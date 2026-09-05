import { useCallback, useEffect, useRef, useState } from 'react';

import { captureFromVideo } from '@/lib/photo';
import { useI18n } from '@/state/I18nProvider';

type Facing = 'environment' | 'user';
type State = 'starting' | 'ready' | 'denied' | 'unavailable';

/**
 * Photo prise dans l'app, jamais choisie dans la galerie : c'est ce qui fait
 * la valeur du rituel. Caméra arrière par défaut, bascule frontale possible.
 */
export function Camera({ onCapture }: { onCapture: (photo: Blob) => void }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>('environment');
  const [state, setState] = useState<State>('starting');
  const [busy, setBusy] = useState(false);

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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1440 }, height: { ideal: 1920 } },
          audio: false,
        });
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

  const capture = async () => {
    if (!videoRef.current || state !== 'ready' || busy) return;
    setBusy(true);
    try {
      const photo = await captureFromVideo(videoRef.current, facing === 'user');
      stop();
      onCapture(photo);
    } finally {
      setBusy(false);
    }
  };

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
              transform: facing === 'user' ? 'scaleX(-1)' : undefined,
              opacity: state === 'ready' ? 1 : 0.4,
            }}
          />
        ) : null}
        {state === 'starting' ? <p className="camera-msg">{t('today.cameraStarting')}</p> : null}
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
          {t('today.takePhoto')}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setFacing((current) => (current === 'user' ? 'environment' : 'user'))}
          disabled={state === 'denied'}
        >
          {t('today.switchCamera')}
        </button>
      </div>
    </div>
  );
}
