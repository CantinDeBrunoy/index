// La fusée qui repart de l'escale 1 (fusee-scenes.js) : la planche de sprites que le site dessine par-dessus la boucle
// de l'espace (scripts/voyage-fusee.ts), pour l'ordinateur (2560 × 1440, comme la vidéo) et le téléphone (780 × 760,
// cadré comme sa boucle).
//   node fusee-render.mjs              → public/voyage/fusee/espace-fusee(-mobile).webp + src/data/fusee.json
//   MODE=sheet OUT=x.png node fusee-render.mjs [mobile]  → une planche d'images du départ, monde compris (réglage)
// La page est le moteur (anim.html) et les scènes, assemblés ici : voyage.html n'en dépend pas.
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
const MODE = process.env.MODE ?? "sprites";
const BG = "#0B0C14";
// Le cadrage du téléphone : celui de la boucle de l'espace (BOXES dans voyage-render.mjs).
const PHONE = { w: 780, h: 760, box: [0.06, 0.1, 0.76, 0.66] };
const DESKTOP = { w: 2560, h: 1440, box: null };

// La page : le moteur et toutes les scènes, plus ce que le rendu des sprites doit atteindre.
const anim = readFileSync(join(dir, "anim.html"), "utf8");
const scenes = ["voyage-scenes.js", "decollage-scenes.js", "fusee-scenes.js"].map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
const expose = "window.__F = { renderer, canvas, THREE, FUSEE, fuseeAt, cruise, cruiseFlame };";
const html = anim.replace("window.ready = true;", () => `${scenes}\n${expose}\nwindow.ready = true;`);

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".glb": "model/gltf-binary", ".geojson": "application/json" };
const server = createServer(async (req, res) => {
  try {
    const rel = normalize(decodeURIComponent(new URL(req.url, "http://local").pathname)).replace(/^[\\/]+/, "");
    if (rel.startsWith("..")) throw new Error("hors du dossier");
    const body = rel === "fusee.html" ? html : await readFile(join(dir, rel));
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
page.on("console", (m) => (m.type() === "error" || m.text().startsWith("§")) && console.log(m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/fusee.html`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 120_000 });

/**
 * Dans la page : rend la fusée seule, image par image, découpe chaque image à sa boîte (alpha), range les découpes
 * sur une planche ; ajoute la pièce de ciel qui cache la fusée de la boucle (bords fondus) et, pour chaque phase de
 * la croisière, le décalage du centre de la fusée par rapport à la phase 0 (le site part de la phase affichée).
 */
async function sprites({ w, h, box, bg, pad, feather, sheetW }) {
  const { renderer, canvas, THREE, FUSEE, cruise, cruiseFlame } = window.__F;
  window.setupScene("espace-fusee", "light", 0xb08a4f, w, h, box);
  const cur = window.__current;
  const g = cur.obj;
  const { ship } = g.userData;
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

  // — La croisière, sur un cycle de 8 s : l'enveloppe de la fusée de la vidéo, et son centre à chaque phase —
  renderer.setClearColor(0x000000, 0);
  const PHASES = 96;
  const bob = [];
  let env = null;
  for (let k = 0; k < PHASES; k++) {
    const phi = (2 * Math.PI * k) / PHASES;
    g.userData.fusee(0, true);
    const c = cruise(phi);
    ship.position.copy(c.pos);
    ship.quaternion.copy(c.quat);
    ship.userData.flames.forEach((f, i) => f.scale.set(...cruiseFlame(i, phi)));
    const b = grab();
    env = env ? { x0: Math.min(env.x0, b.x0), y0: Math.min(env.y0, b.y0), x1: Math.max(env.x1, b.x1), y1: Math.max(env.y1, b.y1) } : b;
    bob.push([b.cx, b.cy]);
  }
  const bob0 = bob[0];
  const offsets = bob.map(([x, y]) => [+(x - bob0[0]).toFixed(2), +(y - bob0[1]).toFixed(2)]);

  // — Les images du départ, chacune découpée à sa boîte —
  const frames = [];
  const n = Math.round(FUSEE.end * FUSEE.fps);
  for (let f = 0; f < n; f++) {
    g.userData.fusee(f / FUSEE.fps, true);
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

  // — La pièce de ciel : le monde sans la fusée, sur l'enveloppe agrandie de `pad`, bords fondus sur `feather` —
  ship.visible = false;
  const grow = pad + feather;
  const P = { x0: Math.max(0, env.x0 - grow), y0: Math.max(0, env.y0 - grow), x1: Math.min(w - 1, env.x1 + grow), y1: Math.min(h - 1, env.y1 + grow) };
  const pw = P.x1 - P.x0 + 1, ph = P.y1 - P.y0 + 1;
  renderer.setClearColor(new THREE.Color(bg), 1);
  const skies = [];
  // Vingt-quatre moments de la boucle (24 s, la Terre et les lunes ailleurs) : derrière la fusée, rien ne doit changer.
  for (let k = 0; k < 24; k++) {
    const phi = (6 * Math.PI * k) / 24;
    g.userData.fusee(0, false, phi);
    ship.visible = false;
    renderer.render(cur.scene, cur.camera);
    sc.clearRect(0, 0, w, h);
    sc.drawImage(canvas, 0, 0);
    skies.push(sc.getImageData(P.x0, P.y0, pw, ph));
  }
  let still = 0;
  for (const other of skies.slice(1)) for (let i = 0; i < other.data.length; i++) still = Math.max(still, Math.abs(skies[0].data[i] - other.data[i]));
  const sky = skies[0];
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      // La distance au rectangle intérieur (l'enveloppe + pad) : opaque dedans, fondu au-delà.
      const ix = P.x0 + x, iy = P.y0 + y;
      const dx = Math.max(env.x0 - pad - ix, 0, ix - (env.x1 + pad)), dy = Math.max(env.y0 - pad - iy, 0, iy - (env.y1 + pad));
      const u = Math.min(1, Math.hypot(dx, dy) / feather);
      sky.data[(y * pw + x) * 4 + 3] = Math.round(255 * (1 - u * u * (3 - 2 * u)));
    }
  }
  const patch = Object.assign(document.createElement("canvas"), { width: pw, height: ph });
  patch.getContext("2d").putImageData(sky, 0, 0);

  // — La planche : rangées de découpes, la pièce de ciel en premier —
  const cells = [{ cell: patch, dx: P.x0, dy: P.y0 }, ...frames.filter(Boolean)];
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
  return {
    png: sheet.toDataURL("image/png"),
    still,
    meta: { w, h, patch: rect(cells[0]), frames: frames.map(rect), bob: offsets },
  };
}

/** Dans la page : une planche d'images du départ, monde compris, à la phase `phi` de la boucle. */
function sheet({ w, h, box, bg, times, phi }) {
  const { renderer, canvas, THREE } = window.__F;
  window.setupScene("espace-fusee", "light", 0xb08a4f, w, h, box);
  renderer.setClearColor(new THREE.Color(bg), 1);
  return times.map((t) => {
    window.__current.obj.userData.fusee(t, false, phi);
    renderer.render(window.__current.scene, window.__current.camera);
    return canvas.toDataURL("image/png");
  });
}

const fps = await page.evaluate(() => window.__F.FUSEE.fps);
const [end, dive] = await page.evaluate(() => [window.__F.FUSEE.end, window.__F.FUSEE.dive]);
if (MODE === "sheet") {
  const phone = process.argv[2] === "mobile";
  const f = phone ? PHONE : DESKTOP;
  const W = phone ? 390 : 640, H = Math.round((W * f.h) / f.w);
  const step = Number(process.env.STEP ?? 3);
  const times = [];
  for (let i = 0; i <= Math.round(end * fps); i += step) times.push(i / fps);
  const urls = await page.evaluate(sheet, { ...f, w: phone ? f.w : 1280, h: phone ? f.h : 720, bg: BG, times, phi: Number(process.env.PHI ?? 0) });
  const COLS = Number(process.env.COLS ?? 4);
  // CROP=x0,y0,x1,y1 (fractions de l'image) : un détail, agrandi.
  const crop = process.env.CROP?.split(",").map(Number);
  const cut = (img) => (crop ? img.extract({ left: Math.round(crop[0] * f.w * (phone ? 1 : 0.5)), top: Math.round(crop[1] * f.h * (phone ? 1 : 0.5)), width: Math.round((crop[2] - crop[0]) * f.w * (phone ? 1 : 0.5)), height: Math.round((crop[3] - crop[1]) * f.h * (phone ? 1 : 0.5)) }) : img);
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
  const out = join(site, "public/voyage/fusee");
  await mkdir(out, { recursive: true });
  const data = { fps, dive };
  for (const [key, f, opts] of [
    ["desktop", DESKTOP, { pad: 8, feather: 16, sheetW: 2048 }],
    ["phone", PHONE, { pad: 4, feather: 8, sheetW: 1024 }],
  ]) {
    const t0 = Date.now();
    const { png, still, meta } = await page.evaluate(sprites, { ...f, bg: BG, ...opts });
    if (still > 2) console.warn(`⚠ ${key} : le ciel derrière la fusée bouge (écart ${still})`);
    const file = `espace-fusee${key === "phone" ? "-mobile" : ""}.webp`;
    const info = await sharp(Buffer.from(png.split(",")[1], "base64")).webp({ quality: Number(process.env.Q ?? 88), alphaQuality: 100, effort: 6 }).toFile(join(out, file));
    data[key] = { src: `/voyage/fusee/${file}`, ...meta };
    console.log(`✓ ${file}  ${info.width} × ${info.height}  ${Math.round(info.size / 1024)} Ko  ciel immobile (écart ${still})  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  await writeFile(join(site, "src/data/fusee.json"), JSON.stringify(data) + "\n");
  console.log("✓ src/data/fusee.json");
}
await browser.close();
server.close();
