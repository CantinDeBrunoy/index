/**
 * Génère les icônes de l'app à partir de la géométrie du logo (src/lib/logo.ts).
 *   npm run icons
 *
 * Aucune dépendance : un rasteriseur minimal (distance au tracé, anticrénelage
 * sur un pixel) et un encodeur PNG. Le logo n'est fait que de segments et de
 * courbes de Bézier : pas besoin d'une bibliothèque d'image pour si peu.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

import {
  BODY_PATH,
  EYES_PATH,
  ICON_FIT,
  ICON_INK,
  ICON_PAPER,
  LOGO_SIZE,
  MASKABLE_FIT,
  faviconSvg,
  logoGeometry,
  type LogoVariant,
} from '../src/lib/logo.ts';

type Point = [number, number];
type Rgb = [number, number, number];

// —— Tracés ——————————————————————————————————————————————————————————————

/** Aplatit un tracé SVG (M, L, C, Q, Z absolus : c'est tout ce que le logo emploie). */
function flatten(d: string, steps = 32): { points: Point[]; closed: boolean }[] {
  const tokens = d.match(/[MLCQZ]|-?\d*\.?\d+/g) ?? [];
  const paths: { points: Point[]; closed: boolean }[] = [];
  let current: Point[] = [];
  let i = 0;
  const num = () => Number(tokens[i++]);
  let command = '';
  while (i < tokens.length) {
    if (/[MLCQZ]/.test(tokens[i])) command = tokens[i++];
    const last = current[current.length - 1];
    if (command === 'M') {
      current = [[num(), num()]];
      paths.push({ points: current, closed: false });
    } else if (command === 'L') {
      current.push([num(), num()]);
    } else if (command === 'C') {
      const c1: Point = [num(), num()];
      const c2: Point = [num(), num()];
      const end: Point = [num(), num()];
      for (let s = 1; s <= steps; s += 1) {
        const t = s / steps;
        const u = 1 - t;
        current.push([
          u * u * u * last[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * end[0],
          u * u * u * last[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * end[1],
        ]);
      }
    } else if (command === 'Q') {
      const c: Point = [num(), num()];
      const end: Point = [num(), num()];
      for (let s = 1; s <= steps; s += 1) {
        const t = s / steps;
        const u = 1 - t;
        current.push([
          u * u * last[0] + 2 * u * t * c[0] + t * t * end[0],
          u * u * last[1] + 2 * u * t * c[1] + t * t * end[1],
        ]);
      }
    } else if (command === 'Z') {
      paths[paths.length - 1].closed = true;
    }
  }
  return paths;
}

function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length2 = dx * dx + dy * dy;
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length2));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

function polylineDistance(p: Point, points: Point[], closed: boolean): number {
  let best = Infinity;
  const count = closed ? points.length : points.length - 1;
  for (let k = 0; k < count; k += 1) {
    best = Math.min(best, segmentDistance(p, points[k], points[(k + 1) % points.length]));
  }
  return best;
}

function inside(p: Point, points: Point[]): boolean {
  let result = false;
  for (let k = 0, j = points.length - 1; k < points.length; j = k, k += 1) {
    const [xi, yi] = points[k];
    const [xj, yj] = points[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) result = !result;
  }
  return result;
}

// —— Formes, en pixels ——————————————————————————————————————————————————————

/** Couverture d'un pixel par la forme (0 à 1), à partir de la distance au tracé. */
type Shape = { color: Rgb; coverage: (p: Point) => number; box: [number, number, number, number] };

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function boxOf(points: Point[], pad: number): [number, number, number, number] {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
}

function stroke(points: Point[], closed: boolean, width: number, color: Rgb): Shape {
  const half = width / 2;
  return {
    color,
    box: boxOf(points, half + 1),
    coverage: (p) => clamp01(half - polylineDistance(p, points, closed) + 0.5),
  };
}

function fill(points: Point[], color: Rgb): Shape {
  return {
    color,
    box: boxOf(points, 1),
    coverage: (p) => {
      const distance = polylineDistance(p, points, true);
      return clamp01(0.5 + (inside(p, points) ? distance : -distance));
    },
  };
}

function hexToRgb(hex: string): Rgb {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/**
 * Les formes du logo, dans l'ordre où elles se peignent : rayons, corps, trait,
 * paupières. `ink` à `null` : silhouette seule (le badge), corps évidé.
 */
function logoShapes(size: number, fit: number, variant: LogoVariant, ink: Rgb, paper: Rgb | null): Shape[] {
  const g = logoGeometry(variant);
  const unit = size / LOGO_SIZE;
  const offset = (LOGO_SIZE / 2) * (1 - fit);
  const toPixel = (x: number, y: number): Point => [(offset + fit * x) * unit, (offset + fit * y) * unit];
  const fromBody = ([x, y]: Point): Point => toPixel(g.body.tx + g.body.scale * x, g.body.ty + g.body.scale * y);
  const width = (w: number) => w * fit * unit;

  const shapes: Shape[] = g.rays.map((ray) =>
    stroke([toPixel(ray.x1, ray.y1), toPixel(ray.x2, ray.y2)], false, width(g.rayWidth), paper ? hexToRgb(ray.color) : ink),
  );
  const [body] = flatten(BODY_PATH).map((path) => path.points.map(fromBody));
  if (paper) shapes.push(fill(body, paper));
  shapes.push(stroke(body, true, width(g.body.strokeWidth), ink));
  if (g.eyesWidth !== null) {
    for (const eye of flatten(EYES_PATH)) shapes.push(stroke(eye.points.map(fromBody), false, width(g.eyesWidth), ink));
  }
  return shapes;
}

/** Peint les formes sur un fond ; `background` à `null` : fond transparent (RVBA). */
function paint(size: number, shapes: Shape[], background: Rgb | null): { data: Buffer; channels: 3 | 4 } {
  const channels = background ? 3 : 4;
  const data = Buffer.alloc(size * size * channels);
  for (let i = 0; i < size * size; i += 1) {
    if (background) data.set(background, i * 3);
  }
  for (const shape of shapes) {
    const [x0, y0, x1, y1] = shape.box.map((v) => Math.round(v));
    for (let y = Math.max(0, y0); y <= Math.min(size - 1, y1); y += 1) {
      for (let x = Math.max(0, x0); x <= Math.min(size - 1, x1); x += 1) {
        const alpha = shape.coverage([x + 0.5, y + 0.5]);
        if (alpha <= 0) continue;
        const offset = (y * size + x) * channels;
        if (channels === 3) {
          for (let c = 0; c < 3; c += 1) data[offset + c] = Math.round(data[offset + c] * (1 - alpha) + shape.color[c] * alpha);
        } else {
          // Silhouette d'une seule couleur : seul l'alpha s'accumule.
          data.set(shape.color, offset);
          data[offset + 3] = Math.round(255 - (255 - data[offset + 3]) * (1 - alpha));
        }
      }
    }
  }
  return { data, channels };
}

// —— PNG ——————————————————————————————————————————————————————————————————

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size: number, { data, channels }: { data: Buffer; channels: 3 | 4 }): Buffer {
  const stride = size * channels;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // filtre « none »
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8 bits par canal
  ihdr[9] = channels === 3 ? 2 : 6; // RVB ou RVBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// —— Sorties ————————————————————————————————————————————————————————————————

const ink = hexToRgb(ICON_INK);
const paper = hexToRgb(ICON_PAPER);

function write(name: string, content: Buffer | string) {
  writeFileSync(new URL(`../public/${name}`, import.meta.url), content);
  console.log(`public/${name}`);
}

// Les icônes d'écran d'accueil : le personnage reste incolore, les rayons portent la palette.
for (const [name, size, fit] of [
  ['icon-192.png', 192, ICON_FIT],
  ['icon-512.png', 512, ICON_FIT],
  ['apple-touch-icon.png', 180, ICON_FIT],
  ['icon-maskable-512.png', 512, MASKABLE_FIT],
] as const) {
  write(name, png(size, paint(size, logoShapes(size, fit, 'full', ink, paper), paper)));
}

// Le badge des notifications Android : l'OS n'en garde que l'alpha. Silhouette
// blanche, version réduite (il s'affiche à 24 dp dans la barre d'état).
const white: Rgb = [255, 255, 255];
write('badge-96.png', png(96, paint(96, logoShapes(96, 0.96, 'small', white, null), null)));

write('favicon.svg', faviconSvg());
