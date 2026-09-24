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
