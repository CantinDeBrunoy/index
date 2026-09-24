import type { Piece } from '../character';

/** Une pièce de la scène : un tracé, ses couleurs et son animation. */
export type DuoPart = {
  d: string;
  /** Une couleur, `currentColor`, `var(--…)`, `none`, ou `motif:<clé>` pour un motif de tenue. */
  fill: string;
  stroke: string;
  sw: number;
  op: number;
  tf: string;
  /** Classe d'animation, origine et délai. */
  c: string;
  o: string;
  dl: string;
};

/**
 * Un acteur : trois groupes imbriqués qui portent chacun une animation
 * (souvent : horizontale, verticale, corps), autour d'une mise en place.
 */
export type DuoActor = {
  c1: string;
  o1: string;
  d1: string;
  c2: string;
  o2: string;
  d2: string;
  tf: string;
  c3: string;
  o3: string;
  d3: string;
  op: number;
  parts: DuoPart[];
};

/** Ce que chacun apporte à la scène : sa teinte du jour et sa tenue. */
export type DuoPerson = {
  tint?: string;
  layers?: { flag?: Piece[]; behind?: Piece[]; body?: Piece[]; face?: Piece[]; head?: Piece[] };
  motif?: string | null;
  /** Relus quand le personnage est couché : la mèche et les taches restent visibles. */
  head?: string | null;
  face?: string | null;
};

export type DuoSceneModel = {
  actors: DuoActor[];
  stageTf: string;
  /** La scène est écrite avec l'émotion meneuse à gauche : vrai si on l'a retournée. */
  mirror: boolean;
  /** Faux quand aucune scène n'est écrite pour la paire : chacun joue alors son émotion. */
  scripted: boolean;
};

export function duoScene(props: { a: string; b: string; me?: DuoPerson; partner?: DuoPerson }): DuoSceneModel;
