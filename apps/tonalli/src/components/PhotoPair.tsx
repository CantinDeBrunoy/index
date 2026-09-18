import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { PhotoImage } from '@/components/PhotoImage';
import { DRAG_THRESHOLD, clampToFrame, moveCorner, nearestCorner } from '@/lib/inset';
import type { Box, Corner, Direction, Frame } from '@/lib/inset';
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
 * voir. Au relâchement elle se range dans le coin le plus proche — elle ne
 * reste jamais au milieu du sujet ni à cheval sur un bord.
 *
 * Une journée d'avant la double photo, ou prise sur un appareil à une seule
 * caméra, n'a pas de vignette : on affiche alors la photo seule, sans cadre
 * vide qui ferait croire à une image manquante.
 */
export function PhotoPair({ main, inset }: { main: ReactNode; inset: ReactNode | null }) {
  const { t } = useI18n();
  const [swapped, setSwapped] = useState(false);
  const [corner, setCorner] = useState<Corner>('top-left');
  /** Décalage appliqué pendant le geste, relatif au coin d'ancrage. */
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);

  const frameRef = useRef<HTMLDivElement>(null);
  const insetRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<Drag | null>(null);
  // Un glissement se termine aussi par un `click` : sans ce drapeau, ranger la
  // vignette dans un coin interchangerait les photos par-dessus le marché.
  const draggedRef = useRef(false);

  if (!inset) return <>{main}</>;

  const large = swapped ? inset : main;
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
      setCorner(nearestCorner({ ...drag.box, ...drag.placed }, drag.frame));
    }
    if (insetRef.current?.hasPointerCapture(event.pointerId)) {
      insetRef.current.releasePointerCapture(event.pointerId);
    }
  };

  // Le clavier n'a pas de doigt : les flèches font le même déplacement.
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const direction = ARROWS[event.key];
    if (!direction) return;
    event.preventDefault();
    setCorner((current) => moveCorner(current, direction));
  };

  return (
    <div className="photo-pair" ref={frameRef}>
      {large}
      <button
        type="button"
        ref={insetRef}
        className="photo-pair__inset"
        data-corner={corner}
        data-dragging={offset !== null}
        style={offset ? { transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` } : undefined}
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
        // L'écran « Aujourd'hui » change de panneau au glissement horizontal.
        // Sans cette coupure, déplacer la vignette vers la droite ferait aussi
        // basculer sur la journée du binôme.
        onTouchStart={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
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

/** Les deux photos d'une entrée enregistrée — une seule si elle n'en a qu'une. */
export function EntryPhotos({ entry, alt }: { entry: Entry | null; alt?: string }) {
  const { t } = useI18n();
  const label = alt ?? t('today.photoStep');
  return (
    <PhotoPair
      main={<PhotoImage path={entry?.photo_path ?? null} alt={label} />}
      inset={entry?.selfie_path ? <PhotoImage path={entry.selfie_path} alt={t('today.selfieStep')} /> : null}
    />
  );
}
