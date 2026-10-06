import { anim, B, body, EI, EO, eyes, f, opac, TF } from '../lib.ts';
import { pyRound, range, sorted } from '../py.ts';
import { lerp, path, quad, S72, seg, smooth } from './serenite.ts';

// ——————————————————————————————————————————————————————————————————————————
// Amour + les autres. Les objets tenus passent d'une main à l'autre par relais
// d'opacité : l'objet tenu suit le corps, l'objet en vol suit sa trajectoire.
export function vis_fn(windows, fade, alpha) {
  function v(t) {
    let best = 0.0;
    for (const [s_, e_] of windows) {
      let val;
      if (s_ <= t && t <= e_) val = alpha;
      else if (s_ - fade < t && t < s_) val = alpha * (t - (s_ - fade)) / fade;
      else if (e_ < t && t < e_ + fade) val = alpha * (1 - (t - e_) / fade);
      else val = 0;
      best = Math.max(best, val);
    }
    return best;
  }
  return v;
}

export function _pts(windows, fade) {
  const pts = new Set([0.0, 100.0]);
  for (const [s_, e_] of windows) {
    for (const p of [s_ - fade, s_, e_, e_ + fade]) {
      if (0 <= p && p <= 100) pts.add(pyRound(p, 3));
    }
  }
  return sorted(pts);
}

export function vis(cls, dur, windows, fade = 1.0, alpha = 1.0, stat = null) {
  const v = vis_fn(windows, fade, alpha);
  opac(cls, dur, _pts(windows, fade).map((p) => [p, v(p)]), stat);
}

export function hid(cls, dur, windows, fade = 1.0, stat = null) {
  const v = vis_fn(windows, fade, 1.0);
  opac(cls, dur, _pts(windows, fade).map((p) => [p, 1 - v(p)]), stat);
}

export function pair(prefix, dur, windows, a, b, fade = 1.0) {
  // a visible hors des fenêtres, b visible dedans
  hid(`${prefix}-${a}`, dur, windows, fade);
  vis(`${prefix}-${b}`, dur, windows, fade);
}

function pop(cls, dur, t0, p0, p1, t1, t2, s0 = 0.3, s1 = 1.2) {
  // un cœur qui naît en p0 à t0, monte jusqu'à p1 à t2, s'efface à partir de t1
  function fn(t) {
    if (t < t0) return [...p0, 0, s0];
    const u = smooth(t0, t2, t);
    const [x, y] = lerp(p0, p1, u);
    const op = smooth(t0, t0 + 0.02, t) * (1 - smooth(t1, t2, t));
    return [x, y, op, s0 + (s1 - s0) * smooth(t0, t0 + 0.06, t)];
  }
  path(cls, dur, fn, 100);
}

// ——— Amour + Amour : échange de lettres, puis bisou ———
let L = 8;
function aa_body(sg) {
  return [B(0, { r: -1.5 * sg }), B(8, { r: 1.5 * sg }), B(12, { ty: 1, sx: 1.05, sy: 0.94, e: EO }), B(15, { ty: -6, r: 3 * sg, sx: 0.97, sy: 1.04, e: EI }),
    B(20), B(28, { e: EO }), B(31, { sx: 1.05, sy: 0.94 }), B(35, { r: -2 * sg }), B(40, { r: 2 * sg }), B(44),
    B(50, { tx: 20 * sg, r: 8 * sg }), B(55, { tx: 21 * sg, r: 8 * sg, sx: 1.03, sy: 0.97 }), B(62, { tx: 20 * sg, r: 8 * sg }),
    B(70), B(80, { r: -1.5 * sg }), B(90, { r: 1.5 * sg }), B(100, { r: -1.5 * sg })];
}
body('du-aa-A', L, aa_body(1));
body('du-aa-B', L, aa_body(-1));
body('du-aa-shA', L, [B(0), B(44), B(50, { tx: 14.4 }), B(62, { tx: 14.4 }), B(70), B(100)]);
body('du-aa-shB', L, [B(0), B(44), B(50, { tx: -14.4 }), B(62, { tx: -14.4 }), B(70), B(100)]);
for (const side of 'AB') {
  pair('du-aa', L, [[6, 30]], `eShut${side}`, `eOpen${side}`, 1.5);
  pair('du-aa', L, [[15, 29]], `hold${side}`, `open${side}`, 0.1);
  pair('du-aa', L, [[47, 64]], `mSmile${side}`, `mKiss${side}`, 1.2);
  vis(`du-aa-blush${side}`, L, [[49, 68]], 3, 0.45);
}
const [LA0, LA1] = [[111.8, 160.5], [250, 166.9]];
const [LB0, LB1] = [[248.2, 160.5], [110, 166.9]];
function aa_fly(p0, q, p1) {
  function fn(t) {
    if (t < 0.15) return [...p0, 0];
    if (t < 0.29) return [...quad(p0, q, p1, seg(t, 0.15, 0.29)), 1];
    return [...p1, 0];
  }
  return fn;
}
path('du-aa-fAB', L, aa_fly(LA0, [180, 20], LA1), 120);
path('du-aa-fBA', L, aa_fly(LB0, [180, 92], LB1), 120);
anim('du-aa-sAB', L, [[0, 'transform:rotate(3deg)'], [15, 'transform:rotate(3deg)'], [29, 'transform:rotate(360deg)'], [100, 'transform:rotate(360deg)']], 'ease-in-out');
anim('du-aa-sBA', L, [[0, 'transform:rotate(-3deg)'], [15, 'transform:rotate(-3deg)'], [29, 'transform:rotate(-360deg)'], [100, 'transform:rotate(-360deg)']], 'ease-in-out');
pop('du-aa-heart', L, 0.52, [180, 138], [180, 56], 0.7, 0.8, 0.2, 1.25);

// ——— Amour + Gratitude : le cadeau ouvert, le cœur qui en sort ———
L = 7;
const GB0 = [250, 56 + 152 * S72];
const GB1 = [247, 163.4];
const GB2 = [248.8, 161.1];
const GA = [110, 56 + 160 * S72];
function ag_gift(t) {
  if (t < 0.04) return [...lerp(GB0, GB1, smooth(0, 0.04, t)), 1];
  if (t < 0.1) return [...GB1, 1];
  if (t < 0.12) return [...lerp(GB1, GB2, smooth(0.1, 0.12, t)), 1];
  if (t < 0.26) return [...quad(GB2, [180, 70], GA, seg(t, 0.12, 0.26)), 1];
  if (t < 0.86) return [GA[0], t < 0.3 ? GA[1] + 1.5 * Math.sin(Math.PI * seg(t, 0.26, 0.3)) : GA[1], 1];
  if (t < 0.9) return [...GA, 1 - smooth(0.86, 0.9, t)];
  if (t < 0.94) return [...GB0, 0];
  return [...GB0, smooth(0.94, 1, t)];
}
path('du-ag-gift', L, ag_gift, 140, 0);
anim('du-ag-lid', L, [[0, TF()], [40, TF()], [44, TF(2, -5, 42)], [88, TF(2, -5, 42)], [91, TF()], [100, TF()]]);
function ag_heart(t) {
  let u;
  if (t < 0.42) return [110, 160, 0, 0.3];
  if (t < 0.5) {
    u = smooth(0.42, 0.5, t);
    return [110, 160 - 44 * u, 1, 0.3 + 0.8 * u];
  }
  if (t < 0.54) return [110 + 2 * Math.sin(2 * Math.PI * seg(t, 0.5, 0.54)), 116, 1, 1.1];
  if (t < 0.68) return [...quad([110, 116], [180, 50], [240, 150], seg(t, 0.54, 0.68)), 1, 1.1];
  if (t < 0.74) {
    u = smooth(0.68, 0.74, t);
    return [240, 150, 1 - u, 1.1 - 0.8 * u];
  }
  return [240, 150, 0, 0.3];
}
path('du-ag-heart', L, ag_heart, 120);
pair('du-ag', L, [[26, 88]], 'openA', 'holdA', 0.1);
pair('du-ag', L, [[12, 94]], 'giftB', 'hangB', 0.1);
body('du-ag-A', L, [B(0), B(24, { e: EO }), B(26, { e: EO }), B(28, { sx: 1.05, sy: 0.95 }), B(32), B(60, { r: 1.5 }), B(72, { r: -1.5 }), B(86), B(100)]);
body('du-ag-B', L, [B(0), B(4, { ty: -3, r: -5 }), B(10, { ty: -3, r: -5 }), B(12, { ty: -6, r: -2, e: EI }), B(16), B(66), B(69, { sx: 1.04, sy: 0.96 }), B(72),
  B(76, { r: -12 }), B(84, { r: -12 }), B(90), B(100)]);
pair('du-ag', L, [[42, 52]], 'eShut', 'eWow', 1);
pair('du-ag', L, [[42, 50]], 'mSmile', 'mWow', 1);
vis('du-ag-blush', L, [[68, 88]], 3, 0.8);

// ——— Amour + Fierté : un cœur pour joyau ———
L = 6;
const CROWN = [250, 56 + 15 * S72];
function af_heart(t) {
  if (t < 0.12) return [124, 90, 0, 0.6];
  if (t < 0.34) return [...quad([124, 90], [190, 0], CROWN, seg(t, 0.12, 0.34)), 1, 0.6 + 0.4 * seg(t, 0.12, 0.2)];
  return [...CROWN, 0, 1];
}
path('du-af-h', L, af_heart, 120);
vis('du-af-hc', L, [[34, 86]], 0.1);
body('du-af-B', L, [B(0), B(10, { ty: -1, sy: 1.02 }), B(20), B(34, { e: EO }), B(37, { ty: 1, sx: 1.04, sy: 0.95 }), B(41, { r: 3 }), B(45, { r: -3 }), B(49),
  B(56, { ty: -6, sx: 1.05, sy: 1.08 }), B(84, { ty: -6, sx: 1.05, sy: 1.08 }), B(90), B(100)]);
eyes('du-af-eB', L, [[0, 0, 0], [14, 0, 0], [26, -5, -6], [36, 0, -8], [41, -3, 3], [50, -3, 3], [56, 0, 0], [100, 0, 0]]);
vis('du-af-blush', L, [[37, 86]], 3, 0.75);
body('du-af-A', L, [B(0), B(8, { r: -4 }), B(12, { r: 5, sx: 1.03, sy: 0.97 }), B(18), B(60, { r: 1.5 }), B(80, { r: -1.5 }), B(100)]);
pair('du-af', L, [[14, 92]], 'eShut', 'eLook', 1.5);

// ——— Amour + Excitation : le câlin attrapé au vol ———
L = 5;
const jumps = [[0, 4, 0, 1, 1], [5, 4, -24, 0.95, 1.05], [10, 4, 0, 1.08, 0.92], [14, 24, -26, 0.95, 1.05], [18, 24, 0, 1.08, 0.92],
  [22, -8, -28, 0.95, 1.05], [26, -8, 0, 1.08, 0.92], [30, -8, -40, 0.95, 1.05], [34, -8, 2, 1.12, 0.88],
  [39, -34, -52, 0.95, 1.05], [44, -54, 0, 1.1, 0.9], [48, -54, 0, 1, 1], [60, -54, 0, 1, 1], [64, -54, 2, 1.1, 0.9],
  [70, -30, -42, 0.95, 1.05], [76, 4, 0, 1.08, 0.92], [80, 4, 0, 1, 1], [84, 4, -18, 1, 1], [88, 4, 0, 1.04, 0.96],
  [94, 4, -18, 1, 1], [100, 4, 0, 1, 1]];
const rot = new Map([[48, -3], [54, -1], [60, -3]]);
const fr = [];
for (const [p, tx, ty, sx, sy] of jumps) {
  const e = ty < -5 ? EI : ty >= 0 && ![48, 60].includes(p) ? EO : null;
  fr.push(B(p, { tx, ty, r: (rot.get(p) ?? -6), sx, sy, e }));
}
fr.splice(12, 0, B(54, { tx: -54, r: -1 }));
body('du-ae-B', L, fr, 'transform:translate(4px,0px) rotate(-6deg)');
body('du-ae-shB', L, jumps.map(([p, tx, ty]) => B(p, { tx: (tx - 4) * S72, sx: Math.max(0.45, 1 + ty / 70) })));
pair('du-ae', L, [[44, 63]], 'eOpen', 'eShut', 0.8);
pair('du-ae', L, [[44, 64]], 'open', 'hug', 0.1);
body('du-ae-A', L, [B(0), B(42, { e: EO }), B(45, { tx: 4, r: 5, sx: 1.04, sy: 0.96 }), B(50, { tx: 6, r: 7 }), B(56, { tx: 5, r: 5 }), B(60, { tx: 6, r: 7 }), B(64), B(100)]);
pop('du-ae-heart', L, 0.46, [182, 92], [182, 44], 0.58, 0.66, 0.3, 1.3);

// ——— Amour + Nostalgie : le nuage qui rosit ———
L = 7;
body('du-an-A', L, [B(0, { r: 5 }), B(50, { r: 7, sx: 1.02 }), B(100, { r: 5 })], 'transform:rotate(5deg)');
eyes('du-an-eA', L, [[0, 6, -2], [6, 6, -2], [12, 3, -8], [80, 3, -8], [90, 6, -2], [100, 6, -2]]);
for (const [k, t0] of [0.05, 0.23, 0.41].entries()) {
  function an_heart(t) {
    if (t < t0 || t > t0 + 0.115) return [132, 150, 0, 0.8];
    const u = seg(t, t0, t0 + 0.11);
    const [x, y] = quad([132, 150], [148, 60], [196, 40], u);
    return [x, y, smooth(t0, t0 + 0.01, t) * (1 - smooth(t0 + 0.09, t0 + 0.11, t)), 0.9 - 0.4 * u];
  }
  path(`du-an-h${k + 1}`, L, an_heart, 140);
}
opac('du-an-pink', L, [[0, 0], [15, 0], [16.5, 0.35], [33, 0.35], [34.5, 0.68], [51, 0.68], [52.5, 1], [85, 1], [97, 0], [100, 0]], 'opacity:.6');
anim('du-an-inner', L, [[0, 'opacity:0;' + TF(0, 0, 0, 0.3)], [53, 'opacity:0;' + TF(0, 0, 0, 0.3)], [57, 'opacity:1;' + TF(0, 0, 0, 1.15)],
  [60, 'opacity:1;' + TF()], [86, 'opacity:1;' + TF()], [92, 'opacity:0;' + TF(0, 0, 0, 0.6)], [100, 'opacity:0;' + TF(0, 0, 0, 0.3)]]);
pair('du-an', L, [[56, 90]], 'mW', 'mS', 2);

// ——— Amour + Fatigue : le bisou du soir ———
L = 7;
body('du-az-A', L, [B(0), B(14), B(30, { tx: 20, r: 26 }), B(35, { tx: 21, r: 27, sx: 1.02, sy: 0.98 }), B(42, { tx: 20, r: 26 }), B(54), B(100)]);
body('du-az-sh', L, [B(0), B(14), B(30, { tx: 14.4 }), B(42, { tx: 14.4 }), B(54), B(100)]);
pair('du-az', L, [[26, 56]], 'eLook', 'eShut', 1.5);
pair('du-az', L, [[26, 46]], 'mSmile', 'mKiss', 1.2);
pop('du-az-heart', L, 0.34, [232, 150], [226, 92], 0.48, 0.56, 0.3, 1.1);
pair('du-az', L, [[38, 95]], 'm1', 'm2', 3);
function zcycle(show) {
  let fr = [];
  for (let c = 0; c < 3; c += 1) {
    const o = c * 100 / 3;
    const f_ = show[c] ? 1 : 0;
    fr.push([o, 'opacity:0;' + TF()], [o + 20 / 3, `opacity:${f_};` + TF(2, -3)], [o + 70 / 3, `opacity:${f(0.85 * f_)};` + TF(6, -10)],
      [o + 90 / 3, 'opacity:0;' + TF(8, -13)], [o + 99.5 / 3, 'opacity:0;' + TF(8, -13)]);
  }
  fr.push([100, 'opacity:0;' + TF()]);
  return fr;
}
anim('du-az-z', L, zcycle([1, 0, 0]), 'ease-in-out');
anim('du-az-zh', L, zcycle([0, 1, 1]), 'ease-in-out', 'opacity:0');

// ——— Amour + Tristesse : le câlin ———
L = 7;
body('du-at-A', L, [B(0), B(16), B(26, { tx: 10, r: 6 }), B(40, { tx: 10, r: 8 }), B(55, { tx: 10, r: 5 }), B(70, { tx: 10, r: 8 }), B(80, { tx: 10, r: 6 }), B(90), B(100)]);
const curl = { ty: 8, sy: 0.88 };
body('du-at-B', L, [B(0, { ...curl }), B(24, { ...curl }), B(32, { r: -7, ...curl }), B(78, { r: -7, ...curl }), B(88, { ...curl }), B(100, { ...curl })], 'transform:translate(0px,8px) scale(1,.88)');
body('du-at-rub', L, [B(0), B(6, { r: -7 }), B(12), B(18, { r: -7 }), B(24), B(86), B(92, { r: -7 }), B(100)]);
pair('du-at', L, [[26, 86]], 'hold', 'around', 0.1);
pair('du-at', L, [[34, 84]], 'eOpen', 'eShut', 1.2);
pair('du-at', L, [[36, 84]], 'mSad', 'mSoft', 1.5);
pop('du-at-heart', L, 0.4, [184, 116], [184, 60], 0.54, 0.62, 0.3, 1.1);

// ——— Amour + Anxiété : la main tendue ———
L = 6;
const tw = [B(0), ...range(13).map((i) => B(1.2 + 2.4 * i, { r: i % 2 === 0 ? -3 : 1.5 }))];
body('du-ax-B', L, [...tw, B(33), B(60, { ty: -1, sx: 1.02 }), B(88), B(92, { r: -3 }), B(94.5, { r: 1.5 }), B(97, { r: -3 }), B(100)]);
body('du-ax-armW', L, [B(0), B(38), B(50, { r: 150 }), B(86, { r: 150 }), B(96), B(100)], 'transform:rotate(150deg)');
pair('du-ax', L, [[34, 90]], 'hangL', 'reachL', 0.1);
pair('du-ax', L, [[32, 90]], 'holdR', 'reachR', 0.1);
body('du-ax-A', L, [B(0), B(50, { ty: -1.5, sx: 1.01 }), B(100)]);
pair('du-ax', L, [[38, 88]], 'eWatch', 'eShut', 1.2);
pair('du-ax', L, [[40, 88]], 'mTense', 'mCalm', 1.5);
pair('du-ax', L, [[40, 90]], 'eLookA', 'eShutA', 1.5);
pop('du-ax-heart', L, 0.36, [193.8, 166], [192, 112], 0.5, 0.58, 0.3, 1.1);

// ——— Amour + Colère : le bisou soufflé ———
L = 6;
pair('du-ac', L, [[8, 24]], 'armHug', 'armMouth', 0.1);
vis('du-ac-armThrow', L, [[13, 24]], 0.1);
opac('du-ac-armMouth', L, [[0, 0], [7.9, 0], [8, 1], [12.9, 1], [13, 0], [100, 0]]);
pair('du-ac', L, [[7, 14]], 'mSmile', 'mKiss', 0.8);
pair('du-ac', L, [[13, 90]], 'eShutA', 'eLookA', 1.2);
body('du-ac-A', L, [B(0), B(8, { r: -3 }), B(13, { r: 5, sx: 1.03, sy: 0.97 }), B(20), B(100)]);
const V2 = [250 - 72 + 84 * S72, 56 + 86 * S72];
function ac_heart(t) {
  if (t < 0.13) return [130, 146, 0, 1];
  if (t < 0.3) return [...quad([130, 146], [185, 40], V2, seg(t, 0.13, 0.3)), 1, 1 - 0.1 * seg(t, 0.13, 0.3)];
  if (t < 0.32) return [...V2, 1 - smooth(0.3, 0.32, t), 0.9];
  return [...V2, 0, 0.9];
}
path('du-ac-h', L, ac_heart, 120);
anim('du-ac-vein', L, [[0, 'opacity:1;' + TF()], [5, 'opacity:1;' + TF(0, 0, 0, 1.3)], [10, 'opacity:1;' + TF()], [15, 'opacity:1;' + TF(0, 0, 0, 1.3)],
  [20, 'opacity:1;' + TF()], [25, 'opacity:1;' + TF(0, 0, 0, 1.35)], [30, 'opacity:1;' + TF(0, 0, 0, 1.2)],
  [33, 'opacity:0;' + TF(0, 0, 0, 0.2)], [86, 'opacity:0;' + TF(0, 0, 0, 0.2)], [90, 'opacity:1;' + TF()],
  [95, 'opacity:1;' + TF(0, 0, 0, 1.3)], [100, 'opacity:1;' + TF()]]);
let hv = [[0, 'opacity:0;' + TF(0, 0, 0, 0.3)], [30, 'opacity:0;' + TF(0, 0, 0, 0.3)], [33, 'opacity:1;' + TF(0, 0, 0, 1.25)]];
for (const [i, p] of range(37, 84, 4).entries()) {
  hv.push([p, 'opacity:1;' + TF(0, 0, 0, i % 2 === 0 ? 0.95 : 1.1)]);
}
hv.push([86, 'opacity:0;' + TF(0, 0, 0, 0.3)], [100, 'opacity:0;' + TF(0, 0, 0, 0.3)]);
anim('du-ac-hv', L, hv);
body('du-ac-B', L, [B(0), B(8, { sx: 1.05, sy: 0.96 }), B(13), B(20, { sx: 1.05, sy: 0.96 }), B(26), B(30), B(33, { ty: -3, sx: 0.96, sy: 1.05 }), B(38),
  B(44, { ty: 1, r: -3, sx: 0.98, sy: 0.99 }), B(80, { ty: 1, r: -3, sx: 0.98, sy: 0.99 }), B(86), B(92, { sx: 1.05, sy: 0.96 }), B(100)]);
hid('du-ac-eAngry', L, [[31, 88]], 1);
vis('du-ac-eWow', L, [[31, 38]], 1);
vis('du-ac-eShy', L, [[38.5, 86]], 1);
hid('du-ac-mFrown', L, [[31, 88]], 1);
vis('du-ac-mO', L, [[31, 38]], 1);
vis('du-ac-mShy', L, [[38.5, 86]], 1);
vis('du-ac-blush', L, [[33, 86]], 3, 0.8);
