import { anim, B, Ball, body, css, EI, EO, eyes, IO, LIN, opac, SINE, TF } from '../lib.ts';
import { radians } from '../py.ts';

// ————————————————————————————————————————————————————————————————
// Socle commun
css.push('.du-stage{display:block;width:100%;height:100%;overflow:visible}');
anim('du-spin', 1.1, [[0, 'transform:rotate(0deg)'], [100, 'transform:rotate(360deg)']], LIN);

// Poses de base, reprises du composant validé (Character) — dans les unités du personnage.
body('du-bounce', 1.15, [B(0), B(40, { ty: -20, sx: 0.96, sy: 1.06 }), B(60, { ty: 2, sx: 1.08, sy: 0.9 }), B(80), B(100)]);
body('du-float', 3.6, [B(0), B(50, { ty: -11, r: 2 }), B(100)]);
body('du-sway', 3.4, [B(0, { r: -2.5 }), B(50, { r: 2.5 }), B(100, { r: -2.5 })], 'transform:rotate(-2.5deg)');
body('du-breathe', 5.5, [B(0), B(50, { ty: -2.5, sx: 1.012 }), B(100)]);
body('du-proud', 3, [B(0), B(50, { ty: -1, sx: 1.02 }), B(100)]);
body('du-hop', 0.78, [B(0, { tx: 4, r: -6 }), B(20, { tx: 4, ty: -19, r: -6, sx: 0.95, sy: 1.05 }), B(38, { tx: 4, r: -6, sx: 1.1, sy: 0.88 }),
  B(50, { tx: 4, r: -6 }), B(68, { tx: 4, ty: -11, r: -6 }), B(82, { tx: 4, r: -6, sx: 1.06, sy: 0.92 }), B(100, { tx: 4, r: -6 })], 'transform:translate(4px,0px) rotate(-6deg)');
body('du-check', 1.6, [B(0), B(30, { r: -4 }), B(55, { r: 1 }), B(100)]);
body('du-huff', 3.2, [B(0), B(40), B(55, { sx: 1.05, sy: 0.96 }), B(100)]);
body('du-walk', 1.4, [B(0), B(50, { ty: -3 }), B(100)]);
body('du-sleep', 4.6, [B(0), B(50, { ty: -1.5 }), B(100)]);
body('du-curl', 5.5, [B(0, { ty: 8, sy: 0.88 }), B(50, { ty: 6.5, sx: 1.012, sy: 0.89 }), B(100, { ty: 8, sy: 0.88 })], 'transform:translate(0px,8px) scale(1,.88)');
body('du-ballBounce', 0.95, [B(0), B(25, { ty: -24 }), B(50, { sx: 1.24, sy: 0.78 }), B(75, { ty: -9 }), B(100)]);
anim('du-heart', 2.6, [[0, 'opacity:0;' + TF(0, 0, 0, 0.5)], [15, 'opacity:0;' + TF(0, 0, 0, 0.5)], [30, 'opacity:1;' + TF(0, -6)],
  [70, 'opacity:.7;' + TF(0, -18)], [100, 'opacity:0;' + TF(0, -26, 0, 0.9)]]);
body('du-cloud', 4.2, [B(0), B(50, { ty: -6 }), B(100)]);
anim('du-vein', 1.1, [[0, 'opacity:.8;' + TF(0, 0, 0, 0.85)], [50, 'opacity:1;' + TF(0, 0, 0, 1.35)], [100, 'opacity:.8;' + TF(0, 0, 0, 0.85)]]);
anim('du-zzz', 2.4, [[0, 'opacity:0;' + TF()], [20, 'opacity:1;' + TF(2, -3)], [70, 'opacity:.85;' + TF(6, -10)],
  [90, 'opacity:0;' + TF(8, -13)], [100, 'opacity:0;' + TF(8, -13)]]);
body('du-rub', 1.4, [B(0), B(50, { r: -7 }), B(100)]);

// Hauteur de contact : centre du ballon posé sur la tête de Joie au sommet de son saut.
const HEAD_HIT = 66;  // Joie droite, en l'air
const HEAD_REST = 80.5;  // Joie posée au sol

// ——— Joie + Joie : une partie de têtes (1,8 s, un aller-retour) ———
let L = 1.8;
let b = new Ball(L, 450);
b.fly(0, 115, 67, 50, 245, 67, 'Joie→Léa');
b.fly(50, 245, 67, 100, 115, 67, 'Léa→Joie');
b.land(100, 115, 67);
b.emit('du-jj-bx', 'du-jj-by', [180, 20]);
function header(sign) {
  return [B(0, { ty: -14, r: 5 * sign, sx: 0.97, sy: 1.04, e: EI }), B(12, { sx: 1.08, sy: 0.92, e: EO }), B(20),
    B(34, { ty: -5 }), B(46), B(60, { ty: -5 }), B(72), B(80, { e: EI }),
    B(88, { ty: 2, r: -3 * sign, sx: 1.08, sy: 0.92, e: EO }), B(100, { ty: -14, r: 5 * sign, sx: 0.97, sy: 1.04 })];
}
body('du-jj-hopA', L, header(1));
body('du-jj-hopB', L, header(-1));
body('du-jj-sh', L, [B(0, { sx: 0.8, e: EI }), B(12, { sx: 1.06, e: EO }), B(20), B(34, { sx: 0.92 }), B(46), B(60, { sx: 0.92 }), B(72), B(80, { e: EI }),
  B(88, { sx: 1.06, e: EO }), B(100, { sx: 0.8 })]);
eyes('du-jj-eyeA', L, [[0, 1, -5], [25, 4, -7], [50, 7, -2], [75, 4, -7], [100, 1, -5]], LIN);
eyes('du-jj-eyeB', L, [[0, -7, -2], [25, -4, -7], [50, -1, -5], [75, -4, -7], [100, -7, -2]], LIN);

// ——— Joie + Sérénité : il s'essaie à la méditation, en tanguant, et ouvre un œil ———
L = 4;
body('du-js-floatA', L, [B(0), B(25, { ty: -9, r: 3 }), B(50, { ty: -16 }), B(75, { ty: -8, r: -3 }), B(100)]);
body('du-js-floatB', L, [B(0), B(50, { ty: -16, r: 1.5, sx: 1.01 }), B(100)]);
anim('du-js-sh', L, [[0, 'opacity:1;' + TF()], [50, 'opacity:.55;' + TF(0, 0, 0, 0.75)], [100, 'opacity:1;' + TF()]]);
opac('du-js-peekOpen', L, [[0, 0], [50, 0], [52.5, 1], [68, 1], [70.5, 0], [100, 0]]);
opac('du-js-peekClosed', L, [[0, 1], [50, 1], [52.5, 0], [68, 0], [70.5, 1], [100, 1]]);
anim('du-js-ox', 6, [[0, TF(-112)], [50, TF(112)], [100, TF(-112)]], SINE);
anim('du-js-oy', 6, [[0, 'opacity:.3;' + TF(0, -11)], [50, 'opacity:1;' + TF(0, 11)], [100, 'opacity:.3;' + TF(0, -11)]], SINE);

// ——— Joie + Amour : le ballon atterrit dans ses bras ouverts, qui se referment ———
L = 4;
b = new Ball(L, 700);
const HUG = 170;  // le ballon serré contre lui, sous la bouche
b.fly(0, 115, 67, 22, 250, HUG, 'Joie→câlin');
b.hold(22, 250, HUG);
b.hold(25, 250, HUG + 1.8);
b.hold(30, 250, HUG);
b.hold(40, 248.4, HUG);
b.hold(50, 251.6, HUG);
b.hold(60, 248.4, HUG);
b.hold(70, 250, HUG);
b.hold(75, 250, HUG + 2.8);
b.fly(78, 250, HUG - 6, 100, 115, 67, 'câlin→Joie');
b.land(100, 115, 67);
b.emit('du-ja-bx', 'du-ja-by', [250, HUG]);
body('du-ja-hop', L, [B(0, { ty: -14, r: 5, sx: 0.97, sy: 1.04, e: EI }), B(6, { sx: 1.08, sy: 0.92, e: EO }), B(12), B(42), B(47, { ty: -6 }), B(52), B(57, { ty: -6 }),
  B(62), B(88, { e: EI }), B(94, { ty: 2, r: -3, sx: 1.08, sy: 0.92, e: EO }), B(100, { ty: -14, r: 5, sx: 0.97, sy: 1.04 })]);
body('du-ja-sh', L, [B(0, { sx: 0.8, e: EI }), B(6, { sx: 1.06, e: EO }), B(12), B(42), B(47, { sx: 0.9 }), B(52), B(57, { sx: 0.9 }), B(62), B(88, { e: EI }),
  B(94, { sx: 1.06, e: EO }), B(100, { sx: 0.8 })]);
eyes('du-ja-eye', L, [[0, 1, -5], [8, 4, -7], [20, 7, 1], [36, 7, 1], [47, 4, -5], [60, 6, -2], [74, 7, 1], [86, 4, -7], [100, 1, -5]]);
body('du-ja-B', L, [B(0, { r: -2 }), B(16), B(22, { e: EO }), B(25, { sx: 1.06, sy: 0.94 }), B(30, { r: -3 }), B(40, { r: 3 }), B(50, { r: -3 }), B(60, { r: 3 }), B(70, { e: EI }),
  B(75, { ty: 1, sx: 1.06, sy: 0.93, e: EO }), B(80, { ty: -11, sx: 0.97, sy: 1.04, e: EI }), B(86), B(93, { r: 1 }), B(100, { r: -2 })], 'transform:rotate(-2deg)');
opac('du-ja-armHug', L, [[0, 0], [21.9, 0], [22, 1], [77.9, 1], [78, 0], [100, 0]]);
opac('du-ja-armOpen', L, [[0, 1], [21.9, 1], [22, 0], [77.9, 0], [78, 1], [100, 1]]);
for (const [cls, [ex, ey], [px, py]] of [['du-ja-h1', [-50, -34], [-24, -16]], ['du-ja-h2', [-34, -54], [-12, -30]], ['du-ja-h3', [-62, -12], [-34, -2]]]) {
  anim(cls, L, [[0, 'opacity:0;' + TF(0, 0, 0, 0.3)], [26, 'opacity:0;' + TF(0, 0, 0, 0.3)], [30, 'opacity:1;' + TF(ex * 0.15, ey * 0.15)],
    [50, 'opacity:.9;' + TF(ex, ey)], [56, 'opacity:0;' + TF(ex * 1.12, ey * 1.12, 0, 0.9)], [100, 'opacity:0;' + TF(ex * 1.12, ey * 1.12, 0, 0.9)]], IO, `transform:translate(${px}px,${py}px)`);
}

// ——— Joie + Gratitude : elle lui offre le ballon, il jongle, il le lui rend ———
L = 5.5;
const H = 171;  // le ballon tenu à deux mains
b = new Ball(L, 550);
b.hold(0, 250, H);
b.hold(3, 250, H + 1.7);
b.hold(7, 250, H);
b.hold(10, 247.5, H - 2.1);
b.hold(20, 247.5, H - 2.1);
b.hold(26, 250, H + 2.4);
b.fly(31, 249, H - 6.2, 51, 110, HEAD_HIT, 'offert→Joie');
b.fly(51, 110, HEAD_HIT, 65.5, 110, HEAD_HIT, 'jongle 1');
b.fly(65.5, 110, HEAD_HIT, 80, 115, 67, 'jongle 2');
b.fly(80, 115, 67, 100, 250, H, 'rendu');
b.land(100, 250, H);
b.emit('du-jg-bx', 'du-jg-by', [250, H]);
body('du-jg-A', L, [B(0), B(4, { ty: -7 }), B(8, { sx: 1.04, sy: 0.96 }), B(12, { ty: -7 }), B(16, { sx: 1.04, sy: 0.96 }), B(20, { ty: -7 }), B(24), B(44),
  B(47, { ty: 2, sx: 1.08, sy: 0.92, e: EO }), B(51, { ty: -14, sx: 0.97, sy: 1.04, e: EI }), B(56, { sx: 1.08, sy: 0.92, e: EO }),
  B(65.5, { ty: -14, sx: 0.97, sy: 1.04, e: EI }), B(70.5, { sx: 1.08, sy: 0.92, e: EO }), B(80, { ty: -14, r: 5, sx: 0.97, sy: 1.04, e: EI }),
  B(85, { sx: 1.08, sy: 0.92 }), B(90), B(100)]);
body('du-jg-sh', L, [B(0), B(4, { sx: 0.9 }), B(8), B(12, { sx: 0.9 }), B(16), B(20, { sx: 0.9 }), B(24), B(44), B(47, { sx: 1.06 }), B(51, { sx: 0.8 }), B(56, { sx: 1.06 }),
  B(65.5, { sx: 0.8 }), B(70.5, { sx: 1.06 }), B(80, { sx: 0.8 }), B(85, { sx: 1.06 }), B(90), B(100)]);
eyes('du-jg-eyeA', L, [[0, 6, 3], [28, 6, 3], [36, 5, -4], [44, 2, -7], [51, 0, -7], [80, 0, -7], [86, 5, -5], [96, 6, 2], [100, 6, 3]]);
body('du-jg-B', L, [B(0, { e: EO }), B(3, { ty: 1, sx: 1.05, sy: 0.94 }), B(7), B(10, { ty: -3, r: -5 }), B(20, { ty: -3, r: -5 }), B(26, { ty: 1, sx: 1.05, sy: 0.94, e: EO }),
  B(31, { ty: -7, r: -2, sx: 0.97, sy: 1.04, e: EI }), B(36), B(50), B(56, { r: -13 }), B(66, { r: -13 }), B(74), B(100)]);
opac('du-jg-armOffer', L, [[0, 1], [30.9, 1], [31, 0], [99.9, 0], [100, 1]]);
opac('du-jg-armHang', L, [[0, 0], [30.9, 0], [31, 1], [99.9, 1], [100, 0]]);

// ——— Joie + Fierté : la couronne saute sur la tête de Joie, revient, puis saut de victoire ———
L = 4.8;
const CY = 56 - 17 + 42 * 0.72;  // centre de la couronne posée
function crown_at(x0, r) {
  // centre de la couronne quand le corps (pieds en 100,200) penche de r degrés
  const a = radians(r);
  return [x0 - 72 + (100 + 158 * Math.sin(a)) * 0.72, 56 - 17 + (200 - 158 * Math.cos(a)) * 0.72];
}
b = new Ball(L, 640);
const [fx, fy] = crown_at(250, -12);
const [jx, jy] = crown_at(110, 12);
b.hold(0, 250, CY);
b.hold(11.9, 250, CY, LIN);
b.fly(12, fx, fy, 30, 110, CY, 'couronne→Joie');
b.hold(30, 110, CY, LIN);
b.hold(53.9, 110, CY, LIN);
b.fly(54, jx, jy, 72, 250, CY, 'couronne→Fierté');
b.land(72, 250, CY);
b.land(100, 250, CY);
b.emit('du-jf-cx', 'du-jf-cy', [250, CY]);
anim('du-jf-crot', L, [[0, 'transform:rotate(0deg)'], [11.9, 'transform:rotate(0deg)', LIN], [12, 'transform:rotate(-12deg)', 'cubic-bezier(.3,.1,.6,1)'],
  [30, 'transform:rotate(-360deg)', LIN], [53.9, 'transform:rotate(-360deg)', LIN], [54, 'transform:rotate(12deg)', 'cubic-bezier(.3,.1,.6,1)'],
  [72, 'transform:rotate(360deg)', LIN], [100, 'transform:rotate(360deg)']], LIN);
opac('du-jf-crownB', L, [[0, 1], [11.9, 1], [12, 0], [71.9, 0], [72, 1], [100, 1]]);
opac('du-jf-crownFly', L, [[0, 0], [11.9, 0], [12, 1], [29.9, 1], [30, 0], [53.9, 0], [54, 1], [71.9, 1], [72, 0], [100, 0]]);
opac('du-jf-crownA', L, [[0, 0], [29.9, 0], [30, 1], [53.9, 1], [54, 0], [100, 0]], 'opacity:0');
const jump = [B(77, { e: EI }), B(79, { ty: 2, sx: 1.1, sy: 0.9, e: EO }), B(85, { ty: -26, sx: 0.96, sy: 1.05, e: EI }), B(91, { sx: 1.1, sy: 0.9, e: EO }), B(96), B(100)];
body('du-jf-B', L, [B(0), B(4, { ty: -1, sy: 1.02 }), B(8, { r: 4 }), B(12, { r: -12, e: EO }), B(18), B(30), B(36, { ty: -2, sx: 1.07, sy: 1.05 }),
  B(46, { ty: -2, sx: 1.07, sy: 1.05 }), B(52), B(70, { e: EO }), B(74, { ty: 1, sx: 1.05, sy: 0.94 }), ...jump]);
body('du-jf-A', L, [B(0), B(28, { e: EO }), B(30, { e: EO }), B(32, { ty: 1, sx: 1.06, sy: 0.92 }), B(36), B(39, { ty: -2, sx: 1.07, sy: 1.05 }),
  B(46, { ty: -2, sx: 1.07, sy: 1.05 }), B(50, { r: -4 }), B(54, { r: 12, e: EO }), B(60), B(72), ...jump]);
eyes('du-jf-eyeA', L, [[0, 6, -2], [8, 6, -2], [13, 4, -6], [21, 1, -9], [30, 0, -9], [36, 0, -3], [46, 4, -3], [52, 6, -2], [60, 6, -6],
  [72, 6, -2], [78, 0, 0], [100, 6, -2]]);
eyes('du-jf-eyeB', L, [[0, -6, 1], [6, -6, 1], [13, -6, -4], [28, -6, 1], [50, -6, 1], [58, -3, -7], [70, 0, -8], [76, 0, 0], [100, -6, 1]]);

// ——— Joie + Excitation : élan, choc ventre contre ventre, retour ———
L = 1.8;
function leap(sign, base_tx = 0, base_r = 0) {
  const t = (x) => base_tx + sign * x;
  return [B(0, { tx: t(0), r: base_r }), B(16, { tx: t(0), ty: 2, r: base_r, sx: 1.1, sy: 0.88, e: EO }),
    B(36, { tx: t(30), ty: -34, r: base_r, sx: 0.96, sy: 1.05 }), B(42, { tx: t(40), ty: -28, r: base_r, sx: 0.88, sy: 1.08 }),
    B(50, { tx: t(30), ty: -28, r: base_r, e: EI }), B(68, { tx: t(0), r: base_r, sx: 1.1, sy: 0.9, e: EO }), B(76, { tx: t(0), r: base_r }),
    B(82, { tx: t(0), ty: -9, r: base_r }), B(88, { tx: t(0), r: base_r }), B(94, { tx: t(0), ty: -9, r: base_r }), B(100, { tx: t(0), r: base_r })];
}
body('du-je-A', L, leap(1));
body('du-je-B', L, leap(-1, 4, -6), 'transform:translate(4px,0px) rotate(-6deg)');
function leap_sh(sign) {
  return [B(0), B(16, { sx: 1.06 }), B(36, { tx: sign * 21.6, sx: 0.74 }), B(42, { tx: sign * 28.8, sx: 0.72 }), B(50, { tx: sign * 21.6, sx: 0.74 }),
    B(68, { sx: 1.06 }), B(76), B(82, { sx: 0.9 }), B(88), B(94, { sx: 0.9 }), B(100)];
}
body('du-je-shA', L, leap_sh(1));
body('du-je-shB', L, leap_sh(-1));
anim('du-je-burst', L, [[0, 'opacity:0;' + TF(0, 0, 0, 0.5)], [40.5, 'opacity:0;' + TF(0, 0, 0, 0.5)], [42.5, 'opacity:1;' + TF()],
  [49, 'opacity:1;' + TF(0, 0, 0, 1.15)], [55, 'opacity:0;' + TF(0, 0, 0, 1.3)], [100, 'opacity:0;' + TF(0, 0, 0, 1.3)]], IO, 'opacity:0');
opac('du-je-eOpen', L, [[0, 1], [40, 1], [41, 0], [52, 0], [53, 1], [100, 1]]);
opac('du-je-eShut', L, [[0, 0], [40, 0], [41, 1], [52, 1], [53, 0], [100, 0]]);

// ——— Joie + Nostalgie : blotti contre elle, la photo, puis le même souvenir ———
L = 4.8;
body('du-jn-A', L, [B(0, { r: 6 }), B(50, { r: 8, sx: 1.02 }), B(100, { r: 6 })], 'transform:rotate(6deg)');
body('du-jn-B', L, [B(0, { r: -2 }), B(50, { r: -4, sx: 1.02 }), B(100, { r: -2 })], 'transform:rotate(-2deg)');
body('du-jn-cloud', L, [B(0), B(50, { ty: -4 }), B(100)]);
body('du-jn-mini', 1.2, [B(0, { sx: 1.15, sy: 0.85, e: EO }), B(50, { ty: -10, e: EI }), B(100, { sx: 1.15, sy: 0.85 })]);
opac('du-jn-dot', 2, [[0, 0.3], [40, 1], [100, 0.3]]);
eyes('du-jn-eyeA', L, [[0, 6, -3], [35, 6, -3], [45, 3, -7], [80, 3, -7], [90, 6, -3], [100, 6, -3]]);

// ——— Joie + Fatigue : sur la pointe des pieds, puis le bâillement le gagne ———
L = 6;
body('du-jz-A', L, [B(0), B(3, { ty: -6 }), B(6, { sx: 1.03, sy: 0.97 }), B(9, { ty: -6 }), B(12, { sx: 1.03, sy: 0.97 }), B(15, { ty: -6 }), B(18), B(22),
  B(27, { ty: -3, r: -2, sx: 0.96, sy: 1.08 }), B(33, { ty: -3, r: -2, sx: 0.96, sy: 1.08 }), B(37), B(43, { ty: 3, r: 9 }), B(50, { ty: 4, r: 12 }),
  B(58, { ty: 3, r: 8 }), B(66, { ty: 4, r: 12 }), B(69, { ty: 3, r: 10, e: EO }), B(72, { ty: -16, sx: 0.95, sy: 1.07, e: EI }),
  B(76, { sx: 1.06, sy: 0.94 }), B(78.5, { r: -7 }), B(81, { r: 7 }), B(83, { r: -4 }), B(85), B(88, { ty: -6 }), B(91), B(94, { ty: -6 }), B(97), B(100)]);
opac('du-jz-eOpen', L, [[0, 1], [21, 1], [22.5, 0], [79.5, 0], [81, 1], [100, 1]]);
opac('du-jz-eClosed', L, [[0, 0], [22.5, 0], [23.5, 1], [34, 1], [35, 0], [40, 0], [41.5, 1], [68.5, 1], [69.5, 0], [100, 0]]);
opac('du-jz-eHalf', L, [[0, 0], [34.5, 0], [35.5, 1], [39.5, 1], [41, 0], [100, 0]]);
opac('du-jz-eWide', L, [[0, 0], [69.5, 0], [70.5, 1], [79.5, 1], [81, 0], [100, 0]]);
opac('du-jz-mSmile', L, [[0, 1], [21.5, 1], [22.5, 0], [83, 0], [84.5, 1], [100, 1]]);
opac('du-jz-mYawn', L, [[0, 0], [22.5, 0], [23.5, 1], [33, 1], [34.5, 0], [100, 0]]);
opac('du-jz-mFlat', L, [[0, 0], [34, 0], [35, 1], [68.5, 1], [69.5, 0], [100, 0]]);
opac('du-jz-mO', L, [[0, 0], [69.5, 0], [70.5, 1], [82.5, 1], [84, 0], [100, 0]]);
anim('du-jz-z', L, [[0, 'opacity:0;' + TF(0, 0, 0, 0.6)], [46, 'opacity:0;' + TF(0, 0, 0, 0.6)], [50, 'opacity:1;' + TF(2, -4)],
  [62, 'opacity:.8;' + TF(6, -12)], [67, 'opacity:0;' + TF(8, -16)], [100, 'opacity:0;' + TF(8, -16)]]);

// ——— Joie + Tristesse : pas de jeu ; il se colle à elle, elle s'appuie sur lui ———
L = 5;
body('du-jr-A', L, [B(0, { r: 8 }), B(30, { r: 8 }), B(36, { r: 13 }), B(42, { r: 8 }), B(48, { r: 12 }), B(54, { r: 8 }), B(100, { r: 8 })], 'transform:rotate(8deg)');
body('du-jr-B', L, [B(0, { ty: 8, sy: 0.88 }), B(46, { ty: 8, sy: 0.88 }), B(55, { ty: 8, r: -6, sy: 0.88 }), B(82, { ty: 8, r: -6, sy: 0.88 }), B(90, { ty: 8, sy: 0.88 }),
  B(100, { ty: 8, sy: 0.88 })], 'transform:translate(0px,8px) scale(1,.88)');
body('du-jr-rub', L, [B(0), B(7, { r: -7 }), B(14), B(21, { r: -7 }), B(28), B(35, { r: -7 }), B(42), B(49, { r: -7 }), B(55), B(88), B(94, { r: -7 }), B(100)]);
opac('du-jr-mSad', L, [[0, 1], [55, 1], [56.5, 0], [86, 0], [87.5, 1], [100, 1]]);
opac('du-jr-mSoft', L, [[0, 0], [55, 0], [56.5, 1], [86, 1], [87.5, 0], [100, 0]]);

// ——— Joie + Anxiété : « respire avec moi » ———
L = 6;
body('du-jx-A', L, [B(0), B(22, { ty: -3, sx: 1.1 }), B(28, { ty: -3, sx: 1.1 }), B(45), B(60), B(72, { ty: -3, sx: 1.1 }), B(78, { ty: -3, sx: 1.1 }), B(94), B(100)]);
opac('du-jx-aOpen', L, [[0, 1], [5, 1], [7, 0], [93, 0], [95, 1], [100, 1]], 'opacity:0');
opac('du-jx-aClosed', L, [[0, 0], [5, 0], [7, 1], [93, 1], [95, 0], [100, 0]]);
const tw = [];
for (let i = 0; i < 10; i += 1) {
  tw.push(B(i * 3.4 + 1.7, { r: i % 2 === 0 ? -4 : 1.5 }));
}
body('du-jx-B', L, [B(0), ...tw, B(36), B(50), B(72, { ty: -3, sx: 1.08 }), B(78, { ty: -3, sx: 1.08 }), B(94), B(100)]);
body('du-jx-arm', L, [B(0), B(36), B(46, { r: 150 }), B(90, { r: 150 }), B(98), B(100)], 'transform:rotate(150deg)');
opac('du-jx-bWatch', L, [[0, 1], [37, 1], [38.5, 0], [92, 0], [93.5, 1], [100, 1]], 'opacity:0');
opac('du-jx-bLook', L, [[0, 0], [37, 0], [38.5, 1], [45.5, 1], [47, 0], [100, 0]]);
opac('du-jx-bClosed', L, [[0, 0], [45.5, 0], [47, 1], [90.5, 1], [92, 0], [100, 0]]);
opac('du-jx-mTense', L, [[0, 1], [49, 1], [50.5, 0], [91, 0], [92.5, 1], [100, 1]], 'opacity:0');
opac('du-jx-mCalm', L, [[0, 0], [49, 0], [50.5, 1], [91, 1], [92.5, 0], [100, 0]], 'opacity:1');

// ——— Joie + Colère : le ballon sur sa tête, la veine gonfle… puis s'éteint ———
L = 4.8;
b = new Ball(L, 550);
b.fly(0, 115, 67, 18, 250, 81, 'Joie→tête de Colère');
b.hold(18, 250, 81);
b.hold(20, 250, 94.1);
b.hold(24, 250, 81);
b.hold(30, 255.7, 81);
b.hold(36, 244.3, 81);
b.hold(42, 253.8, 81);
b.hold(48, 246.2, 81);
b.hold(50, 250, 81);
b.hold(52, 250, 91.2);
b.fly(56, 244.4, 70.8, 74, 110, HEAD_REST, 'Colère→tête de Joie');
b.hold(74, 110, HEAD_REST);
b.hold(76, 110, HEAD_REST + 6);
b.hold(80, 110, HEAD_REST);
b.hold(84, 110, HEAD_REST - 2.2);
b.hold(88, 110, HEAD_REST);
b.hold(92, 110, HEAD_REST + 10.2, EI);
b.hold(100, 115, 67);
b.emit('du-jc-bx', 'du-jc-by', [250, 81]);
body('du-jc-A', L, [B(0, { ty: -14, r: 5, sx: 0.97, sy: 1.04, e: EI }), B(6, { sx: 1.08, sy: 0.92, e: EO }), B(11), B(42), B(45, { ty: -6 }), B(48), B(51, { ty: -6 }),
  B(54), B(72), B(74, { e: EO }), B(76, { sx: 1.06, sy: 0.94 }), B(80), B(84, { ty: -3 }), B(88), B(92, { ty: 2, sx: 1.08, sy: 0.92, e: EO }),
  B(100, { ty: -14, r: 5, sx: 0.97, sy: 1.04 })]);
body('du-jc-sh', L, [B(0, { sx: 0.8, e: EI }), B(6, { sx: 1.06, e: EO }), B(11), B(42), B(45, { sx: 0.9 }), B(48), B(51, { sx: 0.9 }), B(54), B(74), B(76, { sx: 1.04 }),
  B(80), B(92, { sx: 1.06, e: EO }), B(100, { sx: 0.8 })]);
eyes('du-jc-eyeA', L, [[0, 1, -5], [8, 4, -7], [18, 7, -2], [50, 7, -2], [60, 4, -7], [70, 1, -7], [92, 0, -7], [100, 1, -5]]);
body('du-jc-B', L, [B(0), B(18, { e: EO }), B(20, { sx: 1.08, sy: 0.88 }), B(24), B(30, { r: 3 }), B(36, { r: -3 }), B(42, { r: 2 }), B(48, { r: -2 }), B(50),
  B(52, { ty: 2, sx: 1.08, sy: 0.92, e: EO }), B(56, { ty: -10, r: -5, sx: 0.97, sy: 1.04, e: EI }), B(61, { sx: 1.04, sy: 0.96 }), B(65), B(100)]);
eyes('du-jc-eyeB', L, [[0, -5, -3], [16, -2, -6], [20, 0, -7], [50, 0, -7], [56, -6, -2], [100, -5, -3]]);
opac('du-jc-mFrown', L, [[0, 1], [38, 1], [42, 0], [95, 0], [98, 1], [100, 1]]);
opac('du-jc-mSmile', L, [[0, 0], [38, 0], [42, 1], [95, 1], [98, 0], [100, 0]]);
anim('du-jc-vein', L, [[0, 'opacity:.8;' + TF(0, 0, 0, 0.85)], [5, 'opacity:1;' + TF(0, 0, 0, 1.25)], [10, 'opacity:.8;' + TF(0, 0, 0, 0.85)],
  [15, 'opacity:1;' + TF(0, 0, 0, 1.25)], [18, 'opacity:1;' + TF()], [21, 'opacity:1;' + TF(0, 0, 0, 1.9)],
  [24, 'opacity:1;' + TF(0, 0, 0, 1.4)], [27, 'opacity:1;' + TF(0, 0, 0, 1.7)], [31, 'opacity:1;' + TF(0, 0, 0, 1.25)],
  [36, 'opacity:.9;' + TF(0, 0, 0, 1.35)], [42, 'opacity:.5;' + TF(0, 0, 0, 0.9)], [46, 'opacity:0;' + TF(0, 0, 0, 0.7)],
  [90, 'opacity:0;' + TF(0, 0, 0, 0.7)], [95, 'opacity:.9;' + TF()], [100, 'opacity:.8;' + TF(0, 0, 0, 0.85)]]);
