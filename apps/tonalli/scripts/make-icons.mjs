/**
 * Génère les icônes PNG de l'app (aucune dépendance : encodeur PNG minimal).
 * 12 pastilles en cercle — les 12 émotions de Tonalli.
 *   node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const EMOTIONS = [
  '#FFD93D', '#A8DADC', '#FF6B9D', '#F4A261', '#E76F51', '#FF4D4D',
  '#B08BBB', '#8D99AE', '#457B9D', '#6A4C93', '#9B2226', '#D8D8D8',
];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function render(size) {
  const background = hexToRgb('#F5EAD8');
  const pixels = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i += 1) {
    pixels[i * 3] = background[0];
    pixels[i * 3 + 1] = background[1];
    pixels[i * 3 + 2] = background[2];
  }

  const center = size / 2;
  const ring = size * 0.31;
  const dot = size * 0.085;

  EMOTIONS.forEach((color, index) => {
    const [r, g, b] = hexToRgb(color);
    // On part du haut et on tourne dans le sens des aiguilles d'une montre.
    const angle = (index / EMOTIONS.length) * Math.PI * 2 - Math.PI / 2;
    const cx = center + Math.cos(angle) * ring;
    const cy = center + Math.sin(angle) * ring;

    const minX = Math.max(0, Math.floor(cx - dot - 1));
    const maxX = Math.min(size - 1, Math.ceil(cx + dot + 1));
    const minY = Math.max(0, Math.floor(cy - dot - 1));
    const maxY = Math.min(size - 1, Math.ceil(cy + dot + 1));

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        // Anticrénelage sur un pixel de large.
        const alpha = Math.min(1, Math.max(0, dot - distance + 0.5));
        if (alpha <= 0) continue;
        const offset = (y * size + x) * 3;
        pixels[offset] = Math.round(pixels[offset] * (1 - alpha) + r * alpha);
        pixels[offset + 1] = Math.round(pixels[offset + 1] * (1 - alpha) + g * alpha);
        pixels[offset + 2] = Math.round(pixels[offset + 2] * (1 - alpha) + b * alpha);
      }
    }
  });

  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 3 + 1)] = 0; // filtre « none »
    pixels.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8 bits par canal
  ihdr[9] = 2; // RVB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), render(size));
  console.log(`public/icon-${size}.png`);
}
