import { useCallback, useEffect, useRef, useState } from 'react';

import { countCameras, isDenial, openCamera, readSettings, wait } from '@/lib/camera';
import type { Facing, Opened } from '@/lib/camera';
import { captureFromVideo } from '@/lib/photo';
import type { Shot } from '@/lib/photo';
import { useI18n } from '@/state/I18nProvider';

type State = 'starting' | 'ready' | 'denied' | 'unavailable';
/** `second` : la première photo est prise, l'autre caméra est en train de s'ouvrir. */
type Phase = 'idle' | 'first' | 'second';

const opposite = (facing: Facing): Facing => (facing === 'user' ? 'environment' : 'user');

/** Temps laissé à une caméra qui vient de s'ouvrir pour régler son exposition. */
const SETTLE_MS = 450;

/**
 * Pause entre la coupure d'un flux et l'ouverture de l'autre. Les pilotes
 * Android d'entrée de gamme ne relâchent pas la caméra dans la foulée ;
 * `openCamera` sait réessayer, mais commencer par attendre évite un premier
 * échec systématique, donc une seconde photo prise trop tard.
 */
const RELEASE_MS = 150;

/**
 * Une image noire est le piège de la seconde prise : le flux répond avant que
 * le capteur ait produit quoi que ce soit. On attend donc une vraie image, pas
 * seulement l'ouverture du flux — `requestVideoFrameCallback` la garantit quand
 * il existe, sinon `loadeddata` en approche.
 */
async function waitForFrame(video: HTMLVideoElement): Promise<void> {
  type WithFrameCallback = HTMLVideoElement & {
    requestVideoFrameCallback?: (callback: () => void) => number;
  };
  const request = (video as WithFrameCallback).requestVideoFrameCallback?.bind(video);

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      video.removeEventListener('loadeddata', finish);
      resolve();
    };
    if (request) request(finish);
    else if (video.readyState >= 2) finish();
    else video.addEventListener('loadeddata', finish);
    window.setTimeout(finish, 2500);
  });

  await wait(SETTLE_MS);
}

/**
 * Photo prise dans l'app, jamais choisie dans la galerie : c'est ce qui fait
 * la valeur du rituel. Un seul appui prend **deux** photos, la scène puis le
 * visage, l'une derrière l'autre.
 *
 * Pourquoi pas les deux caméras en même temps : aucun navigateur de téléphone
 * ne garde deux flux vidéo actifs simultanément — ouvrir le second coupe le
 * premier sur iOS, et sur la plupart des Android. La cascade rapide est la
 * seule façon d'avoir les deux images du même instant.
 */
export function Camera({ onCapture }: { onCapture: (shot: Shot) => void }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>('environment');
  // Côté réellement obtenu : sur un appareil qui n'a qu'une caméra, ou qui
  // ignore la demande, il diffère de `facing`. L'aperçu doit suivre le vrai,
  // sinon le miroir et la vignette mentent sur ce qui sera enregistré.
  const [shown, setShown] = useState<Facing>('environment');
  const [state, setState] = useState<State>('starting');
  const [phase, setPhase] = useState<Phase>('idle');
  // Vrai quand l'appareil ne rend qu'une caméra, quoi qu'on demande : le dire
  // vaut mieux que laisser croire à un bouton mort et à une photo manquante.
  const [oneCameraOnly, setOneCameraOnly] = useState(false);
  // Première photo déjà prise : elle passe en vignette pendant que la seconde
  // caméra travaille, comme elle le sera dans le résultat.
  const [firstUrl, setFirstUrl] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  /** Branche un flux sur l'élément vidéo et retient le côté réellement obtenu. */
  const attach = useCallback((opened: Opened, requested: Facing) => {
    streamRef.current = opened.stream;
    setShown(opened.facing ?? requested);
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = opened.stream;
    void video.play().catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;

    const start = async () => {
      setState('starting');
      setOneCameraOnly(false);
      stop();
      // La caméra précédente vient d'être coupée : laisser le pilote la rendre.
      await wait(RELEASE_MS);
      if (!active) return;
      try {
        // `allowAny` : un ordinateur portable n'a pas de caméra arrière, et
        // refuser de démarrer pour ça serait absurde.
        const opened = await openCamera(facing, { allowAny: true });
        if (!active) {
          opened.stream.getTracks().forEach((track) => track.stop());
          return;
        }
        attach(opened, facing);
        setState('ready');
        // Deux façons de savoir qu'il n'y a qu'un objectif : l'appareil n'en
        // énumère qu'un, ou il rend l'autre côté que celui demandé.
        const cameras = await countCameras();
        if (!active) return;
        setOneCameraOnly(cameras === 1 || (opened.facing !== null && opened.facing !== facing));
      } catch (error) {
        if (!active) return;
        setState(isDenial(error) ? 'denied' : 'unavailable');
      }
    };

    void start();
    return () => {
      active = false;
      stop();
    };
  }, [attach, facing, stop]);

  /**
   * Bascule sur l'autre caméra et en prend une image. Renvoie `null` plutôt
   * que d'échouer : un appareil à une seule caméra, ou un second flux refusé,
   * ne doit pas empêcher de valider sa journée.
   */
  const captureOther = async (first: {
    deviceId: string | null;
    facing: Facing | null;
  }): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video) return null;

    const other = opposite(shown);
    let opened: Opened;
    try {
      // Le premier flux est coupé avant d'ouvrir le second : sur mobile, deux
      // caméras ne cohabitent pas, et insister ferait échouer l'ouverture.
      stop();
      await wait(RELEASE_MS);
      // Sans `allowAny`, et en écartant explicitement la caméra déjà utilisée :
      // deux fois la même image ne vaut rien, mieux vaut une journée à une
      // seule photo.
      opened = await openCamera(other, {
        avoidDeviceId: first.deviceId,
        avoidFacing: first.facing,
      });
    } catch {
      return null;
    }

    streamRef.current = opened.stream;
    const shownNow = opened.facing ?? other;
    setShown(shownNow);
    video.srcObject = opened.stream;
    await video.play().catch(() => {});
    await waitForFrame(video);

    try {
      return await captureFromVideo(video, shownNow === 'user');
    } catch {
      return null;
    }
  };

  const capture = async () => {
    if (!videoRef.current || state !== 'ready' || phase !== 'idle') return;
    setPhase('first');
    let url: string | null = null;
    try {
      const main = await captureFromVideo(videoRef.current, shown === 'user');
      const first = readSettings(streamRef.current);
      url = URL.createObjectURL(main);
      setFirstUrl(url);
      setPhase('second');
      const selfie = await captureOther({
        deviceId: first.deviceId,
        facing: first.facing ?? shown,
      });
      stop();
      onCapture({ main, selfie });
    } catch {
      stop();
      setState('unavailable');
    } finally {
      setPhase('idle');
      setFirstUrl(null);
      if (url) URL.revokeObjectURL(url);
    }
  };

  const busy = phase !== 'idle';
  // La vignette ne peut pas être en direct : une seule caméra à la fois. Elle
  // montre donc la place que l'autre photo prendra, puis la photo elle-même
  // dès qu'elle existe — le cadrage annonce le résultat au lieu de le cacher.
  const insetLabel = shown === 'user' ? t('today.insetScene') : t('today.insetFace');

  return (
    <div className="stack">
      <div className="camera">
        {state === 'ready' || state === 'starting' ? (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{
              transform: shown === 'user' ? 'scaleX(-1)' : undefined,
              opacity: state === 'ready' ? 1 : 0.4,
            }}
          />
        ) : null}
        {state === 'ready' ? (
          <div className="camera__inset" data-filled={Boolean(firstUrl)}>
            {firstUrl ? (
              <img src={firstUrl} alt={t('today.photoStep')} />
            ) : (
              <span className="camera__inset-label">{insetLabel}</span>
            )}
          </div>
        ) : null}
        {state === 'starting' ? <p className="camera-msg">{t('today.cameraStarting')}</p> : null}
        {state === 'ready' && phase === 'second' ? (
          <p className="camera-msg camera-msg--overlay">{t('today.capturingSecond')}</p>
        ) : null}
        {state === 'denied' ? (
          <p className="camera-msg">
            <strong>{t('today.cameraDenied')}</strong>
            <br />
            {t('today.cameraDeniedHint')}
          </p>
        ) : null}
        {state === 'unavailable' ? <p className="camera-msg">{t('today.cameraUnavailable')}</p> : null}
      </div>

      <div className="camera-actions">
        <button
          type="button"
          className="btn btn--primary grow"
          onClick={() => void capture()}
          disabled={state !== 'ready' || busy}
        >
          {busy ? t('today.capturing') : t('today.takePhoto')}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setFacing(opposite(shown))}
          disabled={state === 'denied' || busy || oneCameraOnly}
        >
          {t('today.switchCamera')}
        </button>
      </div>
      <p className="faint small">
        {oneCameraOnly && state === 'ready' ? t('today.cameraOneOnly') : t('today.dualHint')}
      </p>
    </div>
  );
}
