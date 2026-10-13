// Les passages d'une escale à la suivante (passage-scenes.js) : ce que le site en lit.
//   node passage-render.mjs               → pour les passages « sprites », la planche du format ordinateur (2560 × 1440,
//                                           comme la vidéo) et téléphone (780 × 760, cadré comme sa boucle) dans
//                                           public/voyage/passage/ ; pour tous, src/data/passages.json (planches,
//                                           départs des clips, point vers lequel plonger)
//   MODE=sheet SCENE=route [START=3] OUT=x.png node passage-render.mjs [mobile]
//                                         → une planche d'images d'un passage, monde compris (pour le régler)
// Les vidéos des passages « clip » se rendent comme les autres (voyage-render.mjs, scène « <escale>-passage »).
// La page est le moteur (anim.html) et les scènes, assemblés ici comme le fait build-voyage.cjs.
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, extname, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const dir = process.env.RENDER_DIR ?? fileURLToPath(new URL(".", import.meta.url));
const repo = process.env.REPO_DIR ?? join(dir, "../../../..");
const site = join(repo, "apps/portfolio");
const sharp = createRequire(pathToFileURL(join(site, "package.json")))("sharp");
const { chromium } = createRequire(pathToFileURL(join(repo, "package.json")))("playwright-core");
const MODE = process.env.MODE ?? "data";
// Les fonds et le cadrage du téléphone : ceux des boucles (BG et BOXES dans voyage-render.mjs).
const BG = { espace: "#0B0C14", terre: "#10131C", avion: "#DCE9F0", paris: "#DCE3EA", monuments: "#E0E8DA", route: "#F2DFD3", maison: "#F1E7DA", salon: "#F3D5B5", calendrier: "#D8C2C6" };
const BOXES = {
  espace: [0.06, 0.1, 0.76, 0.66],
  terre: [0.22, 0.06, 0.94, 0.92],
  avion: [0.24, -0.04, 0.8, 1.02],
  paris: [0.12, 0.1, 0.96, 0.94],
  monuments: [0.09, -0.04, 0.91, 1.0],
  route: [0.08, 0.12, 0.94, 0.96],
  maison: [0.16, 0.14, 0.88, 0.84],
  salon: [0.18, 0.04, 0.9, 0.96],
  calendrier: [0.14, 0.02, 0.86, 0.98],
};
const PHONE = { w: 780, h: 760 };
const DESKTOP = { w: 2560, h: 1440 };

const anim = readFileSync(join(dir, "anim.html"), "utf8");
const scenes = ["voyage-scenes.js", "decollage-scenes.js", "passage-scenes.js"].map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
const expose = "window.__P = { renderer, canvas, THREE, PASSAGES, PASSAGE_FPS };";
const html = anim.replace("window.ready = true;", () => `${scenes}\n${expose}\nwindow.ready = true;`);

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".glb": "model/gltf-binary", ".geojson": "application/json", ".stl": "model/stl" };
const server = createServer(async (req, res) => {
  try {
    const rel = normalize(decodeURIComponent(new URL(req.url, "http://local").pathname)).replace(/^[\\/]+/, "");
    if (rel.startsWith("..")) throw new Error("hors du dossier");
    const body = rel === "passage.html" ? html : await readFile(join(dir, rel));
    res.writeHead(200, { "content-type": TYPES[extname(rel)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));

const browser = await chromium.launch({ channel: "msedge", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1300, height: 820 } });
page.on("pageerror", (e) => console.error("page error:", e.message));
page.on("console", (m) => (m.type() === "error" || m.text().startsWith("§")) && !m.text().includes("404") && console.log(m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/passage.html`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 120_000 });

/** Dans la page : où tombe un point du monde sur l'image (en % de sa largeur et de sa hauteur). */
function project([x, y, z]) {
  const { THREE } = window.__P;
  const cur = window.__current;
  cur.scene.updateMatrixWorld(true);
  // La caméra n'est pas dans la scène : sa matrice ne suit qu'au rendu.
  cur.camera.updateMatrixWorld(true);
  const v = new THREE.Vector3(x, y, z).project(cur.camera);
  return [+(((v.x + 1) / 2) * 100).toFixed(2), +(((1 - v.y) / 2) * 100).toFixed(2)];
}

/**
 * Dans la page : rend l'objet seul, image par image, découpe chaque image à sa boîte (alpha), range les découpes sur
 * une planche ; ajoute la pièce de fond qui cache l'objet de la boucle (bords fondus) et, pour chaque phase de son
 * cycle, le décalage de son centre par rapport à la phase 0 (le site part de la phase affichée).
 */
async function sprites({ name, w, h, box, bg, pad, feather, sheetW }) {
  const { renderer, canvas, THREE, PASSAGES, PASSAGE_FPS } = window.__P;
  window.setupScene(`${name}-passage`, "light", 0xb08a4f, w, h, box);
  const cur = window.__current;
  const P = PASSAGES[name];
  const S = cur.obj.userData.sprite;
  const laps = cur.obj.userData.passage.laps ?? 1;
  const show = (world, objects) => {
    for (const o of S.world) o.visible = world;
    for (const o of S.objects) o.visible = objects && o.visible;
  };
  const scratch = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const sc = scratch.getContext("2d", { willReadFrequently: true });
  /** Rend la scène et renvoie la boîte des pixels non transparents, et leur centre (pondéré par l'alpha). */
  const grab = () => {
    renderer.render(cur.scene, cur.camera);
    sc.clearRect(0, 0, w, h);
    sc.drawImage(canvas, 0, 0);
    const d = sc.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1, sa = 0, sx = 0, sy = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = d[(y * w + x) * 4 + 3];
        if (!a) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        sa += a;
        sx += a * x;
        sy += a * y;
      }
    }
    return x1 < 0 ? null : { x0, y0, x1, y1, cx: sx / sa, cy: sy / sa };
  };

  // — L'objet dans la boucle, sur un cycle : son enveloppe, et son centre à chaque phase. Des objets ajoutés (absents
  //   de la boucle) n'en ont pas : rien à cacher, rien à rattraper. —
  renderer.setClearColor(0x000000, 0);
  const PHASES = 96;
  const bob = [];
  let env = null;
  for (let k = 0; k < PHASES; k++) {
    S.loopAt((2 * Math.PI * laps * (P.cycle / P.loop) * k) / PHASES);
    show(false, true);
    const b = grab();
    if (!b) break;
    env = env ? { x0: Math.min(env.x0, b.x0), y0: Math.min(env.y0, b.y0), x1: Math.max(env.x1, b.x1), y1: Math.max(env.y1, b.y1) } : b;
    bob.push([b.cx, b.cy]);
  }
  const offsets = bob.map(([x, y]) => [+(x - bob[0][0]).toFixed(2), +(y - bob[0][1]).toFixed(2)]);

  // — Les images du départ, chacune découpée à sa boîte —
  const frames = [];
  const n = Math.round(P.end * PASSAGE_FPS);
  for (let f = 0; f < n; f++) {
    S.loopAt(0);
    S.departAt(f / PASSAGE_FPS);
    show(false, true);
    const b = grab();
    if (!b) {
      frames.push(null);
      continue;
    }
    const x0 = Math.max(0, b.x0 - 1), y0 = Math.max(0, b.y0 - 1), x1 = Math.min(w - 1, b.x1 + 1), y1 = Math.min(h - 1, b.y1 + 1);
    const cell = Object.assign(document.createElement("canvas"), { width: x1 - x0 + 1, height: y1 - y0 + 1 });
    cell.getContext("2d").drawImage(scratch, x0, y0, cell.width, cell.height, 0, 0, cell.width, cell.height);
    frames.push({ cell, dx: x0, dy: y0 });
  }

  // — La pièce de fond : le monde sans l'objet, sur l'enveloppe agrandie de `pad`, bords fondus sur `feather` —
  let patch = null, still = 0;
  if (env) {
  const grow = pad + feather;
  const R = { x0: Math.max(0, env.x0 - grow), y0: Math.max(0, env.y0 - grow), x1: Math.min(w - 1, env.x1 + grow), y1: Math.min(h - 1, env.y1 + grow) };
  const pw = R.x1 - R.x0 + 1, ph = R.y1 - R.y0 + 1;
  renderer.setClearColor(new THREE.Color(bg), 1);
  const skies = [];
  // Vingt-quatre moments de la boucle entière : derrière l'objet, rien ne doit changer.
  for (let k = 0; k < 24; k++) {
    S.loopAt((2 * Math.PI * laps * k) / 24);
    show(true, false);
    renderer.render(cur.scene, cur.camera);
    sc.clearRect(0, 0, w, h);
    sc.drawImage(canvas, 0, 0);
    skies.push(sc.getImageData(R.x0, R.y0, pw, ph));
  }
  for (const other of skies.slice(1)) for (let i = 0; i < other.data.length; i++) still = Math.max(still, Math.abs(skies[0].data[i] - other.data[i]));
  const sky = skies[0];
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      // La distance au rectangle intérieur (l'enveloppe + pad) : opaque dedans, fondu au-delà.
      const ix = R.x0 + x, iy = R.y0 + y;
      const dx = Math.max(env.x0 - pad - ix, 0, ix - (env.x1 + pad)), dy = Math.max(env.y0 - pad - iy, 0, iy - (env.y1 + pad));
      const u = Math.min(1, Math.hypot(dx, dy) / feather);
      sky.data[(y * pw + x) * 4 + 3] = Math.round(255 * (1 - u * u * (3 - 2 * u)));
    }
  }
  patch = { cell: Object.assign(document.createElement("canvas"), { width: pw, height: ph }), dx: R.x0, dy: R.y0 };
  patch.cell.getContext("2d").putImageData(sky, 0, 0);
  }

  // — La planche : rangées de découpes, la pièce de fond en premier —
  const cells = [...(patch ? [patch] : []), ...frames.filter(Boolean)];
  const GAP = 2;
  let x = 0, y = 0, rowH = 0;
  for (const c of cells) {
    if (x + c.cell.width > sheetW) {
      x = 0;
      y += rowH + GAP;
      rowH = 0;
    }
    Object.assign(c, { sx: x, sy: y });
    x += c.cell.width + GAP;
    rowH = Math.max(rowH, c.cell.height);
  }
  const sheet = Object.assign(document.createElement("canvas"), { width: sheetW, height: y + rowH });
  const sh = sheet.getContext("2d");
  for (const c of cells) sh.drawImage(c.cell, c.sx, c.sy);
  const rect = (c) => (c ? [c.sx, c.sy, c.cell.width, c.cell.height, c.dx, c.dy] : null);
  S.loopAt(0);
  const o = S.origin;
  return {
    png: sheet.toDataURL("image/png"),
    still,
    meta: { w, h, patch: rect(patch), frames: frames.map(rect), bob: offsets },
    origin: o ? [o.x, o.y, o.z] : null,
  };
}

/** Dans la page : une planche d'images d'un passage, monde compris. */
function sheet({ name, w, h, box, bg, times, start }) {
  const { renderer, canvas, THREE, PASSAGES, PASSAGE_FPS } = window.__P;
  window.setupScene(`${name}-passage`, "light", 0xb08a4f, w, h, box);
  renderer.setClearColor(new THREE.Color(bg), 1);
  const g = window.__current.obj;
  const P = g.userData.passage;
  return times.map((t) => {
    if (P.kind === "clip") {
      const i = start * P.length + Math.min(P.length - 1, Math.round(t * PASSAGE_FPS));
      g.userData.animate((Math.PI * 2 * i) / (P.starts * P.length));
    } else {
      const laps = P.laps ?? 1;
      g.userData.sprite.loopAt((2 * Math.PI * laps * t) / P.loop);
      g.userData.sprite.departAt(t);
    }
    renderer.render(window.__current.scene, window.__current.camera);
    return canvas.toDataURL("image/png");
  });
}

const PASSAGES = await page.evaluate(() => window.__P.PASSAGES);
const fps = await page.evaluate(() => window.__P.PASSAGE_FPS);
if (MODE === "sheet") {
  const name = process.env.SCENE;
  const phone = process.argv[2] === "mobile";
  const P = PASSAGES[name];
  const W = phone ? 390 : 640, H = phone ? 380 : 360;
  const step = Number(process.env.STEP ?? 3);
  const end = P.kind === "clip" ? (Math.ceil((P.dive + 0.8) * fps) - 1) / fps : P.end;
  const times = [];
  for (let i = 0; i <= Math.round(end * fps); i += step) times.push(i / fps);
  const urls = await page.evaluate(sheet, { name, w: phone ? PHONE.w : 1280, h: phone ? PHONE.h : 720, box: phone ? BOXES[name] : null, bg: BG[name], times, start: Number(process.env.START ?? 0) });
  const COLS = Number(process.env.COLS ?? 5);
  // CROP=x0,y0,x1,y1 (fractions de l'image) : un détail, agrandi.
  const crop = process.env.CROP?.split(",").map(Number);
  const [iw, ih] = phone ? [PHONE.w, PHONE.h] : [1280, 720];
  const cut = (img) => (crop ? img.extract({ left: Math.round(crop[0] * iw), top: Math.round(crop[1] * ih), width: Math.round((crop[2] - crop[0]) * iw), height: Math.round((crop[3] - crop[1]) * ih) }) : img);
  const tiles = await Promise.all(urls.map((u) => cut(sharp(Buffer.from(u.split(",")[1], "base64"))).resize(W, H).png().toBuffer()));
  const composites = tiles.flatMap((input, i) => {
    const left = (i % COLS) * (W + 4), top = Math.floor(i / COLS) * (H + 4);
    const label = `${(times[i] ?? 0).toFixed(2)} s`;
    return [{ input, left, top }, { input: Buffer.from(`<svg width="90" height="22"><rect width="90" height="22" fill="#000a"/><text x="6" y="16" font-family="monospace" font-size="14" fill="#fff">${label}</text></svg>`), left, top }];
  });
  const rows = Math.ceil(tiles.length / COLS);
  await sharp({ create: { width: COLS * (W + 4) - 4, height: rows * (H + 4) - 4, channels: 3, background: "#333" } }).composite(composites).png().toFile(process.env.OUT);
  console.log("→", process.env.OUT);
} else {
  const out = join(site, "public/voyage/passage");
  await mkdir(out, { recursive: true });
  const data = {};
  for (const [name, P] of Object.entries(PASSAGES)) {
    const t0 = Date.now();
    const entry = { kind: P.kind, fps, dive: P.dive };
    if (P.kind === "sprites") {
      for (const [key, f, opts] of [
        ["desktop", { ...DESKTOP, box: null }, { pad: 8, feather: 16, sheetW: 2048 }],
        ["phone", { ...PHONE, box: BOXES[name] }, { pad: 4, feather: 8, sheetW: 1024 }],
      ]) {
        const { png, still, meta, origin } = await page.evaluate(sprites, { name, ...f, bg: BG[name], ...opts });
        if (still > 2) console.warn(`⚠ ${name} ${key} : le fond derrière l'objet bouge (écart ${still})`);
        const file = `${name}${key === "phone" ? "-mobile" : ""}.webp`;
        const info = await sharp(Buffer.from(png.split(",")[1], "base64")).webp({ quality: Number(process.env.Q ?? 88), alphaQuality: 100, effort: 6 }).toFile(join(out, file));
        entry[key] = { src: `/voyage/passage/${file}`, cycle: P.cycle, ...meta, origin: origin ? await page.evaluate(project, origin) : null };
        console.log(`✓ ${file}  ${info.width} × ${info.height}  ${Math.round(info.size / 1024)} Ko  fond immobile (écart ${still})  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      }
    } else {
      // Le clip : ses départs ; le point vers lequel plonger, s'il n'est pas celui qu'on clique.
      for (const [key, f] of [
        ["desktop", { ...DESKTOP, box: null }],
        ["phone", { ...PHONE, box: BOXES[name] }],
      ]) {
        const meta = await page.evaluate(({ name, w, h, box }) => {
          window.setupScene(`${name}-passage`, "light", 0xb08a4f, w, h, box);
          const { starts, length, loop, origin } = window.__current.obj.userData.passage;
          return { starts, length, loop, origin };
        }, { name, ...f });
        entry[key] = {
          src: `/voyage/passage/${name}-passage${key === "phone" ? "-mobile" : ""}`,
          starts: meta.starts,
          length: meta.length,
          loop: meta.loop,
          origin: meta.origin ? await page.evaluate(project, meta.origin) : null,
        };
      }
      console.log(`✓ ${name} : clip de ${entry.desktop.starts} départs × ${entry.desktop.length} images`);
    }
    data[name] = entry;
  }
  await writeFile(join(site, "src/data/passages.json"), JSON.stringify(data) + "\n");
  console.log("✓ src/data/passages.json");
}
await browser.close();
server.close();
