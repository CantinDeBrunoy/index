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
