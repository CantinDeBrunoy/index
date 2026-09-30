import { anim, B, body, EI, EO, eyes, f, IO, TF } from '../lib.ts';
import { get, range, sorted } from '../py.ts';
import { S72 } from './serenite.ts';
import { hid, pair, vis } from './amour.ts';
import { eyeanim } from './fierte.ts';

// ——————————————————————————————————————————————————————————————————————————
// Excitation + les autres. À gauche, Excitation se penche vers la droite (vers l'autre).
let p;
const LA = { tx: -4, r: 6 };
const LB = { tx: 4, r: -6 };
function X(p, lean, k = {}) {
  const d = { ...lean };
  for (const [kk, v] of Object.entries(k)) {
    d[kk] = ['tx', 'r'].includes(kk) ? get(d, kk, 0) + v : v;
  }
  return B(p, { ...d });
}

function jump(lean, p0, p1, h, tx0 = 0, tx1 = null, crouch = true) {
  // un saut de p0 à p1 : accroupi, sommet, réception écrasée
  tx1 = tx1 == null ? tx0 : tx1;
  const pm = p0 + (p1 - p0) * 0.45;
  const fr = [];
  if (crouch) fr.push(X(p0, lean, { tx: tx0, sx: 1.08, sy: 0.92, e: EO }));
  fr.push(X(pm, lean, { tx: (tx0 + tx1) / 2, ty: -h, sx: 0.95, sy: 1.05, e: EI }));
  fr.push(X(p1, lean, { tx: tx1, sx: 1.08, sy: 0.92, e: EO }));
  return fr;
}

export function clean(fr) {
  return sorted([...new Map(fr.map(([p, k]) => [p, [p, k]])).values()], (x) => x[0]);
}

function shadow_of(fr, scale_h = 90, keep_tx = true) {
  // l'ombre suit le corps : décalage horizontal (en unités de scène), rétrécit avec la hauteur
  const out = [];
  for (const [p, k] of fr) {
    const ty = get(k, 'ty', 0);
    const tx = get(k, 'tx', 0);
    const sx = Math.max(0.3, 1 - Math.max(0, -ty) / scale_h * 0.5);
    out.push(B(p, { tx: keep_tx ? tx * S72 : 0, sx }));
  }
  return clean(out);
}

// ——— Excitation + Excitation : le concours de sauts ———
let L = 7;
let fa = [X(0, LA), ...jump(LA, 2, 10, 30), X(12, LA), X(18, LA), ...jump(LA, 19, 31, 90), X(33, LA), X(44, LA),
  X(45.5, LA, { sx: 1.12, sy: 0.88, e: EO }), X(51, LA, { ty: -330, sx: 0.92, sy: 1.08 }), X(64, LA, { ty: -330, e: EI }), X(71, LA, { sx: 1.2, sy: 0.78 }),
  X(72.5, LA, { sx: 1.16, sy: 0.8 }), X(79, LA, { sx: 1.16, sy: 0.8 }), X(81, LA, { sx: 0.96, sy: 1.06 }), X(84, LA), X(100, LA)];
let fb = [X(0, LB), X(10, LB), ...jump(LB, 11, 20, 55), X(22, LB), X(32, LB), ...jump(LB, 33, 44, 150),
  X(45.5, LB, { sx: 1.12, sy: 0.88, e: EO }), X(51, LB, { ty: -330, sx: 0.92, sy: 1.08 }), X(64, LB, { tx: -194, ty: -330, e: EI }),
  X(71.5, LB, { tx: -194, ty: -120, sx: 1.1, sy: 0.88 }), X(72.5, LB, { tx: -194, ty: -123, sx: 1.06, sy: 0.9 }), X(74.5, LB, { tx: -194, ty: -123, r: -7, sx: 1.06, sy: 0.9 }),
  X(77, LB, { tx: -194, ty: -123, r: 5, sx: 1.06, sy: 0.9 }), X(79, LB, { tx: -194, ty: -123, sx: 1.08, sy: 0.88, e: EO }), X(82.5, LB, { tx: -97, ty: -190, e: EI }),
  X(86, LB, { sx: 1.08, sy: 0.92 }), X(88, LB), X(100, LB)];
body('du-ee-A', L, clean(fa), 'transform:translate(-4px,0px) rotate(6deg)');
body('du-ee-B', L, clean(fb), 'transform:translate(4px,0px) rotate(-6deg)');
body('du-ee-shA', L, shadow_of(fa, 90, false));
body('du-ee-shB', L, shadow_of(fb, 90, true));
eyeanim('du-ee-eyeA', L, [[0, 1, 3, -1], [70.5, 1, 3, -1], [71.5, 0, 3, -1], [84, 0, 3, -1], [85, 1, 3, -1], [100, 1, 3, -1]]);
eyeanim('du-ee-eyeB', L, [[0, 1, -3, -1], [71, 1, -3, -1], [72, 0, -3, -1], [86, 0, -3, -1], [87, 1, -3, -1], [100, 1, -3, -1]]);
vis('du-ee-eShutA', L, [[71.5, 84]], 1);
vis('du-ee-eShutB', L, [[72, 86]], 1);
for (const side of 'AB') {
  pair('du-ee', L, [[73, 92]], `mGrin${side}`, `mLaugh${side}`, 1);
}

// ——— Excitation + Nostalgie : la photo trop haute ———
L = 8;
fa = [X(0, LA), X(5, LA), ...jump(LA, 6, 12, 30, 0, 16), ...jump(LA, 14, 20, 45, 16, 26), ...jump(LA, 22, 29, 60, 26, 30), ...jump(LA, 31, 38, 70, 30, 30)];
fa.push(X(40, LA, { tx: 30 }), X(46, LA, { tx: 30 }), X(50, LA, { tx: 24, r: 2 }), X(56, LA, { tx: 24, r: 2, sy: 1.01 }), X(70, LA, { tx: 24, r: 3 }), X(88, LA, { tx: 24, r: 2 }),
  X(92, LA, { tx: 20 }), X(94.5, LA, { tx: 10, ty: -16, e: EI }), X(97, LA, { sx: 1.05, sy: 0.95 }), X(100, LA));
body('du-xn-A', L, clean(fa), 'transform:translate(-4px,0px) rotate(6deg)');
body('du-xn-shA', L, shadow_of(fa));
eyes('du-xn-eA', L, [[0, 5, -5], [6, 5, -5], [9, 4, -7], [30, 4, -7], [38, 5, -5], [46, 6, -3], [52, 6, -3], [90, 6, -3], [94, 5, -5], [100, 5, -5]]);
pair('du-xn', L, [[52, 90]], 'mGrin', 'mCalm', 2);
body('du-xn-B', L, [B(0), B(12), B(18, { ty: -10, r: 8, sx: 0.97, sy: 1.08 }), B(40, { ty: -10, r: 8, sx: 0.97, sy: 1.08 }), B(46), B(52, { r: -3 }), B(88, { r: -3 }), B(94), B(100)]);
pair('du-xn', L, [[46, 92]], 'R', 'L', 0.1);
pair('du-xn', L, [[50, 92]], 'mW', 'mS', 2);

// ——— Excitation + Fatigue : le réveil en fanfare ———
L = 10;
fa = [X(0, LA), X(1.5, LA), ...jump(LA, 2, 6, 30, 0, 20), ...jump(LA, 8, 12, 40, 20, 50), ...jump(LA, 14, 18, 30, 50, 30),
  ...jump(LA, 20, 24, 45, 30, 50)];
fa.push(X(26, LA, { tx: 50, sx: 1.12, sy: 0.88, e: EO }), X(29, LA, { tx: 56, ty: -75, sx: 0.94, sy: 1.07, e: EI }), X(32, LA, { tx: 60, sx: 1.2, sy: 0.8, e: EO }),
  X(34.5, LA, { tx: 60 }), X(39, LA, { tx: 60 }), X(41, LA, { tx: 60, ty: -22, e: EI }), X(43, LA, { tx: 60, sx: 1.06, sy: 0.94 }), X(45, LA, { tx: 60 }));
fa.push(...[...jump(LA, 46, 50, 16, 60, 60), ...jump(LA, 52, 56, 30, 60, 60), ...jump(LA, 58, 62, 30, 60, 60), ...jump(LA, 64, 68, 30, 60, 60)]);
fa.push(X(70, LA, { tx: 60 }), X(84, LA, { tx: 60, r: -3 }), X(88, LA, { tx: 60, r: -3, sy: 0.96 }), X(91, LA, { tx: 60 }), X(95, LA, { tx: 30, ty: -18, e: EI }),
  X(98, LA, { sx: 1.05, sy: 0.95 }), X(100, LA));
body('du-xz-A', L, clean(fa), 'transform:translate(-4px,0px) rotate(6deg)');
body('du-xz-shA', L, shadow_of(fa));
eyes('du-xz-eA', L, [[0, 5, 2], [26, 5, 2], [29, 5, -3], [32, 6, 3], [40, 5, -2], [70, 5, -2], [80, 6, 1], [92, 6, 2], [100, 5, 2]]);
pair('du-xz', L, [[86, 92]], 'mGrin', 'mOh', 1);
anim('du-xz-boom', L, [[0, 'opacity:0;' + TF(0, 0, 0, 0.6)], [31.5, 'opacity:0;' + TF(0, 0, 0, 0.6)], [32.5, 'opacity:1;' + TF()],
  [37, 'opacity:0;' + TF(0, 0, 0, 1.3)], [100, 'opacity:0;' + TF(0, 0, 0, 1.3)]], IO, 'opacity:0');
// le dormeur (couché) : il respire, ouvre un œil, se tasse… et se relève d'un coup
const LIE = [[0, 1, TF()], [16, 1, TF(0, -1.5)], [30, 1, TF()], [33, 1, TF(0, 1, 0, 1.03, 0.96)], [36, 1, TF()], [38, 1, TF(0, 2, 0, 1.08, 0.86)],
  [39.9, 1, TF(0, 2, 0, 1.08, 0.86)], [40, 0, TF()], [89.9, 0, TF()], [90, 1, TF(0, 0, 0, 1.06, 0.9)], [94, 1, TF()], [100, 1, TF()]];
anim('du-xz-lie', L, LIE.map(([p, o, t]) => [p, `opacity:${f(o)};` + t]));
anim('du-xz-shL', L, [[0, 'opacity:1;' + TF()], [39.9, 'opacity:1;' + TF()], [40, 'opacity:0;' + TF()], [89.9, 'opacity:0;' + TF()],
  [90, 'opacity:1;' + TF()], [100, 'opacity:1;' + TF()]]);
hid('du-xz-eyeR', L, [[33, 40]], 0.6);
vis('du-xz-eyeO', L, [[33, 40]], 0.6);
// réveillé (debout) : sursaut, bâillement, petits bonds fatigués, puis il pique du nez et se recouche
let FW = [[0, 0, TF()], [39.9, 0, TF(0, 14, 0, 1.08, 0.8)], [40, 1, TF(0, 14, 0, 1.08, 0.8)], [42, 1, TF(0, -14, 0, 0.94, 1.08)], [44.5, 1, TF(0, 0, 0, 1.05, 0.95)],
  [46, 1, TF()], [48, 1, TF(0, -3, -3, 0.95, 1.1)], [52, 1, TF(0, -3, 3, 0.95, 1.1)], [54, 1, TF()]];
for (const p of [56, 62]) {
  FW.push([p - 1.5, 1, TF(0, 0, 0, 1.04, 0.96)], [p + 0.5, 1, TF(0, -10, 0, 0.98, 1.03)], [p + 2.5, 1, TF(0, 0, 0, 1.04, 0.96)], [p + 4, 1, TF()]);
}
FW.push([70, 1, TF()], [74, 1, TF(0, 2, 5)], [78, 1, TF(0, 3, 9)], [82, 1, TF(0, 2, 5)], [85, 1, TF(0, 3, 10)], [88, 1, TF(0, 6, 4, 1.06, 0.9)],
  [89.9, 1, TF(0, 10, 0, 1.1, 0.82)], [90, 0, TF()], [100, 0, TF()]);
anim('du-xz-F', L, FW.map(([p, o, t]) => [p, `opacity:${f(o)};` + t]), IO, 'opacity:0');
anim('du-xz-shF', L, [[0, 'opacity:0;' + TF()], [39.9, 'opacity:0;' + TF()], [40, 'opacity:1;' + TF()], [42, 'opacity:1;' + TF(0, 0, 0, 0.8)],
  [44.5, 'opacity:1;' + TF()], [56.5, 'opacity:1;' + TF(0, 0, 0, 0.85)], [59, 'opacity:1;' + TF()], [62.5, 'opacity:1;' + TF(0, 0, 0, 0.85)],
  [65, 'opacity:1;' + TF()], [89.9, 'opacity:1;' + TF()], [90, 'opacity:0;' + TF()], [100, 'opacity:0;' + TF()]]);
vis('du-xz-fWide', L, [[40, 45]], 0.5);
hid('du-xz-fHalf', L, [[40, 45], [46, 52.5], [76, 88]], 0.8);
vis('du-xz-fShut', L, [[46, 52.5], [76, 88]], 0.8);
hid('du-xz-fFlat', L, [[46, 52.5], [54, 70]], 0.8);
vis('du-xz-fYawn', L, [[46, 52.5]], 0.8);
vis('du-xz-fSmile', L, [[54, 70]], 1);

// ——— Excitation + Tristesse : les tout petits bonds ———
L = 9;
fa = [X(0, LA), ...jump(LA, 2, 7, 40), ...jump(LA, 9, 14, 40), ...jump(LA, 16, 21, 40), X(23, LA), X(26, LA, { r: 10 }), X(30, LA)];
fa.push(...[...jump(LA, 31, 34.5, 10, 0, 20, false), ...jump(LA, 34.5, 38, 10, 20, 40, false)]);
const sit = { ty: 8, sx: 1.04, sy: 0.9 };
fa.push(X(39, LA, { tx: 40, r: 4, ...sit }));
for (const p of range(42, 86, 5)) {
  fa.push(X(p, LA, { tx: 40, r: 4, ty: 3, sx: 1.02, sy: 0.93 }), X(p + 2.5, LA, { tx: 40, r: 4, ...sit }));
}
fa.push(X(88, LA, { tx: 40 }), X(91, LA, { tx: 20, ty: -10 }), X(94, LA, { sx: 1.05, sy: 0.95 }), X(96, LA), X(100, LA));
body('du-xt-A', L, clean(fa), 'transform:translate(-4px,0px) rotate(6deg)');
body('du-xt-shA', L, shadow_of(fa));
eyes('du-xt-eA', L, [[0, 5, 0], [30, 5, 0], [40, 4, 2], [86, 4, 2], [92, 5, 0], [100, 5, 0]]);
pair('du-xt', L, [[30, 92]], 'mGrin', 'mSoft2', 2);
const curl = { ty: 8, sy: 0.88 };
fb = [B(0, { ...curl }), B(60, { ...curl })];
for (const p of [62, 67, 72, 77, 82]) {
  fb.push(B(p, { ty: 4, sx: 1.01, sy: 0.9 }), B(p + 2.5, { ...curl }));
}
fb.push(B(86, { ...curl }), B(100, { ...curl }));
body('du-xt-B', L, clean(fb), 'transform:translate(0px,8px) scale(1,.88)');
body('du-xt-rub', L, [B(0), B(6, { r: -7 }), B(12), B(18, { r: -7 }), B(24), B(30, { r: -7 }), B(36), B(42, { r: -7 }), B(48), B(54, { r: -7 }), B(58), B(62, { r: -60 }), B(86, { r: -60 }),
  B(90), B(95, { r: -7 }), B(100)]);
pair('du-xt', L, [[63, 88]], 'eSad', 'eSoft', 1.2);
pair('du-xt', L, [[63, 88]], 'mSad', 'mSoft', 1.5);

// ——— Excitation + Anxiété : un bond par tic ———
L = 8;
const T = 100 / 12;
fa = [X(0, LA)];
for (let k = 0; k < 12; k += 1) {
  p = k * T;
  fa.push(X(p, LA, { sx: 1.06, sy: 0.94, e: EO }), X(p + 2.6, LA, { ty: -24, sx: 0.96, sy: 1.04, e: EI }), X(p + 5.2, LA, { sx: 1.07, sy: 0.93, e: EO }), X(p + 7, LA));
}
fa.push(X(100, LA, { sx: 1.06, sy: 0.94 }));
body('du-xx-A', L, clean(fa), 'transform:translate(-4px,0px) rotate(6deg)');
body('du-xx-shA', L, shadow_of(fa, 60));
fb = [B(0), ...range(14).map((i) => B(1.1 + 2.2 * i, { r: i % 2 === 0 ? -3 : 1.5 })), B(32), B(46)];
for (let k = 6; k < 11; k += 1) {
  p = k * T;
  fb.push(B(p, { sx: 1.04, sy: 0.96, e: EO }), B(p + 2.6, { ty: -12, sx: 0.97, sy: 1.03, e: EI }), B(p + 5.2, { sx: 1.05, sy: 0.95, e: EO }), B(p + 7));
}
fb.push(B(92), B(100));
body('du-xx-B', L, clean(fb));
body('du-xx-shB', L, shadow_of(fb, 40, false));
anim('du-xx-hand', L, [[0, 'transform:rotate(0deg)'], [100, 'transform:rotate(360deg)']], 'steps(12)');
let tic = [[0, 'opacity:1;' + TF()]];
for (let k = 0; k < 12; k += 1) {
  p = k * T;
  tic.push([p, 'opacity:1;' + TF(0, 0, 0, 1.15)], [p + 3, 'opacity:0;' + TF()]);
}
tic.push([100, 'opacity:1;' + TF(0, 0, 0, 1.15)]);
anim('du-xx-tic', L, sorted([...new Map(tic.map(([p, d]) => [p, [p, d]])).values()]), 'linear', 'opacity:0');
eyeanim('du-xx-eye', L, [[0, 1, 6, -7], [32, 1, 6, -7], [35, 1, -5, 0], [49, 1, -5, 0], [50, 0, -5, 0], [91, 0, 6, -7], [92, 1, 6, -7], [100, 1, 6, -7]]);
vis('du-xx-eShut', L, [[50, 91]], 1);
pair('du-xx', L, [[41, 93]], 'mTense', 'mSmile', 1.5);
eyes('du-xx-eA', L, [[0, 4, -2], [30, 4, -2], [34, 6, -5], [92, 6, -5], [97, 4, -2], [100, 4, -2]]);

// ——— Excitation + Colère : la colère qui se défoule ———
L = 8;
fa = [X(0, LA), X(1.5, LA), ...jump(LA, 2, 6, 30, 0, 25), ...jump(LA, 8, 12, 35, 25, 50), ...jump(LA, 14, 18, 25, 50, 35),
  ...jump(LA, 20, 24, 35, 35, 55), ...jump(LA, 26, 30, 25, 55, 45)];
fa.push(X(32, LA, { tx: 45 }), X(40, LA, { tx: 45 }));
for (const p of [44, 52, 60]) {
  fa.push(...jump(LA, p - 2, p + 2, 12, 45, 45));
}
for (const p of [72, 78, 84]) {
  fa.push(...jump(LA, p - 3, p + 1, 30, 45, 45));
}
fa.push(X(86, LA, { tx: 45 }), X(90, LA, { tx: 28, ty: -14, e: EI }), X(93, LA, { tx: 14, sx: 1.05, sy: 0.95 }), X(96, LA), X(100, LA));
body('du-xc-A', L, clean(fa), 'transform:translate(-4px,0px) rotate(6deg)');
body('du-xc-shA', L, shadow_of(fa));
eyes('du-xc-eA', L, [[0, 5, -1], [30, 5, -1], [40, 5, -2], [100, 5, -1]]);
fb = [B(0), B(6, { sx: 1.05, sy: 0.96 }), B(9), B(12, { sx: 1.05, sy: 0.96 }), B(15), B(18, { sx: 1.06, sy: 0.95 }), B(21), B(24, { sx: 1.06, sy: 0.95 }), B(27), B(30),
  B(34, { sx: 1.09, sy: 0.92 }), B(38, { sx: 1.09, sy: 0.92 }), B(40)];
for (const p of [44, 52, 60, 68]) {
  fb.push(B(p - 2.5, { sx: 1.08, sy: 0.92, e: EO }), B(p, { ty: -26, sx: 0.96, sy: 1.05, e: EI }), B(p + 2.5, { sx: 1.1, sy: 0.9, e: EO }), B(p + 4));
}
for (const p of [74, 80]) {
  fb.push(B(p - 2.5, { sx: 1.06, sy: 0.94, e: EO }), B(p, { ty: -24, r: -3, sx: 0.96, sy: 1.05, e: EI }), B(p + 2.5, { sx: 1.06, sy: 0.94, e: EO }), B(p + 4));
}
fb.push(B(88), B(100));
body('du-xc-B', L, clean(fb));
body('du-xc-shB', L, shadow_of(fb, 60, false));
anim('du-xc-vein', L, [[0, 'opacity:.9;' + TF()], [4, 'opacity:1;' + TF(0, 0, 0, 1.25)], [8, 'opacity:.9;' + TF()], [12, 'opacity:1;' + TF(0, 0, 0, 1.3)],
  [16, 'opacity:.9;' + TF()], [20, 'opacity:1;' + TF(0, 0, 0, 1.35)], [24, 'opacity:.9;' + TF(0, 0, 0, 1.05)],
  [30, 'opacity:1;' + TF(0, 0, 0, 1.4)], [36, 'opacity:1;' + TF(0, 0, 0, 1.6)], [44, 'opacity:1;' + TF(0, 0, 0, 1.45)],
  [52, 'opacity:1;' + TF(0, 0, 0, 1.6)], [58, 'opacity:.9;' + TF(0, 0, 0, 1.3)], [61, 'opacity:0;' + TF(0, 0, 0, 0.3)],
  [92, 'opacity:0;' + TF(0, 0, 0, 0.3)], [95, 'opacity:.9;' + TF()], [100, 'opacity:.9;' + TF()]]);
eyeanim('du-xc-eAngry', L, [[0, 1, -4, -1], [30, 1, -4, -1], [40, 1, -2, -3], [60.5, 1, -2, -3], [61.5, 0, -2, -3], [92, 0, -4, -1], [93, 1, -4, -1],
  [100, 1, -4, -1]]);
vis('du-xc-eJoy', L, [[61.5, 92]], 1);
hid('du-xc-mFrown', L, [[30, 93]], 1);
vis('du-xc-mShout', L, [[30, 60.5]], 1);
vis('du-xc-mJoy', L, [[61.5, 92]], 1);
