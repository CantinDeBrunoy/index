import { anim, B, EI, EO, f, IO, LIN, opac, TF } from '../lib.ts';
import { get, pyRound, range, sorted, zip } from '../py.ts';
import { f1, lerp, path, quad, S72, seg, smooth } from './serenite.ts';
import { _pts, vis_fn } from './amour.ts';
import { eyeanim } from './fierte.ts';
import { clean } from './excitation.ts';

// ——————————————————————————————————————————————————————————————————————————
// Nostalgie + les autres. Chaque classe porte aussi son image « mouvement réduit »,
// prise au même instant de la scène (POSTER) : l'affiche montre le cœur du souvenir,
// pas le début de la boucle.
const KEYS = ['tx', 'ty', 'r', 'sx', 'sy', 'op'];

export function kval(k, key) {
  if (key === 'sy') return get(k, 'sy', get(k, 'sx', 1));
  return get(k, key, ['sx', 'op'].includes(key) ? 1 : 0);
}

function state_at(frames, p) {
  // pose interpolée linéairement à l'instant p (%) : sert d'image fixe
  frames = sorted(frames, (x) => x[0]);
  for (const [[p0, k0], [p1, k1]] of zip(frames, frames.slice(1))) {
    if (p0 <= p && p <= p1) {
      const u = p1 === p0 ? 0 : (p - p0) / (p1 - p0);
      return Object.fromEntries(KEYS.map((key) => [key, kval(k0, key) + (kval(k1, key) - kval(k0, key)) * u]));
    }
  }
  const k = p >= frames.at(-1)[0] ? frames.at(-1)[1] : frames[0][1];
  return Object.fromEntries(KEYS.map((key) => [key, kval(k, key)]));
}

export function mv(cls, dur, frames, poster, ease = IO, op = false) {
  // corps ou objet : images clés (pct, dict) + image fixe à `poster`
  frames = clean(frames);
  const out = [];
  for (const [p, k] of frames) {
    const d = op ? `opacity:${f(kval(k, 'op'))};` : '';
    out.push([p, d + TF(kval(k, 'tx'), kval(k, 'ty'), kval(k, 'r'), kval(k, 'sx'), kval(k, 'sy')), get(k, 'e')]);
  }
  const s_ = state_at(frames, poster);
  const stat = (op ? `opacity:${f(s_.op)};` : '') + TF(s_.tx, s_.ty, s_.r, s_.sx, s_.sy);
  anim(cls, dur, out, ease, stat);
  return frames;
}

export function shade_of(frames, poster, dur, cls, lift = 90, base_ty = 0) {
  // l'ombre suit le corps (décalage en unités de scène) et rétrécit quand il décolle
  const out = frames.map(([p, k]) => [p, { tx: kval(k, 'tx') * S72, sx: Math.max(0.3, 1 - Math.max(0, base_ty - kval(k, 'ty')) / lift * 0.5), e: get(k, 'e') }]);
  mv(cls, dur, out, poster);
}

export function win(cls, dur, windows, fade, poster, inverse = false, alpha = 1.0) {
  // visible pendant les fenêtres (ou hors d'elles si inverse)
  const v = vis_fn(windows, fade, alpha);
  const val_ = inverse ? ((p) => alpha - v(p)) : v;
  opac(cls, dur, _pts(windows, fade).map((p) => [p, val_(p)]), `opacity:${f(val_(poster))}`);
}

export function duo(prefix, dur, windows, a, b, fade, poster) {
  // a visible hors des fenêtres, b dedans
  win(`${prefix}-${a}`, dur, windows, fade, poster, true);
  win(`${prefix}-${b}`, dur, windows, fade, poster);
}

export function gaze(cls, dur, frames, poster) {
  // yeux : (pct, opacité, x, y) ; image fixe interpolée
  frames = sorted(frames);
  function at(p) {
    for (const [[p0, ...a], [p1, ...b]] of zip(frames, frames.slice(1))) {
      if (p0 <= p && p <= p1) {
        const u = p1 === p0 ? 0 : (p - p0) / (p1 - p0);
        return zip(a, b).map(([x, y]) => x + (y - x) * u);
      }
    }
    return [...frames.at(-1).slice(1)];
  }
  const [o, x, y] = at(poster);
  eyeanim(cls, dur, frames, `opacity:${f(o)};` + TF(x, y));
}

export function pulse(cls, dur, pts, poster) {
  // (pct, opacité, échelle) : une apparition qui gonfle sur place
  pts = sorted(pts);
  let stat = null;
  for (const [[p0, o0, s0], [p1, o1, s1]] of zip(pts, pts.slice(1))) {
    if (p0 <= poster && poster <= p1) {
      const u = p1 === p0 ? 0 : (poster - p0) / (p1 - p0);
      stat = `opacity:${f(o0 + (o1 - o0) * u)};` + TF(0, 0, 0, s0 + (s1 - s0) * u);
      break;
    }
  }
  anim(cls, dur, pts.map(([p, o, s_]) => [p, `opacity:${f(o)};` + TF(0, 0, 0, s_)]), IO, stat);
}

function turn(cls, dur, pts, static_deg) {
  anim(cls, dur, pts.map(([p, a]) => [p, `transform:rotate(${f(a)}deg)`]), IO, `transform:rotate(${f(static_deg)}deg)`);
}

export function path_t(cls, dur, fn, poster, dense = [], n = 72) {
  // comme path(), mais avec des échantillons serrés là où tout se joue en un instant
  let v;
  const ts = new Set(range(n + 1).map((i) => i / n));
  for (const [a_, b_, step] of dense) {
    let k = a_;
    while (k <= b_ + 1e-9) {
      ts.add(pyRound(k, 4));
      k += step;
    }
  }
  const frames = [];
  for (const t of sorted(ts)) {
    v = fn(t);
    const op = v.length > 2 ? v[2] : null;
    const sc = v.length > 3 ? v[3] : 1;
    frames.push([100 * t, (op != null ? `opacity:${f(op)};` : '') + `transform:translate(${f1(v[0])}px,${f1(v[1])}px) scale(${f(sc)})`]);
  }
  v = fn(poster);
  const stat = (v.length > 2 ? `opacity:${f(v[2])};` : '') + `transform:translate(${f(v[0])}px,${f(v[1])}px) scale(${f(v.length > 3 ? v[3] : 1)})`;
  anim(cls, dur, frames, LIN, stat);
}

const FLOAT = (_L_) => [B(0), B(25, { ty: -2 }), B(50), B(75, { ty: -2 }), B(100)];

// ——— Nostalgie + Nostalgie : les deux moitiés du même souvenir ———
let L = 9;
let PO = 66;
function nn_body(sg) {
  const s = (v) => v * sg;
  return [B(0), B(6, { ty: -2.5, sx: 1.012 }), B(12), B(19, { r: s(2) }), B(23.5, { r: s(-3) }), B(26, { e: EO }), B(27.5),
    B(29.5, { tx: s(3.2), e: EO }), B(30.8, { tx: s(3.2), ty: -3.5, sx: 0.98, sy: 1.03 }), B(32.2, { tx: s(3.2), sx: 1.02, sy: 0.98 }), B(34, { tx: s(3.2) }),
    B(42, { tx: s(3.2), ty: -1.5 }), B(50, { tx: s(3.2) }), B(58, { tx: s(3.2), ty: -1.5 }), B(66, { tx: s(3.2) }), B(74, { tx: s(3.2), ty: -1.5 }),
    B(82, { tx: s(3.2) }), B(86, { tx: s(3.2) }), B(88.5), B(94, { ty: -2.5, sx: 1.012 }), B(100)];
}
mv('du-nn-A', L, nn_body(1), PO);
mv('du-nn-B', L, nn_body(-1), PO);
for (const [side, sg] of [['A', 1], ['B', -1]]) {
  duo('du-nn', L, [[26, 88]], `hold${side}`, `reach${side}`, 0.4, PO);
  win(`du-nn-eSoft${side}`, L, [[14, 88.5]], 1, PO, true);
  gaze(`du-nn-eLook${side}`, L, [[0, 0, 4 * sg, -6], [13, 0, 4 * sg, -6], [14.5, 1, 4 * sg, -6], [19, 1, 4 * sg, -6], [21, 1, 6 * sg, -1],
    [25, 1, 6 * sg, -1], [27, 1, 6 * sg, -3], [34, 1, 6 * sg, -3], [38, 1, 3 * sg, -6], [48, 1, 2 * sg, -7],
    [80, 1, 2 * sg, -7], [84, 1, 6 * sg, -1], [88, 1, 6 * sg, -1], [89, 0, 6 * sg, -1], [100, 0, 4 * sg, -6]], PO);
  duo('du-nn', L, [[31, 87]], `mW${side}`, `mS${side}`, 1.5, PO);
}
pulse('du-nn-spark', L, [[0, 0, 0.5], [30, 0, 0.5], [31, 1, 1], [33.5, 1, 1.12], [35.5, 0, 1.25], [100, 0, 1.25]], PO);
const NN_C = [180, 50];
function nn_small(p0) {
  function fn(t) {
    let u;
    if (t < 0.34) return [...p0, 0, 0.3];
    if (t < 0.38) {
      u = smooth(0.34, 0.38, t);
      return [p0[0], p0[1] + 8 * (1 - u), u, 0.3 + 0.7 * u];
    }
    u = smooth(0.38, 0.48, t);
    const [x, y] = lerp(p0, NN_C, u);
    return [x, y, 1 - smooth(0.45, 0.49, t), 1 - 0.15 * u];
  }
  return fn;
}
path('du-nn-bA', L, nn_small([135, 64]), 90, PO / 100);
path('du-nn-bB', L, nn_small([225, 64]), 90, PO / 100);
function nn_big(t) {
  const op = smooth(0.45, 0.48, t) * (1 - smooth(0.83, 0.88, t));
  const sc = 0.45 + 0.63 * smooth(0.45, 0.485, t) - 0.08 * smooth(0.485, 0.51, t) + 0.1 * smooth(0.83, 0.88, t);
  return [...NN_C, op, sc];
}
path('du-nn-big', L, nn_big, 90, PO / 100);
mv('du-nn-grow', L, FLOAT(L), PO);
win('du-nn-tA', L, [[49, 83]], 2, PO);
win('du-nn-tB', L, [[49, 83]], 2, PO);

// ——— Nostalgie + Fatigue : la pensée devient son rêve ———
L = 9;
PO = 64;
const Z0 = [160, 52];  // la bulle, au-dessus de Nostalgie
const Z1 = [242, 102];  // la bulle, au-dessus du dormeur
function nz_cloud(t) {
  let u;
  if (t < 0.2) return [...Z0, 1, 1];
  if (t < 0.42) return [...quad(Z0, [212, 38], Z1, smooth(0.2, 0.42, t)), 1, 1];
  if (t < 0.84) return [...Z1, 1, 1];
  if (t < 0.9) {
    u = smooth(0.84, 0.89, t);
    return [Z1[0], Z1[1] - 6 * u, 1 - u, 1 + 0.15 * u];
  }
  u = smooth(0.91, 0.97, t);
  return [...Z0, u, 0.35 + 0.65 * u];
}
path('du-nz-cloud', L, nz_cloud, 90, PO / 100);
mv('du-nz-grow', L, FLOAT(L), PO);
win('du-nz-tA', L, [[-10, 20], [91, 110]], 2, PO);
win('du-nz-tB', L, [[43, 84]], 2, PO);
duo('du-nz', L, [[44, 88]], 'm1', 'm2', 1.5, PO);
mv('du-nz-A', L, [B(0), B(8, { ty: -2, sx: 1.01 }), B(16), B(19.5, { r: -2 }), B(23, { r: 5 }), B(28, { r: 2 }), B(50, { r: 2, ty: -1.5 }), B(70, { r: 2 }), B(84, { r: 2 }), B(90),
  B(95, { ty: -2, sx: 1.01 }), B(100)], PO);
duo('du-nz', L, [[18, 86]], 'eSoft', 'eLook', 1, PO);
duo('du-nz', L, [[47, 90]], 'mW', 'mS', 1.5, PO);

// ——— Nostalgie + Tristesse : la photo d'un jour heureux ———
L = 9;
PO = 70;
mv('du-nt-A', L, [B(0), B(6, { ty: -2, sx: 1.01 }), B(11), B(13, { r: -2 }), B(15, { r: 3, e: EO }), B(40, { r: 3, ty: -1 }), B(60, { r: 3 }), B(64, { r: 3, ty: -2, sx: 0.99, sy: 1.02 }),
  B(68, { r: 3 }), B(84, { r: 3 }), B(86.5), B(94, { ty: -2, sx: 1.01 }), B(100)], PO);
duo('du-nt', L, [[14, 86]], 'hold', 'reach', 0.4, PO);
duo('du-nt', L, [[12, 86]], 'eSoft', 'eLook', 1, PO);
duo('du-nt', L, [[60, 86]], 'mW', 'mS', 1.5, PO);
const CURL = { ty: 8, sy: 0.88 };
function nt_hops(p0, p1, x0, x1, n) {
  let fr = [];
  for (let i = 0; i < n; i += 1) {
    const a = p0 + (p1 - p0) * i / n;
    const m = p0 + (p1 - p0) * (i + 0.5) / n;
    const xa = x0 + (x1 - x0) * i / n;
    const xm = x0 + (x1 - x0) * (i + 0.5) / n;
    fr.push(B(a, { tx: xa, ty: 8, sx: 1.03, sy: 0.86, e: EO }), B(m, { tx: xm, ty: 1, sy: 0.9, e: EI }));
  }
  fr.push(B(p1, { tx: x1, ty: 8, sx: 1.03, sy: 0.86 }));
  return fr;
}
const TB = -18;
let nt = [B(0, { ...CURL }), B(12, { ty: 7, sx: 1.01, sy: 0.89 }), B(24, { ...CURL }), B(27, { ty: 6, r: -3, sy: 0.9 }), B(36, { ty: 6, r: -3, sy: 0.9 })];
nt.push(...nt_hops(38, 50, 0, TB, 3));
nt.push(B(52, { tx: TB, ...CURL }), B(58, { tx: TB, ty: 7, sy: 0.89 }), B(62, { tx: TB, ty: 5, r: -4, sy: 0.91 }), B(84, { tx: TB, ty: 5, r: -4, sy: 0.91 }), B(86, { tx: TB, ...CURL }));
nt.push(...nt_hops(87, 96, TB, 0, 3));
nt.push(B(100, { ...CURL }));
nt = mv('du-nt-B', L, nt, PO);
shade_of(nt, PO, L, 'du-nt-shB', 40, 8);
mv('du-nt-rub', L, [B(0), B(6, { r: -7 }), B(12), B(18, { r: -7 }), B(24), B(30), B(36, { r: -130 }), B(88, { r: -130 }), B(95), B(97.5, { r: -7 }), B(100)], PO);
const eyes_nt = [[0, 0, 0], [25, 0, 0], [28, -5, -3], [36, -5, -3], [40, -4, -2], [52, -6, -3], [86, -6, -3], [92, -2, -1], [96, 0, 0], [100, 0, 0]];
anim('du-nt-eT', L, eyes_nt.map(([p, x, y]) => [p, TF(x, y)]), IO, TF(-6, -3));
duo('du-nt', L, [[58, 86]], 'mSad', 'mSmile', 2, PO);

// ——— Nostalgie + Anxiété : le futur qui presse, le passé qui rassure ———
L = 8;
PO = 64;
mv('du-nx-A', L, [B(0), B(6, { ty: -2, sx: 1.01 }), B(13), B(15, { r: -2 }), B(17, { r: 3, e: EO }), B(40, { r: 3, ty: -1 }), B(60, { r: 3 }), B(84, { r: 3 }), B(86.5),
  B(94, { ty: -2, sx: 1.01 }), B(100)], PO);
duo('du-nx', L, [[16, 86]], 'hold', 'reach', 0.4, PO);
const tics = [B(0), ...range(13).map((i) => B(1.1 + 2.2 * i, { r: i % 2 === 0 ? -3.5 : 1.5 }))];
let nx = [...tics, B(30), B(33, { r: -3 }), B(38, { r: -3 }), B(40.5, { ty: 2, sx: 1.03, sy: 0.96 }), B(43), B(50, { ty: -1.5, sx: 1.01 }), B(58), B(66, { ty: -1.5, sx: 1.01 }), B(74),
  B(82, { ty: -1.5, sx: 1.01 }), B(86.5), B(88.2, { ty: -7, sx: 0.96, sy: 1.05, e: EI }), B(90, { sx: 1.04, sy: 0.96 })];
nx.push(...[...range(4).map((i) => B(91.1 + 2.2 * i, { r: i % 2 === 0 ? -3.5 : 1.5 })), B(100)]);
mv('du-nx-B', L, nx, PO);
duo('du-nx', L, [[40, 90]], 'up', 'down', 0.6, PO);
gaze('du-nx-eye', L, [[0, 1, 6, -7], [28, 1, 6, -7], [31, 1, -5, -2], [43, 1, -5, -2], [44.5, 0, -5, -2], [86, 0, -2, -3], [87.5, 1, -2, -3],
  [90, 1, 6, -7], [100, 1, 6, -7]], PO);
win('du-nx-eSoft', L, [[44.5, 86.5]], 1, PO);
duo('du-nx', L, [[41, 88]], 'mTense', 'mCalm', 1.5, PO);
// l'aiguille : vite, puis de plus en plus lentement pendant qu'elle regarde la photo, puis repart
function nx_speed(t) {
  if (t < 0.3) return 72;
  if (t < 0.4) return 72 - 22 * smooth(0.3, 0.4, t);
  if (t < 0.7) return 50 - 48 * smooth(0.4, 0.7, t);
  if (t < 0.86) return 2 - 1 * smooth(0.7, 0.86, t);
  return 1 + 71 * smooth(0.86, 1, t);
}
const NS = 400;
const acc_ = [0.0];
for (let i = 0; i < NS; i += 1) {
  acc_.push(acc_.at(-1) + nx_speed((i + 0.5) / NS) * 100 / NS);
}
const turns = pyRound(acc_.at(-1) / 360) * 360;
function nx_ang(t) {
  return acc_[Math.min(NS, Math.trunc(pyRound(t * NS)))] * turns / acc_.at(-1);
}
const DOWN = vis_fn([[40, 90]], 0.6, 1.0);
function hand(cls, down) {
  // même angle pour les deux aiguilles à chaque instant : seule l'opacité dit laquelle on voit
  const pts = sorted(new Set([...range(51).map((i) => i * 2.0), 39.4, 40, 40.6, 89.4, 90, 90.6]));
  const op = down ? ((p) => DOWN(p)) : ((p) => 1 - DOWN(p));
  const fr = pts.map((p) => [p, `opacity:${f(op(p))};transform:rotate(${f1(nx_ang(p / 100))}deg)`]);
  anim(cls, L, fr, LIN, `opacity:${f(op(PO))};transform:rotate(${f1(nx_ang(PO / 100))}deg)`);
}
hand('du-nx-handUp', false);
hand('du-nx-handDown', true);

// ——— Nostalgie + Colère : froissée, dépliée, rendue ———
L = 10;
PO = 60;
const R0 = [110 - 72 + 176 * S72, 56 + 96 * S72];  // centre de la photo tendue par Nostalgie
const G1 = [206, 193];  // là où elle retombe, devant Colère
const [BALL0, BALL1] = [[192, 196], [184, 196]];  // la boule écrasée, puis roulée d'un coup de pied
const U = [183, 193];  // la photo dépliée
const V = [171, 193];  // poussée jusqu'aux pieds de Nostalgie
function nc_photo(t) {
  let u;
  if (t < 0.175) return [...R0, 0, 1];
  if (t < 0.26) return [...quad(R0, [188, -5], G1, seg(t, 0.175, 0.26)), 1, 1];
  if (t < 0.27) return [G1[0], G1[1] - 4 * Math.sin(Math.PI * seg(t, 0.26, 0.27)), 1, 1];
  if (t < 0.31) return [...G1, 1, 1];
  if (t < 0.5) return [...U, 0, 0.4];
  if (t < 0.535) {
    u = smooth(0.5, 0.535, t);
    return [...U, smooth(0.5, 0.51, t), 0.4 + 0.68 * smooth(0.5, 0.52, t) - 0.08 * smooth(0.52, 0.535, t)];
  }
  if (t < 0.685) return [...U, 1, 1];
  if (t < 0.75) {
    u = seg(t, 0.685, 0.75);
    return [...lerp(U, V, 1 - (1 - u) ** 2), 1, 1];
  }
  if (t < 0.77) return [...V, 1, 1];
  if (t < 0.84) return [...quad(V, [175, 110], R0, seg(t, 0.77, 0.84)), 1, 1];
  return [...R0, 0, 1];
}
path_t('du-nc-photo', L, nc_photo, PO / 100, [[0.175, 0.27, 0.005], [0.5, 0.54, 0.005], [0.685, 0.75, 0.005], [0.77, 0.84, 0.005]]);
turn('du-nc-prot', L, [[0, 0], [17.5, 0], [26, 720], [77, 720], [84, 1080], [100, 1080]], 720);
function nc_ball(t) {
  if (t < 0.31) return [...BALL0, 0, 0.8];
  if (t < 0.32) return [...BALL0, 1, 0.8 + 0.3 * seg(t, 0.31, 0.32)];
  if (t < 0.33) return [...BALL0, 1, 1.1 - 0.1 * seg(t, 0.32, 0.33)];
  if (t < 0.34) return [...BALL0, 1, 1 - 0.15 * seg(t, 0.33, 0.34)];
  if (t < 0.36) return [...BALL0, 1, 0.85 + 0.15 * smooth(0.34, 0.36, t)];
  if (t < 0.46) return [...BALL0, 1, 1];
  if (t < 0.49) return [...lerp(BALL0, BALL1, smooth(0.46, 0.49, t)), 1, 1];
  if (t < 0.51) return [...BALL1, 1 - smooth(0.49, 0.51, t), 1 + 0.35 * smooth(0.49, 0.51, t)];
  return [...BALL1, 0, 1.35];
}
path_t('du-nc-ball', L, nc_ball, PO / 100, [[0.305, 0.365, 0.0025], [0.46, 0.515, 0.005]]);
turn('du-nc-bRot', L, [[0, 0], [46, 0], [49, -50], [100, -50]], -50);
function nc_gust(t) {
  if (t < 0.145 || t > 0.195) return [236, 155, 0];
  const u = seg(t, 0.145, 0.195);
  const [x, y] = lerp([236, 155], [184, 130], u);
  return [x, y, Math.sin(Math.PI * u) ** 0.5, 0.8 + 0.4 * u];
}
path_t('du-nc-gust', L, nc_gust, PO / 100, [[0.14, 0.2, 0.005]]);
// Nostalgie
duo('du-nc', L, [[17.5, 84]], 'reach', 'empty', 0.3, PO);
mv('du-nc-A', L, [B(0), B(6, { ty: -2, sx: 1.01 }), B(12), B(17), B(18.7, { r: -6, ty: -2, e: EO }), B(22, { r: -2 }), B(26), B(30.5), B(31.5, { r: -3, sx: 1.03, sy: 0.97 }),
  B(34), B(44, { ty: 1, sx: 1.02, sy: 0.98 }), B(50), B(55), B(57, { ty: -3, sx: 0.98, sy: 1.03 }), B(60), B(76), B(80.5, { r: 4 }), B(84, { e: EO }),
  B(85.5, { ty: -2.5, sx: 0.98, sy: 1.03 }), B(87.5), B(94, { ty: -2, sx: 1.01 }), B(100)], PO);
win('du-nc-eSoftA', L, [[17, 86]], 0.8, PO, true);
gaze('du-nc-eLookA', L, [[0, 0, 5, -5], [17, 0, 5, -5], [17.8, 1, 5, -5], [21, 1, 6, -6], [26, 1, 6, 3], [46, 1, 6, 3], [50, 1, 6, 2], [56, 1, 6, -1],
  [66, 1, 6, -1], [70, 1, 6, 3], [78, 1, 5, 4], [83, 1, 5, -2], [85.5, 1, 5, -2], [86.5, 0, 5, -2], [100, 0, 5, -5]], PO);
win('du-nc-mWA', L, [[17.5, 26], [56, 95]], 1, PO, true);
win('du-nc-mOA', L, [[17.5, 26]], 1, PO);
win('du-nc-mSA', L, [[56, 95]], 1.5, PO);
// Colère
const ST = -30;
let nc = [B(0), B(5, { sx: 1.04, sy: 0.97 }), B(10), B(12.5, { ty: -3, sx: 0.95, sy: 1.07, e: EI }), B(15, { sx: 1.13, sy: 0.87, e: EO }), B(17, { sx: 1.08, sy: 0.92 }), B(19),
  B(26, { r: -2 }), B(28, { r: -2, sx: 1.08, sy: 0.9, e: EO }), B(29.7, { tx: ST / 2, ty: -28, r: -2, sx: 0.95, sy: 1.06, e: EI }), B(31, { tx: ST, sx: 1.15, sy: 0.84, e: EO }),
  B(32.5, { tx: ST, ty: -9, sx: 0.97, sy: 1.04, e: EI }), B(34, { tx: ST, sx: 1.12, sy: 0.87, e: EO }), B(36, { tx: ST }), B(44, { tx: ST, ty: 1 }), B(46, { tx: ST }),
  B(47.5, { tx: ST, r: -7 }), B(49.5, { tx: ST, r: 2 }), B(51, { tx: ST }), B(53, { tx: ST, ty: -5, sx: 0.97, sy: 1.04 }), B(55, { tx: ST }), B(58, { tx: ST, r: -3 }),
  B(62, { tx: ST, r: 3 }), B(66, { tx: ST }), B(67.5, { tx: ST, r: 4 }), B(69, { tx: ST - 4, r: -9, e: EO }), B(71, { tx: ST }), B(86, { tx: ST, sx: 1.05, sy: 0.95, e: EO }),
  B(88, { tx: ST / 2, ty: -12, e: EI }), B(90, { sx: 1.06, sy: 0.94, e: EO }), B(92), B(96, { sx: 1.04, sy: 0.97 }), B(100)];
nc = mv('du-nc-B', L, nc, PO);
shade_of(nc, PO, L, 'du-nc-shB', 60);
gaze('du-nc-eAngry', L, [[0, 1, -4, -1], [12, 1, -4, -1], [14.5, 1, -4, -2], [18, 1, -5, -5], [22, 1, -3, -6], [26, 1, -3, 5], [29, 1, -3, 6],
  [31, 1, -1, 7], [46, 1, -2, 7], [50, 1, -4, 6], [54, 1, -4, 5], [55, 0, -4, 5], [94, 0, -4, -1], [95, 1, -4, -1],
  [100, 1, -4, -1]], PO);
win('du-nc-eSoft', L, [[55, 94]], 1, PO);
duo('du-nc', L, [[55, 95]], 'mFrown', 'mSmile', 1.5, PO);
const vein = [[0, 0.8, 0.85], [5.5, 1, 1.35], [11, 0.8, 0.85], [12.5, 1, 1.2], [15, 1, 1.65], [18, 1, 1.3], [22, 1, 1.6], [26, 1, 1.3], [29, 1, 1.5],
  [31, 1, 1.7], [34, 1, 1.4], [38, 0.9, 1.3], [46, 0, 0.5], [95, 0, 0.4], [97.5, 0.9, 1.2], [100, 0.8, 0.85]];
pulse('du-nc-vein', L, vein, PO);
