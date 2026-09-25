import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { PhotoImage } from '@/components/PhotoImage';
import { PhotoViewer } from '@/components/PhotoViewer';
import type { ViewerPhoto } from '@/components/PhotoViewer';
import { DRAG_THRESHOLD, asFraction, clampToFrame, nudgeOffset } from '@/lib/inset';
import type { Box, Direction, Frame, Spot } from '@/lib/inset';
import type { Entry } from '@/lib/types';
import { useI18n } from '@/state/I18nProvider';

const ARROWS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

/** Ce qu'un glissement en cours a besoin de retenir, hors du rendu. */
type Drag = {
  pointerX: number;
  pointerY: number;
  /** Position de départ de la vignette dans le cadre. */
  box: Box;
  frame: Frame;
  /** Position atteinte, tenue à jour pendant le geste. */
  placed: { x: number; y: number };
  moved: boolean;
};

/**
 * Les deux photos d'un même appui : la scène en grand, le visage en vignette.
 * Un appui sur la vignette les échange — c'est souvent le visage qu'on veut
 * regarder en grand, et l'inverse dépend du jour.
 *
 * La vignette se **déplace au doigt** : elle masque forcément un coin de la
 * grande photo, et c'est parfois précisément là qu'il y a quelque chose à
 * voir. Elle reste exactement là où le doigt l'a laissée — rien ne la range
 * dans un angle, c'est la personne qui décide de ce qu'elle cache. La seule
 * limite est le cadre : elle ne sort pas de la photo.
 *
 * Une journée d'avant la double photo, ou prise sur un appareil à une seule
 * caméra, n'a pas de vignette : on affiche alors la photo seule, sans cadre
 * vide qui ferait croire à une image manquante.
 */
export function PhotoPair({
  main,
  inset,
  onOpen,
}: {
  main: ReactNode;
  inset: ReactNode | null;
  /**
   * Ouvre en grand la photo affichée en grand : `main` ou `inset`, selon
   * l'échange en cours. Sans lui, la grande photo ne réagit pas au toucher.
   */
  onOpen?: (shown: 'main' | 'inset') => void;
}) {
  const { t } = useI18n();
  const [swapped, setSwapped] = useState(false);
  /** Position choisie, en fraction du cadre. `null` = la place de départ. */
  const [spot, setSpot] = useState<Spot | null>(null);
  /** Décalage appliqué pendant le geste, relatif à la position de départ. */
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);

  const frameRef = useRef<HTMLDivElement>(null);
  const insetRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<Drag | null>(null);
  // Un glissement se termine aussi par un `click` : sans ce drapeau, ranger la
  // vignette dans un coin interchangerait les photos par-dessus le marché.
  const draggedRef = useRef(false);

  // La grande photo s'ouvre d'un appui ; la vignette, elle, garde ses gestes
  // (échanger, déplacer). Ce sont deux éléments voisins : un appui sur l'une
  // n'atteint jamais l'autre.
  const opener = (content: ReactNode, shown: 'main' | 'inset') =>
    onOpen ? (
      <button type="button" className="photo-pair__open" onClick={() => onOpen(shown)} aria-label={t('today.photoOpen')}>
        {content}
      </button>
    ) : (
      content
    );

  if (!inset) return <>{opener(main, 'main')}</>;

  const large = opener(swapped ? inset : main, swapped ? 'inset' : 'main');
  const small = swapped ? main : inset;

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const frame = frameRef.current;
    const element = insetRef.current;
    if (!frame || !element) return;

    draggedRef.current = false;
    const frameRect = frame.getBoundingClientRect();
    const insetRect = element.getBoundingClientRect();
    const box: Box = {
      x: insetRect.left - frameRect.left,
      y: insetRect.top - frameRect.top,
      width: insetRect.width,
      height: insetRect.height,
    };
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      box,
      frame: { width: frameRect.width, height: frameRect.height },
      placed: { x: box.x, y: box.y },
      moved: false,
    };
    // La capture garde le geste même si le doigt sort de la vignette — sans
    // elle, un glissement un peu large lâche la vignette en route.
    element.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = event.clientX - drag.pointerX;
    const dy = event.clientY - drag.pointerY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;

    drag.placed = clampToFrame(drag.box.x + dx, drag.box.y + dy, drag.box, drag.frame);
    setOffset({ x: drag.placed.x - drag.box.x, y: drag.placed.y - drag.box.y });
  };

  const endDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setOffset(null);
    if (!drag) return;

    if (drag.moved) {
      draggedRef.current = true;
      setSpot(asFraction(drag.placed.x, drag.placed.y, drag.frame));
    }
    if (insetRef.current?.hasPointerCapture(event.pointerId)) {
      insetRef.current.releasePointerCapture(event.pointerId);
    }
  };

  // Le clavier n'a pas de doigt : les flèches déplacent d'un pas. On repart de
  // la position réellement affichée, mesurée, plutôt que d'un état — c'est la
  // seule façon de partir juste quand la vignette est encore à sa place de
  // départ, qui vient de la feuille de style.
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const direction: Direction | undefined = ARROWS[event.key];
    if (!direction) return;
    event.preventDefault();

    const frameElement = frameRef.current;
    const element = insetRef.current;
    if (!frameElement || !element) return;

    const frameRect = frameElement.getBoundingClientRect();
    const insetRect = element.getBoundingClientRect();
    const frame: Frame = { width: frameRect.width, height: frameRect.height };
    const { dx, dy } = nudgeOffset(direction, frame);
    const placed = clampToFrame(
      insetRect.left - frameRect.left + dx,
      insetRect.top - frameRect.top + dy,
      insetRect,
      frame,
    );
    setSpot(asFraction(placed.x, placed.y, frame));
  };

  return (
    <div className="photo-pair" ref={frameRef}>
      {large}
      <button
        type="button"
        ref={insetRef}
        className="photo-pair__inset"
        data-dragging={offset !== null}
        style={{
          ...(spot ? { left: `${spot.x * 100}%`, top: `${spot.y * 100}%` } : null),
          ...(offset ? { transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` } : null),
        }}
        // Une image est nativement « déplaçable » : au premier mouvement, le
        // navigateur démarre son propre glisser-déposer et coupe le nôtre par
        // un `pointercancel`. La vignette ne bougeait pas d'un pixel, sans la
        // moindre erreur.
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        onClick={() => {
          if (draggedRef.current) {
            draggedRef.current = false;
            return;
          }
          setSwapped((current) => !current);
        }}
        aria-label={t('today.swapPhotos')}
        title={t('today.insetHint')}
      >
        {small}
      </button>
    </div>
  );
}

/**
 * Les deux photos d'une entrée enregistrée — une seule si elle n'en a qu'une.
 * Un appui sur la grande les ouvre en grand (`PhotoViewer`).
 */
export function EntryPhotos({ entry, alt }: { entry: Entry | null; alt?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  // Référence stable : la visionneuse range ses écouteurs à chaque nouvelle
  // fonction, et le sondage des entrées fait un rendu toutes les 60 s.
  const close = useCallback(() => setOpen(null), []);
  const label = alt ?? t('today.photoStep');
  const photos: ViewerPhoto[] = [{ path: entry?.photo_path ?? null, alt: label, name: t('today.photoScene') }];
  if (entry?.selfie_path) photos.push({ path: entry.selfie_path, alt: t('today.selfieStep'), name: t('today.photoFace') });
  return (
    <>
      <PhotoPair
        main={<PhotoImage path={entry?.photo_path ?? null} alt={label} />}
        inset={entry?.selfie_path ? <PhotoImage path={entry.selfie_path} alt={t('today.selfieStep')} /> : null}
        onOpen={entry?.photo_path ? (shown) => setOpen(shown === 'main' ? 0 : 1) : undefined}
      />
      {open !== null ? <PhotoViewer photos={photos} start={open} onClose={close} /> : null}
    </>
  );
}
