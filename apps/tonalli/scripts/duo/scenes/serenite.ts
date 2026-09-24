import { anim, B, body, css, EI, EO, f, LIN, opac, TF } from '../lib.ts';
import { get, pyFixed, pyMod, pyRstrip, radians, range } from '../py.ts';

// ——————————————————————————————————————————————————————————————————————————
// Sérénité + les autres. Les trajets libres (points, cœurs, montre, nuage) sont
// échantillonnés : on calcule la position à chaque instant, le navigateur relie.
function clamp(v, a = 0.0, b = 1.0) {
  return Math.max(a, Math.min(b, v));
}
export function smooth(a, b, t) {
  const u = clamp((t - a) / (b - a));
  return u * u * (3 - 2 * u);
}
export function lerp(p, q, u) {
  return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
}
export function quad(p0, q, p1, u) {
  return [(1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * q[0] + u * u * p1[0], (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * q[1] + u * u * p1[1]];
}
export function seg(t, a, b) {
  return clamp((t - a) / (b - a));
}

export function f1(v) {
  const s_ = pyRstrip(pyRstrip(pyFixed(v, 1), '0'), '.');
  return ['-0', ''].includes(s_) ? '0' : s_;
}

export function path(cls, dur, fn, n = 96, poster = null) {
  let v;
  n = Math.min(n, 90);
  const frames = [];
  for (let i = 0; i < n + 1; i += 1) {
    const t = i / n;
    v = fn(t);
    const [x, y] = [v[0], v[1]];
    const op = v.length > 2 ? v[2] : null;
    const sc = v.length > 3 ? v[3] : 1;
    const decl = (op != null ? `opacity:${f(op)};` : '') + `transform:translate(${f1(x)}px,${f1(y)}px) scale(${f(sc)})`;
    frames.push([100 * t, decl]);
  }
  let stat = null;
  if (poster != null) {
    v = fn(poster);
    stat = (v.length > 2 ? `opacity:${f(v[2])};` : '') + `transform:translate(${f(v[0])}px,${f(v[1])}px) scale(${f(v.length > 3 ? v[3] : 1)})`;
  }
  anim(cls, dur, frames, LIN, stat);
}

function swap(prefix, dur, on_windows, names, _static_first = true, fade = 1.2) {
  // deux variantes qui s'échangent : la seconde visible pendant les fenêtres données
  const [a, b] = names;
  let pts_b = [[0, 0]];
  for (const [s, e] of on_windows) {
    pts_b.push([s - fade, 0], [s, 1], [e, 1], [e + fade, 0]);
  }
  pts_b.push([100, 0]);
  pts_b = pts_b.map(([p, v]) => [Math.max(0, Math.min(100, p)), v]);
  opac(`${prefix}-${a}`, dur, pts_b.map(([p, v]) => [p, 1 - v]));
  opac(`${prefix}-${b}`, dur, pts_b);
}

export const S72 = 0.72;
// L'anneau de Sérénité : une ellipse au-dessus de la tête (unités du personnage),
// parcourue en 9 s. Les objets qui le rejoignent suivent la même ellipse, en unités de scène.
const [HX, HY, HRX, HRY] = [100, 30, 62, 16];
function halo_pt(xs, th) {
  return [xs - 72 + (HX + HRX * Math.cos(th)) * S72, 56 + (HY + HRY * Math.sin(th)) * S72];
}
function halo_op(th) {
  return 0.45 + 0.55 * (Math.sin(th) + 1) / 2;
}
for (let k = 0; k < 3; k += 1) {
  path(`du-halo${k}`, 9, (t) => [HX + HRX * Math.cos(2 * Math.PI * (t + k / 3)), HY + HRY * Math.sin(2 * Math.PI * (t + k / 3)),
    halo_op(2 * Math.PI * (t + k / 3))], 72, 0);
}

// ——— Sérénité + Sérénité : balance, et un 8 qui passe d'une tête à l'autre ———
let L = 6;
body('du-ss-float', L, [B(0), B(50, { ty: -20 }), B(100)]);
anim('du-ss-sh', L, [[0, 'opacity:1;' + TF()], [50, 'opacity:.55;' + TF(0, 0, 0, 0.75)], [100, 'opacity:1;' + TF()]]);
path('du-ss-8', L, (t) => [180 + 100 * Math.sin(2 * Math.PI * t), 52 + 26 * Math.sin(4 * Math.PI * t)]);

// ——— Sérénité + Amour : les cœurs rejoignent l'orbite ———
L = 6;
body('du-sa-B', 2, [B(0), B(6, { sx: 1.05, sy: 0.95 }), B(18), B(60, { r: 1.5 }), B(100)]);
function sa_heart(t) {
  let x, y;
  const entry = halo_pt(110, 0);
  const p0 = [246, 126];
  if (t < 0.22) {
    const u = seg(t, 0, 0.22);
    [x, y] = quad(p0, [200, 44], entry, u);
    return [x, y, smooth(0, 0.04, t), 0.6 + 0.4 * u];
  }
  const th = 2 * Math.PI * (t - 0.22) * L / 9;
  [x, y] = halo_pt(110, th);
  return [x, y, halo_op(th) * (1 - smooth(0.86, 0.93, t))];
}
path('du-sa-h', L, sa_heart, 120);

// ——— Sérénité + Gratitude : l'offrande, les saluts, la lumière posée ———
L = 7;
body('du-sg-A', L, [B(0), B(12, { ty: -6 }), B(28, { ty: -2 }), B(34, { r: 12 }), B(44, { r: 12 }), B(50), B(64, { ty: -6 }), B(80), B(100)]);
body('du-sg-B', L, [B(0), B(8), B(16, { r: -14 }), B(24, { r: -14 }), B(30), B(50), B(55, { r: -12 }), B(62, { r: -12 }), B(68), B(100)]);
const HANDS = [250, 56 + 151 * S72];
const BOW = [250 - 49 * Math.sin(radians(14)) * S72, 56 + (200 - 49 * Math.cos(radians(14))) * S72];
const GROUND = [180, 202 - 8.6];
function sg_gift(t) {
  if (t < 0.08) return [...HANDS, 1];
  if (t < 0.16) return [...lerp(HANDS, BOW, smooth(0.08, 0.16, t)), 1];
  if (t < 0.24) return [...quad(BOW, [206, 158], GROUND, smooth(0.16, 0.24, t)), 1];
  if (t < 0.9) return [...GROUND, 1];
  if (t < 0.95) return [...GROUND, 1 - smooth(0.9, 0.94, t)];
  return [...HANDS, smooth(0.96, 1, t)];
}
path('du-sg-gift', L, sg_gift, 140, 0);
opac('du-sg-armGift', L, [[0, 1], [16.9, 1], [17, 0], [95.9, 0], [96, 1], [100, 1]]);
opac('du-sg-armHang', L, [[0, 0], [16.9, 0], [17, 1], [95.9, 1], [96, 0], [100, 0]]);
const START = halo_pt(110, 0);
const TOP = [180, 176];
function sg_dot(t) {
  if (t < 0.6) return [...START, 0];
  if (t < 0.62) return [...START, smooth(0.6, 0.62, t)];
  if (t < 0.74) return [...quad(START, [178, 92], TOP, smooth(0.62, 0.74, t)), 1];
  return [...TOP, 1 - smooth(0.9, 0.94, t)];
}
path('du-sg-dot', L, sg_dot, 100, 0);
anim('du-sg-glow', L, [[0, TF()], [74, TF()], [78, TF(0, 0, 0, 1.6)], [82, TF()], [86, TF(0, 0, 0, 1.6)], [90, TF()], [100, TF()]]);

// ——— Sérénité + Fierté : plus haut que la couronne ———
L = 7;
body('du-sf-A', L, [B(0), B(8, { ty: -6 }), B(45, { ty: -70 }), B(50, { ty: -66 }), B(55, { ty: -70 }), B(62, { ty: -68 }), B(90), B(100)]);
anim('du-sf-shA', L, [[0, 'opacity:1;' + TF()], [45, 'opacity:.35;' + TF(0, 0, 0, 0.5)], [62, 'opacity:.35;' + TF(0, 0, 0, 0.5)],
  [90, 'opacity:1;' + TF()], [100, 'opacity:1;' + TF()]]);
const sit = { ty: 8, sx: 1.06, sy: 0.88 };
body('du-sf-B', L, [B(0), B(10, { ty: -1, sy: 1.02 }), B(20), B(28, { ty: -8, sx: 0.95, sy: 1.1 }), B(36, { ty: -10, sx: 0.94, sy: 1.12, r: 2 }),
  B(42, { ty: -10, sx: 0.94, sy: 1.12, r: -2 }), B(48, { ty: -10, sx: 0.94, sy: 1.12, r: 1.5 }), B(52, { ty: -10, sx: 0.94, sy: 1.12, e: EI }),
  B(56, { ...sit }), B(86, { ...sit }), B(92), B(100)]);
opac('du-sf-feet', L, [[0, 1], [54.5, 1], [55.5, 0], [87.5, 0], [88.5, 1], [100, 1]]);
anim('du-sf-eOpen', L, [[0, 'opacity:1;' + TF()], [20, 'opacity:1;' + TF()], [26, 'opacity:1;' + TF(-4, -8)], [52, 'opacity:1;' + TF(-3, -9)],
  [54, 'opacity:0;' + TF(-3, -9)], [87, 'opacity:0;' + TF()], [88.5, 'opacity:1;' + TF()], [100, 'opacity:1;' + TF()]]);
opac('du-sf-eShut', L, [[0, 0], [54, 0], [55, 1], [87, 1], [88.5, 0], [100, 0]]);

// ——— Sérénité + Excitation : les sauts s'éteignent, puis ils flottent ensemble ———
L = 5;
const hops = [[4, -34], [12, -28], [20, -21], [28, -14], [36, -8], [44, -3]];
let fr = [B(0, { tx: 4, r: -6 })];
for (const [p, h] of hops) {
  fr.push(B(p, { tx: 4, ty: h, r: -6, sx: 0.95, sy: 1.05, e: EI }), B(p + 4, { tx: 4, r: -6, sx: 1 + h / -300, sy: 1 - h / -300, e: EO }));
}
fr.push(B(54, { tx: 4, ty: -10, r: -4 }), B(64, { tx: 4, ty: -15, r: -2 }), B(74, { tx: 4, ty: -11, r: -3 }), B(84, { tx: 4, ty: -15, r: -2 }),
  B(89, { tx: 4, ty: 2, r: -6, sx: 1.1, sy: 0.88, e: EO }), B(95, { tx: 4, ty: -34, r: -6, sx: 0.95, sy: 1.05, e: EI }), B(100, { tx: 4, r: -6 }));
fr.splice(1, Infinity, ...fr.slice(1).map(([p, k]) => [p, { ...k, e: get(k, 'e') }]));
body('du-se-B', L, fr, 'transform:translate(4px,0px) rotate(-6deg)');
let sh = [B(0), ...hops.flatMap(([p, h]) => [B(p, { sx: 1 + h / 60 }), B(p + 4)].map((x) => x))];
sh.push(B(54, { sx: 0.82 }), B(64, { sx: 0.76 }), B(74, { sx: 0.82 }), B(84, { sx: 0.76 }), B(89, { sx: 1.06 }), B(95, { sx: 0.45 }), B(100));
body('du-se-shB', L, sh);
body('du-se-A', L, [B(0), B(10, { ty: -3, r: 5 }), B(48, { ty: -3, r: 5 }), B(56, { ty: -10 }), B(64, { ty: -15 }), B(74, { ty: -11 }), B(84, { ty: -15 }), B(92), B(100)]);
swap('du-se', L, [[52.5, 88]], ['eOpen', 'eShut']);
swap('du-se', L, [[52.5, 88]], ['mOpen', 'mCalm']);
function se_wave(t) {
  if (t < 0.1 || t > 0.5) return [150, 128, 0];
  const u = pyMod(t - 0.1, 0.12) / 0.12;
  return [150 + 52 * u, 128 - 5 * u, 0.85 * Math.sin(Math.PI * u), 1 + 0.5 * u];
}
path('du-se-wave', L, se_wave, 150);

// ——— Sérénité + Nostalgie : laisser passer la pensée ———
L = 7;
const P0 = [250 - 72 + 36 * S72, 56 + 14 * S72];  // centre de la bulle de Nostalgie (THINK dans le modèle)
const P1 = [112, 44];
const P2 = [46, 32];
function sn_cloud(t) {
  if (t < 0.08) return [...P0, smooth(0, 0.08, t), 0.25 + 0.75 * smooth(0, 0.08, t)];
  if (t < 0.18) return [P0[0], P0[1] - 2 * Math.sin(Math.PI * seg(t, 0.08, 0.18)), 1];
  if (t < 0.5) return [...lerp(P0, P1, smooth(0.18, 0.5, t)), 1];
  if (t < 0.56) return [P1[0], P1[1] - 2 * Math.sin(Math.PI * seg(t, 0.5, 0.56)), 1];
  if (t < 0.74) {
    const u = smooth(0.56, 0.74, t);
    return [...lerp(P1, P2, u), 1 - u, 1 + 0.35 * u];
  }
  return [...P0, 0, 0.25];
}
path('du-sn-cloud', L, sn_cloud, 140, 0.52);
opac('du-sn-bub', L, [[0, 0], [4, 0.9], [18, 0.9], [24, 0], [100, 0]], 'opacity:0');
swap('du-sn', L, [[43, 54]], ['mSmile', 'mBlow']);
swap('du-sn', L, [[60, 92]], ['mWist', 'mSmile2'], undefined, 3);

// ——— Sérénité + Fatigue : la berceuse ———
L = 8;
body('du-sz-A', L, [B(0, { r: -2.5 }), B(25, { r: 2.5 }), B(50, { r: -2.5 }), B(75, { r: 2.5 }), B(100, { r: -2.5 })]);
anim('du-sz-page', L, [[0, 'opacity:0;' + TF()], [39.9, 'opacity:0;' + TF()], [40, 'opacity:1;' + TF()], [46, 'opacity:1;' + TF(0, 0, 0, -1, 1)],
  [46.5, 'opacity:0;' + TF(0, 0, 0, -1, 1)], [47, 'opacity:0;' + TF()], [89.9, 'opacity:0;' + TF()], [90, 'opacity:1;' + TF()],
  [96, 'opacity:1;' + TF(0, 0, 0, -1, 1)], [96.5, 'opacity:0;' + TF(0, 0, 0, -1, 1)], [100, 'opacity:0;' + TF()]], LIN);
swap('du-sz', L, [[76, 88]], ['eRead', 'eLook']);
swap('du-sz', L, range(15).filter((k) => k * 5 + 3.2 < 74).map((k) => [k * 5 + 1.5, k * 5 + 3.2]), ['mRest', 'mSing'], undefined, 0.8);
function sz_note(t) {
  const u = seg(t, 0, 0.32);
  if (t > 0.32) return [150, 138, 0];
  return [150 + 78 * u, 138 - 28 * u + 5 * Math.sin(3 * Math.PI * u), 0.9 * Math.sin(Math.PI * u) ** 0.6, 0.8 + 0.3 * u];
}
path('du-sz-note', L, sz_note, 120);

// ——— Sérénité + Tristesse : l'orbite qui s'élargit ———
L = 8;
const CM = [185, 80];
for (let k = 0; k < 3; k += 1) {
  function st_dot(t) {
    const th = 2 * Math.PI * (k / 3 + t);
    const w = smooth(0.16, 0.34, t) * (1 - smooth(0.8, 0.94, t));
    const a = halo_pt(125, th);
    const e = [CM[0] + 108 * Math.cos(th), CM[1] + 18 * Math.sin(th)];
    const [x, y] = lerp(a, e, w);
    return [x, y, halo_op(th)];
  }
  path(`du-st-o${k}`, L, st_dot, 160, 0.5);
}
function st_ring(t) {
  const w = smooth(0.16, 0.34, t) * (1 - smooth(0.8, 0.94, t));
  const c = lerp(halo_pt(125, Math.PI), halo_pt(125, 0), 0.5);
  const [x, y] = lerp(c, CM, w);
  const [rx, ry] = [HRX * S72 + (108 - HRX * S72) * w, HRY * S72 + (18 - HRY * S72) * w];
  return [x, y, rx, ry, smooth(0.1, 0.3, t) * (1 - smooth(0.84, 0.96, t))];
}
fr = [];
for (let i = 0; i < 97; i += 1) {
  const t = i / 96;
  const [x, y, rx, ry, op] = st_ring(t);
  fr.push([100 * t, `opacity:${f(op)};` + TF(x, y, 0, rx, ry)]);
}
anim('du-st-ring', L, fr, LIN, 'opacity:1;' + TF(...st_ring(0.5).slice(0, 2), 0, ...st_ring(0.5).slice(2, 4)));
css.push('.du-st-ring path{vector-effect:non-scaling-stroke}');
body('du-st-rub', L, [B(0), B(6, { r: -7 }), B(12), B(18, { r: -7 }), B(24), B(30, { r: -7 }), B(36), B(88), B(94, { r: -7 }), B(100)]);
swap('du-st', L, [[40, 86]], ['eOpen', 'eShut']);
swap('du-st', L, [[40, 86]], ['mSad', 'mSoft'], undefined, 2);

// ——— Sérénité + Anxiété : la montre fait un tour d'orbite ———
L = 8;
const W0 = [250 - 72 + 136 * S72, 56 + 96 * S72];
const ENTRY = halo_pt(110, 0);
function sx_watch(t) {
  if (t < 0.24) return [...W0, 0];
  if (t < 0.36) return [...quad(W0, [215, 40], ENTRY, smooth(0.24, 0.36, t)), 1];
  if (t < 0.84) {
    const th = 2 * Math.PI * seg(t, 0.36, 0.84);
    return [...halo_pt(110, th), 0.55 + 0.45 * halo_op(th)];
  }
  if (t < 0.97) return [...quad(ENTRY, [215, 40], W0, smooth(0.84, 0.97, t)), 1];
  return [...W0, 0];
}
path('du-sx-watch', L, sx_watch, 160, 0);
const tw = [B(0), ...range(10).map((i) => B(1.1 + 2.2 * i, { r: i % 2 === 0 ? -3 : 1.5 }))];
body('du-sx-B', L, [...tw, B(23), B(25, { ty: -4 }), B(30), B(37, { ty: 6 }), B(86, { ty: 6 }), B(92), B(96.5, { ty: -3 }), B(100)]);
opac('du-sx-feet', L, [[0, 1], [35, 1], [36.5, 0], [90.5, 0], [92, 1], [100, 1]]);
opac('du-sx-armWatch', L, [[0, 1], [23.9, 1], [24, 0], [96.9, 0], [97, 1], [100, 1]]);
opac('du-sx-armHang', L, [[0, 0], [23.9, 0], [24, 1], [35, 1], [36.5, 0], [88, 0], [89.5, 1], [96.9, 1], [97, 0], [100, 0]]);
opac('du-sx-armMed', L, [[0, 0], [35, 0], [36.5, 1], [88, 1], [89.5, 0], [100, 0]]);
anim('du-sx-eye', L, [[0, 'opacity:1;' + TF(6, -7)], [23, 'opacity:1;' + TF(6, -7)], [27, 'opacity:1;' + TF(-4, -8)], [34, 'opacity:1;' + TF(-7, -6)],
  [36.5, 'opacity:0;' + TF(-7, -6)], [86, 'opacity:0;' + TF(-6, -6)], [88, 'opacity:1;' + TF(-6, -6)], [95, 'opacity:1;' + TF(0, -6)],
  [97, 'opacity:1;' + TF(6, -7)], [100, 'opacity:1;' + TF(6, -7)]]);
opac('du-sx-eShut', L, [[0, 0], [36.5, 0], [37.5, 1], [86, 1], [88, 0], [100, 0]]);
swap('du-sx', L, [[38, 87]], ['mTense', 'mCalm'], undefined, 2);

// ——— Sérénité + Colère : un point sur la veine ———
L = 7;
const V = [250 - 72 + 84 * S72, 56 + 86 * S72];
function sc_dot(t) {
  if (t < 0.12) return [...START, 0];
  if (t < 0.14) return [...START, smooth(0.12, 0.14, t)];
  if (t < 0.32) return [...quad(START, [195, 55], V, smooth(0.14, 0.32, t)), 1];
  if (t < 0.72) return [V[0], V[1] - 1.5 * Math.sin(2 * Math.PI * seg(t, 0.32, 0.72) * 3), 1];
  if (t < 0.86) return [...quad(V, [195, 55], START, smooth(0.72, 0.86, t)), 1];
  return [...START, 1 - smooth(0.86, 0.9, t)];
}
path('du-sc-dot', L, sc_dot, 140, 0);
anim('du-sc-vein', L, [[0, 'opacity:1;' + TF()], [5, 'opacity:1;' + TF(0, 0, 0, 1.5)], [10, 'opacity:1;' + TF(0, 0, 0, 1.1)],
  [15, 'opacity:1;' + TF(0, 0, 0, 1.5)], [20, 'opacity:1;' + TF(0, 0, 0, 1.1)], [25, 'opacity:1;' + TF(0, 0, 0, 1.5)],
  [30, 'opacity:1;' + TF(0, 0, 0, 1.2)], [32, 'opacity:1;' + TF(0, 0, 0, 1.3)], [44, 'opacity:0;' + TF(0, 0, 0, 0.2)],
  [80, 'opacity:0;' + TF(0, 0, 0, 0.2)], [86, 'opacity:1;' + TF()], [92, 'opacity:1;' + TF(0, 0, 0, 1.4)], [100, 'opacity:1;' + TF()]]);
body('du-sc-B', L, [B(0), B(8, { sx: 1.05, sy: 0.96 }), B(13), B(18, { sx: 1.05, sy: 0.96 }), B(23), B(28, { sx: 1.05, sy: 0.96 }), B(33), B(46, { ty: 1, sx: 0.98, sy: 0.99 }),
  B(76, { ty: 1, sx: 0.98, sy: 0.99 }), B(84), B(90, { sx: 1.05, sy: 0.96 }), B(96), B(100)]);
swap('du-sc', L, [[44, 79]], ['eOpen', 'eShut']);
swap('du-sc', L, [[42, 80]], ['mFrown', 'mCalm'], undefined, 2);
