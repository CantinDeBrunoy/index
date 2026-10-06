import { anim, B, EI, EO, f, opac } from '../lib.ts';
import { pyRound, sorted } from '../py.ts';
import { lerp, S72, seg, smooth } from './serenite.ts';
import { vis_fn } from './amour.ts';
import { duo, gaze, kval, mv, path_t, pulse, shade_of, win } from './nostalgie.ts';

// ——————————————————————————————————————————————————————————————————————————
// Anxiété + les autres. L'aiguille avance par à-coups : chaque tic est un événement de la scène.
let fn;
function tick_frames(a0, events, down_window, down, jump = 0.35) {
  // events : (pct, nouvel angle) ; l'aiguille saute en `jump` % puis attend le tic suivant
  const DW_ = vis_fn([down_window], 0.6, 1.0);
  const op = down ? ((q) => DW_(q)) : ((q) => 1 - DW_(q));
  let [pts, a] = [[[0, a0]], a0];
  for (const ev of events) {
    const [p, na] = [ev[0], ev[1]];
    const j = ev.length > 2 ? ev[2] : jump;
    pts.push([p, a], [Math.min(100, p + j), na]);
    a = na;
  }
  pts.push([100, a]);
  for (const sw of [down_window[0] - 0.6, down_window[0], down_window[1], down_window[1] + 0.6]) {
    pts.push([sw, sorted(pts).filter(([q]) => q <= sw).map(([, x]) => x).at(-1)]);
  }
  pts = sorted([...new Map(pts.map(([q, x]) => [pyRound(q, 3), [pyRound(q, 3), x]])).values()]);
  return [pts.map(([q, x]) => [q, `opacity:${f(op(q))};transform:rotate(${f(x)}deg)`]), op, pts];
}

function tick_hand(pre, dur, a0, events, down_window, poster) {
  for (const [cls, down] of [[`${pre}-handUp`, false], [`${pre}-handDown`, true]]) {
    const [fr, op, pts] = tick_frames(a0, events, down_window, down);
    const aP = pts.filter(([q]) => q <= poster).map(([, x]) => x).at(-1);
    anim(cls, dur, fr, 'linear', `opacity:${f(op(poster))};transform:rotate(${f(aP)}deg)`);
  }
}

function tick_marks(pre, dur, times, down_window) {
  const DW_ = vis_fn([down_window], 0.6, 1.0);
  for (const [cls, down] of [[`${pre}-ticUp`, false], [`${pre}-ticDown`, true]]) {
    let fr = [[0, 0]];
    for (const p of times) {
      const v = down ? DW_(p) : 1 - DW_(p);
      if (v < 0.5) continue;
      fr.push([Math.max(0, p - 0.01), 0], [p + 0.1, 0.9], [Math.min(100, p + 1.6), 0]);
    }
    fr.push([100, 0]);
    opac(cls, dur, sorted([...new Map(fr.map(([q, v]) => [q, [q, v]])).values()]), 'opacity:0');
  }
}

function spaced(p0, p1, gap) {
  let [out, p] = [[], p0];
  while (p < p1) {
    out.push(pyRound(p, 2));
    p += gap(p);
  }
  return out;
}

// ——— Anxiété + Anxiété : remettre les montres à la même heure ———
let L = 10;
let PO = 70;
let DOWNW = [60, 88];
const TA = spaced(0, 31, (_p) => 2.2);  // chacune son tic, à contretemps
const TB = TA.map((p) => pyRound(p + 1.1, 2));
const SHARED = spaced(37, 86, (p) => 2.8 + 4.2 * smooth(37, 60, p));
let TA2 = spaced(90, 99, (_p) => 2.2);
const TB2 = TA2.filter((p) => p + 1.1 < 99.5).map((p) => pyRound(p + 1.1, 2));
TA2 = TA2.slice(0, TB2.length);
let N = TA.length + SHARED.length + TA2.length;
let STEP = 360 * Math.max(1, pyRound(N * 30 / 360)) / N;
let [evA, a] = [[], 0];
for (const p of [...TA, ...SHARED, ...TA2]) {
  a += STEP;
  evA.push([p, a]);
}
const angA = (q) => [0, ...evA.filter(([p]) => p <= q).map(([, x]) => x)].at(-1);
let [evB, b] = [[], 150];
for (const p of TB) {
  b += STEP;
  evB.push([p, b]);
}
const SYNC = 34;
// l'aiguille de B tourne vers l'avant jusqu'à rejoindre celle de A (un tour de plus, à l'œil c'est la même heure)
const OFF = 360 * Math.ceil((b - angA(SYNC)) / 360 + 0.01);
evB.push([SYNC, angA(SYNC) + OFF, 1.6]);
for (const p of SHARED) {
  evB.push([p, angA(p) + OFF]);
}
const KNOCK = 88;
evB.push([KNOCK, angA(KNOCK) + OFF + 150, 0.6]);  // le sursaut les désaccorde
b = angA(KNOCK) + OFF + 150;
for (const p of TB2) {
  b += STEP;
  evB.push([p, b]);
}
tick_hand('du-qq-A', L, 0, evA, DOWNW, PO);
// la remise à l'heure : un tour rapide plutôt qu'un saut
tick_hand('du-qq-B', L, 150, evB, DOWNW, PO);
tick_marks('du-qq-A', L, [...TA, ...SHARED, ...TA2], DOWNW);
tick_marks('du-qq-B', L, [...TB, ...SHARED, ...TB2], DOWNW);
for (const [side, sg] of [['A', 1], ['B', -1]]) {
  duo(`du-qq-${side}`, L, [DOWNW], 'up', 'down', 0.6, PO);
  const own = side === 'A' ? TA : TB;
  const own2 = side === 'A' ? TA2 : TB2;
  let fr = [B(0), ...[...own.entries()].filter(([, p]) => p < 25).map(([i, p]) => B(p + 0.2, { r: i % 2 === 0 ? -3.5 : 1.5 }))];
  fr.push(B(26), B(28, { tx: 8 * sg, ty: -6, e: EI }), B(30, { tx: 16 * sg, sx: 1.04, sy: 0.96, e: EO }), B(31.5, { tx: 16 * sg }), B(34, { tx: 16 * sg }),
    B(35, { tx: 16 * sg, ty: -4, sx: 0.97, sy: 1.04 }), B(36.5, { tx: 16 * sg }));
  fr.push(...[...SHARED.entries()].filter(([, p]) => p < 58).map(([i, p]) => B(p + 0.4, { tx: 16 * sg, r: (i % 2 === 0 ? 4 : -4) * smooth(37, 50, p) })));
  fr.push(B(60, { tx: 16 * sg }), B(62, { tx: 16 * sg, ty: 1, sx: 1.03, sy: 0.96 }), B(66, { tx: 16 * sg, ty: -1.5, sx: 1.01 }), B(72, { tx: 16 * sg }),
    B(78, { tx: 16 * sg, ty: -1.5, sx: 1.01 }), B(84, { tx: 16 * sg }), B(86.5, { tx: 16 * sg }), B(87.6, { tx: 16 * sg, ty: -7, sx: 0.96, sy: 1.05, e: EI }),
    B(88.8, { tx: 16 * sg }), B(90.5, { tx: 8 * sg, ty: -6, e: EI }), B(92, { sx: 1.04, sy: 0.96, e: EO }), B(93));
  fr.push(...[...[...own2.entries()].filter(([, p]) => p > 93).map(([i, p]) => B(p + 0.2, { r: i % 2 === 0 ? -3.5 : 1.5 })), B(100)]);
  fr = mv(`du-qq-${side}`, L, fr, PO);
  mv(`du-qq-sh${side}`, L, fr.map(([p, k]) => [p, { tx: kval(k, 'tx') * S72 }]), PO);
  const look = [8 * sg, -3];
  gaze(`du-qq-${side}-eye`, L, [[0, 1, 6, -7], [26, 1, 6, -7], [28, 1, ...look], [34, 1, ...look], [36, 1, 6, -7], [56, 1, 6, -7], [57.5, 0, 6, -7],
    [87, 0, 6, -7], [88, 1, 6, -7], [100, 1, 6, -7]], PO);
  win(`du-qq-${side}-eSoft`, L, [[57.5, 87]], 1.5, PO);
  duo(`du-qq-${side}`, L, [[52, 88]], 'mTense', 'mCalm', 2, PO);
}
// l'éclair de la remise à l'heure, sur chaque cadran (position : cadran levé, personnage avancé)
for (const [side, x0] of [['A', 110], ['B', 250]]) {
  const sg = side === 'A' ? 1 : -1;
  const [cx, cy] = [x0 - 72 + (136 + 16 * sg) * S72, 56 + 96 * S72];
  fn = (t) => [cx, cy, smooth(0.349, 0.355, t) * (1 - smooth(0.37, 0.39, t)), 0.7 + 0.5 * smooth(0.35, 0.39, t)];
  path_t(`du-qq-sync${side}`, L, fn, PO / 100, [[0.34, 0.4, 0.004]], 12);
}

// ——— Anxiété + Colère : le silence ———
L = 10;
PO = 70;
DOWNW = [48, 88];
const TT = spaced(0, 45, (_p) => 2.4);
const TT2 = spaced(90, 99.5, (_p) => 2.4);
N = TT.length + TT2.length;
STEP = 360 * Math.max(1, pyRound(N * 30 / 360)) / N;
let ev;
[ev, a] = [[], 0];
for (const p of [...TT, ...TT2]) {
  a += STEP;
  ev.push([p, a]);
}
tick_hand('du-qc-A', L, 0, ev, DOWNW, PO);
tick_marks('du-qc-A', L, [...TT, ...TT2], DOWNW);
duo('du-qc-A', L, [DOWNW], 'up', 'down', 0.6, PO);
let fa = [B(0), ...[...TT.entries()].filter(([, p]) => p < 42).map(([i, p]) => B(p + 0.2, { r: i % 2 === 0 ? -3.5 : 1.5 }))];
fa.push(B(44), B(46, { r: 3 }), B(48.5, { ty: 2, sx: 1.03, sy: 0.96 }), B(50), B(53, { ty: 3, sx: 1.05, sy: 0.93 }), B(57), B(66, { ty: -1.5, sx: 1.01 }), B(74),
  B(82, { ty: -1.5, sx: 1.01 }), B(86.5), B(87.8, { ty: -7, sx: 0.96, sy: 1.05, e: EI }), B(89, { sx: 1.04, sy: 0.96 }), B(90));
fa.push(...[...[...TT2.entries()].filter(([, p]) => p > 90.5).map(([i, p]) => B(p + 0.2, { r: i % 2 === 0 ? -3.5 : 1.5 })), B(100)]);
mv('du-qc-A', L, fa, PO);
gaze('du-qc-A-eye', L, [[0, 1, 6, -7], [42, 1, 6, -7], [44, 1, 8, -1], [57, 1, 8, -1], [58.5, 0, 8, -1], [87, 0, 6, -7], [88, 1, 6, -7], [100, 1, 6, -7]], PO);
win('du-qc-A-eSoft', L, [[58.5, 87]], 1.5, PO);
duo('du-qc-A', L, [[54, 88]], 'mTense', 'mCalm', 2, PO);
// Colère : chaque tic fait battre la veine ; un tic sur deux, il tape du pied, de plus en plus fort
let [fb, vein, thud] = [[B(0)], [[0, 0.85, 1]], [[0, 0, 0.6]]];
for (const [i, p] of TT.entries()) {
  const k = p / 45;
  vein.push([p, 0.9, 1.05 + 0.3 * k], [p + 0.9, 1, 1.35 + 0.45 * k], [Math.min(p + 2.2, 45.5), 0.9, 1.1 + 0.3 * k]);
  if (i % 2 === 1) {
    const h = 5 + 15 * k;
    fb.push(B(p - 1.1, { ty: -h, sx: 0.97, sy: 1.04, e: EI }), B(p, { sx: 1.08 + 0.04 * k, sy: 0.9 - 0.03 * k, e: EO }), B(p + 0.9));
    thud.push([p - 0.1, 0, 0.6], [p, 0.7 + 0.3 * k, 0.8 + 0.3 * k], [p + 2, 0, 1.2]);
  }
}
fb.push(B(46), B(48, { sx: 1.04, sy: 0.97 }), B(50), B(53, { ty: 4, sx: 1.07, sy: 0.9 }), B(57), B(66, { ty: -1, sx: 1.01 }), B(76), B(86.5), B(87.8, { ty: -8, sx: 0.96, sy: 1.05, e: EI }),
  B(89, { sx: 1.06, sy: 0.94 }), B(90));
for (const [i, p] of TT2.entries()) {
  if (i % 2 === 1 && p > 91) fb.push(B(p - 1.1, { ty: -5, e: EI }), B(p, { sx: 1.08, sy: 0.9, e: EO }), B(p + 0.9));
}
fb.push(B(100));
fb = mv('du-qc-B', L, fb, PO);
shade_of(fb, PO, L, 'du-qc-shB', 60);
vein.push([48, 0.9, 1.2], [52, 0.6, 0.9], [60, 0, 0.3], [89, 0, 0.3], [92, 0.9, 1.1]);
for (const p of TT2) {
  if (p > 92) vein.push([p, 0.9, 1.05], [p + 0.9, 1, 1.35], [Math.min(p + 2.2, 99.9), 0.9, 1.1]);
}
vein.push([100, 0.9, 1.05]);
pulse('du-qc-vein', L, sorted([...new Map(vein.map(([q, o, s_]) => [q, [q, o, s_]])).values()]), PO);
thud.push([100, 0, 1.2]);
pulse('du-qc-thud', L, sorted([...new Map(thud.map(([q, o, s_]) => [q, [q, o, s_]])).values()]), PO);
gaze('du-qc-eAngry', L, [[0, 1, -5, 0], [40, 1, -5, 0], [48, 1, -6, -3], [57, 1, -5, -1], [58.5, 0, -5, -1], [87, 0, -5, 0], [88, 1, -5, 0], [100, 1, -5, 0]], PO);
win('du-qc-eShut', L, [[58.5, 87]], 1.5, PO);
duo('du-qc', L, [[55, 88]], 'mFrown', 'mCalm', 2, PO);
// le souffle : une volute qui monte de chaque bouche
for (const [cls, p0, p1] of [['du-qc-puffA', [124, 84], [132, 62]], ['du-qc-puffB', [236, 84], [228, 62]]]) {
  fn = (t) => [...lerp(p0, p1, smooth(0.51, 0.58, t)), 0.51 <= t && t <= 0.58 ? Math.sin(Math.PI * seg(t, 0.51, 0.58)) ** 0.6 : 0,
    0.7 + 0.5 * seg(t, 0.51, 0.58)];
  path_t(cls, L, fn, PO / 100, [[0.5, 0.59, 0.005]], 12);
}
