/**
 * Génère toutes les icônes de l'app à partir d'un seul dessin (ci-dessous).
 *   npm run icons
 *
 * Le dessin : un fanion de papel picado crème, une double croche découpée
 * dedans, accroché à la guirlande entre deux fanions turquoise et jaune, sur
 * un fond rosa mexicano → rouge. Les couleurs sont fixées ci-dessous (l'icône
 * garde la palette d'origine, plus vive que celle de l'app).
 *
 * Aucune dépendance : un rasteriseur minimal (remplissage de polygones par
 * lignes de balayage, 16 sous-lignes par pixel pour l'anticrénelage) et un
 * encodeur PNG. Le dessin n'est fait que de polygones : pas besoin d'une
 * bibliothèque d'image pour si peu. Chaque taille est dessinée directement,
 * pas réduite depuis la grande : les petites restent nettes.
 *
 * Après une modification du dessin : relancer, puis incrémenter le `?v=` des
 * icônes (src/app/+html.tsx, public/manifest.webmanifest) et `CACHE` dans
 * public/sw.js — sinon les appareils gardent l'ancienne icône en cache.
 */
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

// —— Couleurs ————————————————————————————————————————————————————————————

const ROSA = '#EC3B83';
const ROJO = '#E23A2E';
const TURQUESA = '#12B0C4';
const AMARILLO = '#FFC020';
const PAPEL = '#FFF6E9';
const TINTA = '#3A1E12';

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

// —— Dessin (grille de 1024 × 1024) ——————————————————————————————————————

const C = 512;

/** La guirlande : une corde qui s'affaisse au milieu, d'un bord à l'autre. */
const STRING_FROM = -20;
const STRING_TO = 1044;
const STRING_EDGE_Y = 150;
const STRING_SAG = 280;
function stringY(x) {
  const t = (x - STRING_FROM) / (STRING_TO - STRING_FROM);
  return STRING_EDGE_Y + STRING_SAG * t * (1 - t);
}

/**
 * Un fanion qui pend à la corde : le haut suit la corde, les côtés tombent
 * droit, le bas est une frange en dents de scie (comme `flagPath` dans
 * src/components/decor/papel-picado.tsx).
 */
function flag(left, right, height, fringe, teeth) {
  const points = [];
  for (let i = 0; i <= 48; i += 1) {
    const x = left + ((right - left) * i) / 48;
    points.push([x, stringY(x) - 2]);
  }
  const base = stringY((left + right) / 2) + height - fringe;
  const tooth = (right - left) / teeth;
  points.push([right, base]);
  for (let i = 0; i < teeth; i += 1) {
    points.push([right - (i + 0.5) * tooth, base + fringe]);
    points.push([right - (i + 1) * tooth, base]);
  }
  return points;
}

function ellipse(cx, cy, rx, ry, degrees, steps = 96) {
  const a = (degrees * Math.PI) / 180;
  return Array.from({ length: steps }, (_, i) => {
    const t = (2 * Math.PI * i) / steps;
    const x = rx * Math.cos(t);
    const y = ry * Math.sin(t);
    return [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
  });
}

const circle = (cx, cy, r) => ellipse(cx, cy, r, r, 0, 64);
const diamond = (cx, cy, r) => [
  [cx, cy - r],
  [cx + r, cy],
  [cx, cy + r],
  [cx - r, cy],
];

/** Épaissit une ligne brisée en polygone (pas de bouts arrondis : elle sort du cadre). */
function stroke(points, width) {
  const left = [];
  const right = [];
  points.forEach(([x, y], i) => {
    const [px, py] = points[Math.max(0, i - 1)];
    const [nx, ny] = points[Math.min(points.length - 1, i + 1)];
    const length = Math.hypot(nx - px, ny - py);
    const ox = (-(ny - py) / length) * (width / 2);
    const oy = ((nx - px) / length) * (width / 2);
    left.push([x + ox, y + oy]);
    right.unshift([x - ox, y - oy]);
  });
  return [...left, ...right];
}

const translate = (points, dx, dy) => points.map(([x, y]) => [x + dx, y + dy]);

/** La double croche, découpée dans le fanion central. */
function note() {
  const dx = -16;
  const dy = 14;
  const heads = [
    [438, 600],
    [622, 556],
  ];
  const parts = [];
  for (const [cx, cy] of heads) {
    parts.push(ellipse(cx, cy, 70, 52, -24));
    // La hampe part du point le plus à droite de la tête (12 px au-dessus du
    // centre, à cause de l'inclinaison) et s'arrête dans l'épaisseur de la
    // barre : aucun coin ne dépasse.
    const top = cy - 225;
    parts.push([
      [cx + 39, top],
      [cx + 67, top],
      [cx + 67, cy - 12],
      [cx + 39, cy + 8],
    ]);
  }
  parts.push([
    [477, 345],
    [689, 301],
    [689, 373],
    [477, 417],
  ]);
  return parts.map((part) => translate(part, dx, dy));
}

/**
 * Les calques, dans l'ordre de peinture. `paint` : une couleur, `background`
 * (le dégradé du fond) ou `cutout` (un trou : le fond en dessous sur l'icône
 * pleine, la transparence sur les icônes à calques d'Android).
 */
function layers() {
  const centre = flag(262, 762, 600, 50, 5);
  const sideLeft = flag(-180, 220, 470, 44, 4);
  const sideRight = flag(804, 1204, 470, 44, 4);
  const holes = (cx) => [circle(cx, stringY(cx) + 170, 26), diamond(cx, stringY(cx) + 290, 30)];
  const rope = [];
  for (let x = STRING_FROM; x <= STRING_TO; x += 8) rope.push([x, stringY(x)]);

  return [
    { tag: 'background', paint: 'background', shapes: [[[0, 0], [1024, 0], [1024, 1024], [0, 1024]]] },
    { tag: 'side', paint: { color: TURQUESA }, shapes: [sideLeft] },
    { tag: 'side', paint: 'cutout', shapes: holes(110) },
    { tag: 'side', paint: { color: AMARILLO }, shapes: [sideRight] },
    { tag: 'side', paint: 'cutout', shapes: holes(914) },
    { tag: 'shadow', paint: { color: TINTA, alpha: 0.2 }, shapes: [translate(centre, 0, 14)] },
    { tag: 'flag', paint: { color: PAPEL }, shapes: [centre] },
    { tag: 'note', paint: 'cutout', shapes: note() },
    { tag: 'string', paint: { color: TINTA }, shapes: [stroke(rope, 14)] },
  ];
}

/** Le fond : rosa mexicano en haut, rouge en bas. */
function background(y) {
  const t = Math.min(1, Math.max(0, y / 1024));
  const [a, b] = [rgb(ROSA), rgb(ROJO)];
  return a.map((v, i) => v + (b[i] - v) * t);
}

// —— Variantes ——————————————————————————————————————————————————————————

/**
 * `scale` resserre le dessin autour de (cx, cy) : la zone sûre d'Android ne
 * garde qu'un disque de 61 % du côté. Le fanion central tient dans le disque
 * de 80 % des icônes « maskable » sans retouche.
 */
const VARIANTS = {
  full: { tags: ['background', 'side', 'shadow', 'flag', 'note', 'string'], scale: 1 },
  foreground: { tags: ['side', 'shadow', 'flag', 'note', 'string'], scale: 0.78 },
  background: { tags: ['background'], scale: 1 },
  monochrome: { tags: ['flag', 'note', 'string'], scale: 0.78, white: true },
  splash: { tags: ['flag', 'note'], scale: 1.6, cy: 510 },
};

const OUTPUTS = [
  ['assets/images/icon.png', 1024, 'full'],
  ['assets/images/favicon.png', 48, 'full'],
  ['assets/images/android-icon-foreground.png', 512, 'foreground'],
  ['assets/images/android-icon-background.png', 512, 'background'],
  ['assets/images/android-icon-monochrome.png', 432, 'monochrome'],
  ['assets/images/splash-icon.png', 512, 'splash'],
  ['public/icon-512.png', 512, 'full'],
  ['public/icon-maskable-512.png', 512, 'full'],
  ['public/icon-192.png', 192, 'full'],
  ['public/apple-touch-icon.png', 180, 'full'],
];

// —— Rasteriseur ————————————————————————————————————————————————————————

const SUB = 16;

/** Couverture (0..1) de chaque pixel par un polygone, règle pair-impair. */
function cover(size, polygon, buffer) {
  let top = Infinity;
  let bottom = -Infinity;
  for (const [, y] of polygon) {
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  const first = Math.max(0, Math.floor(top * SUB));
  const last = Math.min(size * SUB, Math.ceil(bottom * SUB));
  const crossings = [];
  for (let row = first; row < last; row += 1) {
    const y = (row + 0.5) / SUB;
    crossings.length = 0;
    for (let i = 0; i < polygon.length; i += 1) {
      const [x0, y0] = polygon[i];
      const [x1, y1] = polygon[(i + 1) % polygon.length];
      if ((y0 <= y && y < y1) || (y1 <= y && y < y0)) {
        crossings.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
    }
    crossings.sort((a, b) => a - b);
    const line = Math.floor(y) * size;
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const from = Math.max(0, crossings[i]);
      const to = Math.min(size, crossings[i + 1]);
      for (let x = Math.floor(from); x < to; x += 1) {
        const overlap = Math.min(to, x + 1) - Math.max(from, x);
        if (overlap > 0) buffer[line + x] += overlap / SUB;
      }
    }
  }
}

function render(size, variantName) {
  const variant = VARIANTS[variantName];
  const k = (variant.scale * size) / 1024;
  const cy = variant.cy ?? C;
  const toPixel = ([x, y]) => [(x - C) * k + size / 2, (y - cy) * k + size / 2];
  const toDesign = (py) => (py - size / 2) / k + cy;

  // Prémultiplié : couleur × alpha, ce qui rend la superposition triviale.
  const pixels = new Float32Array(size * size * 4);
  const coverage = new Float32Array(size * size);

  for (const layer of layers()) {
    if (!variant.tags.includes(layer.tag)) continue;
    const erase = layer.paint === 'cutout' && variantName !== 'full';
    for (const shape of layer.shapes) {
      coverage.fill(0);
      cover(size, shape.map(toPixel), coverage);
      for (let i = 0; i < size * size; i += 1) {
        const c = Math.min(1, coverage[i]);
        if (c === 0) continue;
        const p = i * 4;
        if (erase) {
          for (let j = 0; j < 4; j += 1) pixels[p + j] *= 1 - c;
          continue;
        }
        let color;
        let alpha = c;
        if (layer.paint === 'background' || layer.paint === 'cutout') {
          color = background(toDesign(Math.floor(i / size) + 0.5));
        } else {
          color = rgb(layer.paint.color);
          alpha *= layer.paint.alpha ?? 1;
        }
        if (variant.white) color = [1, 1, 1];
        for (let j = 0; j < 3; j += 1) pixels[p + j] = color[j] * alpha + pixels[p + j] * (1 - alpha);
        pixels[p + 3] = alpha + pixels[p + 3] * (1 - alpha);
      }
    }
  }

  const out = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    const a = pixels[i * 4 + 3];
    for (let j = 0; j < 3; j += 1) {
      out[i * 4 + j] = a > 0 ? Math.round(Math.min(1, pixels[i * 4 + j] / a) * 255) : 0;
    }
    out[i * 4 + 3] = Math.round(a * 255);
  }
  return out;
}

// —— PNG ————————————————————————————————————————————————————————————————

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 8 bits par canal
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const [file, size, variant] of OUTPUTS) {
  writeFileSync(file, png(size, render(size, variant)));
  console.log(`${file} (${size} px, ${variant})`);
}
