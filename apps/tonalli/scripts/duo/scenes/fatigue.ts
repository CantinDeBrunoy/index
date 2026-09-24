import { anim, B, EI, EO, f, IO, LIN, TF } from '../lib.ts';
import { get, pyMod, pyRound, range, sorted } from '../py.ts';
import { f1, lerp, quad, S72, seg, smooth } from './serenite.ts';
import { vis_fn } from './amour.ts';
import { duo, gaze, kval, mv, path_t, pulse, shade_of, win } from './nostalgie.ts';

// ——————————————————————————————————————————————————————————————————————————
// Fatigue + les autres. Il dort : ses Z sont des objets de la scène, qu'on promène.
// Positions en unités de scène (le dormeur couché est posé par place(x) : x − 72 + px·0,72).
function zloop(cls, dur, a, b, period, phase, window = null, poster = null, dense = []) {
  // un Z qui naît en a, monte vers b et s'éteint, toutes les `period` (fraction de la boucle)
  function fn(t) {
    if (window && !(window[0] <= t && t <= window[1])) return [...a, 0, 0.6];
    const u = pyMod(t - phase, period) / period;
    const [x, y] = lerp(a, b, u);
    return [x + 2.5 * Math.sin(2 * Math.PI * u), y, Math.sin(Math.PI * u) ** 0.7, 0.6 + 0.5 * u];
  }
  path_t(cls, dur, fn, poster != null ? poster : 0, dense, 40);
}

function zpath(cls, dur, fn, poster, t0, t1) {
  path_t(cls, dur, fn, poster, [[t0, t1 + 0.03, 0.006]], 24);
}

function zfly(p0, p1, t0, t1, lift = 25) {
  // un Z qui vole d'un point à un autre, puis s'enfonce dans sa cible en rapetissant
  const q = [(p0[0] + p1[0]) / 2, Math.min(p0[1], p1[1]) - lift];
  function fn(t) {
    let u;
    if (t < t0) return [...p0, 0, 0.4];
    if (t < t1) {
      u = smooth(t0, t1, t);
      return [...quad(p0, q, p1, u), smooth(t0, t0 + 0.015, t), 0.4 + 0.6 * smooth(t0, t0 + 0.04, t)];
    }
    if (t < t1 + 0.025) {
      u = seg(t, t1, t1 + 0.025);
      return [...p1, 1 - u, 1 - 0.7 * u];
    }
    return [...p1, 0, 0.3];
  }
  return fn;
}

function speed_to_angle(speed, _turns_round = true, ns = 400) {
  const acc = [0.0];
  for (let i = 0; i < ns; i += 1) {
    acc.push(acc.at(-1) + speed((i + 0.5) / ns) * 100 / ns);
  }
  const k = acc.at(-1) ? pyRound(acc.at(-1) / 360) * 360 / acc.at(-1) : 1;
  return (t) => acc[Math.min(ns, Math.trunc(pyRound(t * ns)))] * k;
}

function hands(prefix, dur, ang, down_window, poster) {
  const DW = vis_fn([down_window], 0.6, 1.0);
  const pts = sorted(new Set([...range(51).map((i) => i * 2.0), down_window[0] - 0.6, down_window[0], down_window[1], down_window[1] + 0.6]));
  for (const [cls, op] of [[`${prefix}-handUp`, (p) => 1 - DW(p)], [`${prefix}-handDown`, DW]]) {
    const fr = pts.map((p) => [p, `opacity:${f(op(p))};transform:rotate(${f1(ang(p / 100))}deg)`]);
    anim(cls, dur, fr, LIN, `opacity:${f(op(poster))};transform:rotate(${f1(ang(poster / 100))}deg)`);
  }
}

// ——— Fatigue + Fatigue : la guirlande de Z ———
let L = 10;
let PO = 66;
const [EA, EB] = [[112, 140], [248, 140]];  // au-dessus des deux visages, tournés l'un vers l'autre
const [G0, GQ, G1] = [[128, 70], [180, 96], [232, 70]];
function gpt(u) {
  const [x, y] = quad(G0, GQ, G1, u);
  return [x, y + 7];
}
function sway(t) {
  return 2.5 * Math.sin(2 * Math.PI * (t - 0.44) / 0.2) * smooth(0.42, 0.47, t) * (1 - smooth(0.8, 0.84, t));
}
function zf_z(e, slot, t0) {
  const fly = zfly(e, slot, t0, t0 + 0.08);
  function fn(t) {
    if (t < t0 + 0.08) return [...fly(t).slice(0, 3), fly(t)[3]];
    if (t < 0.82) return [slot[0], slot[1] + sway(t), 1, 1];
    const u = smooth(0.82, 0.88, t);
    return [slot[0], slot[1] - 6 * u, 1 - u, 1];
  }
  return fn;
}
for (const [i, u] of [0.1, 0.26, 0.42].entries()) {
  path_t(`du-zf-a${i}`, L, zf_z(EA, gpt(u), 0.04 + 0.12 * i), PO / 100, [[0.04 + 0.12 * i, 0.13 + 0.12 * i, 0.006]], 40);
}
for (const [i, u] of [0.58, 0.74, 0.9].entries()) {
  path_t(`du-zf-b${i}`, L, zf_z(EB, gpt(u), 0.1 + 0.12 * i), PO / 100, [[0.1 + 0.12 * i, 0.19 + 0.12 * i, 0.006]], 40);
}
function zf_str(t) {
  const op = smooth(0.42, 0.46, t) * (1 - smooth(0.82, 0.88, t));
  return [0, sway(t) - 6 * smooth(0.82, 0.88, t), op];
}
path_t('du-zf-str', L, zf_str, PO / 100, [], 40);
// souffles décalés ; ils se rapprochent quand la guirlande est finie (A est retourné : tx négatif = vers la droite)
const fa = mv('du-zf-A', L, [B(0), B(25, { ty: -1.5 }), B(48), B(51, { tx: -6, ty: -4 }), B(54, { tx: -12 }), B(75, { tx: -12, ty: -1.5 }), B(92, { tx: -12 }),
  B(95, { tx: -6, ty: -3 }), B(98), B(100)], PO);
const fb = mv('du-zf-B', L, [B(0, { ty: -1.5 }), B(25), B(48, { ty: -1 }), B(51, { tx: -6, ty: -4 }), B(54, { tx: -12 }), B(62, { tx: -12, ty: -1.5 }), B(75, { tx: -12 }),
  B(92, { tx: -12 }), B(95, { tx: -6, ty: -3 }), B(98), B(100, { ty: -1.5 })], PO);
mv('du-zf-shA', L, fa.map(([p, k]) => [p, { tx: -kval(k, 'tx') * S72 }]), PO);  // A est retourné : son tx va dans l'autre sens
mv('du-zf-shB', L, fb.map(([p, k]) => [p, { tx: kval(k, 'tx') * S72 }]), PO);
for (const side of 'AB') {
  duo('du-zf', L, [[48, 90]], `m1${side}`, `m2${side}`, 1.5, PO);
}

// ——— Fatigue + Tristesse : allongée contre lui ———
L = 10;
PO = 62;
const EZ = [124, 142];
for (let i = 0; i < 3; i += 1) {
  zloop(`du-zt-z${i}`, L, EZ, [134, 114], 0.25, i / 12, undefined, PO / 100);
}
zpath('du-zt-zOver', L, zfly([116, 132], [198, 128], 0.4, 0.52, 40), PO / 100, 0.4, 0.52);
zloop('du-zt-zT', L, [180, 140], [194, 118], 0.12, 0.6, [0.6, 0.84], PO / 100);
const CURL = { ty: 8, sy: 0.88 };
const TX = -76;
export function hops4(p0, p1, x0, x1, n = 4) {
  let fr = [];
  for (let i = 0; i < n; i += 1) {
    const a = p0 + (p1 - p0) * i / n;
    const m = p0 + (p1 - p0) * (i + 0.5) / n;
    fr.push(B(a, { tx: x0 + (x1 - x0) * i / n, ty: 8, sx: 1.03, sy: 0.86, e: EO }),
      B(m, { tx: x0 + (x1 - x0) * (i + 0.5) / n, ty: 1, sy: 0.9, e: EI }));
  }
  fr.push(B(p1, { tx: x1, ...CURL }));
  return fr;
}
let zt = [B(0, { ...CURL }), B(18, { ...CURL }), B(20, { ty: 7, r: -3, sy: 0.89 }), B(22, { ...CURL }), ...hops4(22, 34, 0, TX)];
zt.push(B(34.5, { tx: TX, ...CURL }), B(36.5, { tx: TX, ty: 14, sx: 1.08, sy: 0.72, op: 1 }), B(37, { tx: TX, ty: 14, sx: 1.08, sy: 0.72, op: 0 }),
  B(86, { tx: TX, ty: 14, sx: 1.08, sy: 0.72, op: 0 }), B(86.5, { tx: TX, ty: 14, sx: 1.08, sy: 0.72, op: 1 }), B(88, { tx: TX, ty: 4, sy: 0.92 }), B(89, { tx: TX, ...CURL }));
zt.push(...[...hops4(89, 98, TX, 0), B(100, { ...CURL })]);
zt = zt.map(([p, k]) => [p, { ...k, op: get(k, 'op', 37 <= p && p <= 86 ? 0 : 1) }]);
zt = mv('du-zt-B', L, zt, PO, undefined, true);
mv('du-zt-shB', L, zt.map(([p, k]) => [p, { tx: kval(k, 'tx') * S72, op: kval(k, 'op') }]), PO, undefined, true);
mv('du-zt-rub', L, [B(0), B(6, { r: -7 }), B(12), B(18, { r: -7 }), B(22), B(92), B(96, { r: -7 }), B(100)], PO);
anim('du-zt-eT', L, [[0, 0, 0], [17, 0, 0], [20, -5, 1], [34, -5, 1], [36, 0, 0], [100, 0, 0]].map(([p, x, y]) => [p, TF(x, y)]), IO, TF());
let lie = [B(0, { sy: 0.6, op: 0 }), B(36.8, { sy: 0.6, op: 0 }), B(37, { sy: 0.6, op: 1 }), B(39, { sy: 1.06, sx: 0.97 }), B(41), B(52, { ty: -1.5 }), B(64), B(76, { ty: -1.5 }),
  B(84), B(86.3, { sy: 0.65, sx: 1.05 }), B(86.5, { sy: 0.6, op: 0 }), B(100, { sy: 0.6, op: 0 })];
lie = lie.map(([p, k]) => [p, { ...k, op: get(k, 'op', 1) }]);
mv('du-zt-L', L, lie, PO, undefined, true);
win('du-zt-shL', L, [[37, 86.5]], 0.5, PO);
duo('du-zt', L, [[44, 88]], 'm1', 'm2', 1.5, PO);

// ——— Fatigue + Anxiété : les Z sur la montre ———
L = 10;
PO = 76;
const W = [250 - 72 + 136 * S72, 56 + 96 * S72];
for (const [i, t0] of [0.08, 0.24, 0.4].entries()) {
  zpath(`du-za-f${i}`, L, zfly([160, 126], W, t0, t0 + 0.12, 45), PO / 100, t0, t0 + 0.12);
}
function za_speed(t) {
  if (t < 0.2) return 40;
  if (t < 0.36) return 22;
  if (t < 0.52) return 9;
  if (t < 0.58) return 9 * (1 - smooth(0.52, 0.58, t));
  if (t < 0.86) return 0;
  return 40 * smooth(0.86, 1, t);
}
hands('du-za', L, speed_to_angle(za_speed), [60, 88], PO);
duo('du-za', L, [[60, 88]], 'up', 'down', 0.6, PO);
function tics(p0, p1, amp) {
  const n = Math.trunc((p1 - p0) / 2.2);
  return range(n).map((i) => B(p0 + 1.1 + 2.2 * i, { r: i % 2 === 0 ? -amp : amp * 0.45 }));
}
let za = [B(0), ...tics(0, 20, 3.5), ...tics(20, 36, 2), ...tics(36, 52, 1), B(53), B(56), B(58.5, { ty: -4, sx: 0.96, sy: 1.06 }), B(60.5)];
za.push(...[B(63, { ty: 6 }), B(68, { ty: 6, r: 7 }), B(69, { ty: 6, r: 0 }), B(77, { ty: 6, r: 8 }), B(78, { ty: 6 }), B(86, { ty: 6 }), B(87.3, { ty: -9, sx: 0.96, sy: 1.05, e: EI }),
  B(89, { sx: 1.04, sy: 0.96 }), B(90), ...tics(90, 100, 3.5), B(100)]);
za = mv('du-za-B', L, za, PO);
anim('du-za-sh', L, [[0, TF()], [86.5, TF()], [87.3, TF(0, 0, 0, 0.75)], [89, TF(0, 0, 0, 1.05)], [90, TF()], [100, TF()]], IO, TF());
win('du-za-feet', L, [[62.5, 87]], 0.8, PO, true);
gaze('du-za-eye', L, [[0, 1, 6, -7], [52, 1, 6, -7], [55, 1, -3, -2], [56.5, 1, -3, -2], [57.5, 0, -3, -2], [86.8, 0, 6, -7], [87.5, 1, 6, -7], [100, 1, 6, -7]], PO);
win('du-za-eShut', L, [[57.5, 86.8]], 0.8, PO);
win('du-za-mTense', L, [[56, 88]], 1, PO, true);
win('du-za-mYawn', L, [[56.5, 60.5]], 1, PO);
win('du-za-mCalm', L, [[61, 87]], 1, PO);
zloop('du-za-zB', L, [262, 88], [276, 66], 0.08, 0.68, [0.68, 0.84], PO / 100);

// ——— Fatigue + Colère : il se retourne, ses Z éteignent la veine ———
L = 10;
PO = 76;
function roll(p, back = false) {
  const [s0, s1] = back ? [-1, 1] : [1, -1];
  return [B(p, { sx: s0, sy: 1 }), B(p + 1.3, { ty: -7, sx: 0.05 * s1, sy: 1.04 }), B(p + 2.6, { sx: 1.04 * s1, sy: 0.96 }), B(p + 3.5, { sx: s1, sy: 1 })];
}
const zc = [B(0, { sy: 1 }), B(8, { ty: -1.5, sy: 1 }), ...roll(16), B(30, { ty: -1.5, sx: -1, sy: 1 }), B(50, { sx: -1, sy: 1 }), B(70, { ty: -1.5, sx: -1, sy: 1 }), ...roll(88, true), B(100, { sy: 1 })];
mv('du-zc-A', L, zc, PO);
for (const [i, ph] of [0, 0.125].entries()) {
  zloop(`du-zc-z${i}`, L, [140, 138], [152, 112], 0.25, ph, undefined, PO / 100);
}
const V = [250 - 72 + 84 * S72, 56 + 86 * S72];
for (const [i, t0] of [0.28, 0.38, 0.48].entries()) {
  zpath(`du-zc-f${i}`, L, zfly([142, 132], V, t0, t0 + 0.08, 55), PO / 100, t0, t0 + 0.08);
}
const STOMPS = [4, 9, 14, 19];
let zb = [B(0)];
for (const p of STOMPS) {
  zb.push(B(p - 2.5, { sx: 1.05, sy: 0.95, e: EO }), B(p - 1.2, { ty: -14, sx: 0.96, sy: 1.05, e: EI }), B(p, { sx: 1.12, sy: 0.87, e: EO }), B(p + 1.2));
}
zb.push(B(24, { r: -4 }), B(28, { r: -4 }), B(36, { r: -4, sx: 1.04, sy: 0.96 }), B(37.5, { r: -3 }), B(46, { r: -3, sx: 1.03, sy: 0.97 }), B(47.5, { r: -2 }), B(56, { sx: 1.02, sy: 0.98 }),
  B(58), B(62), B(65, { ty: -4, sx: 0.96, sy: 1.06 }), B(68), B(73, { r: -5 }), B(78, { r: 4 }), B(83, { r: -5 }), B(86), B(87.3, { ty: -9, sx: 0.96, sy: 1.05, e: EI }),
  B(89, { sx: 1.06, sy: 0.94 }), B(91));
zb.push(B(93.5, { sx: 1.05, sy: 0.95, e: EO }), B(94.8, { ty: -14, sx: 0.96, sy: 1.05, e: EI }), B(96, { sx: 1.12, sy: 0.87, e: EO }), B(97.2), B(100));
zb = mv('du-zc-B', L, zb, PO);
shade_of(zb, PO, L, 'du-zc-sh', 60);
let thud = [[0, 0, 0.6]];
for (const p of [...STOMPS, 96]) {
  thud.push([p - 0.2, 0, 0.6], [p, 1, 1], [p + 2.5, 0, 1.25]);
}
thud.push([100, 0, 1.25]);
pulse('du-zc-thud', L, thud, PO);
let vein = [[0, 0.9, 1.1]];
for (const p of STOMPS) {
  vein.push([p, 1, 1.6], [p + 2.4, 1, 1.25]);
}
vein.push([24, 1, 1.4], [30, 1, 1.25], [36, 1, 1.35], [37, 0.9, 1], [46, 0.9, 1.05], [47, 0.7, 0.65], [56, 0.7, 0.7], [58, 0, 0.2], [89, 0, 0.2],
  [91, 0.9, 1.1], [96, 1, 1.6], [98.4, 1, 1.25], [100, 0.9, 1.1]);
pulse('du-zc-vein', L, sorted(vein), PO);
gaze('du-zc-eAngry', L, [[0, 1, -5, 2], [24, 1, -5, 2], [30, 1, -4, -3], [36, 1, -1, -6], [40, 1, -4, -3], [46, 1, -1, -6], [50, 1, -4, -3],
  [56, 1, -1, -6], [58, 1, -2, 0], [60, 0, -2, 0], [87, 0, -5, 2], [88, 1, -5, 2], [100, 1, -5, 2]], PO);
win('du-zc-eShut', L, [[60, 87]], 1, PO);
win('du-zc-mFrown', L, [[61, 88]], 1, PO, true);
win('du-zc-mYawn', L, [[62, 67.5]], 1, PO);
win('du-zc-mCalm', L, [[68, 87]], 1, PO);
zloop('du-zc-zB', L, [262, 86], [276, 64], 0.08, 0.7, [0.7, 0.86], PO / 100);
