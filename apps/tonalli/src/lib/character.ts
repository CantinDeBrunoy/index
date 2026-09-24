/**
 * Le personnage : une goutte à la silhouette fixe, qui prend la teinte de la
 * journée et la pose de son émotion. Ce module ne dessine rien — il dit quoi
 * dessiner (`components/Character.tsx` s'en charge) — pour que les règles se
 * vérifient dans `npm run checks`.
 *
 * Module sans dépendance (il est exécuté par Node dans les vérifications) :
 * pas d'alias `@/`, pas de `window`.
 */
import type { EmotionKey } from './emotions.ts';

/**
 * `scene` : la journée a sa teinte, le personnage joue son émotion.
 * `waiting` : pas encore de teinte — il attend, incolore.
 * `sleeping` : incolore, endormi.
 */
export type CharacterState = 'scene' | 'waiting' | 'sleeping';

export type Arm =
  | 'none'
  | 'hang'
  | 'hug'
  | 'hugUp'
  | 'akimbo'
  | 'gift'
  | 'meditate'
  | 'watch'
  | 'tuck'
  | 'rubEyes';

export type Pose = {
  /** Courbure de la bouche, de −1 (triste) à 1 (grand sourire). */
  mouth: number;
  /** Yeux en points, ou paupières closes en arc. */
  eye: 'dot' | 'soft';
  /** Hauteur des yeux en points : plus grands, plus ouverts. */
  eyeHeight: number;
  arm: Arm;
  leg: 'stand' | 'sit' | 'curl';
  /** Classe d'animation du corps (voir `app.css`, section « personnage »). */
  motion: string;
  yawn?: boolean;
};

/**
 * Une pose par émotion. Deux règles tiennent l'ensemble :
 * - **La Joie et la Colère n'ont pas de bras.** L'une rebondit, l'autre se
 *   gonfle : des bras ajouteraient un geste là où tout le corps en fait un.
 * - **La Tristesse ne pleure jamais.** Elle se frotte l'œil, sans larme : une
 *   larme dessinée serait un symbole, et le personnage ne parle que par gestes.
 */
export const POSES: Record<EmotionKey, Pose> = {
  joy: { mouth: 1, eye: 'dot', eyeHeight: 5, arm: 'none', leg: 'stand', motion: 'tc-bounce' },
  serenity: { mouth: 0.5, eye: 'dot', eyeHeight: 1, arm: 'meditate', leg: 'sit', motion: 'tc-float' },
  love: { mouth: 0.5, eye: 'dot', eyeHeight: 1, arm: 'hug', leg: 'sit', motion: 'tc-sway' },
  gratitude: { mouth: 0.6, eye: 'soft', eyeHeight: 3, arm: 'gift', leg: 'stand', motion: 'tc-still' },
  pride: { mouth: 0.5, eye: 'dot', eyeHeight: 5, arm: 'akimbo', leg: 'stand', motion: 'tc-proud' },
  excitement: { mouth: 0.8, eye: 'dot', eyeHeight: 6.5, arm: 'hang', leg: 'stand', motion: 'tc-hop' },
  nostalgia: { mouth: 0.1, eye: 'soft', eyeHeight: 3, arm: 'hugUp', leg: 'sit', motion: 'tc-still' },
  tiredness: { mouth: 0, eye: 'dot', eyeHeight: 1.5, arm: 'tuck', leg: 'curl', motion: 'tc-nod', yawn: true },
  sadness: { mouth: -0.7, eye: 'dot', eyeHeight: 3.5, arm: 'rubEyes', leg: 'curl', motion: 'tc-still' },
  anxiety: { mouth: -0.2, eye: 'dot', eyeHeight: 4, arm: 'watch', leg: 'stand', motion: 'tc-check' },
  anger: { mouth: -0.6, eye: 'dot', eyeHeight: 3, arm: 'none', leg: 'stand', motion: 'tc-huff' },
  neutral: { mouth: 0, eye: 'dot', eyeHeight: 4, arm: 'hang', leg: 'stand', motion: 'tc-walk' },
};

const UNCOLORED_POSES: Record<Exclude<CharacterState, 'scene'>, Pose> = {
  waiting: { mouth: 0.1, eye: 'dot', eyeHeight: 4, arm: 'hang', leg: 'stand', motion: 'tc-idle' },
  sleeping: { mouth: 0, eye: 'dot', eyeHeight: 1, arm: 'tuck', leg: 'curl', motion: 'tc-sleep' },
};

export function poseOf(state: CharacterState, emotion: EmotionKey | null): Pose {
  if (state === 'scene' && emotion) return POSES[emotion];
  return UNCOLORED_POSES[state === 'sleeping' ? 'sleeping' : 'waiting'];
}

/**
 * Le personnage est allongé, pas debout : la Fatigue dort sur son coussin,
 * et l'état `sleeping` aussi. La silhouette change de posture, jamais de forme.
 */
export function isLying(state: CharacterState, emotion: EmotionKey | null): boolean {
  return state === 'sleeping' || (state === 'scene' && emotion === 'tiredness');
}

/** La bouche : un arc dont le creux suit la courbure de la pose. */
export function mouthPath(curve: number): string {
  return `M86,138 Q100,${138 + curve * 16} 114,138`;
}

/**
 * Les accessoires : une liste fermée par catégorie, un accessoire au plus
 * dans chacune. Ils ne changent jamais la silhouette, prennent le trait
 * d'encre et la teinte du jour. Le binôme voit ceux de l'autre : le
 * personnage paraît dans les scènes à deux.
 */
export const HEAD_ACCESSORIES = ['beanie', 'flower', 'ears', 'lock', 'cap', 'bow', 'antennae'] as const;
export const BODY_ACCESSORIES = ['scarf', 'satchel', 'cape', 'bowtie', 'necklace'] as const;
export const FACE_ACCESSORIES = ['glasses', 'freckles', 'blush', 'lashes', 'mole', 'bandage'] as const;
export const MOTIFS = ['stripes', 'dots', 'checks', 'stars'] as const;

export type Outfit = {
  head?: (typeof HEAD_ACCESSORIES)[number] | null;
  body?: (typeof BODY_ACCESSORIES)[number] | null;
  face?: (typeof FACE_ACCESSORIES)[number] | null;
  motif?: (typeof MOTIFS)[number] | null;
};

export type OutfitCategory = keyof Outfit;

/** Les catégories dans l'ordre de l'écran, chacune avec sa liste fermée. */
export const OUTFIT_CATEGORIES = [
  { key: 'head', column: 'character_head', items: HEAD_ACCESSORIES },
  { key: 'body', column: 'character_body', items: BODY_ACCESSORIES },
  { key: 'face', column: 'character_face', items: FACE_ACCESSORIES },
  { key: 'motif', column: 'character_motif', items: MOTIFS },
] as const;

type OutfitColumns = {
  character_head?: string | null;
  character_body?: string | null;
  character_face?: string | null;
  character_motif?: string | null;
};

function pick<T extends string>(items: readonly T[], value: string | null | undefined): T | null {
  return value && (items as readonly string[]).includes(value) ? (value as T) : null;
}

/**
 * La tenue d'un profil. Une clé inconnue — un profil lu avant une mise à
 * jour de l'app, ou une donnée abîmée — donne « rien » plutôt qu'un dessin
 * cassé : la base la refuserait de toute façon à l'écriture.
 */
export function outfitOf(profile: OutfitColumns | null | undefined): Outfit {
  if (!profile) return {};
  return {
    head: pick(HEAD_ACCESSORIES, profile.character_head),
    body: pick(BODY_ACCESSORIES, profile.character_body),
    face: pick(FACE_ACCESSORIES, profile.character_face),
    motif: pick(MOTIFS, profile.character_motif),
  };
}

/**
 * Ce qui peint une pièce : l'encre (le trait), la teinte du jour, le cran
 * léger de l'émotion (ce qu'on tient, ce qu'on porte), le papier, ou une
 * couleur fixe quand l'objet a la sienne (le pansement).
 */
export type Paint = 'none' | 'ink' | 'tint' | 'held' | 'paper' | `#${string}`;

/**
 * Une pièce de dessin, dans le repère du personnage (200 × 220). Le trait est
 * à l'encre et arrondi ; `stroke: false` pour une tache sans contour.
 */
export type Piece = { d: string; fill?: Paint; stroke?: boolean; sw?: number; op?: number; tf?: string };

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Une ellipse en tracé : deux demi-arcs, pour que tout ne soit que des `path`. */
export function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M${r2(cx - rx)},${r2(cy)} A${rx},${ry} 0 1,0 ${r2(cx + rx)},${r2(cy)} A${rx},${ry} 0 1,0 ${r2(cx - rx)},${r2(cy)} Z`;
}

export function circlePath(cx: number, cy: number, r: number): string {
  return ellipsePath(cx, cy, r, r);
}

function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
}

export type AccessoryKey =
  | (typeof HEAD_ACCESSORIES)[number]
  | (typeof BODY_ACCESSORIES)[number]
  | (typeof FACE_ACCESSORIES)[number];

/**
 * Le dessin de chaque accessoire, une seule fois pour tout l'app : le
 * personnage seul (`Character`) et les scènes à deux (`lib/duo`) le lisent
 * ici. Ils ne touchent jamais la silhouette : ils se posent sur le corps.
 */
export const ACCESSORY_PIECES: Record<AccessoryKey, Piece[]> = {
  beanie: [
    { d: 'M58,62 Q100,18 142,62 L138,74 Q100,50 62,74 Z', fill: 'tint', sw: 4 },
    { d: circlePath(100, 18, 7), fill: 'tint', sw: 3.5 },
  ],
  flower: [
    { d: 'M62,66 Q58,50 66,40', sw: 3 },
    ...[[0, -8], [7, -3], [4, 6], [-7, -3], [-4, 6]].map(([x, y]) => ({ d: circlePath(66 + x, 36 + y, 6), fill: 'tint' as const, sw: 2.5 })),
    { d: circlePath(66, 36, 4), fill: 'ink', stroke: false, op: 0.7 },
  ],
  ears: [
    { d: ellipsePath(72, 46, 10, 16), fill: 'tint', sw: 4, tf: 'rotate(-18 72 46)' },
    { d: ellipsePath(128, 46, 10, 16), fill: 'tint', sw: 4, tf: 'rotate(18 128 46)' },
  ],
  lock: [{ d: 'M96,50 Q92,28 106,22 Q98,32 100,50', sw: 4.5 }],
  cap: [
    { d: 'M62,68 Q60,32 100,30 Q140,32 138,68 Q100,58 62,68 Z', fill: 'tint', sw: 4 },
    { d: 'M134,64 Q160,58 176,68 Q156,76 136,72 Z', fill: 'held', sw: 3.5 },
    { d: circlePath(100, 30, 3.5), fill: 'ink', stroke: false },
  ],
  bow: [
    { d: 'M122,52 L104,40 L106,62 Z M122,52 L140,40 L138,62 Z', fill: 'held', sw: 3.2 },
    { d: circlePath(122, 51, 5), fill: 'held', sw: 3 },
  ],
  antennae: [
    { d: 'M84,52 Q76,34 66,26 M116,52 Q124,34 134,26', sw: 3.5 },
    { d: circlePath(65, 24, 6), fill: 'held', sw: 3 },
    { d: circlePath(135, 24, 6), fill: 'held', sw: 3 },
  ],
  // La cape se dessine derrière le corps (voir `BEHIND_BODY`).
  cape: [
    { d: 'M58,92 Q20,140 26,196 Q48,204 70,190 Q46,160 60,100 Z', fill: 'held', sw: 3.5 },
    { d: 'M142,92 Q180,140 174,196 Q152,204 130,190 Q154,160 140,100 Z', fill: 'held', sw: 3.5 },
  ],
  // Sous la bouche, là où serait le cou : un tour d'écharpe et un pan qui pend.
  scarf: [
    { d: 'M46,145 Q100,166 154,145 L150,160 Q100,182 50,160 Z', fill: 'held', sw: 4 },
    { d: 'M118,163 Q126,180 120,200 L134,196 Q138,180 132,159 Z', fill: 'held', sw: 3.5 },
  ],
  bowtie: [
    { d: 'M100,154 L82,145 L82,163 Z M100,154 L118,145 L118,163 Z', fill: 'held', sw: 3.2 },
    { d: circlePath(100, 154, 4.5), fill: 'held', sw: 3 },
  ],
  necklace: [
    { d: 'M56,146 Q100,172 144,146', sw: 2.6 },
    { d: 'M100,159 L107,168 L100,177 L93,168 Z', fill: 'held', sw: 2.8 },
  ],
  // La bandoulière passe sous le menton, jamais sur le visage.
  satchel: [
    { d: 'M40,138 Q76,166 120,168', sw: 4 },
    { d: roundedRect(112, 156, 36, 28, 6), fill: 'held', sw: 4 },
    { d: 'M112,166 L148,166', sw: 2.5, op: 0.6 },
  ],
  glasses: [
    { d: circlePath(80, 112, 13), sw: 3.5 },
    { d: circlePath(120, 112, 13), sw: 3.5 },
    { d: 'M93,112 L107,112', sw: 3.5 },
  ],
  freckles: [[70, 124], [77, 128], [123, 128], [130, 124]].map(([x, y]) => ({
    d: circlePath(x, y, 2),
    fill: 'ink' as const,
    stroke: false,
    op: 0.6,
  })),
  lashes: [{ d: 'M71,104 L67,99 M77,101 L76,95 M83,102 L86,97 M117,102 L114,97 M123,101 L124,95 M129,104 L133,99', sw: 2.6 }],
  mole: [{ d: circlePath(116, 131, 2.6), fill: 'ink', stroke: false }],
  bandage: [
    { d: roundedRect(121, 119, 26, 10, 5), fill: '#F3E3C8', sw: 2.4, tf: 'rotate(-24 134 124)' },
    { d: 'M130,119 H138 V129 H130 Z', fill: 'ink', stroke: false, op: 0.12, tf: 'rotate(-24 134 124)' },
  ],
  blush: [
    { d: ellipsePath(68, 126, 9, 6), fill: 'tint', stroke: false, op: 0.65 },
    { d: ellipsePath(132, 126, 9, 6), fill: 'tint', stroke: false, op: 0.65 },
  ],
};

/** Les accessoires qui passent derrière le corps plutôt que devant. */
export const BEHIND_BODY: readonly AccessoryKey[] = ['cape'];

/**
 * Les pièces d'une tenue, rangées par plan : derrière le corps, sur le corps
 * (après les bras), sur le visage (après les yeux), sur la tête (en dernier).
 */
export function outfitLayers(outfit: Outfit): { behind: Piece[]; body: Piece[]; face: Piece[]; head: Piece[] } {
  const body = outfit.body ? ACCESSORY_PIECES[outfit.body] : [];
  const behind = outfit.body && BEHIND_BODY.includes(outfit.body);
  return {
    behind: behind ? body : [],
    body: behind ? [] : body,
    face: outfit.face ? ACCESSORY_PIECES[outfit.face] : [],
    head: outfit.head ? ACCESSORY_PIECES[outfit.head] : [],
  };
}
