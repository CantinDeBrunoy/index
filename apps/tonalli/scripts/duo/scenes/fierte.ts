import { anim, B, body, EI, EO, eyes, f, IO, opac, TF } from '../lib.ts';
import { get, radians, range, sorted } from '../py.ts';
import { path, quad, S72, seg } from './serenite.ts';
import { hid, pair, vis } from './amour.ts';
import { body_pt, carry } from './gratitude.ts';

// ——————————————————————————————————————————————————————————————————————————
// Fierté + les autres.
export function eyeanim(cls, dur, frames, stat = null) {
  // yeux qui regardent quelque part et peuvent s'effacer : (pct, opacité, x, y)
  anim(cls, dur, frames.map(([p, o, x, y]) => [p, `opacity:${f(o)};` + TF(x, y)]), IO, stat);
}

function spin(cls, dur, pts) {
  anim(cls, dur, pts.map(([p, a]) => [p, `transform:rotate(${f(a)}deg)`]), IO);
}

function hops(x0, x1, p0, p1, n, h, base = null, _k = {}) {
  // n petits bonds de x0 à x1 entre p0 et p1 (unités du personnage)
  base = base || {};
  const fr = [];
  for (let i = 0; i < n; i += 1) {
    const a = p0 + (p1 - p0) * i / n;
    const m = p0 + (p1 - p0) * (i + 0.5) / n;
    const xa = x0 + (x1 - x0) * i / n;
    const xm = x0 + (x1 - x0) * (i + 0.5) / n;
    fr.push(B(a, { tx: xa, e: EO, ...base }));
    fr.push(B(m, { tx: xm, e: EI, ...base, ty: get(base, 'ty', 0) - h }));
  }
  fr.push(B(p1, { tx: x1, ...base, sx: 1.04 * get(base, 'sx', 1), sy: 0.96 * get(base, 'sy', 1) }));
  return fr;
}

function flight(pts) {
  // trajet d'un objet : liste de (t0, t1, p0, q, p1) ; visible pendant les vols seulement,
  // ou aussi pendant les tenues quand on donne (t0, t1, p, None, None, 'hold')
  function fn(t) {
    for (const seg_ of pts) {
      let t0, t1;
      if (seg_[3] === 'hold') {
        let p;
        [t0, t1, p] = [seg_[0], seg_[1], seg_[2]];
        if (t0 <= t && t <= t1) return [...p, 1];
        continue;
      }
      let p0, q, p1;
      [t0, t1, p0, q, p1] = seg_;
      if (t0 <= t && t <= t1) return [...quad(p0, q, p1, seg(t, t0, t1)), 1];
    }
    // hors vol : caché, posé sur le point le plus proche
    return [...pts[0][2], 0];
  }
  return fn;
}

// ——— Fierté + Fierté : le concours de torse, puis l'échange des couronnes ———
let L = 9;
function ff_body(sg, puffs) {
  let fr = [B(0), B(4)];
  for (const [p0, pk, p1, sx, sy, ty] of puffs) {
    fr.push(B(p0), B(pk, { sx, sy, ty, r: -2 * sg }), B(pk + 3, { sx, sy, ty, r: -2 * sg }), B(p1));
  }
  fr.push(B(46), B(48, { sx: 1.04, sy: 0.96 }), B(50), B(52, { ty: -3 }), B(54), B(56, { ty: -3 }), B(58), B(61, { r: 14 * sg }), B(63, { r: 14 * sg }), B(65),
    B(66.5, { sx: 1.04, sy: 0.95, e: EO }), B(67.5, { ty: -6, sx: 0.97, sy: 1.04, e: EI }), B(69), B(76.5, { e: EO }), B(78, { sx: 1.04, sy: 0.96 }), B(80),
    B(88, { sx: 1.03, sy: 1.03, ty: -1 }), B(96), B(100));
  return sorted([...new Map(fr.map(([p, k]) => [p, [p, k]])).values()], (x) => x[0]);
}
body('du-ff-A', L, ff_body(1, [[6, 9, 14, 1.07, 1.06, -2], [26, 29, 35, 1.13, 1.12, -9]]));
body('du-ff-B', L, ff_body(-1, [[16, 19, 25, 1.1, 1.09, -4], [36, 39, 45, 1.16, 1.15, -13]]));
for (const [side, dx] of [['A', 4], ['B', -4]]) {
  eyeanim(`du-ff-eye${side}`, L, [[0, 1, dx, -1], [47, 1, dx, -1], [48, 0, dx, -1], [65, 0, dx, -1], [66, 1, dx, -1], [100, 1, dx, -1]]);
  vis(`du-ff-eSoft${side}`, L, [[48, 65]], 1);
  pair('du-ff', L, [[48, 57]], `mSmile${side}`, `mLaugh${side}`, 1);
  hid(`du-ff-crown${side}`, L, [[67.5, 77]], 0.1);
}
const HA = body_pt(110, 100, 42, undefined, -6, undefined, 0.97, 1.04);
const HB = body_pt(250, 100, 42, undefined, -6, undefined, 0.97, 1.04);
const [HA1, HB1] = [body_pt(110, 100, 42), body_pt(250, 100, 42)];
path('du-ff-cAB', L, carry(HA, [180, -6], HB1, 0.675, 0.77, true, true), 90);
path('du-ff-cBA', L, carry(HB, [180, 44], HA1, 0.675, 0.77, true, true), 90);
spin('du-ff-rAB', L, [[0, 0], [67.5, 0], [77, 360], [100, 360]]);
spin('du-ff-rBA', L, [[0, 0], [67.5, 0], [77, -360], [100, -360]]);

// ——— Fierté + Excitation : la photo de champions ———
L = 7;
const UP = 24;  // Excitation au sol, devant le rocher (unités du personnage)
let exc = [B(0, { tx: 4, ty: UP, r: -6 }), B(8, { tx: 4, ty: UP, r: -6, sx: 1.08, sy: 0.9, e: EO }), B(11, { tx: 4, ty: -16, r: -6, sx: 0.95, sy: 1.05, e: EI }),
  B(14, { tx: 4, r: -6, sx: 1.08, sy: 0.92 }), B(17, { tx: 4, r: -6 })];
for (const [i, p] of [19, 20.5, 22, 23.5, 25, 26.5, 28].entries()) {
  exc.push(B(p, { tx: 4 + (i % 2 === 0 ? 1.8 : -1.8), r: -6, sx: 1.03, sy: 0.97 }));
}
const jumps = [[30, 14, -30], [35, -8, -26], [40, 20, -34], [45, 0, -28], [50, 16, -30], [55, 4, 0]];
let prev = 4;
for (const [p, tx, ty] of jumps) {
  exc.push(B(p - 2.5, { tx: (prev + tx) / 2 + 4, ty, r: -6, sx: 0.95, sy: 1.05, e: EI }));
  exc.push(B(p, { tx: tx + 4, r: -6, sx: 1.07, sy: 0.93, e: EO }));
  prev = tx;
}
exc = exc.filter((x) => x[0] >= 0).map((x) => x);
for (const p of [60, 66, 72, 78]) {
  exc.push(B(p - 3, { tx: 4, ty: -30, r: -6, sx: 0.95, sy: 1.05, e: EI }), B(p, { tx: 4, r: -6, sx: 1.07, sy: 0.93, e: EO }));
}
exc.push(B(84, { tx: 4, r: -6 }), B(90, { tx: 4, r: -6, sx: 1.06, sy: 0.94, e: EO }), B(93, { tx: 4, ty: -14, r: -6, e: EI }), B(96, { tx: 4, ty: UP, r: -6, sx: 1.06, sy: 0.94 }),
  B(100, { tx: 4, ty: UP, r: -6 }));
body('du-fe-B', L, sorted([...new Map(exc.map(([p, k]) => [p, [p, k]])).values()], (x) => x[0]), 'transform:translate(4px,0px) rotate(-6deg)');
let shB = [B(0), B(8), B(11, { ty: -9, sx: 0.8 }), B(14, { ty: -18 }), B(28, { ty: -18 })];
for (const [p, tx] of jumps) {
  shB.push(B(p - 2.5, { ty: -18, tx: tx * S72, sx: 0.75 }), B(p, { ty: -18, tx: tx * S72 }));
}
for (const p of [60, 66, 72, 78]) {
  shB.push(B(p - 3, { ty: -18, sx: 0.75 }), B(p, { ty: -18 }));
}
shB.push(B(90, { ty: -18 }), B(93, { ty: -9, sx: 0.8 }), B(96), B(100));
body('du-fe-shB', L, sorted([...new Map(shB.map(([p, k]) => [p, [p, k]])).values()], (x) => x[0]));
let fa = [B(0), B(4, { r: 8 }), B(8, { r: 8 }), B(12), B(18), B(21, { ty: -2, sx: 1.06, sy: 1.05 }), B(56, { ty: -2, sx: 1.06, sy: 1.05 }), B(58)];
for (const p of [60, 66, 72, 78]) {
  fa.push(B(p - 3, { ty: -22, sx: 0.96, sy: 1.04, e: EI }), B(p, { sx: 1.06, sy: 0.94, e: EO }));
}
fa.push(B(84), B(100));
body('du-fe-A', L, fa);
eyes('du-fe-eA', L, [[0, 5, 3], [12, 5, 3], [18, 0, 0], [40, 0, 0], [43, 5, -1], [48, 5, -1], [51, 0, 0], [58, 0, 0], [60, 3, -3], [84, 3, -3], [90, 5, 3], [100, 5, 3]]);
pair('du-fe', L, [[25.5, 28.5]], 'eOpen', 'eShut', 0.6);
pair('du-fe', L, [[30, 56]], 'mGrin', 'mWow', 1);
opac('du-fe-flash', L, [[0, 0], [25.5, 0], [26, 0.7], [29, 0], [100, 0]], 'opacity:0');

// ——— Fierté + Nostalgie : la vieille photo ———
L = 8;
body('du-fn-A', L, [B(0), B(10), B(18, { tx: 4, r: 8 }), B(26, { tx: 4, r: 8 }), B(30, { tx: 4, r: 8, ty: -3, sx: 0.97, sy: 1.04 }), B(34, { tx: 4, r: 6 }),
  B(38, { sx: 0.98, sy: 0.97, r: 2 }), B(42, { sx: 0.98, sy: 0.97, r: -2 }), B(46, { sx: 0.98, sy: 0.97, r: 2 }), B(50, { sx: 0.98, sy: 0.97, r: -2 }), B(56, { sx: 0.98, sy: 0.97 }),
  B(62, { ty: -3, sx: 1.08, sy: 1.07 }), B(80, { ty: -3, sx: 1.08, sy: 1.07 }), B(88), B(100)]);
eyeanim('du-fn-eLook', L, [[0, 1, 0, 0], [10, 1, 0, 0], [18, 1, 6, -3], [25.5, 1, 6, -3], [26.5, 0, 6, -3], [83, 0, 0, 0], [84.5, 1, 0, 0], [100, 1, 0, 0]]);
eyeanim('du-fn-eWow', L, [[0, 0, 5, -3], [25.5, 0, 5, -3], [26.5, 1, 5, -3], [34.5, 1, 5, -3], [35.5, 0, 5, -3], [100, 0, 5, -3]]);
vis('du-fn-eShy', L, [[35.5, 83.5]], 1);
pair('du-fn', L, [[26.5, 35]], 'mSmile', 'mO', 1);
vis('du-fn-blush', L, [[34, 60]], 3, 0.85);
body('du-fn-B', L, [B(0, { r: -1.5 }), B(25, { r: 1.5 }), B(50, { r: -1.5 }), B(75, { r: 1.5 }), B(100, { r: -1.5 })]);
pair('du-fn', L, [[40, 94]], 'mW', 'mS', 2);

// ——— Fierté + Fatigue : le roi de la sieste ———
L = 9;
body('du-fz-A', L, [B(0), B(8), B(15, { tx: 14, r: 24 }), B(19, { tx: 14, r: 24 }), B(27), B(32, { sy: 1.03 }), B(44, { sy: 1.035, ty: -0.5 }), B(56, { sy: 1.03 }),
  B(60, { ty: -3, sx: 0.96, sy: 1.08 }), B(66, { ty: -3, sx: 0.96, sy: 1.08 }), B(70, { ty: 2, r: 8 }), B(74, { ty: 2.5, r: 10 }), B(77, { ty: 2, r: 8, e: EO }),
  B(79.5, { ty: -10, sx: 0.95, sy: 1.07, e: EI }), B(82, { sx: 1.05, sy: 0.95 }), B(84), B(88, { tx: 14, r: 24 }), B(92, { tx: 14, r: 24 }), B(97), B(100)]);
body('du-fz-sh', L, [B(0), B(8), B(15, { tx: 10 }), B(19, { tx: 10 }), B(27), B(84), B(88, { tx: 10 }), B(92, { tx: 10 }), B(97), B(100)]);
eyeanim('du-fz-eOpen', L, [[0, 1, 5, 3], [27, 1, 5, 3], [31, 1, 1, 0], [57.5, 1, 1, 0], [58.5, 0, 1, 0], [78.5, 0, 0, -2], [79.5, 1, 0, -2],
  [84, 1, 5, 3], [100, 1, 5, 3]]);
vis('du-fz-eShut', L, [[58.5, 67.5]], 0.8);
vis('du-fz-eHalf', L, [[68.5, 78.5]], 0.8);
pair('du-fz', L, [[58.5, 67]], 'mSmile', 'mYawn', 1);
hid('du-fz-crownA', L, [[15, 94]], 0.1);
const CZ0 = body_pt(150, 100, 42, 14, undefined, 24);
const CZ1 = [262 - 72 + 90 * S72, 56 + 114 * S72];
path('du-fz-crown', L, flight([[0.15, 0.27, CZ0, [225, 60], CZ1], [0.27, 0.86, CZ1, 'hold'], [0.86, 0.94, CZ1, [225, 60], CZ0]]), 120);
spin('du-fz-crot', L, [[0, 24], [15, 24], [27, -12], [86, -12], [94, 24], [100, 24]]);
pair('du-fz', L, [[28, 90]], 'm1', 'm2', 3);

// ——— Fierté + Tristesse : sa place sur le rocher ———
L = 10;
fa = [B(0), B(6), B(8, { r: 6 }), B(10, { e: EO }), ...hops(0, -146, 10, 16, 2, 16).slice(1), B(18, { tx: -146 }), B(20, { tx: -146, r: 10 }), B(22, { tx: -146 }),
  B(39, { tx: -146, e: EO }), B(40, { tx: -146, ty: -6, sx: 0.97, sy: 1.04, e: EI }), B(42, { tx: -146 }), B(50, { tx: -146 }), B(54, { tx: -146, ty: -2, sx: 1.06, sy: 1.05 }),
  B(84, { tx: -146, ty: -2, sx: 1.06, sy: 1.05 }), B(86, { tx: -146 }), B(89, { tx: -146, e: EO }), B(90, { tx: -146, sx: 1.04, sy: 0.96 }), B(92, { tx: -146 })];
fa.push(...[...hops(-146, 0, 92, 98, 2, 16).slice(1), B(100)]);
body('du-ft-A', L, sorted([...new Map(fa.map(([p, k]) => [p, [p, k]])).values()], (x) => x[0]));
body('du-ft-shA', L, [B(0), B(10), B(13, { tx: -73 * S72, sx: 0.8 }), B(16, { tx: -146 * S72 }), B(92, { tx: -146 * S72 }), B(95, { tx: -73 * S72, sx: 0.8 }), B(98), B(100)]);
const curl = { ty: 8, sy: 0.88 };
let fb = [B(0, { ...curl }), B(22, { e: EO, ...curl }), ...hops(0, -140, 22, 34, 4, 6, curl).slice(1)];
fb.push(B(35, { tx: -140, e: EO, ...curl }), B(36.5, { tx: -147, ty: -4, sy: 0.9, e: EI }), B(38, { tx: -153, ty: 8, sx: 1.04, sy: 0.86 }), B(40, { tx: -153, ...curl }),
  B(50, { tx: -153, ...curl }), B(51.5, { tx: -153, ty: 9, sx: 1.03, sy: 0.85 }), B(53, { tx: -153, ...curl }), B(58, { tx: -153, ty: 2, sy: 0.97 }),
  B(70, { tx: -153, ty: 1.5, sy: 0.98 }), B(84, { tx: -153, ty: 2, sy: 0.97 }), B(87, { tx: -153, ...curl }), B(88, { tx: -153, e: EO, ...curl }),
  B(89.5, { tx: -146, ty: -4, sy: 0.9, e: EI }), B(91, { tx: -140, sx: 1.04, sy: 0.86, ty: 8 }));
fb.push(...[...hops(-140, 0, 91, 97, 2, 6, curl).slice(1), B(100, { ...curl })]);
body('du-ft-B', L, sorted([...new Map(fb.map(([p, k]) => [p, [p, k]])).values()], (x) => x[0]), 'transform:translate(0px,8px) scale(1,.88)');
body('du-ft-shB', L, [B(0), B(22), B(34, { tx: -140 * S72 }), B(38, { tx: -153 * S72 }), B(88, { tx: -153 * S72 }), B(91, { tx: -140 * S72 }), B(97), B(100)]);
body('du-ft-rub', L, [B(0), B(6, { r: -7 }), B(12), B(18, { r: -7 }), B(24), B(30, { r: -7 }), B(36), B(42, { r: -7 }), B(48), B(52), B(57, { r: -60 }), B(84, { r: -60 }),
  B(88), B(94, { r: -7 }), B(100)]);
eyes('du-ft-eA', L, [[0, 0, 0], [6, 5, 0], [38, 5, 0], [42, 5, -4], [50, 5, -5], [84, 5, -5], [88, 3, -3], [92, 0, 0], [100, 0, 0]]);
pair('du-ft', L, [[55, 85]], 'eSad', 'eSoft', 1.2);
pair('du-ft', L, [[56, 85]], 'mSad', 'mSoft', 1.5);
anim('du-ft-crownT', L, [[0, 'opacity:0;' + TF()], [49.9, 'opacity:0;' + TF(0, 0, -8)], [50, 'opacity:1;' + TF(0, 0, -8)], [53, 'opacity:1;' + TF(0, 0, 3)],
  [56, 'opacity:1;' + TF()], [83.9, 'opacity:1;' + TF()], [84, 'opacity:0;' + TF()], [100, 'opacity:0;' + TF()]]);
hid('du-ft-crownA', L, [[40, 90]], 0.1);
const TA40 = body_pt(180, 100, 42, -146, -6, undefined, 0.97, 1.04);
const TT50 = body_pt(290, 100, 42 + 14 * (1 - Math.cos(radians(8))), -153, 8, undefined, undefined, 0.88, 100, 190);
const TT84 = body_pt(290, 100, 42, -153, 2, undefined, undefined, 0.97, 100, 190);
const TA90 = body_pt(180, 100, 42, -146);
path('du-ft-crown', L, flight([[0.4, 0.5, TA40, [130, 30], TT50], [0.84, 0.9, TT84, [130, 40], TA90]]), 120);
spin('du-ft-crot', L, [[0, 0], [40, 0], [50, -368], [84, -360], [90, 0], [100, 0]]);

// ——— Fierté + Anxiété : la pose du héros ———
L = 8;
const tw = [B(0), ...range(13).map((i) => B(1.1 + 2.2 * i, { r: i % 2 === 0 ? -3 : 1.5 })), B(30)];
fb = [...tw, B(36), B(40), B(44, { ty: -3, sx: 1.05, sy: 1.06 }), B(62, { ty: -3.5, sx: 1.05, sy: 1.07 }), B(80, { ty: -3, sx: 1.05, sy: 1.06 }), B(84),
  B(88, { ty: 3, r: -10 }), B(91, { ty: 3, r: -10 }), B(93)];
fb.push(...[...range(4).map((i) => B(93 + 1.4 * (i + 1), { r: i % 2 === 0 ? -3 : 1.5 })), B(100)]);
body('du-fx-B', L, sorted([...new Map(fb.map(([p, k]) => [p, [p, k]])).values()], (x) => x[0]));
body('du-fx-A', L, [B(0), B(16), B(18, { ty: -3, r: -4, sx: 1.08, sy: 1.06 }), B(21, { ty: -3, sx: 1.08, sy: 1.06 }), B(26, { ty: -3, sx: 1.08, sy: 1.06 }), B(30),
  B(44), B(48, { ty: -2, sx: 1.06, sy: 1.05 }), B(80, { ty: -2, sx: 1.06, sy: 1.05 }), B(84), B(100)]);
eyes('du-fx-eA', L, [[0, 5, 0], [16, 5, 0], [18, 0, -1], [26, 0, -1], [30, 5, 0], [100, 5, 0]]);
hid('du-fx-watchOn', L, [[36, 92]], 0.1);
hid('du-fx-armW', L, [[38, 90]], 0.1);
vis('du-fx-akimbo', L, [[38, 90]], 0.1);
const WR = body_pt(250, 136, 96, undefined, undefined, undefined, undefined, undefined, 100, 195);
const WG = [206, 198];
function fx_watch(t) {
  let u;
  if (t < 0.36 || t > 0.92) return [...WR, 0];
  if (t < 0.41) {
    u = seg(t, 0.36, 0.41);
    const x = WR[0] + (WG[0] - WR[0]) * u;
    return [x, WR[1] + (WG[1] - WR[1]) * u * u, 1];
  }
  if (t < 0.44) {
    u = seg(t, 0.41, 0.44);
    return [WG[0] - 3 * u, WG[1] - 7 * Math.sin(Math.PI * u), 1];
  }
  if (t < 0.87) return [WG[0] - 3, WG[1], 1];
  return [...quad([WG[0] - 3, WG[1]], [238, 120], WR, seg(t, 0.87, 0.92)), 1];
}
path('du-fx-watch', L, fx_watch, 120);
spin('du-fx-wspin', L, [[0, 0], [36, 0], [44, 230], [87, 230], [92, 360], [100, 360]]);
eyeanim('du-fx-eye', L, [[0, 1, 6, -7], [26, 1, 6, -7], [28, 1, -5, 0], [35, 1, -5, 0], [38, 1, -3, 6], [41, 1, -4, 5], [43, 1, -5, 0],
  [44, 0, -5, 0], [80, 0, -3, 6], [81, 1, -3, 6], [87, 1, -3, 6], [91, 1, 6, -7], [100, 1, 6, -7]]);
vis('du-fx-eShut', L, [[44, 80]], 1);
pair('du-fx', L, [[44, 81]], 'mTense', 'mProud', 1.5);

// ——— Fierté + Colère : garder la couronne en équilibre ———
L = 8;
body('du-fc-A', L, [B(0), B(10), B(13, { sx: 1.04, sy: 0.96, e: EO }), B(14.5, { ty: -6, sx: 0.97, sy: 1.04, e: EI }), B(17), B(40), B(44, { r: -5, ty: -2, sx: 1.05, sy: 1.04 }),
  B(48, { ty: -2, sx: 1.05, sy: 1.04 }), B(70, { ty: -2, sx: 1.05, sy: 1.04 }), B(74), B(85, { e: EO }), B(86.5, { sx: 1.04, sy: 0.95 }), B(88), B(100)]);
eyes('du-fc-eA', L, [[0, 5, 0], [12, 5, 0], [16, 4, -5], [24, 5, 0], [44, 0, -1], [70, 0, -1], [74, 5, 0], [78, 4, -5], [86, 3, -3], [90, 5, 0], [100, 5, 0]]);
hid('du-fc-crownA', L, [[14.5, 86]], 0.1);
body('du-fc-B', L, [B(0), B(6, { sx: 1.05, sy: 0.96 }), B(10), B(13, { sx: 1.05, sy: 0.96 }), B(17), B(23.5, { e: EO }), B(25, { ty: -6, sx: 0.96, sy: 1.05, e: EI }), B(27),
  B(30, { r: 2, sy: 1.03 }), B(33, { r: -2, sy: 1.03 }), B(36, { sy: 1.03 }), B(56, { sy: 1.035, ty: -0.5 }), B(70, { sy: 1.03 }), B(72, { r: 3, sy: 1.03 }),
  B(74, { r: -4, sy: 1.03 }), B(76, { r: 6, sy: 1.03 }), B(79, { r: -3 }), B(82), B(86, { sx: 1.05, sy: 0.96 }), B(90), B(94, { sx: 1.05, sy: 0.96 }), B(100)]);
anim('du-fc-crownC', L, [[0, 'opacity:0;' + TF()], [23.9, 'opacity:0;' + TF(0, 0, -10)], [24, 'opacity:1;' + TF(0, 0, -10)], [27, 'opacity:1;' + TF(0, 0, 6)],
  [30, 'opacity:1;' + TF(0, 0, -3)], [34, 'opacity:1;' + TF()], [70, 'opacity:1;' + TF()], [72, 'opacity:1;' + TF(0, 0, 5)],
  [74, 'opacity:1;' + TF(0, 0, -6)], [75.9, 'opacity:1;' + TF(0, 0, 14)], [76, 'opacity:0;' + TF(0, 0, 14)], [100, 'opacity:0;' + TF()]]);
const FA14 = body_pt(110, 100, 42, undefined, -6, undefined, 0.97, 1.04);
const FC24 = body_pt(250, 100, 42 - 14 * (1 - Math.cos(radians(10))));
const [cx_, cy_] = [100 + 14 * Math.sin(radians(14)), 56 - 14 * Math.cos(radians(14))];
const FC76 = body_pt(250, cx_, cy_, undefined, undefined, 6, undefined, 1.03);
const FA86 = body_pt(110, 100, 42);
path('du-fc-crown', L, flight([[0.145, 0.24, FA14, [180, 20], FC24], [0.76, 0.86, FC76, [215, 30], FA86]]), 120);
spin('du-fc-crot', L, [[0, 0], [14.5, 0], [24, -370], [76, 20], [86, 360], [100, 360]]);
eyeanim('du-fc-eAngry', L, [[0, 1, -4, 0], [23.5, 1, -4, 0], [24.5, 0, -4, 0], [79.5, 0, -4, 0], [80.5, 1, -4, 0], [100, 1, -4, 0]]);
eyeanim('du-fc-eWow', L, [[0, 0, 0, 0], [23.5, 0, 0, 0], [24.5, 1, 0, 0], [29, 1, 0, 0], [31, 1, 0, -6], [39.5, 1, 0, -6], [40.5, 0, 0, -6],
  [75.5, 0, 2, -4], [76.5, 1, 2, -4], [79.5, 1, 2, -4], [80.5, 0, 2, -4], [100, 0, 0, 0]]);
vis('du-fc-eCalm', L, [[40.5, 75.5]], 1);
hid('du-fc-mFrown', L, [[29, 83]], 1);
vis('du-fc-mCalm', L, [[29, 76]], 1);
vis('du-fc-mOops', L, [[76.5, 82]], 0.8);
anim('du-fc-vein', L, [[0, 'opacity:.9;' + TF()], [5, 'opacity:1;' + TF(0, 0, 0, 1.3)], [10, 'opacity:.9;' + TF()], [15, 'opacity:1;' + TF(0, 0, 0, 1.3)],
  [20, 'opacity:.9;' + TF()], [25, 'opacity:1;' + TF(0, 0, 0, 1.6)], [28, 'opacity:1;' + TF(0, 0, 0, 1.2)],
  [34, 'opacity:.6;' + TF(0, 0, 0, 0.8)], [39, 'opacity:0;' + TF(0, 0, 0, 0.3)], [80, 'opacity:0;' + TF(0, 0, 0, 0.3)],
  [83, 'opacity:1;' + TF(0, 0, 0, 1.5)], [87, 'opacity:.9;' + TF()], [92, 'opacity:1;' + TF(0, 0, 0, 1.3)], [100, 'opacity:.9;' + TF()]]);
