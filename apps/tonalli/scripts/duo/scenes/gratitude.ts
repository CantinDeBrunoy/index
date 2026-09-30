import { anim, B, body, EI, EO, eyes, opac, TF } from '../lib.ts';
import { PyRandom, radians, range, sorted } from '../py.ts';
import { lerp, path, quad, S72, seg, smooth } from './serenite.ts';
import { hid, pair, vis } from './amour.ts';

// ——————————————————————————————————————————————————————————————————————————
// Gratitude + les autres.
let tx;
export function body_pt(x0, px, py, tx = 0, ty = 0, r = 0, sx = 1, sy = 1, ox = 100, oy = 200, dy = 0) {
  // position en scène d'un point du personnage, une fois son corps transformé
  const [vx, vy] = [(px - ox) * sx, (py - oy) * sy];
  const a = radians(r);
  const [rx, ry] = [vx * Math.cos(a) - vy * Math.sin(a), vx * Math.sin(a) + vy * Math.cos(a)];
  return [x0 - 72 + (ox + tx + rx) * S72, 56 + dy + (oy + ty + ry) * S72];
}

const GROUND_Y = 202 - 12 * S72;  // centre d'un cadeau posé au sol

export function carry(p0, q, p1, t0, t1, hide_before = true, hide_after = false) {
  // trajet d'un objet en relais : visible seulement pendant son vol (ou après)
  function fn(t) {
    if (t < t0) return [...p0, hide_before ? 0 : 1];
    if (t < t1) return [...quad(p0, q, p1, seg(t, t0, t1)), 1];
    return [...p1, hide_after ? 0 : 1];
  }
  return fn;
}

// ——— Gratitude + Gratitude : « après vous » ———
let L = 8;
const A_BOWS = [[10, 14, 18], [26, 29, 32], [38, 40, 42.5], [47, 48.5, 50]];
const B_BOWS = [[18, 22, 26], [32, 35, 38], [42.5, 45, 47], [50, 51.5, 53]];
function gg_body(sg, bows) {
  let fr = [B(0, { r: 4 * sg }), B(10, { r: 4 * sg })];
  for (const [s_, d_, u_] of bows) {
    fr.push(B(s_, { r: 3 * sg }), B(d_, { r: 18 * sg }), B(u_, { r: 3 * sg }));
  }
  fr.push(B(53, { r: 3 * sg, e: EI }), B(57, { r: 20 * sg }), B(58.2, { r: 15 * sg }), B(60, { sx: 1.04, sy: 0.96 }), B(62), B(64),
    B(66, { ty: -6, sx: 0.97, sy: 1.04 }), B(70), B(77, { e: EO }), B(79, { sx: 1.05, sy: 0.95 }), B(83), B(88, { ty: -2 }), B(92), B(100, { r: 4 * sg }));
  fr = sorted([...new Map(fr.map(([p, k]) => [p, [p, k]])).values()], (x) => x[0]);
  return fr;
}
body('du-gg-A', L, gg_body(1, A_BOWS));
body('du-gg-B', L, gg_body(-1, B_BOWS));
for (const side of 'AB') {
  pair('du-gg', L, [[66, 78]], `hold${side}`, `open${side}`, 0.1);
  pair('du-gg', L, [[56.5, 60.5]], `eSoft${side}`, `eWow${side}`, 0.8);
  pair('du-gg', L, [[58, 66]], `mSmile${side}`, `mLaugh${side}`, 0.8);
}
const TA = body_pt(110, 100, 160, undefined, -6, undefined, 0.97, 1.04);
const TB = body_pt(250, 100, 160, undefined, -6, undefined, 0.97, 1.04);
path('du-gg-fAB', L, carry(TA, [180, 70], [250, 171.2], 0.66, 0.78, true, true), 90);
path('du-gg-fBA', L, carry(TB, [180, 125], [110, 171.2], 0.66, 0.78, true, true), 90);
anim('du-gg-sAB', L, [[0, 'transform:rotate(0deg)'], [66, 'transform:rotate(0deg)'], [78, 'transform:rotate(360deg)'], [100, 'transform:rotate(360deg)']]);
anim('du-gg-sBA', L, [[0, 'transform:rotate(0deg)'], [66, 'transform:rotate(0deg)'], [78, 'transform:rotate(-360deg)'], [100, 'transform:rotate(-360deg)']]);
anim('du-gg-burst', L, [[0, 'opacity:0;' + TF(0, 0, 0, 0.5)], [56.5, 'opacity:0;' + TF(0, 0, 0, 0.5)], [57.2, 'opacity:1;' + TF()],
  [60.5, 'opacity:0;' + TF(0, 0, 0, 1.4)], [100, 'opacity:0;' + TF(0, 0, 0, 1.4)]], undefined, 'opacity:0');

// ——— Gratitude + Fierté : la couronne rattrapée ———
L = 7;
body('du-gf-A', L, [B(0), B(10), B(16, { r: 16 }), B(22, { r: 16 }), B(26), B(53), B(55, { ty: -6, sx: 0.97, sy: 1.04, e: EI }), B(58), B(70), B(73, { r: 8 }), B(78, { r: 8 }), B(82), B(100)]);
pair('du-gf', L, [[43, 54]], 'eSoft', 'eLook', 1);
body('du-gf-B', L, [B(0), B(28), B(33, { r: -20 }), B(35, { r: -20 }), B(40), B(66, { e: EO }), B(68.5, { sx: 1.04, sy: 0.96 }), B(72, { ty: -2, sx: 1.05, sy: 1.06 }),
  B(82, { ty: -2, sx: 1.05, sy: 1.06 }), B(88), B(100)]);
eyes('du-gf-eB', L, [[0, -5, 0], [28, -5, 0], [33, -4, 4], [38, -7, 5], [44, -7, 5], [55, -5, -3], [62, -1, -8], [69, 0, -1], [90, -5, 0], [100, -5, 0]]);
pair('du-gf', L, [[34, 46]], 'mOk', 'mOops', 1);
const vis_crown = [[0, 34], [68, 100]];
vis('du-gf-crownB', L, vis_crown, 0.1);
const FC0 = body_pt(250, 100, 42, undefined, undefined, -20);
const FC1 = [110, 56 + 127 * S72];
const FC2 = [250, 56 + 42 * S72];
function gf_crown(t) {
  if (t < 0.34) return [...FC0, 0];
  if (t < 0.44) return [...quad(FC0, [165, 60], FC1, seg(t, 0.34, 0.44)), 1];
  if (t < 0.55) return [...FC1, 1];
  if (t < 0.68) return [...quad(FC1, [180, 0], FC2, seg(t, 0.55, 0.68)), 1];
  return [...FC2, 0];
}
path('du-gf-crown', L, gf_crown, 90);
anim('du-gf-crot', L, [[0, 'transform:rotate(-20deg)'], [34, 'transform:rotate(-20deg)'], [44, 'transform:rotate(-360deg)'],
  [55, 'transform:rotate(-360deg)'], [68, 'transform:rotate(0deg)'], [100, 'transform:rotate(0deg)']]);

// ——— Gratitude + Excitation : l'emballage arraché ———
L = 6;
const GH = [110, 56 + 160 * S72];
const EH = body_pt(250, 100, 160, 4, undefined, -6, undefined, undefined, 100, 190);
path('du-ge-gift', L, carry(GH, [182, 80], EH, 0.12, 0.2, true, true), 60);
anim('du-ge-gspin', L, [[0, 'transform:rotate(0deg)'], [12, 'transform:rotate(0deg)'], [20, 'transform:rotate(-360deg)'], [100, 'transform:rotate(-360deg)']]);
pair('du-ge', L, [[12, 92]], 'holdA', 'hangA', 0.1);
vis('du-ge-holdB', L, [[20, 86]], 0.1);
hid('du-ge-hangB', L, [[20, 86]], 0.1);
vis('du-ge-wrap', L, [[20, 23.5]], 0.1);
vis('du-ge-box', L, [[23.5, 86]], 0.1);
const ex = [[0, 0, 1, 1, null], [5, -10, 1, 1, EI], [9, 0, 1.05, 0.95, EO], [14, -10, 1, 1, EI], [18, 0, 1.05, 0.95, EO], [20, 0, 1.06, 0.94, null],
  [22, 0, 1, 1, null], [29, 0, 1.08, 0.92, EO], [36, -32, 0.95, 1.05, EI], [43, 0, 1.08, 0.92, EO], [50, -32, 0.95, 1.05, EI],
  [57, 0, 1.08, 0.92, EO], [64, -24, 0.96, 1.04, EI], [70, 0, 1.05, 0.95, EO], [78, -8, 1, 1, EI], [84, 0, 1, 1, EO], [92, -8, 1, 1, EI], [100, 0, 1, 1, null]];
const shake = new Map([[23, -12], [24.5, -2], [26, -12], [27.5, -2]]);
const fr = [...ex.map(([p, ty, sx, sy, e]) => B(p, { tx: 4, ty, r: -6, sx, sy, e })), ...[...shake.entries()].map(([p, r]) => B(p, { tx: 4, r }))];
body('du-ge-B', L, sorted(fr, (x) => x[0]), 'transform:translate(4px,0px) rotate(-6deg)');
body('du-ge-shB', L, ex.map(([p, ty]) => B(p, { sx: Math.max(0.5, 1 + ty / 60) })));
pair('du-ge', L, [[30, 62]], 'eOpen', 'eShut', 1);
pair('du-ge', L, [[30, 62]], 'mSmile', 'mLaugh', 1);
body('du-ge-A', L, [B(0), B(34), B(37, { ty: -4 }), B(40), B(44, { ty: -4 }), B(47), B(54, { ty: -4 }), B(57), B(100)]);
const random = new PyRandom();
random.seed(7);
for (let k = 0; k < 8; k += 1) {
  const ang = radians(-160 + 140 * k / 7 + random.uniform(-8, 8));
  const v = random.uniform(95, 140);
  const [vx, vy] = [v * Math.cos(ang), v * Math.sin(ang)];
  function paper(t) {
    if (t < 0.23 || t > 0.62) return [255, 160, 0];
    const tau = (t - 0.23) * L;
    let [x, y] = [255 + vx * tau, 160 + vy * tau + 0.5 * 300 * tau * tau];
    y = Math.min(y, 200);
    return [x, y, 1 - smooth(0.5, 0.62, t)];
  }
  path(`du-ge-p${k}`, L, paper, 70);
}

// ——— Gratitude + Nostalgie : la nouvelle photo ———
L = 7;
body('du-gn-A', L, [B(0, { r: 4 }), B(8, { r: 6 }), B(14), B(34), B(38, { r: 10 }), B(46, { r: 10 }), B(52), B(90, { r: 4 }), B(100, { r: 4 })]);
anim('du-gn-lid', L, [[0, TF()], [10, TF()], [14, TF(2, -5, 42)], [86, TF(2, -5, 42)], [92, TF()], [100, TF()]]);
const PH0 = [110, 161];
const PH1 = [110, 124];
const PH2 = body_pt(250, 52, 78, undefined, undefined, undefined, undefined, undefined, 100, 195);
function gn_photo(t) {
  let u;
  if (t < 0.14) return [...PH0, 0, 0.3];
  if (t < 0.22) {
    u = smooth(0.14, 0.22, t);
    return [...lerp(PH0, PH1, u), smooth(0.14, 0.15, t), 0.3 + 0.5 * u];
  }
  if (t < 0.32) {
    u = seg(t, 0.22, 0.32);
    return [...quad(PH1, [170, 70], PH2, u), 1, 0.8 + 0.2 * u];
  }
  return [...PH2, 0, 1];
}
path('du-gn-photo', L, gn_photo, 70);
anim('du-gn-prot', L, [[0, 'transform:rotate(0deg)'], [22, 'transform:rotate(0deg)'], [32, 'transform:rotate(8deg)'], [100, 'transform:rotate(8deg)']]);
pair('du-gn', L, [[32, 88]], 'one', 'two', 0.1);
body('du-gn-B', L, [B(0, { r: -1 }), B(31, { r: -1 }), B(34, { r: -1, sx: 1.04, sy: 0.96 }), B(38), B(50, { r: -2.5 }), B(62, { r: 1 }), B(74, { r: -2.5 }), B(86), B(100, { r: -1 })]);
pair('du-gn', L, [[38, 88]], 'mW', 'mS', 2);

// ——— Gratitude + Fatigue : le cadeau du réveil ———
L = 7;
const GZ0 = body_pt(135, 100, 160, undefined, undefined, 24);
const GZ1 = [198, GROUND_Y];
function gz_gift(t) {
  if (t < 0.2) return [...GZ0, 0];
  if (t < 0.26) return [...lerp(GZ0, GZ1, smooth(0.2, 0.26, t)), 1];
  if (t < 0.88) return [...GZ1, 1];
  return [...GZ1, 1 - smooth(0.88, 0.92, t)];
}
path('du-gz-gift', L, gz_gift, 70, 0.5);
pair('du-gz', L, [[20, 94]], 'hold', 'hang', 0.1);
let tip = [];
for (const p of [42, 46, 50, 54, 58]) {
  tx = -26 * (p - 40) / 20;
  tip.push(B(p, { tx, ty: -4 }), B(p + 2, { tx: tx - 2.6 }));
}
let back = [];
for (const p of [86, 89, 92, 95]) {
  tx = -26 + 26 * (p - 84) / 12;
  back.push(B(p, { tx, ty: -4 }), B(p + 1.5, { tx: tx + 3.2 }));
}
body('du-gz-A', L, [B(0), B(8), B(16, { r: 24 }), B(22, { r: 24 }), B(26), B(30, { r: 12 }), B(34, { r: 12 }), B(38), B(40), ...tip, B(60, { tx: -26 }), B(84, { tx: -26 }), ...back, B(98), B(100)]);
body('du-gz-sh', L, [B(0), B(40), ...[46, 52, 58].map((p) => B(p, { tx: -26 * (p - 40) / 20 * S72 })), B(60, { tx: -26 * S72 }), B(84, { tx: -26 * S72 }), B(98), B(100)]);
pair('du-gz', L, [[40, 60]], 'mSmile', 'mShh', 1);
pair('du-gz', L, [[36, 92]], 'm1', 'm2', 3);

// ——— Gratitude + Tristesse : la fleur ———
L = 8;
body('du-gt-A', L, [B(0, { r: 6 }), B(12, { r: 6 }), B(22, { r: 22 }), B(26, { r: 22 }), B(30), B(60), B(66, { r: 6 }), B(100, { r: 6 })]);
const GT0 = body_pt(115, 100, 160, undefined, undefined, 22);
const GT1 = [185, GROUND_Y];
function gt_gift(t) {
  if (t < 0.26) return [...GT0, 0];
  if (t < 0.32) return [...lerp(GT0, GT1, smooth(0.26, 0.32, t)), 1];
  if (t < 0.88) return [...GT1, 1];
  return [...GT1, 1 - smooth(0.88, 0.92, t)];
}
path('du-gt-gift', L, gt_gift, 70, 0.5);
anim('du-gt-lid', L, [[0, TF()], [32, TF()], [36, TF(2, -5, 42)], [100, TF(2, -5, 42)]]);
pair('du-gt', L, [[26, 92]], 'hold', 'hang', 0.1);
anim('du-gt-stem', L, [[0, 'transform:scale(1,0)'], [36, 'transform:scale(1,0)'], [46, 'transform:scale(1,1)'], [100, 'transform:scale(1,1)']], undefined, 'transform:scale(1,1)');
anim('du-gt-leaf', L, [[0, 'transform:scale(0)'], [42, 'transform:scale(0)'], [48, 'transform:scale(1)'], [100, 'transform:scale(1)']], undefined, 'transform:scale(1)');
anim('du-gt-head', L, [[0, 'transform:scale(0)'], [46, 'transform:scale(0)'], [51, 'transform:scale(1.15)'], [54, 'transform:scale(1)'], [100, 'transform:scale(1)']], undefined, 'transform:scale(1)');
anim('du-gt-flower', L, [[0, 'transform:rotate(0deg)'], [54, 'transform:rotate(0deg)'], [64, 'transform:rotate(4deg)'], [74, 'transform:rotate(-3deg)'],
  [84, 'transform:rotate(3deg)'], [92, 'transform:rotate(0deg)'], [100, 'transform:rotate(0deg)']]);
opac('du-gt-fade', L, [[0, 0], [35.9, 0], [36, 1], [88, 1], [92, 0], [100, 0]], 'opacity:1');
body('du-gt-rub', L, [B(0), B(6, { r: -7 }), B(12), B(18, { r: -7 }), B(24), B(30, { r: -7 }), B(36), B(42, { r: -7 }), B(48, { r: -60 }), B(88, { r: -60 }), B(94), B(100)]);
eyes('du-gt-eT', L, [[0, 0, 0], [40, 0, 0], [48, -5, 4], [88, -5, 4], [94, 0, 0], [100, 0, 0]]);
pair('du-gt', L, [[52, 88]], 'mSad', 'mSoft', 2);

// ——— Gratitude + Anxiété : les mains prises ———
L = 7;
const AH = body_pt(250, 100, 160, undefined, undefined, undefined, undefined, undefined, 100, 195);
function gx_gift(t) {
  if (t < 0.2) return [...GH, 0];
  if (t < 0.29) return [...quad(GH, [180, 95], AH, seg(t, 0.2, 0.29)), 1];
  if (t < 0.84) return [...AH, 0];
  if (t < 0.93) return [...quad(AH, [180, 95], GH, seg(t, 0.84, 0.93)), 1];
  return [...GH, 0];
}
path('du-gx-gift', L, gx_gift, 80);
anim('du-gx-gspin', L, [[0, 'transform:rotate(0deg)'], [20, 'transform:rotate(0deg)'], [29, 'transform:rotate(360deg)'], [84, 'transform:rotate(360deg)'],
  [93, 'transform:rotate(0deg)'], [100, 'transform:rotate(0deg)']]);
pair('du-gx', L, [[20, 93]], 'holdA', 'hangA', 0.1);
pair('du-gx', L, [[29, 84]], 'armW', 'holdB', 0.1);
const tw = [B(0), ...range(10).map((i) => B(1.2 + 2.4 * i, { r: i % 2 === 0 ? -3 : 1.5 }))];
body('du-gx-B', L, [...tw, B(26), B(29), B(31, { sx: 1.04, sy: 0.96 }), B(34), B(60, { ty: -1, sx: 1.02 }), B(84), B(88, { r: -3 }), B(90.4, { r: 1.5 }), B(92.8, { r: -3 }),
  B(95.2, { r: 1.5 }), B(97.6, { r: -3 }), B(100)]);
anim('du-gx-eOpen', L, [[0, 'opacity:1;' + TF(6, -7)], [26, 'opacity:1;' + TF(6, -7)], [30, 'opacity:1;' + TF(0, 6)], [36, 'opacity:1;' + TF(0, 6)],
  [38, 'opacity:0;' + TF(0, 6)], [82, 'opacity:0;' + TF(0, 6)], [84, 'opacity:1;' + TF(-4, 2)], [93, 'opacity:1;' + TF(6, -7)],
  [100, 'opacity:1;' + TF(6, -7)]]);
vis('du-gx-eShut', L, [[38, 82]], 1.5);
pair('du-gx', L, [[38, 84]], 'mTense', 'mCalm', 1.5);
body('du-gx-A', L, [B(0), B(18), B(20, { ty: -5, sx: 0.97, sy: 1.04 }), B(23), B(38), B(42, { r: 10 }), B(48, { r: 10 }), B(52), B(100)]);

// ——— Gratitude + Colère : trois offrandes ———
L = 8;
body('du-gc-A', L, [B(0, { r: 6 }), B(8, { r: 6 }), B(14, { r: 6 }), B(18, { r: 18 }), B(23, { r: 18 }), B(26, { r: 6 }), B(38, { r: 6 }), B(42, { r: 18 }), B(47, { r: 18 }), B(50, { r: 6 }),
  B(55, { r: 6 }), B(56.5, { ty: -4, r: 4, sx: 0.97, sy: 1.04 }), B(60), B(92), B(100, { r: 6 })]);
const GC0 = body_pt(110, 100, 160, undefined, -4, 4, 0.97, 1.04);
const GC1 = [212, GROUND_Y];
function gc_gift(t) {
  if (t < 0.565) return [...GC0, 0];
  if (t < 0.62) return [...quad(GC0, [165, 110], GC1, seg(t, 0.565, 0.62)), 1];
  if (t < 0.88) return [...GC1, 1];
  return [...GC1, 1 - smooth(0.88, 0.92, t)];
}
path('du-gc-gift', L, gc_gift, 80, 0.7);
pair('du-gc', L, [[56.5, 94]], 'hold', 'hang', 0.1);
body('du-gc-B', L, [B(0), B(7), B(9, { r: 12, sx: 1.04, sy: 0.96 }), B(13, { r: 12 }), B(16), B(30), B(32, { r: 12, sx: 1.04, sy: 0.96 }), B(36, { r: 12 }), B(39),
  B(52, { r: -3 }), B(58, { r: -3 }), B(61, { r: -9 }), B(64), B(66, { sx: 0.99 }), B(86, { sx: 0.99 }), B(90, { sx: 1.05, sy: 0.96 }), B(94), B(100)]);
anim('du-gc-eAngry', L, [[0, 'opacity:1;' + TF(-4, 0)], [7, 'opacity:1;' + TF(-4, 0)], [9, 'opacity:1;' + TF(6, -3)], [14, 'opacity:1;' + TF(6, -3)],
  [16, 'opacity:1;' + TF(-4, 0)], [30, 'opacity:1;' + TF(-4, 0)], [32, 'opacity:1;' + TF(6, -3)], [37, 'opacity:1;' + TF(6, -3)],
  [39, 'opacity:1;' + TF(-4, 0)], [52, 'opacity:1;' + TF(-4, 3)], [62, 'opacity:1;' + TF(-5, 5)], [64, 'opacity:0;' + TF(-5, 5)],
  [86, 'opacity:0;' + TF(-5, 5)], [88, 'opacity:1;' + TF(-4, 0)], [100, 'opacity:1;' + TF(-4, 0)]]);
vis('du-gc-eCalm', L, [[64, 86]], 1.5);
pair('du-gc', L, [[64, 88]], 'mFrown', 'mCalm', 1.5);
anim('du-gc-vein', L, [[0, 'opacity:.9;' + TF()], [4, 'opacity:1;' + TF(0, 0, 0, 1.2)], [9, 'opacity:1;' + TF(0, 0, 0, 1.6)], [14, 'opacity:1;' + TF(0, 0, 0, 1.1)],
  [20, 'opacity:.9;' + TF(0, 0, 0, 1.25)], [26, 'opacity:.9;' + TF()], [32, 'opacity:1;' + TF(0, 0, 0, 1.45)], [38, 'opacity:.9;' + TF()],
  [46, 'opacity:.8;' + TF(0, 0, 0, 1.15)], [58, 'opacity:.7;' + TF(0, 0, 0, 0.9)], [64, 'opacity:0;' + TF(0, 0, 0, 0.3)],
  [88, 'opacity:0;' + TF(0, 0, 0, 0.3)], [94, 'opacity:.9;' + TF()], [100, 'opacity:.9;' + TF()]]);
