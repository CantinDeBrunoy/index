import { useCallback, useEffect, useRef, useState } from 'react';

import { countCameras, isDenial, openCamera, readSettings, wait } from '@/lib/camera';
import type { Facing, Opened } from '@/lib/camera';
import { captureFromVideo } from '@/lib/photo';
import type { Shot } from '@/lib/photo';
import { useI18n } from '@/state/I18nProvider';

type State = 'starting' | 'ready' | 'denied' | 'unavailable';
/**
 * `second` : la première photo est prise, l'autre caméra est en train de
 * s'ouvrir. `manual` : la scène est prise et c'est la personne qui cadre son
 * visage, avec la caméra qu'elle veut. `face` : elle vient d'appuyer.
 */
type Phase = 'idle' | 'first' | 'second' | 'manual' | 'face';

/** Comment on est arrivé au cadrage manuel : par choix, ou faute de mieux. */
type ManualReason = 'chosen' | 'failed';

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
 *
 * Et quand la cascade échoue — une caméra frontale qui refuse de s'ouvrir, un
 * appareil qui n'en a qu'une — la personne prend le second cliché elle-même,
 * avec la caméra dont elle dispose. Renoncer à la moitié du rituel parce que
 * le matériel est capricieux serait le punir elle.
 */
export function Camera({ onCapture }: { onCapture: (shot: Shot) => void }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>('environment');
  // Côté réellement obtenu : sur un appareil qui n'a qu'une caméra, ou qui
  // ignore la demande, il diffère de `facing`. L'aperçu doit suivre le vrai,
  // sinon le miroir et la vignette mentent sur ce qui sera enregistré.
  const [shown, setShownState] = useState<Facing>('environment');
  // Le même côté, lisible depuis une fonction asynchrone : `shown` y serait
  // figé à la valeur du rendu qui l'a créée, et la prise automatique change
  // de caméra en cours de route.
  const shownRef = useRef<Facing>('environment');
  const [state, setState] = useState<State>('starting');
  const [phase, setPhase] = useState<Phase>('idle');
  const [manualReason, setManualReason] = useState<ManualReason>('chosen');
  // Vrai quand l'appareil ne rend qu'une caméra, quoi qu'on demande : le dire
  // vaut mieux que laisser croire à un bouton mort et à une photo manquante.
  const [oneCameraOnly, setOneCameraOnly] = useState(false);
  // Rouvre la caméra sans changer de côté — après une seconde prise ratée, il
  // n'y a plus de flux du tout.
  const [session, setSession] = useState(0);
  // Première photo prise, en attente de la seconde : elle passe en vignette,
  // comme elle le sera dans le résultat.
  const pendingRef = useRef<Blob | null>(null);
  const [firstUrl, setFirstUrl] = useState<string | null>(null);

  const setShown = useCallback((side: Facing) => {
    shownRef.current = side;
    setShownState(side);
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  /** Retient la scène et l'affiche en vignette. L'URL survit jusqu'au résultat. */
  const holdFirst = useCallback((main: Blob) => {
    pendingRef.current = main;
    setFirstUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(main);
    });
  }, []);

  const release = useCallback(() => {
    pendingRef.current = null;
    setFirstUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  useEffect(() => release, [release]);

  /** Branche un flux sur l'élément vidéo et retient le côté réellement obtenu. */
  const attach = useCallback((opened: Opened, requested: Facing) => {
    streamRef.current = opened.stream;
    setShown(opened.facing ?? requested);
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = opened.stream;
    void video.play().catch(() => {});
  }, [setShown]);

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
  }, [attach, facing, session, stop]);

  /**
   * Capture l'image courante, en attendant une vraie image si l'aperçu vient
   * de rouvrir : `state === 'ready'` dit que le flux est branché, pas qu'il a
   * déjà produit quelque chose. Sans cette attente, un appui rapide échoue
   * sans rien dire.
   */
  const grab = async (video: HTMLVideoElement): Promise<Blob> => {
    if (!video.videoWidth) await waitForFrame(video);
    return captureFromVideo(video, shownRef.current === 'user');
  };

  const finish = (main: Blob, selfie: Blob | null) => {
    stop();
    release();
    setPhase('idle');
    onCapture({ main, selfie });
  };

  /**
   * Passe la main : la scène est prise, c'est la personne qui cadre le second
   * cliché. Les deux photos se prennent alors avec **la même caméra**, celle
   * qui a fait la première — la seule dont on sait qu'elle marche. Après une
   * tentative automatique, c'est l'autre qui est à l'écran, ou plus rien du
   * tout : dans les deux cas on rouvre celle de la scène, sinon on laisserait
   * la personne devant l'objectif qui vient justement de la lâcher. La
   * bascule reste offerte, mais c'est elle qui la demande.
   */
  const handOver = (reason: ManualReason, sceneFacing: Facing) => {
    setManualReason(reason);
    setPhase('manual');
    if (!streamRef.current || shownRef.current !== sceneFacing) {
      setFacing(sceneFacing);
      setSession((current) => current + 1);
    }
  };

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
    // Surtout ne pas *attendre* `play()` : sur un objectif qui s'ouvre sans
    // jamais produire d'image, cette promesse ne se résout jamais et l'app
    // reste figée sur « Prise en cours… ». C'est l'image qu'on attend, et
    // `waitForFrame` a, lui, une limite.
    void video.play().catch(() => {});
    await waitForFrame(video);

    // Un flux ouvert n'est pas un flux qui filme : sans image (`readyState`
    // sous `HAVE_CURRENT_DATA`), la capture ne rendrait qu'un rectangle noir.
    // Mieux vaut déclarer forfait et passer la main.
    if (video.readyState < 2 || !video.videoWidth) return null;

    try {
      return await captureFromVideo(video, shownNow === 'user');
    } catch {
      return null;
    }
  };

  /** La prise en un appui : la scène, puis le visage dans la foulée. */
  const capture = async () => {
    if (!videoRef.current || state !== 'ready' || phase !== 'idle') return;
    setPhase('first');
    const sceneFacing = shownRef.current;
    try {
      const main = await grab(videoRef.current);
      const first = readSettings(streamRef.current);
      holdFirst(main);
      setPhase('second');
      const selfie = await captureOther({
        deviceId: first.deviceId,
        facing: first.facing ?? shown,
      });
      if (selfie) {
        finish(main, selfie);
        return;
      }
      // L'autre caméra n'a rien donné. Plutôt que de rendre une journée à une
      // seule photo sans rien demander, on propose de cadrer le visage à la
      // main — c'est le seul recours quand la frontale ne répond pas.
      handOver('failed', sceneFacing);
    } catch {
      stop();
      release();
      setPhase('idle');
      setState('unavailable');
    }
  };

  /** Prendre la scène, puis cadrer le visage soi-même — sans essai automatique. */
  const captureThenHandOver = async () => {
    if (!videoRef.current || state !== 'ready' || phase !== 'idle') return;
    setPhase('first');
    const sceneFacing = shownRef.current;
    try {
      const main = await grab(videoRef.current);
      holdFirst(main);
      handOver('chosen', sceneFacing);
    } catch {
      setPhase('idle');
      setState('unavailable');
    }
  };

  /** Le second cliché, cadré par la personne, avec la caméra de la scène. */
  const captureFace = async () => {
    const main = pendingRef.current;
    if (!videoRef.current || !main || state !== 'ready' || phase !== 'manual') return;
    setPhase('face');
    try {
      finish(main, await grab(videoRef.current));
    } catch {
      setPhase('manual');
    }
  };

  const busy = phase === 'first' || phase === 'second' || phase === 'face';
  const manual = phase === 'manual';
  // La vignette ne peut pas être en direct : une seule caméra à la fois. Elle
  // montre donc la place que l'autre photo prendra, puis la photo elle-même
  // dès qu'elle existe — le cadrage annonce le résultat au lieu de le cacher.
  const insetLabel = shown === 'user' ? t('today.insetScene') : t('today.insetFace');
  const hint = manual
    ? t(manualReason === 'failed' ? 'today.faceFallback' : 'today.faceHint')
    : oneCameraOnly && state === 'ready'
      ? t('today.cameraOneOnly')
      : t('today.dualHint');

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
          onClick={() => void (manual ? captureFace() : capture())}
          disabled={state !== 'ready' || busy}
        >
          {busy ? t('today.capturing') : manual ? t('today.takeFace') : t('today.takePhoto')}
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

      {/* Le repli manuel, moins appuyé que la prise : avant, c'est le choix de
          cadrer soi-même ; pendant, c'est le droit de s'en passer. */}
      <div className="camera-actions camera-actions--second">
        {manual ? (
          <button
            type="button"
            className="btn grow"
            onClick={() => {
              const main = pendingRef.current;
              if (main) finish(main, null);
            }}
            disabled={busy}
          >
            {t('today.skipFace')}
          </button>
        ) : (
          <button
            type="button"
            className="btn grow"
            onClick={() => void captureThenHandOver()}
            disabled={state !== 'ready' || busy}
          >
            {t('today.faceMyself')}
          </button>
        )}
      </div>

      <p className="faint small">{hint}</p>
    </div>
  );
}
