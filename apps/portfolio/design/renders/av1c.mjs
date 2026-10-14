// Les MP4 AV1 tels que Safari les lit. mp4-muxer (vendor/) écrit une boîte av1C vide (81 00 00 00) : profil 0,
// niveau 2.0, chrominance 4:4:4, sans en-tête de séquence. Chrome l'ignore et lit l'en-tête dans le flux ; Safari
// (là où il lit l'AV1 : Mac M3 et suivants, iPhone 15 Pro, iPad M4) règle son décodeur d'après elle, et la vidéo ne
// part jamais. fixAv1 la remplit d'après l'en-tête de séquence de la première image, l'y joint, et retire des images
// les délimiteurs temporels et le remplissage, que le format MP4 exclut (comme le fait ffmpeg).
//   node av1c.mjs <fichier-av1.mp4>…   corrige sur place ; un fichier déjà corrigé ne change pas.
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const OBU_SEQUENCE_HEADER = 1;
const OBU_TEMPORAL_DELIMITER = 2;
const OBU_PADDING = 15;

/** Les boîtes entre `start` et `end` : type, début, début du contenu, fin. */
function* boxes(buf, start, end) {
  for (let at = start; at + 8 <= end; ) {
    const size = buf.readUInt32BE(at);
    if (size < 8) throw new Error(`boîte de taille ${size} à ${at} : non prise en charge`);
    yield { type: buf.toString("latin1", at + 4, at + 8), at, body: at + 8, end: at + size };
    at += size;
  }
}
const child = (buf, parent, type, from = parent.body) => {
  for (const box of boxes(buf, from, parent.end)) if (box.type === type) return box;
  throw new Error(`boîte ${type} absente de ${parent.type}`);
};

/** Les OBU d'une image : type, début (en-tête compris), fin. */
function obus(buf) {
  const list = [];
  for (let at = 0; at < buf.length; ) {
    const header = buf[at];
    let p = at + 1 + ((header >> 2) & 1);
    let size = 0;
    if ((header >> 1) & 1) {
      for (let k = 0; ; k++) {
        const b = buf[p++];
        size += (b & 0x7f) * 2 ** (7 * k);
        if (!(b & 0x80)) break;
      }
    } else size = buf.length - p;
    list.push({ type: (header >> 3) & 0xf, start: at, payload: p, end: p + size });
    at = p + size;
  }
  return list;
}

/** Les champs de l'en-tête de séquence que reprend av1C (spécification AV1, 5.5). */
function sequenceHeader(payload) {
  let pos = 0;
  const f = (n) => {
    let v = 0;
    for (let i = 0; i < n; i++, pos++) v = v * 2 + ((payload[pos >> 3] >> (7 - (pos & 7))) & 1);
    return v;
  };
  const uvlc = () => {
    let zeros = 0;
    while (!f(1)) zeros++;
    return zeros >= 32 ? 2 ** 32 - 1 : f(zeros) + 2 ** zeros - 1;
  };
  const profile = f(3);
  f(1); // still_picture
  const reduced = f(1);
  let level = 0;
  let tier = 0;
  if (reduced) level = f(5);
  else {
    let decoderModel = 0;
    let delayBits = 0;
    if (f(1)) {
      // timing_info
      f(32);
      f(32);
      if (f(1)) uvlc();
      decoderModel = f(1);
      if (decoderModel) {
        delayBits = f(5) + 1;
        f(32);
        f(5);
        f(5);
      }
    }
    const displayDelay = f(1);
    const points = f(5) + 1;
    for (let i = 0; i < points; i++) {
      f(12); // operating_point_idc
      const l = f(5);
      const t = l > 7 ? f(1) : 0;
      if (i === 0) [level, tier] = [l, t];
      if (decoderModel && f(1)) f(2 * delayBits + 1);
      if (displayDelay && f(1)) f(4);
    }
  }
  const widthBits = f(4) + 1;
  const heightBits = f(4) + 1;
  f(widthBits);
  f(heightBits);
  if (!reduced && f(1)) f(7); // frame_id_numbers_present_flag
  f(3); // use_128x128_superblock, enable_filter_intra, enable_intra_edge_filter
  if (!reduced) {
    f(4); // interintra, masked compound, warped motion, dual filter
    const orderHint = f(1);
    if (orderHint) f(2);
    const screenContent = f(1) ? 2 : f(1);
    if (screenContent > 0 && !f(1)) f(1);
    if (orderHint) f(3);
  }
  f(3); // superres, cdef, restoration
  const high = f(1);
  const twelve = profile === 2 && high ? f(1) : 0;
  const mono = profile === 1 ? 0 : f(1);
  let [primaries, transfer, matrix] = [2, 2, 2];
  if (f(1)) [primaries, transfer, matrix] = [f(8), f(8), f(8)];
  let [ssx, ssy, position] = [1, 1, 0];
  if (mono) f(1);
  else if (primaries === 1 && transfer === 13 && matrix === 0) [ssx, ssy] = [0, 0];
  else {
    f(1); // color_range
    if (profile === 1) [ssx, ssy] = [0, 0];
    else if (profile === 2) {
      if (twelve) {
        ssx = f(1);
        ssy = ssx ? f(1) : 0;
      } else [ssx, ssy] = [1, 0];
    }
    if (ssx && ssy) position = f(2);
  }
  return { profile, level, tier, high, twelve, mono, ssx, ssy, position };
}

/** Le MP4 corrigé (une seule piste vidéo AV1, moov avant mdat, comme les écrit mp4-muxer). */
export function fixAv1(buf) {
  const top = [...boxes(buf, 0, buf.length)];
  const moov = top.find((b) => b.type === "moov");
  const mdat = top.find((b) => b.type === "mdat");
  if (!moov || !mdat || moov.at > mdat.at || top.at(-1) !== mdat) throw new Error("attendu : ftyp, moov puis mdat");
  const traks = [...boxes(buf, moov.body, moov.end)].filter((b) => b.type === "trak");
  if (traks.length !== 1) throw new Error(`${traks.length} pistes : une seule attendue`);
  const mdia = child(buf, traks[0], "mdia");
  const minf = child(buf, mdia, "minf");
  const stbl = child(buf, minf, "stbl");
  const stsd = child(buf, stbl, "stsd");
  const av01 = child(buf, stsd, "av01", stsd.body + 8);
  const av1C = child(buf, av01, "av1C", av01.body + 78);

  // Les images, dans l'ordre du fichier : un morceau (chunk) après l'autre.
  const stsz = child(buf, stbl, "stsz");
  const fixed = buf.readUInt32BE(stsz.body + 4);
  if (fixed) throw new Error("taille d'image fixe : non prise en charge");
  const count = buf.readUInt32BE(stsz.body + 8);
  const sizes = Array.from({ length: count }, (_, i) => buf.readUInt32BE(stsz.body + 12 + 4 * i));
  const stco = child(buf, stbl, "stco");
  const chunks = Array.from({ length: buf.readUInt32BE(stco.body + 4) }, (_, i) => buf.readUInt32BE(stco.body + 8 + 4 * i));
  const stsc = child(buf, stbl, "stsc");
  const runs = Array.from({ length: buf.readUInt32BE(stsc.body + 4) }, (_, i) => [buf.readUInt32BE(stsc.body + 8 + 12 * i), buf.readUInt32BE(stsc.body + 12 + 12 * i)]);
  const perChunk = chunks.map((_, c) => runs.findLast(([first]) => first <= c + 1)[1]);
  const samples = [];
  for (const [c, offset] of chunks.entries()) {
    if (c > 0 && offset < chunks[c - 1]) throw new Error("morceaux dans le désordre");
    let at = offset;
    for (let k = 0; k < perChunk[c]; k++) {
      const size = sizes[samples.length];
      samples.push(buf.subarray(at, at + size));
      at += size;
    }
  }
  if (samples.length !== count) throw new Error(`${samples.length} images trouvées, ${count} annoncées`);

  const stripped = samples.map((s) => Buffer.concat(obus(s).filter((o) => o.type !== OBU_TEMPORAL_DELIMITER && o.type !== OBU_PADDING).map((o) => s.subarray(o.start, o.end))));
  const seq = obus(samples[0]).find((o) => o.type === OBU_SEQUENCE_HEADER);
  if (!seq) throw new Error("pas d'en-tête de séquence dans la première image");
  const h = sequenceHeader(samples[0].subarray(seq.payload, seq.end));
  const config = Buffer.concat([
    Buffer.from([
      0x81,
      (h.profile << 5) | h.level,
      (h.tier << 7) | (h.high << 6) | (h.twelve << 5) | (h.mono << 4) | (h.ssx << 3) | (h.ssy << 2) | h.position,
      0,
    ]),
    samples[0].subarray(seq.start, seq.end),
  ]);
  const box = Buffer.alloc(8 + config.length);
  box.writeUInt32BE(box.length);
  box.write("av1C", 4, "latin1");
  config.copy(box, 8);

  // Le nouveau moov : av1C remplacée, ses boîtes parentes agrandies d'autant ; puis les tailles et les positions des
  // images, qui suivent av1C dans le fichier.
  const delta = box.length - (av1C.end - av1C.at);
  const head = Buffer.from(buf.subarray(moov.at, av1C.at));
  for (const parent of [moov, traks[0], mdia, minf, stbl, stsd, av01]) head.writeUInt32BE(parent.end - parent.at + delta, parent.at - moov.at);
  const newMoov = Buffer.concat([head, box, buf.subarray(av1C.end, moov.end)]);
  const shift = (box_) => box_.at - moov.at + (box_.at > av1C.at ? delta : 0);
  stripped.forEach((s, i) => newMoov.writeUInt32BE(s.length, shift(stsz) + 20 + 4 * i));
  const before = top.filter((b) => b !== mdat);
  const dataStart = before.reduce((n, b) => n + (b === moov ? newMoov.length : b.end - b.at), 0) + 8;
  let at = dataStart;
  let sample = 0;
  for (const [c, n] of perChunk.entries()) {
    newMoov.writeUInt32BE(at, shift(stco) + 16 + 4 * c);
    for (let k = 0; k < n; k++) at += stripped[sample++].length;
  }
  const data = Buffer.concat(stripped);
  const mdatHeader = Buffer.alloc(8);
  mdatHeader.writeUInt32BE(8 + data.length);
  mdatHeader.write("mdat", 4, "latin1");
  return Buffer.concat([...before.map((b) => (b === moov ? newMoov : buf.subarray(b.at, b.end))), mdatHeader, data]);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  for (const file of process.argv.slice(2)) {
    const buf = await readFile(file);
    const out = fixAv1(buf);
    if (out.equals(buf)) console.log(`= ${file}`);
    else {
      await writeFile(file, out);
      console.log(`✓ ${file}  ${Math.round(buf.length / 1024)} → ${Math.round(out.length / 1024)} Ko`);
    }
  }
}
