/**
 * Les réactions rapides : un appui sur la journée de l'autre, et c'est tout.
 *
 * La palette est fermée, comme celle des émotions, et pour la même raison :
 * un rituel à deux n'a pas besoin d'un clavier d'emoji, il a besoin d'un
 * geste court et sans ambiguïté. Le couple (clé, emoji) vit aussi en base,
 * derrière une clé étrangère — une réaction hors palette ne peut littéralement
 * pas être écrite.
 *
 * Aucun caractère d'après Emoji 11 (2018) : le projet tourne sur des Android
 * d'entrée de gamme, et un emoji trop récent s'y affiche en carré vide. Ce
 * serait une réaction illisible, donc pas une réaction.
 *
 * Ce module ne dépend de rien (ni alias `@/`, ni `window`) : `npm run checks`
 * l'exécute directement sous Node.
 */
export const REACTIONS = [
  { key: 'heart', emoji: '❤️' },
  { key: 'hug', emoji: '🤗' },
  { key: 'laugh', emoji: '😂' },
  { key: 'wow', emoji: '😮' },
  { key: 'tender', emoji: '🥺' },
  { key: 'strength', emoji: '💪' },
] as const;

export type ReactionKey = (typeof REACTIONS)[number]['key'];

const EMOJI_BY_KEY = new Map<string, string>(REACTIONS.map((reaction) => [reaction.key, reaction.emoji]));

export function isReactionKey(value: unknown): value is ReactionKey {
  return typeof value === 'string' && EMOJI_BY_KEY.has(value);
}

/** Emoji d'une réaction. `null` si la clé est inconnue (donnée corrompue). */
export function emojiOf(key: string): string | null {
  return EMOJI_BY_KEY.get(key) ?? null;
}

/** Une bulle du champ qui monte quand on ouvre une réaction reçue. */
export type Bubble = {
  /** Départ horizontal, en pourcentage de la largeur. */
  left: number;
  /** Retard avant l'envol, en secondes. */
  delay: number;
  /** Durée de la montée, en secondes. */
  duration: number;
  /** Taille du caractère, en pixels. */
  size: number;
  /** Dérive horizontale sur toute la montée, en pixels. */
  drift: number;
};

/** Assez pour faire une pluie, pas assez pour faire ramer un vieux téléphone. */
export const BUBBLE_COUNT = 18;

/**
 * Le champ de bulles : des départs, des retards et des vitesses différents,
 * sinon les emoji montent en rang d'oignons et le geste perd tout son charme.
 *
 * `random` est injecté plutôt que pris dans `Math.random` : c'est ce qui rend
 * la génération vérifiable, et `npm run checks` s'assure qu'aucune bulle ne
 * part hors de l'écran ni avec une durée nulle — une bulle immobile resterait
 * plantée en bas, bien visible.
 */
export function bubbles(count: number, random: () => number): Bubble[] {
  const field: Bubble[] = [];
  for (let index = 0; index < count; index += 1) {
    field.push({
      left: Math.round(random() * 100),
      delay: Math.round(random() * 2600) / 1000,
      duration: 2.6 + Math.round(random() * 2200) / 1000,
      size: 22 + Math.round(random() * 26),
      drift: Math.round((random() - 0.5) * 120),
    });
  }
  return field;
}
