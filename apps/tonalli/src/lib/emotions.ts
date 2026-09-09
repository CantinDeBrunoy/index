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

/**
 * À quel point une couleur jure avec le fond chaud (0 = à l'aise, 1 = jure).
 * Sert à doser le voile chaud posé sur chaque pastille — plus une couleur est
 * froide, plus elle a besoin d'être réchauffée pour tenir sur le papier crème.
 */
const COLDNESS: Record<EmotionKey, number> = {
  joy: 0.35,
  serenity: 1,
  love: 0.5,
  gratitude: 0.3,
  pride: 0.3,
  excitement: 0.45,
  nostalgia: 0.85,
  tiredness: 1,
  sadness: 1,
  anxiety: 0.9,
  anger: 0.4,
  neutral: 1,
};

/** Encres opaques du châssis : crème et brun-encre. Jamais de blanc/noir purs. */
const INK_CREAM = '#FFF7EB';
const INK_BROWN = '#2A2019';

/** Luminance relative (WCAG). */
function luminance(color: string): number {
  const hex = color.replace('#', '');
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/** Rapport de contraste WCAG entre deux luminances. */
function contrastRatio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * Encre lisible par-dessus `color` : on compare le contraste des deux encres
 * opaques du châssis et on garde la meilleure, plutôt qu'un seuil de
 * luminance fixe — c'est ce qui garantit >4.5:1 sur les 12 couleurs, y
 * compris les semi-froides comme la gratitude ou l'excitation.
 */
export function readableTextOn(color: string): string {
  const l = luminance(color);
  const onCream = contrastRatio(l, luminance(INK_CREAM));
  const onBrown = contrastRatio(l, luminance(INK_BROWN));
  return onCream > onBrown ? INK_CREAM : INK_BROWN;
}

/**
 * Opacité du voile chaud posé sur une pastille d'émotion (linear-gradient
 * crème → terracotta). `veilStrength` est le réglage de base (défaut 14 %),
 * dosé par couleur via `COLDNESS`, et réduit de 20 % en mode sombre où le
 * voile porte davantage sur un fond déjà brun-noir.
 */
export function veilOpacity(key: string, options?: { dark?: boolean; veilStrength?: number }): number {
  const strength = options?.veilStrength ?? 14;
  const k = (COLDNESS as Record<string, number>)[key] ?? 0.5;
  const veil = Math.round(strength * k) / 100;
  return options?.dark ? Math.round(veil * 0.8 * 1000) / 1000 : veil;
}

/**
 * Le lavis du jour : un dégradé radial posé en haut de l'écran uniquement,
 * jamais sur les cartes. Les teintes pâles montent en opacité (elles ont
 * besoin de plus de matière pour se sentir), les foncées redescendent ; le
 * mode sombre pousse tout d'un cran, pour que la nuit chaude tienne sa
 * braise.
 */
export function washGradient(color: string, dark = false): string {
  const l = luminance(color);
  const base = dark ? 0.42 : 0.3;
  const span = dark ? 0.16 : 0.2;
  const opacity = Math.min(0.5, base + l * span);
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `radial-gradient(125% 62% at 50% 0%, rgba(${r},${g},${b},${opacity.toFixed(2)}), rgba(${r},${g},${b},0) 72%)`;
}
