import { useCallback, useEffect, useRef, useState } from 'react';

import { captureFromVideo } from '@/lib/photo';
import type { Shot } from '@/lib/photo';
import { useI18n } from '@/state/I18nProvider';

type Facing = 'environment' | 'user';
type State = 'starting' | 'ready' | 'denied' | 'unavailable';
/** `second` : la première photo est prise, l'autre caméra est en train de s'ouvrir. */
type Phase = 'idle' | 'first' | 'second';
/**
 * Ce que la vignette du cadrage peut montrer, du meilleur au moins bon :
 * l'autre caméra en direct, une image figée d'elle, ou son seul emplacement.
 */
type Inset = 'none' | 'live' | 'still';

const opposite = (facing: Facing): Facing => (facing === 'user' ? 'environment' : 'user');

/** Temps laissé à une caméra qui vient de s'ouvrir pour régler son exposition. */
const SETTLE_MS = 450;
/** Durée d'observation pour savoir si le flux cadré a survécu à l'ouverture du second. */
const LIVENESS_MS = 350;

const constraintsFor = (facing: Facing): MediaStreamConstraints => ({
  video: { facingMode: facing, width: { ideal: 1440 }, height: { ideal: 1920 } },
  audio: false,
});

const deviceIdOf = (stream: MediaStream | null): string | undefined =>
  stream?.getVideoTracks()[0]?.getSettings().deviceId;

const stopStream = (stream: MediaStream | null) => stream?.getTracks().forEach((track) => track.stop());

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * Une image noire est le piège d'une caméra qui vient de s'ouvrir : le flux
 * répond avant que le capteur ait produit quoi que ce soit. On attend donc une
 * vraie image, pas seulement l'ouverture du flux.
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
 * la valeur du rituel. Un seul appui prend **deux** photos, la scène et le
 * visage.
 *
 * Deux chemins, choisis à l'ouverture selon ce que l'appareil tolère :
 *
 * - **deux flux à la fois** — vignette en direct, et les deux photos prises au
 *   même instant. Plusieurs Android récents l'acceptent ;
 * - **un flux à la fois** — iOS coupe le premier dès qu'on ouvre le second, et
 *   il n'y a alors pas d'autre voie que la cascade : une photo, bascule,
 *   l'autre photo. La vignette montre une image figée de l'autre caméra, prise
 *   une seule fois à l'ouverture, pour que le cadrage annonce le résultat.
 *
 * Ce qu'on ne fait pas : basculer en boucle pour simuler le direct. Chaque tour
 * coûte une réouverture complète de la caméra — la grande vue se figerait et le
 * capteur referait sa mise au point à chaque fois, abîmant précisément ce qu'on
 * vient regarder : le cadrage.
 */
export function Camera({ onCapture }: { onCapture: (shot: Shot) => void }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const insetVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const insetStreamRef = useRef<MediaStream | null>(null);

  const [facing, setFacing] = useState<Facing>('environment');
  const [state, setState] = useState<State>('starting');
  const [phase, setPhase] = useState<Phase>('idle');
  const [inset, setInset] = useState<Inset>('none');
  /** Image figée de l'autre caméra, quand le direct est impossible. */
  const [stillUrl, setStillUrl] = useState<string | null>(null);
  /** Première photo déjà prise : elle occupe la vignette pendant la seconde prise. */
  const [firstUrl, setFirstUrl] = useState<string | null>(null);

  const stop = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
  }, []);

  const stopInset = useCallback(() => {
    stopStream(insetStreamRef.current);
    insetStreamRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;
    let still: string | null = null;

    const openMain = async (): Promise<boolean> => {
      const stream = await navigator.mediaDevices.getUserMedia(constraintsFor(facing));
      if (!active) {
        stopStream(stream);
        return false;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      return true;
    };

    /**
     * Tente le direct sur l'autre caméra, et se rabat sur une image figée si
     * l'appareil ne tient pas deux flux. Silencieux de bout en bout : rien ici
     * ne doit empêcher de prendre une photo.
     */
    const prepareInset = async () => {
      const main = videoRef.current;
      const mainTrack = streamRef.current?.getVideoTracks()[0];
      if (!main || !mainTrack) return;

      const other = opposite(facing);
      const mainDeviceId = mainTrack.getSettings().deviceId;
      const seenAt = main.currentTime;

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraintsFor(other));
      } catch {
        return;
      }
      if (!active) {
        stopStream(stream);
        return;
      }

      // Même identifiant : l'appareil n'a qu'une caméra et `facingMode` a été
      // ignoré. Il n'y a pas d'autre image à montrer.
      if (mainDeviceId && deviceIdOf(stream) === mainDeviceId) {
        stopStream(stream);
        return;
      }

      await wait(LIVENESS_MS);
      if (!active) {
        stopStream(stream);
        return;
      }

      // Le flux cadré a-t-il survécu ? `readyState` ne suffit pas : certains
      // navigateurs se contentent de le rendre muet. On vérifie que la vidéo
      // avance encore réellement.
      const stillLive = mainTrack.readyState === 'live' && !mainTrack.muted && main.currentTime > seenAt;

      if (stillLive) {
        insetStreamRef.current = stream;
        if (insetVideoRef.current) {
          insetVideoRef.current.srcObject = stream;
          await insetVideoRef.current.play().catch(() => {});
        }
        setInset('live');
        return;
      }

      // L'appareil ne tient qu'un flux : le cadré vient de mourir. Puisque
      // l'autre caméra est ouverte, on lui prend une image avant de rendre la
      // main — une bascule payée une fois, au démarrage, plutôt qu'en boucle.
      const view = insetVideoRef.current;
      if (view) {
        view.srcObject = stream;
        await view.play().catch(() => {});
        await waitForFrame(view);
        const frame = await captureFromVideo(view, other === 'user').catch(() => null);
        if (frame && active) {
          still = URL.createObjectURL(frame);
          setStillUrl(still);
          setInset('still');
        }
      }
      stopStream(stream);
      if (active) await openMain().catch(() => {});
    };

    const start = async () => {
      setState('starting');
      setInset('none');
      setStillUrl(null);
      stop();
      stopInset();
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('unavailable');
        return;
      }
      try {
        if (!(await openMain())) return;
        setState('ready');
      } catch (error) {
        if (!active) return;
        const name = (error as { name?: string }).name;
        setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
        return;
      }
      await prepareInset();
    };

    void start();
    return () => {
      active = false;
      stop();
      stopInset();
      if (still) URL.revokeObjectURL(still);
    };
  }, [facing, stop, stopInset]);

  /**
   * Bascule sur l'autre caméra et en prend une image — le chemin des appareils
   * qui ne tiennent qu'un flux. Renvoie `null` plutôt que d'échouer : une
   * seconde photo manquante n'empêche pas de valider sa journée.
   */
  const captureOther = async (firstDeviceId: string | undefined): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video) return null;

    const other = opposite(facing);
    let stream: MediaStream;
    try {
      // Le premier flux est coupé avant d'ouvrir le second : sur ces
      // appareils, insister ferait échouer l'ouverture.
      stop();
      stream = await navigator.mediaDevices.getUserMedia(constraintsFor(other));
    } catch {
      return null;
    }

    streamRef.current = stream;
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
      const other = opposite(facing);

      let selfie: Blob | null = null;
      if (inset === 'live' && insetVideoRef.current) {
        // Les deux caméras tournent déjà : les deux images sont du même
        // instant, sans bascule ni attente.
        selfie = await captureFromVideo(insetVideoRef.current, other === 'user').catch(() => null);
      } else {
        url = URL.createObjectURL(main);
        setFirstUrl(url);
        setPhase('second');
        selfie = await captureOther(deviceIdOf(streamRef.current));
      }

      stop();
      stopInset();
      onCapture({ main, selfie });
    } catch {
      stop();
      stopInset();
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
  const other = opposite(shown);
  // La vignette montre, par ordre de préférence : la photo déjà prise, l'autre
  // caméra en direct, son image figée, ou à défaut la place qu'elle occupera.
  const insetPhoto = firstUrl ?? (inset === 'still' ? stillUrl : null);
  const insetLive = inset === 'live' && !firstUrl;

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
          <div className="camera__inset" data-filled={Boolean(insetPhoto) || insetLive}>
            {/* Jamais `display: none` : c'est de cette vidéo qu'on tire
                l'image figée, et un élément masqué ainsi peut ne plus décoder
                d'images du tout. Elle reste affichée, simplement recouverte
                par la photo ou par le libellé. */}
            <video
              ref={insetVideoRef}
              playsInline
              muted
              autoPlay
              style={{ transform: other === 'user' ? 'scaleX(-1)' : undefined }}
            />
            {insetPhoto ? <img src={insetPhoto} alt={t('today.photoStep')} /> : null}
            {!insetPhoto && !insetLive ? (
              <span className="camera__inset-label">
                {other === 'user' ? t('today.insetFace') : t('today.insetScene')}
              </span>
            ) : null}
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
          disabled={state !== 'ready' || phase !== 'idle'}
        >
          {phase === 'idle' ? t('today.takePhoto') : t('today.capturing')}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setFacing(opposite)}
          disabled={state === 'denied' || phase !== 'idle'}
        >
          {t('today.switchCamera')}
        </button>
      </div>
      <p className="faint small">{inset === 'live' ? t('today.dualHintLive') : t('today.dualHint')}</p>
    </div>
  );
}
