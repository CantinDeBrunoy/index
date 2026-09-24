/**
 * Le logo : « le soleil de Tonalli ». Le personnage au centre, paupières
 * closes, et douze rayons autour — un par émotion, dans l'ordre de la palette,
 * Joie à midi puis dans le sens des aiguilles d'une montre.
 *
 * Une seule géométrie pour tout ce qui porte le logo : le composant `Logo`,
 * le favicon et les icônes PNG (générés par `scripts/make-icons.ts`). Un rayon
 * déplacé ici se déplace partout, et `npm run checks` refuse un favicon qui ne
 * correspondrait plus à ce fichier.
 *
 * Module sans dépendance (il est exécuté par Node dans les vérifications) :
 * pas d'alias `@/`, pas de `window`.
 */
import { EMOTIONS } from './emotions.ts';

/** Le logo se dessine dans un carré de 100 × 100. */
export const LOGO_SIZE = 100;

/**
 * Le corps du personnage, dans son repère d'origine (200 × 220) — le même
 * tracé que les illustrations. Il n'est jamais redessiné pour le logo :
 * seulement mis à l'échelle.
 */
export const BODY_PATH =
  'M100,48 C138,46 170,76 166,116 C171,160 136,190 98,188 C60,190 30,156 34,114 C29,76 62,50 100,48 Z';

/** Les paupières closes : le visage de la Sérénité, sans la teinte. */
export const EYES_PATH = 'M73,112 Q80,119 87,112 M113,112 Q120,119 127,112';

/** Le centre visuel du corps, dans le repère d'origine. */
const BODY_CENTER = { x: 100, y: 118 };

/**
 * `full` : la version complète, avec le visage.
 * `small` : la version réduite, sans visage, au trait et aux rayons épaissis.
 * À 16 px, deux paupières ne font plus qu'une tache ; un rond cerclé dans un
 * anneau de couleurs se reconnaît encore.
 */
export type LogoVariant = 'full' | 'small';

/** En dessous de cette taille (en pixels), on passe à la version réduite. */
export const SMALL_BELOW = 48;

export interface LogoRay {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export interface LogoGeometry {
  rays: LogoRay[];
  /** Épaisseur des rayons, bouts arrondis, en unités du logo. */
  rayWidth: number;
  /** Mise à l'échelle du corps : repère d'origine → repère du logo. */
  body: { scale: number; tx: number; ty: number; strokeWidth: number };
  /** Épaisseur du trait des paupières, ou `null` quand le visage est retiré. */
  eyesWidth: number | null;
}

const round = (value: number) => Math.round(value * 100) / 100;

export function logoGeometry(variant: LogoVariant = 'full'): LogoGeometry {
  const small = variant === 'small';
  const inner = small ? 31 : 32;
  const outer = small ? 45 : 43;
  const center = LOGO_SIZE / 2;
  const rays = EMOTIONS.map(({ color }, index) => {
    // On part du haut (−π/2) et on tourne dans le sens des aiguilles d'une montre.
    const angle = (index / EMOTIONS.length) * Math.PI * 2 - Math.PI / 2;
    return {
      x1: round(center + Math.cos(angle) * inner),
      y1: round(center + Math.sin(angle) * inner),
      x2: round(center + Math.cos(angle) * outer),
      y2: round(center + Math.sin(angle) * outer),
      color,
    };
  });
  const scale = 0.3;
  return {
    rays,
    rayWidth: small ? 9 : 7,
    body: {
      scale,
      tx: round(center - BODY_CENTER.x * scale),
      ty: round(center - BODY_CENTER.y * scale),
      strokeWidth: small ? 6.5 : 4.8,
    },
    eyesWidth: small ? null : 3.9,
  };
}

export interface LogoSvgOptions {
  variant?: LogoVariant;
  /** Trait du personnage. */
  ink: string;
  /** Intérieur du personnage : le papier, puisqu'il reste incolore sur l'icône. */
  paper: string;
  /** Fond du carré, arrondi comme une icône ; absent : fond transparent. */
  tile?: string;
  /** Taille du logo dans le carré (1 = bord à bord) : les rayons ne doivent pas toucher le bord. */
  scale?: number;
}

/** Le logo en SVG autonome — c'est ainsi qu'est écrit `public/favicon.svg`. */
export function logoSvg({ variant = 'full', ink, paper, tile, scale: fit = 1 }: LogoSvgOptions): string {
  const g = logoGeometry(variant);
  const { scale, tx, ty, strokeWidth } = g.body;
  const offset = round((LOGO_SIZE / 2) * (1 - fit));
  const lines: string[] = [];
  lines.push(`<g stroke-linecap="round" stroke-width="${g.rayWidth}">`);
  for (const ray of g.rays) {
    lines.push(`  <path d="M${ray.x1},${ray.y1} L${ray.x2},${ray.y2}" stroke="${ray.color}"/>`);
  }
  lines.push('</g>');
  // Les épaisseurs sont données en unités du logo : on les ramène dans le repère du corps.
  lines.push(`<g transform="translate(${tx},${ty}) scale(${scale})" stroke="${ink}" stroke-linecap="round" stroke-linejoin="round">`);
  lines.push(`  <path d="${BODY_PATH}" fill="${paper}" stroke-width="${round(strokeWidth / scale)}"/>`);
  if (g.eyesWidth !== null) {
    lines.push(`  <path d="${EYES_PATH}" fill="none" stroke-width="${round(g.eyesWidth / scale)}"/>`);
  }
  lines.push('</g>');
  const mark = fit === 1 ? lines : [`<g transform="translate(${offset},${offset}) scale(${fit})">`, ...lines.map((l) => `  ${l}`), '</g>'];
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_SIZE} ${LOGO_SIZE}">`,
    ...(tile ? [`<rect width="${LOGO_SIZE}" height="${LOGO_SIZE}" rx="22" fill="${tile}"/>`] : []),
    ...mark,
  ].map((l, i) => (i === 0 ? l : `  ${l}`)).concat('</svg>', '').join('\n');
}

/** Les couleurs du châssis sur lesquelles le logo est posé en icône. */
export const ICON_INK = '#2A2019';
export const ICON_PAPER = '#FAF7F0';

/**
 * Place du logo dans une icône carrée. Les icônes « any » gardent une marge
 * pour que les rayons respirent ; l'icône « maskable » doit tenir dans le
 * cercle de sécurité (40 % du côté en rayon), que l'OS peut découper.
 */
export const ICON_FIT = 0.86;
export const MASKABLE_FIT = 0.74;
export const FAVICON_FIT = 0.9;

/** Le favicon : version réduite, sur son carré de papier (lisible sur un onglet sombre comme clair). */
export function faviconSvg(): string {
  return logoSvg({ variant: 'small', ink: ICON_INK, paper: ICON_PAPER, tile: ICON_PAPER, scale: FAVICON_FIT });
}
