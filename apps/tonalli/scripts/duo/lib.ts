/**
 * Le petit langage des scènes à deux : images clés, poses du corps, ballon.
 *
 * Chaque livre de scènes (`scenes/*.ts`) appelle ces fonctions, qui empilent
 * des règles CSS dans `css` ; `build.ts` les répartit ensuite en une feuille
 * par scène. Les nombres sont écrits comme le faisait le générateur d'origine,
 * en Python (voir `py.ts` pour les quelques différences de calcul à imiter),
 * pour que chaque feuille sorte identique à l'octet près.
 */
import { pyFixed, pyRstrip } from './py.ts';

export const css: string[] = [];
export const report: string[] = [];

/** Montée : décélère vers le sommet. */
export const EO = 'cubic-bezier(.33,.67,.67,1)';
/** Descente : accélère vers l'impact. */
export const EI = 'cubic-bezier(.33,0,.67,.33)';
export const LIN = 'linear';
export const IO = 'ease-in-out';
export const SINE = 'cubic-bezier(.37,0,.63,1)';

/** Un nombre au centième, sans zéros inutiles : `1.50` → `1.5`, `-0` → `0`. */
export function f(v: number): string {
  const s = pyRstrip(pyRstrip(pyFixed(v, 2), '0'), '.');
  return s === '-0' || s === '' ? '0' : s;
}

/** Toujours la même liste de fonctions : l'interpolation reste composante par composante. */
export function TF(tx = 0, ty = 0, r = 0, sx = 1, sy: number | null = null): string {
  if (sy === null || sy === undefined) sy = sx;
  return `transform:translate(${f(tx)}px,${f(ty)}px) rotate(${f(r)}deg) scale(${f(sx)},${f(sy)})`;
}

export function rule(cls: string, name: string, dur: number, ease = 'ease-in-out', stat: string | null = null): void {
  const extra = stat ? stat + ';' : '';
  css.push(`.${cls}{${extra}animation:${name} ${dur}s ${ease} infinite}`);
}

/** Une image clé : pourcentage, déclarations, et éventuellement sa courbe. */
export type Frame = [number, string] | [number, string, string | null | undefined];

export function keyframes(name: string, frames: Frame[]): void {
  const sorted = [...frames].sort((a, b) => a[0] - b[0]);
  const body = sorted.map((fr) => {
    const ease = fr.length > 2 ? fr[2] : null;
    const e = ease ? `;animation-timing-function:${ease}` : '';
    return `${f(fr[0])}%{${fr[1]}${e}}`;
  });
  css.push(`@keyframes ${name}{` + body.join('') + '}');
}

/** Le nom des images clés se tire de la classe : `du-jj-hopA` → `kDuJjHopa`. */
function capitalize(p: string): string {
  return p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p;
}

export function anim(cls: string, dur: number, frames: Frame[], ease = 'ease-in-out', stat: string | null = null): void {
  const name = 'k' + cls.split('-').map(capitalize).join('');
  rule(cls, name, dur, ease, stat);
  keyframes(name, frames);
}

/** Une pose du corps à un instant : décalage, rotation, échelle, courbe. */
export type Pose = { ty?: number; r?: number; sx?: number; sy?: number | null; tx?: number; e?: string | null };
export type BodyFrame = [number, Pose];

export function B(pct: number, k: Pose = {}): BodyFrame {
  return [pct, k];
}

/** Le corps : images clés (pourcentage, ty, rotation, sx, sy, tx, courbe). */
export function body(cls: string, dur: number, frames: BodyFrame[], stat: string | null = null, ease = IO): void {
  const out: Frame[] = frames.map((fr) => {
    const d = { ty: 0, r: 0, sx: 1, sy: null as number | null, tx: 0, e: null as string | null, ...(fr.length > 1 ? fr[1] : {}) };
    return [fr[0], TF(d.tx, d.ty, d.r, d.sx, d.sy ?? null), d.e];
  });
  anim(cls, dur, out, ease, stat);
}

export function opac(cls: string, dur: number, pts: [number, number][], stat: string | null = null): void {
  anim(cls, dur, pts.map(([p, v]) => [p, `opacity:${f(v)}`] as Frame), LIN, stat);
}

export function eyes(cls: string, dur: number, pts: [number, number, number][], ease = IO): void {
  anim(cls, dur, pts.map(([p, x, y]) => [p, TF(x, y)] as Frame), ease);
}

/**
 * Le ballon : X linéaire pendant un vol, Y en paraboles à gravité constante,
 * pour qu'il retombe pile sur une tête ou dans des bras au bon instant.
 */
export class Ball {
  x: [number, number, string][] = [];
  y: [number, number, string][] = [];
  dur: number;
  g: number;
  constructor(dur: number, g: number) {
    this.dur = dur;
    this.g = g;
  }

  hold(pct: number, x: number, y: number, ease = IO): void {
    this.x.push([pct, x, ease]);
    this.y.push([pct, y, ease]);
  }

  /** Vol de p0 à p1 : on résout la hauteur du sommet pour que la durée colle à la gravité. */
  fly(p0: number, x0: number, y0: number, p1: number, x1: number, y1: number, name = ''): number {
    const t = ((p1 - p0) / 100) * this.dur;
    const k = t * Math.sqrt(this.g / 2);
    const d = y1 - y0;
    const u = (k * k - d) / (2 * k);
    const h0 = u * u;
    const ya = y0 - h0;
    const h1 = y1 - ya;
    const ta = Math.sqrt(h0) / (Math.sqrt(h0) + Math.sqrt(h1));
    const pa = p0 + ta * (p1 - p0);
    this.x.push([p0, x0, LIN]);
    this.y.push([p0, y0, EO]);
    this.y.push([pa, ya, EI]);
    report.push(`  vol ${name}: ${f(p0)}%→${f(p1)}%  sommet y=${f(ya)} à ${f(pa)}%  (durée ${pyFixed(t, 2)}s)`);
    return ya;
  }

  land(pct: number, x: number, y: number, ease = IO): void {
    this.x.push([pct, x, ease]);
    this.y.push([pct, y, ease]);
  }

  emit(cx: string, cy: string, base: [number, number]): void {
    const [bx, by] = base;
    const xs: Frame[] = this.x.map(([p, x, e]) => [p, `transform:translate(${f(x - bx)}px,0px)`, e]);
    const ys: Frame[] = this.y.map(([p, y, e]) => [p, `transform:translate(0px,${f(y - by)}px)`, e]);
    anim(cx, this.dur, xs, LIN);
    anim(cy, this.dur, ys, IO);
  }
}
