/**
 * Géométrie de la vignette : où elle se pose, et jusqu'où elle peut aller.
 *
 * La vignette cache forcément un bout de la grande photo — c'est le prix du
 * cadre BeReal. On la rend donc déplaçable, et elle **reste là où le doigt
 * l'a laissée** : pas de rangement automatique dans un coin, c'est la personne
 * qui décide de ce qu'elle veut découvrir et de ce qu'elle accepte de cacher.
 *
 * La seule contrainte gardée est le cadre lui-même : une vignette à moitié
 * sortie de la photo ressemblerait à un bug, et une vignette lâchée hors de
 * l'image serait perdue pour de bon.
 *
 * La position est mémorisée en **fraction du cadre**, jamais en pixels : une
 * rotation d'écran ou un passage en grand change la taille de la photo, et des
 * pixels d'hier n'y voudraient plus rien dire.
 *
 * Ce module ne dépend de rien (ni alias `@/`, ni `window`) : `npm run checks`
 * l'exécute directement sous Node.
 */
export type Direction = 'up' | 'down' | 'left' | 'right';

/** Un rectangle dans le repère du cadre, en pixels. */
export type Box = { x: number; y: number; width: number; height: number };

/** Le cadre de la grande photo, en pixels. */
export type Frame = { width: number; height: number };

/** Position du coin haut-gauche de la vignette, en fraction du cadre. */
export type Spot = { x: number; y: number };

/** Distance minimale entre la vignette et le bord, en pixels. Vaut aussi en CSS. */
export const INSET_MARGIN = 12;

/**
 * En dessous de ce déplacement, le geste reste un appui : un doigt tremble
 * toujours un peu, et un appui qui n'intervertit pas parce qu'il a glissé de
 * deux pixels passerait pour une panne.
 */
export const DRAG_THRESHOLD = 8;

/** Pas du clavier, en fraction du cadre. */
export const NUDGE = 0.06;

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

/**
 * Pixels → fraction du cadre. Un cadre pas encore mesuré vaut zéro : mieux
 * vaut la vignette à sa place de départ qu'une division par zéro propagée en
 * `NaN` jusque dans le style.
 */
export function asFraction(x: number, y: number, frame: Frame): Spot {
  return {
    x: frame.width > 0 ? x / frame.width : 0,
    y: frame.height > 0 ? y / frame.height : 0,
  };
}

/** Déplacement demandé par une flèche du clavier, en pixels du cadre. */
export function nudgeOffset(
  direction: Direction,
  frame: Frame,
  step = NUDGE,
): { dx: number; dy: number } {
  const horizontal = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
  const vertical = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
  return { dx: horizontal * step * frame.width, dy: vertical * step * frame.height };
}
