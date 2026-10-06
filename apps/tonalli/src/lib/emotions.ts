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

/**
 * L'intensité d'une émotion : la même couleur, plus pâle ou plus dense.
 *
 * Trois crans et pas davantage. Un curseur continu donnerait une infinité de
 * teintes, et un calendrier de l'année n'y lirait plus rien : deux journées
 * voisines doivent se distinguer d'un coup d'œil, pas à la loupe.
 *
 * `plain` vaut **exactement** la couleur d'origine de l'émotion. C'est ce qui
 * permet d'ajouter les nuances sans toucher aux journées déjà écrites : elles
 * restent valides, et deviennent rétroactivement des « franches ».
 */
export const INTENSITIES = ['light', 'plain', 'deep'] as const;

export type Intensity = (typeof INTENSITIES)[number];

/** Le cran par défaut — celui d'avant les nuances. */
export const DEFAULT_INTENSITY: Intensity = 'plain';

export function isIntensity(value: unknown): value is Intensity {
  return typeof value === 'string' && (INTENSITIES as readonly string[]).includes(value);
}

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

/**
 * Vers quoi et de combien chaque cran s'écarte de la couleur d'origine.
 *
 * On mélange vers les **encres du châssis**, jamais vers du blanc ou du noir
 * purs : une nuance claire tirée vers le blanc jurerait sur le papier crème,
 * et une nuance dense tirée vers le noir ferait un trou dans le calendrier.
 *
 * Les proportions ne sont pas choisies à l'œil. Plus faibles, les nuances
 * denses tombaient dans le creux de contraste — là où une couleur ne tranche
 * ni sur le crème ni sur le brun — et faisaient descendre le plancher de la
 * palette sous les 4.3 garantis. À 0.55, le plancher redevient celui de la
 * tristesse, c'est-à-dire celui d'avant les nuances : ajouter des crans n'a
 * rien coûté à la lisibilité. `npm run checks` échoue si une retouche le fait
 * redescendre.
 */
const MIX = { light: 0.4, deep: 0.55 } as const;

function channels(color: string): [number, number, number] {
  const hex = color.replace('#', '');
  return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number];
}

function mix(from: string, to: string, amount: number): string {
  const a = channels(from);
  const b = channels(to);
  const blended = a.map((value, index) => Math.round(value + (b[index] - value) * amount));
  return `#${blended.map((value) => value.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}

/**
 * Couleur d'une émotion à un cran donné. `null` si la clé est inconnue —
 * même règle que `colorOf`, dont c'est la généralisation : `shadeOf(k, 'plain')`
 * rend exactement `colorOf(k)`.
 */
export function shadeOf(key: string, intensity: Intensity = DEFAULT_INTENSITY): string | null {
  const base = COLOR_BY_KEY.get(key);
  if (!base) return null;
  if (intensity === 'plain') return base;
  return intensity === 'light' ? mix(base, INK_CREAM, MIX.light) : mix(base, INK_BROWN, MIX.deep);
}

/**
 * Retrouve le cran d'une couleur déjà enregistrée. Une entrée ne stocke que
 * son émotion et sa couleur : l'intensité se relit, elle ne se duplique pas en
 * base. `null` si la couleur n'appartient pas à la palette de cette émotion —
 * une donnée d'avant une retouche de palette, par exemple.
 */
export function intensityOf(key: string, color: string): Intensity | null {
  const wanted = color.toUpperCase();
  return INTENSITIES.find((intensity) => shadeOf(key, intensity)?.toUpperCase() === wanted) ?? null;
}

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
 * Contraste minimal réellement atteint sur les 12 couleurs de la palette.
 *
 * C'est la tristesse (`#457B9D`) qui fixe le plancher, et elle reste sous les
 * 4.5:1 du niveau AA. Le compromis est assumé : remonter le crème jusqu'à
 * tenir AA sur cette couleur demanderait `#FFFDFA`, c'est-à-dire du blanc, ce
 * qui ferait tomber la chaleur du châssis ; et retoucher `#457B9D` est exclu,
 * la palette est fermée et vit en base derrière une clé étrangère. On garde
 * donc l'encre chaude, et on documente le plancher plutôt que de le cacher —
 * `npm run checks` échoue si une modification le fait redescendre.
 */
export const MIN_TEXT_CONTRAST = 4.3;

/**
 * Encre lisible par-dessus `color` : on compare le contraste des deux encres
 * opaques du châssis et on garde la meilleure, plutôt qu'un seuil de
 * luminance fixe. Onze des douze couleurs passent AA (4.87:1 à 11.56:1) ;
 * voir `MIN_TEXT_CONTRAST` pour la douzième.
 */
export function readableTextOn(color: string): string {
  const l = luminance(color);
  const onCream = contrastRatio(l, luminance(INK_CREAM));
  const onBrown = contrastRatio(l, luminance(INK_BROWN));
  return onCream > onBrown ? INK_CREAM : INK_BROWN;
}

/** Contraste obtenu par l'encre que `readableTextOn` choisit pour `color`. */
export function textContrastOn(color: string): number {
  return contrastRatio(luminance(color), luminance(readableTextOn(color)));
}

/** Réglage de base du voile, en pourcents, avant dosage par `COLDNESS`. */
const VEIL_STRENGTH = 14;

/**
 * Opacité du voile chaud posé sur une pastille d'émotion (linear-gradient
 * crème → terracotta), dosée par couleur via `COLDNESS`.
 *
 * Le mode sombre allège ce voile — il porte sur un fond déjà brun-noir — mais
 * l'allègement se fait en CSS (`.emotion-dot__veil`), pas ici : le thème est
 * une media query, et rien côté React ne le connaît. On expose donc la valeur
 * de base en variable custom et c'est la feuille de style qui l'atténue.
 */
export function veilOpacity(key: string): number {
  const k = (COLDNESS as Record<string, number>)[key] ?? 0.5;
  return Math.round(VEIL_STRENGTH * k) / 100;
}

