import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { PhotoImage } from '@/components/PhotoImage';
import { useI18n } from '@/state/I18nProvider';

export type ViewerPhoto = { path: string | null; alt: string; name: string };

/**
 * Une photo de la journée en grand, sur fond sombre : ouverte d'un appui sur
 * la grande photo, refermée d'un appui à côté, par le bouton ou par Échap.
 *
 * Contrairement à la réaction en grand, c'est une vraie boîte de dialogue :
 * elle reste tant qu'on la regarde, et on la ferme soi-même. Le focus y entre
 * et revient ensuite là d'où on l'a ouverte.
 *
 * Quand la journée a ses deux photos, une bascule passe de la scène au visage
 * (les flèches du clavier aussi). Rendue dans `body` : sous l'écran, un parent
 * transformé ou `inert` (la nappe du dévoilement) la piégerait.
 */
export function PhotoViewer({ photos, start, onClose }: { photos: ViewerPhoto[]; start: number; onClose: () => void }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(start);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    // La page ne défile pas derrière la photo.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (photos.length > 1 && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        setIndex((current) => (current + 1) % photos.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [onClose, photos.length]);

  const photo = photos[index] ?? photos[0];

  return createPortal(
    <div className="viewer" role="dialog" aria-modal="true" aria-label={t('today.photoViewer')} onClick={onClose}>
      <button ref={closeRef} type="button" className="viewer__close" onClick={onClose} aria-label={t('today.photoClose')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M6 6 L18 18 M18 6 L6 18" />
        </svg>
      </button>
      {/* Un appui sur la photo ne la ferme pas : c'est là qu'on pince pour zoomer. */}
      <div className="viewer__photo" onClick={(event) => event.stopPropagation()}>
        <PhotoImage key={photo.path ?? index} path={photo.path} alt={photo.alt} />
      </div>
      {photos.length > 1 ? (
        <div className="viewer__switch" role="group" aria-label={t('today.photoViewer')} onClick={(event) => event.stopPropagation()}>
          {photos.map((item, position) => (
            <button
              key={item.name}
              type="button"
              className="viewer__tab"
              aria-pressed={position === index}
              onClick={() => setIndex(position)}
            >
              {item.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
