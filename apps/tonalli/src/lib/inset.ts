/**
 * Géométrie de la vignette : où elle se pose, et jusqu'où elle peut aller.
 *
 * La vignette cache forcément un bout de la grande photo — c'est le prix du
 * cadre BeReal. On la rend donc déplaçable : au doigt, elle suit la main, et
 * au relâchement elle se range dans le coin le plus proche. Le collage aux
 * coins n'est pas une facilité d'implémentation, c'est ce qui garde le cadre
 * lisible : une vignette laissée au milieu masquerait le sujet, et une
 * vignette à moitié sortie ressemblerait à un bug.
 *
 * Ce module ne dépend de rien (ni alias `@/`, ni `window`) : `npm run checks`
 * l'exécute directement sous Node.
 */
export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type Direction = 'up' | 'down' | 'left' | 'right';

/** Un rectangle dans le repère du cadre. */
export type Box = { x: number; y: number; width: number; height: number };

/** Le cadre de la grande photo. */
export type Frame = { width: number; height: number };

/** Distance entre la vignette et le bord, en pixels. Vaut aussi en CSS. */
export const INSET_MARGIN = 12;

/**
 * En dessous de ce déplacement, le geste reste un appui : un doigt tremble
 * toujours un peu, et un appui qui n'intervertit pas parce qu'il a glissé de
 * deux pixels passerait pour une panne.
 */
export const DRAG_THRESHOLD = 8;

/** Le coin le plus proche du centre de la vignette. */
export function nearestCorner(box: Box, frame: Frame): Corner {
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const vertical = centerY < frame.height / 2 ? 'top' : 'bottom';
  const horizontal = centerX < frame.width / 2 ? 'left' : 'right';
  return `${vertical}-${horizontal}`;
}

/**
 * Position gardée à l'intérieur du cadre, marge comprise. Sans ça, un doigt
 * qui sort de la photo emmènerait la vignette avec lui.
 */
export function clampToFrame(
  x: number,
  y: number,
  box: { width: number; height: number },
  frame: Frame,
  margin = INSET_MARGIN,
): { x: number; y: number } {
  // `Math.max` sur la borne haute : si la vignette était plus grande que le
  // cadre, la borne basse doit rester gagnante plutôt que de croiser l'autre.
  const maxX = Math.max(margin, frame.width - box.width - margin);
  const maxY = Math.max(margin, frame.height - box.height - margin);
  return {
    x: Math.min(Math.max(x, margin), maxX),
    y: Math.min(Math.max(y, margin), maxY),
  };
}

/** Coin voisin dans une direction — le déplacement au clavier. */
export function moveCorner(corner: Corner, direction: Direction): Corner {
  const [vertical, horizontal] = corner.split('-') as ['top' | 'bottom', 'left' | 'right'];
  if (direction === 'up') return `top-${horizontal}`;
  if (direction === 'down') return `bottom-${horizontal}`;
  return `${vertical}-${direction}`;
}
