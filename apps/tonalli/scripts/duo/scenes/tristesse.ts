import { anim, B, EI, EO, f, opac } from '../lib.ts';
import { get, pyMod, pyRound, sorted } from '../py.ts';
import { S72, smooth } from './serenite.ts';
import { vis_fn } from './amour.ts';
import { duo, gaze, kval, mv, pulse, shade_of, win } from './nostalgie.ts';
import { hops4 } from './fatigue.ts';

// ——————————————————————————————————————————————————————————————————————————
// Tristesse + les autres. Elle ne pleure jamais : la main quitte l'œil, et c'est tout le récit.
let fr;
const CURL = { ty: 8, sy: 0.88 };
function curl(p, k = {}) {
  const d = { ...CURL };
  Object.assign(d, k);
  return B(p, { ...d });
}

function rubbing(p0, p1, phase = 0, r = -7) {
  // le frottement d'œil : aller-retour de 6 % en 6 %
  let [fr, p, i] = [[], p0, 0];
  while (p <= p1) {
    fr.push(B(p, { r: pyMod(i + phase, 2) ? r : 0 }));
    p += 3;
    i += 1;
  }
  return fr;
}

// ——— Tristesse + Tristesse : la main dans la main ———
let L = 10;
let PO = 62;
for (const [side, sg] of [['A', 1, 0], ['B', -1, 1]]) {
  fr = [curl(0), curl(16), curl(20, { r: 3 * sg }), ...hops4(22, 34, 0, 24 * sg)];
  fr.push(...[curl(36, { tx: 24 * sg }), curl(41, { tx: 24 * sg, r: 5 * sg, ty: 7, sy: 0.89 }), curl(62, { tx: 24 * sg, r: 5 * sg, ty: 6, sy: 0.9 }),
    curl(86, { tx: 24 * sg, r: 5 * sg, ty: 7, sy: 0.89 }), curl(88, { tx: 24 * sg }), ...hops4(88, 98, 24 * sg, 0), curl(100)]);
  fr = mv(`du-tt-${side}`, L, fr, PO);
  mv(`du-tt-sh${side}`, L, fr.map(([p, k]) => [p, { tx: kval(k, 'tx') * S72 }]), PO);
  gaze(`du-tt-${side}-e`, L, [[0, 1, 0, 0], [15, 1, 0, 0], [18, 1, 5 * sg, 0], [38, 1, 5 * sg, 0], [40, 0, 5 * sg, 0], [86, 0, 0, 0],
    [88, 1, 0, 0], [100, 1, 0, 0]], PO);
  win(`du-tt-${side}-s`, L, [[40, 86]], 1.5, PO);
  duo(`du-tt-${side}`, L, [[44, 86]], 'mSad', 'mSmile', 2, PO);
}
// A : sa main droite quitte l'œil et va chercher celle de B ; B baisse la sienne et tend la gauche
const ra = [...rubbing(0, 15).map(([p, k]) => [p, { ...k, op: 1 }]), B(20, { op: 1 }), B(35.5, { op: 1 }), B(36, { op: 0 }), B(87.5, { op: 0 }), B(88, { op: 1 }), B(96, { op: 1 }),
  B(98, { r: -7, op: 1 }), B(100, { op: 1 })];
mv('du-tt-A-rub', L, ra, PO, undefined, true);
mv('du-tt-B-rub', L, [...rubbing(0, 15, 1), B(20), B(36), B(40, { r: -130 }), B(86, { r: -130 }), B(92), B(96), B(100, { r: -7 })], PO);
win('du-tt-handA', L, [[36, 87]], 0.5, PO);
win('du-tt-armB', L, [[38, 87]], 0.5, PO, true);
win('du-tt-handB', L, [[38, 87]], 0.5, PO);

// ——— Tristesse + Anxiété : elle compte avec elle ———
L = 10;
PO = 72;
// les tics : serrés au début, puis de plus en plus espacés — une berceuse — et ça repart
function ta_gap(p) {
  if (p < 20) return 2.2;
  if (p < 60) return 2.2 + 4.3 * smooth(20, 60, p);
  if (p < 86) return 6.5;
  return 6.5 - 4.3 * smooth(86, 100, p);
}
const TICKS = [0.0];
while (TICKS.at(-1) + ta_gap(TICKS.at(-1)) < 99) {
  TICKS.push(TICKS.at(-1) + ta_gap(TICKS.at(-1)));
}
const STEP = 360 * Math.max(1, pyRound(TICKS.length * 30 / 360)) / TICKS.length;
const DOWN_W = [64, 88];
const DW = vis_fn([DOWN_W], 0.6, 1.0);
function hand_frames(down) {
  let fr = [];
  for (const [i, p] of TICKS.entries()) {
    const [a0, a1] = [i * STEP, (i + 1) * STEP];
    const nxt = i + 1 < TICKS.length ? TICKS[i + 1] : 100;
    for (const [q, a] of [[p, a0], [p + 0.35, a1], [nxt - 0.01, a1]]) {
      if (q <= 100) fr.push([q, a]);
    }
  }
  fr.push([100, TICKS.length * STEP]);
  fr = sorted([...new Map(fr.map(([q, a]) => [pyRound(q, 3), [pyRound(q, 3), a]])).values()]);
  for (const sw of [DOWN_W[0] - 0.6, DOWN_W[0], DOWN_W[1], DOWN_W[1] + 0.6]) {
    const a = fr.filter(([q]) => q <= sw).map(([, x]) => x).at(-1);
    fr.push([sw, a]);
  }
  fr = sorted([...new Map(fr.map(([q, a]) => [q, [q, a]])).values()]);
  const op = down ? ((q) => DW(q)) : ((q) => 1 - DW(q));
  return [fr.map(([q, a]) => [q, `opacity:${f(op(q))};transform:rotate(${f(a)}deg)`]), op];
}
for (const [cls, down] of [['du-ta-handUp', false], ['du-ta-handDown', true]]) {
  let op;
  [fr, op] = hand_frames(down);
  const aP = fr.map(([q, d]) => [q, Number(d.split('rotate(')[1].split('deg')[0])]).filter(([q]) => q <= PO).map(([, a]) => a).at(-1);
  anim(cls, L, fr, 'linear', `opacity:${f(op(PO))};transform:rotate(${f(aP)}deg)`);
}
function tic_frames(down) {
  let fr = [[0, 0]];
  for (const p of TICKS) {
    const vis_ = down ? DW(p) : 1 - DW(p);
    if (vis_ < 0.5) continue;
    fr.push([Math.max(0, p - 0.01), 0], [p + 0.1, 0.9], [Math.min(100, p + 1.6), 0]);
  }
  fr.push([100, 0]);
  return sorted([...new Map(fr.map(([q, v]) => [q, [q, v]])).values()]);
}
opac('du-ta-ticUp', L, tic_frames(false), 'opacity:0');
opac('du-ta-ticDown', L, tic_frames(true), 'opacity:0');
duo('du-ta', L, [DOWN_W], 'up', 'down', 0.6, PO);
// Anxiété : un sursaut à chaque tic au début, puis un balancement doux, calé sur le tic
let fb = [B(0)];
for (const [i, p] of TICKS.entries()) {
  if (p < 30) fb.push(B(p + 0.2, { r: i % 2 === 0 ? -3.5 : 1.5 }));
  else if (p < 86) fb.push(B(p + 0.4, { r: (i % 2 === 0 ? 5 : -5) * smooth(30, 50, p), ty: -1 }));
}
fb.push(B(86.5), B(87.8, { ty: -6, sx: 0.97, sy: 1.04, e: EI }), B(89, { sx: 1.03, sy: 0.97 }), B(90));
fb.push(...[...[...TICKS.entries()].filter(([, p]) => p > 90).map(([i, p]) => B(p + 0.2, { r: i % 2 === 0 ? -3.5 : 1.5 })), B(100)]);
mv('du-ta-B', L, fb, PO);
gaze('du-ta-eye', L, [[0, 1, 6, -7], [54, 1, 6, -7], [56, 0, 6, -7], [87, 0, 6, -7], [88, 1, 6, -7], [100, 1, 6, -7]], PO);
win('du-ta-eSoft', L, [[56, 87]], 1.5, PO);
duo('du-ta', L, [[50, 88]], 'mTense', 'mCalm', 2, PO);
// Tristesse : elle regarde, laisse retomber sa main, s'approche, et balance la tête au même tic
let fa = [curl(0), curl(18), curl(22, { r: 3 }), ...hops4(26, 32, 0, 16, 2)];
for (const [i, p] of TICKS.entries()) {
  if (34 <= p && p < 86) fa.push(curl(p + 0.4, { tx: 16, r: (i % 2 === 0 ? 7 : -5) * smooth(32, 44, p) }));
}
fa.push(...[curl(86.5, { tx: 16 }), curl(88, { tx: 16 }), ...hops4(88, 96, 16, 0, 2), curl(100)]);
fa = mv('du-ta-A', L, fa, PO);
mv('du-ta-shA', L, fa.map(([p, k]) => [p, { tx: kval(k, 'tx') * S72 }]), PO);
mv('du-ta-A-rub', L, [...rubbing(0, 18), B(22), B(28, { r: -130 }), B(88, { r: -130 }), B(94), B(97, { r: -7 }), B(100)], PO);
gaze('du-ta-A-e', L, [[0, 1, 0, 0], [18, 1, 0, 0], [21, 1, 6, -4], [58, 1, 6, -4], [60, 0, 6, -4], [87, 0, 0, 0], [88.5, 1, 0, 0], [100, 1, 0, 0]], PO);
win('du-ta-A-s', L, [[60, 87]], 1.5, PO);
duo('du-ta-A', L, [[62, 87]], 'mSad', 'mSmile', 2, PO);

// ——— Tristesse + Colère : derrière la colère, de la peine ———
L = 10;
PO = 66;
const STOMPS = [4, 9, 14, 19];
fa = [curl(0)];
for (const p of STOMPS) {
  fa.push(curl(p - 0.5), curl(p + 0.8, { ty: 10, sx: 1.03, sy: 0.85 }), curl(p + 2.5));
}
fa.push(curl(30), curl(52), curl(56, { r: 4, ty: 7, sy: 0.89 }), curl(86, { r: 4, ty: 7, sy: 0.89 }), curl(88), curl(100));
mv('du-tc-A', L, fa, PO);
mv('du-tc-A-rub', L, [...rubbing(0, 9), B(12), B(48), B(52, { r: -130 }), B(86, { r: -130 }), B(92), B(97, { r: -7 }), B(100)], PO);
gaze('du-tc-A-e', L, [[0, 1, 0, 0], [9, 1, 0, 0], [12, 1, 5, 0], [58, 1, 5, 0], [59.5, 0, 5, 0], [86, 0, 0, 0], [88, 1, 0, 0], [100, 1, 0, 0]], PO);
win('du-tc-A-s', L, [[59.5, 86]], 1.5, PO);
duo('du-tc-A', L, [[62, 86]], 'mSad', 'mSmile', 2, PO);
const TXC = -40;
const SIT = { tx: TXC, ty: 10, sx: 1.03, sy: 0.9 };
fb = [B(0)];
for (const p of STOMPS) {
  fb.push(B(p - 2.5, { sx: 1.05, sy: 0.95, e: EO }), B(p - 1.2, { ty: -14, sx: 0.96, sy: 1.05, e: EI }), B(p, { sx: 1.12, sy: 0.87, e: EO }), B(p + 1.2));
}
fb.push(...[B(24), B(28, { r: -3 }), B(31), ...hops4(32, 44, 0, TXC, 3).flatMap(([p, k]) => [B(p, { tx: k.tx, ty: k.ty - 8, sx: get(k, 'sx', 1), sy: k.sy + 0.12, e: get(k, 'e') })].map((x) => x))]);
fb.push(B(45.5, { ...SIT }), B(48, { r: 2, ...SIT }), B(50, { r: -2, ...SIT }), B(52, { r: 2, ...SIT }), B(54, { ...SIT }), B(57, { r: -8, ...SIT }), B(86, { r: -8, ...SIT }),
  B(87.5, { tx: TXC, ty: -8, sx: 0.96, sy: 1.05, e: EI }), B(89, { tx: TXC, sx: 1.04, sy: 0.96 }));
fb.push(...[...hops4(89, 98, TXC, 0, 3).flatMap(([p, k]) => [B(p, { tx: k.tx, ty: k.ty - 8, sx: get(k, 'sx', 1), sy: k.sy + 0.12, e: get(k, 'e') })].map((x) => x)), B(100)]);
fb = mv('du-tc-B', L, fb, PO);
shade_of(fb, PO, L, 'du-tc-shB', 60);
win('du-tc-feet', L, [[45.5, 87.5]], 0.8, PO, true);
let thud = [[0, 0, 0.6]];
for (const p of STOMPS) {
  thud.push([p - 0.2, 0, 0.6], [p, 1, 1], [p + 2.5, 0, 1.25]);
}
thud.push([100, 0, 1.25]);
pulse('du-tc-thud', L, thud, PO);
let vein = [[0, 0.9, 1.1]];
for (const p of STOMPS) {
  vein.push([p, 1, 1.6], [p + 2.4, 1, 1.25]);
}
vein.push([28, 1, 1.3], [34, 1, 1.15], [40, 0.9, 1.25], [46, 0.9, 1.1], [56, 0, 0.3], [88, 0, 0.3], [92, 0.9, 1.1], [96, 1, 1.4], [100, 0.9, 1.1]);
pulse('du-tc-vein', L, sorted(vein), PO);
gaze('du-tc-eAngry', L, [[0, 1, -5, 2], [22, 1, -5, 2], [26, 1, -6, 0], [57, 1, -6, 0], [58.5, 0, -6, 0], [86.5, 0, -5, 2], [87.5, 1, -5, 2], [100, 1, -5, 2]], PO);
win('du-tc-eShut', L, [[58.5, 86.5]], 1, PO);
duo('du-tc', L, [[58, 88]], 'mFrown', 'mCalm', 1.5, PO);
