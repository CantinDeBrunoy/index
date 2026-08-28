/**
 * Les 12 émotions de Tonalli. L'association émotion → couleur est fixe : on
 * choisit une émotion, la couleur suit. Les libellés FR/ES sont dans les
 * fichiers de traduction ; ici on ne garde que ce qui doit rester identique
 * dans les deux langues et en base.
 */
export const EMOTIONS = [
  { key: 'joy', color: '#FFD93D' },
  { key: 'serenity', color: '#A8DADC' },
  { key: 'love', color: '#FF6B9D' },
  { key: 'gratitude', color: '#F4A261' },
  { key: 'pride', color: '#E76F51' },
  { key: 'excitement', color: '#FF4D4D' },
  { key: 'nostalgia', color: '#B08BBB' },
  { key: 'tiredness', color: '#8D99AE' },
  { key: 'sadness', color: '#457B9D' },
  { key: 'anxiety', color: '#6A4C93' },
  { key: 'anger', color: '#9B2226' },
  { key: 'neutral', color: '#D8D8D8' },
] as const;

export type EmotionKey = (typeof EMOTIONS)[number]['key'];

const COLOR_BY_KEY = new Map<string, string>(EMOTIONS.map((e) => [e.key, e.color]));

export function isEmotionKey(value: unknown): value is EmotionKey {
  return typeof value === 'string' && COLOR_BY_KEY.has(value);
}

/** Couleur d'une émotion. `null` si la clé est inconnue (donnée corrompue). */
export function colorOf(key: string): string | null {
  return COLOR_BY_KEY.get(key) ?? null;
}

/** Luminance relative (WCAG), pour poser un texte lisible sur une couleur. */
export function isLightColor(color: string): boolean {
  const hex = color.replace('#', '');
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return luminance > 0.45;
}

/** Couleur de texte lisible par-dessus `color`. */
export function readableTextOn(color: string): string {
  return isLightColor(color) ? '#1A1A1C' : '#FFFFFF';
}
