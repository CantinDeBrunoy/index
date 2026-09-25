/**
 * Le bruit de `feTurbulence`, calculé une fois en JavaScript.
 *
 * L'encre en WebGL (`InkCanvasGl`) a besoin du même champ de turbulence que
 * le filtre SVG, mais un filtre SVG le recalcule sur chaque pixel de l'écran à
 * chaque image — c'est ce qui faisait ramer la validation. Ici on le calcule
 * une seule fois, sur une grille lâche (le bruit est très basse fréquence),
 * et le processeur graphique l'interpole.
 *
 * C'est l'algorithme de référence de la spécification SVG 1.1 (« fractalNoise »,
 * sans raccord de tuiles), transcrit tel quel : même générateur, mêmes
 * gradients, mêmes octaves. Le motif n'est pas identique au pixel près à celui
 * d'un navigateur donné, mais c'est la même matière.
 *
 * Aucun import, pas de `window` : ce module reste lisible par `npm run checks`.
 */

const B_SIZE = 0x100;
const BM = 0xff;
const PERLIN_N = 0x1000;
const RAND_M = 2147483647;
const RAND_A = 16807;
const RAND_Q = 127773;
const RAND_R = 2836;

function setupSeed(seed: number): number {
  let s = Math.round(seed);
  if (s <= 0) s = -(s % (RAND_M - 1)) + 1;
  if (s > RAND_M - 1) s = RAND_M - 1;
  return s;
}

function nextRandom(seed: number): number {
  let result = RAND_A * (seed % RAND_Q) - RAND_R * Math.floor(seed / RAND_Q);
  if (result <= 0) result += RAND_M;
  return result;
}

type Lattice = { selector: Int32Array; gradient: Float64Array[] };

function lattice(seed: number): Lattice {
  const selector = new Int32Array(B_SIZE + B_SIZE + 2);
  // Quatre canaux, comme la spécification : on n'en lit que deux, mais le
  // tirage des deux autres fait partie de la suite pseudo-aléatoire.
  const gradient = Array.from({ length: 4 }, () => new Float64Array((B_SIZE + B_SIZE + 2) * 2));
  let s = setupSeed(seed);
  for (let k = 0; k < 4; k++) {
    for (let i = 0; i < B_SIZE; i++) {
      selector[i] = i;
      for (let j = 0; j < 2; j++) {
        s = nextRandom(s);
        gradient[k][i * 2 + j] = ((s % (B_SIZE + B_SIZE)) - B_SIZE) / B_SIZE;
      }
      // Un gradient nul (tirage des deux composantes au milieu) reste nul
      // plutôt que de devenir NaN.
      const length = Math.hypot(gradient[k][i * 2], gradient[k][i * 2 + 1]) || 1;
      gradient[k][i * 2] /= length;
      gradient[k][i * 2 + 1] /= length;
    }
  }
  for (let i = B_SIZE - 1; i > 0; i--) {
    const kept = selector[i];
    s = nextRandom(s);
    const j = s % B_SIZE;
    selector[i] = selector[j];
    selector[j] = kept;
  }
  for (let i = 0; i < B_SIZE + 2; i++) {
    selector[B_SIZE + i] = selector[i];
    for (let k = 0; k < 4; k++) {
      gradient[k][(B_SIZE + i) * 2] = gradient[k][i * 2];
      gradient[k][(B_SIZE + i) * 2 + 1] = gradient[k][i * 2 + 1];
    }
  }
  return { selector, gradient };
}

const sCurve = (t: number) => t * t * (3 - 2 * t);
const lerp = (t: number, a: number, b: number) => a + t * (b - a);

function noise2({ selector, gradient }: Lattice, channel: number, x: number, y: number): number {
  const g = gradient[channel];
  let t = x + PERLIN_N;
  const bx0 = Math.trunc(t) & BM;
  const bx1 = (bx0 + 1) & BM;
  const rx0 = t - Math.trunc(t);
  const rx1 = rx0 - 1;
  t = y + PERLIN_N;
  const by0 = Math.trunc(t) & BM;
  const by1 = (by0 + 1) & BM;
  const ry0 = t - Math.trunc(t);
  const ry1 = ry0 - 1;
  const i = selector[bx0];
  const j = selector[bx1];
  const b00 = selector[i + by0];
  const b10 = selector[j + by0];
  const b01 = selector[i + by1];
  const b11 = selector[j + by1];
  const sx = sCurve(rx0);
  const sy = sCurve(ry0);
  const a = lerp(sx, rx0 * g[b00 * 2] + ry0 * g[b00 * 2 + 1], rx1 * g[b10 * 2] + ry0 * g[b10 * 2 + 1]);
  const b = lerp(sx, rx0 * g[b01 * 2] + ry1 * g[b01 * 2 + 1], rx1 * g[b11 * 2] + ry1 * g[b11 * 2 + 1]);
  return lerp(sy, a, b);
}

export type TurbulenceGrid = {
  /** Coin haut-gauche de la grille, dans les unités de l'écran. */
  x: number;
  y: number;
  /** Écart entre deux échantillons, dans les mêmes unités. */
  step: number;
  columns: number;
  rows: number;
};

/**
 * Le champ de `fractalNoise` sur une grille, prêt pour une texture RGBA :
 * rouge et vert sont les deux canaux que lit `feDisplacementMap`, bleu est
 * vide, alpha plein. La rangée 0 est celle du haut de l'écran.
 */
export function turbulenceField(
  seed: number,
  baseFrequency: readonly [number, number],
  octaves: number,
  grid: TurbulenceGrid,
): Uint8Array {
  const table = lattice(seed);
  const pixels = new Uint8Array(grid.columns * grid.rows * 4);
  for (let row = 0; row < grid.rows; row++) {
    const py = grid.y + (row + 0.5) * grid.step;
    for (let column = 0; column < grid.columns; column++) {
      const px = grid.x + (column + 0.5) * grid.step;
      const at = (row * grid.columns + column) * 4;
      for (let channel = 0; channel < 2; channel++) {
        let sum = 0;
        let fx = baseFrequency[0];
        let fy = baseFrequency[1];
        let ratio = 1;
        for (let octave = 0; octave < octaves; octave++) {
          sum += noise2(table, channel, px * fx, py * fy) / ratio;
          fx *= 2;
          fy *= 2;
          ratio *= 2;
        }
        pixels[at + channel] = Math.round(Math.min(1, Math.max(0, (sum + 1) / 2)) * 255);
      }
      pixels[at + 3] = 255;
    }
  }
  return pixels;
}
