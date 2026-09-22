/**
 * Le symbole de la série — celui qui s'affiche à côté du nombre de jours
 * d'affilée. Il se choisit dans les réglages : c'est la seule décoration de
 * l'app, et elle n'appartient qu'à la personne qui la voit.
 *
 * Palette fermée, comme les émotions et les réactions, et pour les mêmes
 * raisons : six choix suffisent à s'approprier la chose, et un clavier
 * d'emoji ouvrirait la porte à un caractère illisible sur la moitié des
 * appareils. Aucun symbole d'après Emoji 11 (2018), le projet tourne sur des
 * Android d'entrée de gamme.
 *
 * La base ne stocke que la **clé**, pas le caractère : si le glyphe de la
 * flamme changeait un jour, aucun profil n'aurait à être réécrit. Une simple
 * contrainte `check` suffit ici, là où les réactions ont une clé étrangère —
 * ce symbole est cosmétique et personnel, rien d'autre ne le référence.
 *
 * Ce module ne dépend de rien (ni alias `@/`, ni `window`) : `npm run checks`
 * l'exécute directement sous Node.
 */
export const STREAK_SYMBOLS = [
  { key: 'flame', symbol: '🔥' },
  { key: 'cherry', symbol: '🍒' },
  { key: 'heart', symbol: '❤️' },
  { key: 'star', symbol: '⭐' },
  { key: 'leaf', symbol: '🌿' },
  { key: 'sun', symbol: '☀️' },
] as const;

export type StreakSymbolKey = (typeof STREAK_SYMBOLS)[number]['key'];

/** Ce que voit quelqu'un qui n'a jamais rien choisi. */
export const DEFAULT_STREAK_SYMBOL: StreakSymbolKey = 'flame';

const SYMBOL_BY_KEY = new Map<string, string>(STREAK_SYMBOLS.map((item) => [item.key, item.symbol]));

export function isStreakSymbolKey(value: unknown): value is StreakSymbolKey {
  return typeof value === 'string' && SYMBOL_BY_KEY.has(value);
}

/**
 * Caractère d'une clé. Une clé inconnue rend la flamme plutôt que rien : un
 * badge doit toujours s'afficher, et une donnée abîmée ne doit pas laisser un
 * trou à la place du compteur.
 */
export function symbolOf(key: string | null | undefined): string {
  return SYMBOL_BY_KEY.get(key ?? '') ?? SYMBOL_BY_KEY.get(DEFAULT_STREAK_SYMBOL)!;
}
