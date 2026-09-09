import { useCallback, useEffect, useRef, useState } from 'react';

import { captureFromVideo } from '@/lib/photo';
import type { Shot } from '@/lib/photo';
import { useI18n } from '@/state/I18nProvider';

type Facing = 'environment' | 'user';
type State = 'starting' | 'ready' | 'denied' | 'unavailable';
/** `second` : la première photo est prise, l'autre caméra est en train de s'ouvrir. */
type Phase = 'idle' | 'first' | 'second';

const opposite = (facing: Facing): Facing => (facing === 'user' ? 'environment' : 'user');

/** Temps laissé à une caméra qui vient de s'ouvrir pour régler son exposition. */
const SETTLE_MS = 450;

const constraintsFor = (facing: Facing): MediaStreamConstraints => ({
  video: { facingMode: facing, width: { ideal: 1440 }, height: { ideal: 1920 } },
  audio: false,
});

const deviceIdOf = (stream: MediaStream | null): string | undefined =>
  stream?.getVideoTracks()[0]?.getSettings().deviceId;

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * Une image noire est le piège de la seconde prise : le flux répond avant que
 * le capteur ait produit quoi que ce soit. On attend donc une vraie image, pas
 * seulement l'ouverture du flux.
 */
async function waitForFrame(video: HTMLVideoElement): Promise<void> {
  if (video.readyState < 2) {
    await new Promise<void>((resolve) => {
      const done = () => {
        video.removeEventListener('loadeddata', done);
        resolve();
      };
      video.addEventListener('loadeddata', done);
      window.setTimeout(done, 2500);
    });
  }
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
  const [state, setState] = useState<State>('starting');
  const [phase, setPhase] = useState<Phase>('idle');
  // Première photo déjà prise : elle passe en vignette pendant que la seconde
  // caméra travaille, comme elle le sera dans le résultat.
  const [firstUrl, setFirstUrl] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;

    const start = async () => {
      setState('starting');
      stop();
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('unavailable');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraintsFor(facing));
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setState('ready');
      } catch (error) {
        if (!active) return;
        const name = (error as { name?: string }).name;
        setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
      }
    };

    void start();
    return () => {
      active = false;
      stop();
    };
  }, [facing, stop]);

  /**
   * Bascule sur l'autre caméra et en prend une image. Renvoie `null` plutôt
   * que d'échouer : un appareil à une seule caméra, ou un second flux refusé,
   * ne doit pas empêcher de valider sa journée.
   */
  const captureOther = async (firstDeviceId: string | undefined): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video) return null;

    const other = opposite(facing);
    let stream: MediaStream;
    try {
      // Le premier flux est coupé avant d'ouvrir le second : sur mobile, deux
      // caméras ne cohabitent pas, et insister ferait échouer l'ouverture.
      stop();
      stream = await navigator.mediaDevices.getUserMedia(constraintsFor(other));
    } catch {
      return null;
    }

    streamRef.current = stream;
    // Même identifiant qu'à la première prise : l'appareil n'a qu'une caméra
    // et `facingMode` a été ignoré. Deux fois la même image ne vaut rien.
    if (firstDeviceId && deviceIdOf(stream) === firstDeviceId) return null;

    video.srcObject = stream;
    await video.play().catch(() => {});
    await waitForFrame(video);

    try {
      return await captureFromVideo(video, other === 'user');
    } catch {
      return null;
    }
  };

  const capture = async () => {
    if (!videoRef.current || state !== 'ready' || phase !== 'idle') return;
    setPhase('first');
    let url: string | null = null;
    try {
      const main = await captureFromVideo(videoRef.current, facing === 'user');
      const firstDeviceId = deviceIdOf(streamRef.current);
      url = URL.createObjectURL(main);
      setFirstUrl(url);
      setPhase('second');
      const selfie = await captureOther(firstDeviceId);
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

  // Pendant la seconde prise, c'est l'autre caméra qui est à l'écran : le
  // miroir doit la suivre, sinon l'aperçu ment sur ce qui est enregistré.
  const shown = phase === 'second' ? opposite(facing) : facing;
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
          onClick={() => setFacing(opposite)}
          disabled={state === 'denied' || busy}
        >
          {t('today.switchCamera')}
        </button>
      </div>
      <p className="faint small">{t('today.dualHint')}</p>
    </div>
  );
}
