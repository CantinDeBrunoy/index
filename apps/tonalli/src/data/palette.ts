/**
 * Palette figée : 18 teintes, jamais réordonnées ni renumérotées, pour que la
 * même couleur veuille dire la même chose d'une année sur l'autre.
 */
export type Swatch = { color: string; name: string };

export const PALETTE: Swatch[] = [
  { color: '#E2564B', name: 'Coquelicot' },
  { color: '#F09A82', name: 'Pêche' },
  { color: '#EE9B3F', name: 'Abricot' },
  { color: '#E9C46A', name: 'Miel' },
  { color: '#B7C46A', name: 'Tilleul' },
  { color: '#7FA88B', name: 'Sauge' },
  { color: '#3E7A5E', name: 'Sapin' },
  { color: '#4FB3A9', name: 'Lagon' },
  { color: '#77B6DF', name: 'Ciel' },
  { color: '#3E7CB1', name: 'Azur' },
  { color: '#33456B', name: 'Nuit' },
  { color: '#7A6BAE', name: 'Iris' },
  { color: '#B08BC4', name: 'Lilas' },
  { color: '#D77FA1', name: 'Bruyère' },
  { color: '#A97155', name: 'Terre' },
  { color: '#C9C6BF', name: 'Brume' },
  { color: '#7C8388', name: 'Ardoise' },
  { color: '#3C3C42', name: 'Charbon' },
];

const NAMES_BY_COLOR = new Map(PALETTE.map((s) => [s.color.toUpperCase(), s.name]));

/** Nom lisible d'une couleur ; retombe sur l'hexadécimal pour une couleur importée. */
export function colorName(color: string): string {
  return NAMES_BY_COLOR.get(color.toUpperCase()) ?? color.toUpperCase();
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidColor(color: unknown): color is string {
  return typeof color === 'string' && HEX_RE.test(color);
}

/**
 * Luminance relative (WCAG), utilisée pour poser du texte lisible sur une
 * pastille de couleur.
 */
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
