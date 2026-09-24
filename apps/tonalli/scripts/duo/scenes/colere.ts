import { B, EI, EO } from '../lib.ts';
import { sorted } from '../py.ts';
import { duo, gaze, mv, pulse, shade_of, win } from './nostalgie.ts';

// ——————————————————————————————————————————————————————————————————————————
// Colère + Colère : le concours de gonflette, le choc, le fou rire.
const L = 8;
const PO = 76;
const PUFFS = { A: [[8, 14, 1.12], [24, 30, 1.2]], B: [[16, 22, 1.16], [32, 38, 1.24]] };
for (const [side, sg] of [['A', 1], ['B', -1]]) {
  let fr = [B(0), B(3, { sx: 1.04, sy: 0.97 }), B(6)];
  for (const [p0, p1, k] of PUFFS[side]) {
    fr.push(B(p0, { e: EO }), B(p0 + 2, { ty: -2, sx: 0.96, sy: 1.06 }), B(p0 + 3.5, { ty: -4 * k, sx: k, sy: k - 0.04, r: -3 * sg }), B(p1 - 1, { ty: -4 * k, sx: k, sy: k - 0.04, r: -3 * sg }),
      B(p1));
  }
  fr.push(B(39.5), B(41.5, { sx: 1.1, sy: 0.88, e: EO }), B(45, { tx: 22 * sg, ty: -30, sx: 0.95, sy: 1.06, e: EI }), B(48, { tx: 42 * sg, ty: -6, sx: 0.86, sy: 1.1, e: EO }),
    B(52, { tx: 18 * sg, ty: -22, r: -10 * sg, e: EI }), B(56, { sx: 1.12, sy: 0.86, r: 6 * sg, e: EO }), B(58, { r: -6 * sg }), B(60, { r: 3 * sg }), B(62), B(64));
  for (const [i, p] of [65, 67, 69, 71, 73, 75, 77, 79, 81].entries()) {
    fr.push(B(p, { ty: -4, sx: 0.98, sy: 1.03, r: (i % 2 ? 3 : -3) * sg }), B(p + 1, { sx: 1.03, sy: 0.97 }));
  }
  fr.push(B(84), B(90), B(94, { sx: 1.04, sy: 0.97 }), B(100));
  fr = mv(`du-cc-${side}`, L, fr, PO);
  shade_of(fr, PO, L, `du-cc-sh${side}`, 60);
  let vein = [[0, 0.85, 0.9], [3, 1, 1.2], [6, 0.85, 0.9]];
  for (const [p0, p1, k] of PUFFS[side]) {
    vein.push([p0, 0.9, 1], [p0 + 3.5, 1, 1.4 * k], [p0 + 5, 1, 1.15 * k], [p1 - 1, 1, 1.5 * k], [p1, 0.9, 1.1]);
  }
  vein.push([40, 1, 1.4], [48, 1, 2.1], [52, 1, 1.5], [60, 1, 1.3], [64, 0.9, 1.2], [70, 0, 0.3], [90, 0, 0.3], [94, 0.9, 1.2], [100, 0.85, 0.9]);
  pulse(`du-cc-${side}-vein`, L, sorted([...new Map(vein.map(([q, o, s_]) => [q, [q, o, s_]])).values()]), PO);
  gaze(`du-cc-${side}-e`, L, [[0, 1, 4 * sg, -1], [40, 1, 4 * sg, -1], [48, 1, 0, 0], [56, 1, 0, 2], [60, 1, 5 * sg, 0], [63, 1, 5 * sg, 0], [64, 0, 5 * sg, 0],
    [88, 0, 4 * sg, -1], [89, 1, 4 * sg, -1], [100, 1, 4 * sg, -1]], PO);
  win(`du-cc-${side}-s`, L, [[64, 88]], 1, PO);
  duo(`du-cc-${side}`, L, [[63.5, 88]], 'mFrown', 'mLaugh', 1, PO);
}
pulse('du-cc-bang', L, [[0, 0, 0.5], [47.8, 0, 0.5], [48.3, 1, 1], [51, 1, 1.25], [53, 0, 1.4], [100, 0, 1.4]], PO);
