// Rendu des scènes du voyage, servi en http local (l'avion .glb et la carte du monde
// se chargent par fetch, interdit en file://).
//   MODE=shot   → une image fixe par scène dans check/<scène>-shot.png (+ position du point cliquable)
//   MODE=encode → la boucle animée dans anim/<scène>-light-laiton.webp
// Scènes en arguments ; FRAME (shot), FRAMES / LOOP_MS (encode, sinon réglage par scène).
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, extname, normalize } from "node:path";
import { pathToFileURL } from "node:url";

const dir = process.env.RENDER_DIR;
// sharp et playwright-core viennent du monorepo : le script tourne depuis le dossier de travail.
const sharp = createRequire(pathToFileURL(join(process.env.REPO_DIR, "apps/portfolio/package.json")))("sharp");
const { chromium } = createRequire(pathToFileURL(join(process.env.REPO_DIR, "package.json")))("playwright-core");
const MODE = process.env.MODE ?? "shot";
const ACCENT = 0xb08a4f;
const BG = {
  espace: "#0B0C14", terre: "#10131C", avion: "#DCE9F0", paris: "#DCE3EA", monuments: "#E0E8DA",
  route: "#F2DFD3", maison: "#F1E7DA", salon: "#F3D5B5", tonalliA: "#D8C2C6", tonalliB: "#D8C2C6", calendrier: "#D8C2C6",
  passeport: "#0E1018", dossiers: "#E6D5B8", bagage: "#121522",
};
// Boucles plus longues là où un tour complet doit rester lent (le globe) : [images, durée, qualité].
// La carte du monde est riche en détails : 9 images/s et une qualité plus basse la gardent légère (2,1 Mo).
// Le passeport : le tampon s'encre, traverse, tamponne et revient ; 6 s pour que le geste reste posé.
const LOOPS = { terre: [72, 8000, 45], passeport: [120, 6000, 72] };

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".glb": "model/gltf-binary", ".geojson": "application/json" };
const server = createServer(async (req, res) => {
  try {
    const rel = normalize(decodeURIComponent(new URL(req.url, "http://local").pathname)).replace(/^[\\/]+/, "");
    if (rel.startsWith("..")) throw new Error("hors du dossier");
    const body = await readFile(join(dir, rel));
    res.writeHead(200, { "content-type": TYPES[extname(rel)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ channel: "msedge", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1300, height: 820 } });
page.on("pageerror", (e) => console.error("page error:", e.message));
page.on("console", (m) => m.type() === "error" && console.error("console:", m.text()));
await page.goto(`${base}/voyage.html`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 120_000 });

const names = process.argv.slice(2);
await mkdir(join(dir, "check"), { recursive: true });
await mkdir(join(dir, "anim"), { recursive: true });
// Réglage à la volée de la position de l'avion vu du hublot : AV="x,y,z".
if (process.env.AV) {
  const [x, y, z, s] = process.env.AV.split(",").map(Number);
  await page.evaluate((av) => (window.AV = av), { x, y, z, s });
}
// MOBILE=1 : rendus pour le voyage sur téléphone (scène de 390 × 380, rendue au double), cadrés par BOXES :
// la zone de l'image d'ordinateur (fractions x0, y0, x1, y1) qui doit rester visible.
// SIZE=LxH et SUFFIX : un autre format cadré de la même façon (l'image d'aperçu des partages, par exemple).
const MOBILE = !!process.env.MOBILE || !!process.env.SIZE;
const [MW, MH] = process.env.SIZE ? process.env.SIZE.split("x").map(Number) : [780, 760];
const BOXES = {
  espace: [-0.04, 0.14, 0.84, 0.78],
  terre: [0.22, 0.06, 0.94, 0.92],
  avion: [0.24, -0.04, 0.8, 1.02],
  paris: [0.12, 0.1, 0.96, 0.94],
  // Visit Match : plus de marge autour de la tour et de l'arc (Cantin trouvait l'escale encore trop serrée).
  monuments: [0.09, -0.04, 0.91, 1.0],
  route: [0.08, 0.12, 0.94, 0.96],
  maison: [0.18, 0.06, 0.94, 0.98],
  salon: [0.18, 0.04, 0.9, 0.96],
  calendrier: [0.14, 0.02, 0.86, 0.98],
  dossiers: [0.14, 0.08, 0.86, 0.92],
  // La 404 : tout le socle, le panneau du tapis compris.
  bagage: [0.14, 0.12, 0.84, 0.96],
};
if (process.env.BOX) BOXES[names[0]] = process.env.BOX.split(",").map(Number);
const suffix = process.env.SUFFIX ?? (MOBILE ? "-mobile" : "");
for (const name of names) {
  const t0 = Date.now();
  await page.evaluate(([n, a, m, box]) => (m ? window.setupScene(n, "light", a, m[0], m[1], box) : window.setupScene(n, "light", a)), [name, ACCENT, MOBILE ? [MW, MH] : null, BOXES[name] ?? null]);
  // Caméra de mise au point : CAM="x,y,z,cx,cy,cz[,fov]".
  if (process.env.CAM) {
    const [x, y, z, cx, cy, cz, fov] = process.env.CAM.split(",").map(Number);
    await page.evaluate(([x, y, z, cx, cy, cz, fov]) => {
      const cam = window.__current.camera;
      cam.position.set(x, y, z);
      if (fov) cam.fov = fov;
      cam.updateProjectionMatrix();
      cam.lookAt(cx, cy, cz);
    }, [x, y, z, cx, cy, cz, fov]);
  }
  if (MODE === "bounds") {
    for (const prefix of (process.env.PREFIX ?? "Group_").split(",")) console.log(prefix, JSON.stringify(await page.evaluate((p) => window.bounds(p), prefix)));
  } else if (MODE === "shot") {
    const [n] = LOOPS[name] ?? [96];
    const f = Number(process.env.FRAME ?? 0);
    const url = await page.evaluate(([i, k]) => window.renderFrame(i, k), [f, n]);
    const spot = await page.evaluate(() => window.hotspot());
    await sharp(Buffer.from(url.split(",")[1], "base64")).flatten({ background: BG[name] ?? "#888888" }).png().toFile(join(dir, "check", `${name}${suffix}-shot.png`));
    // Ordinateur : position sur l'artboard 1440 × 900 (rendu 1440 × 810 posé à 45 px du haut).
    // Mobile : position dans l'image elle-même, qui remplit toute la zone de la scène.
    const board = spot && (MOBILE ? { x: +spot.x.toFixed(1), y: +spot.y.toFixed(1) } : { x: +spot.x.toFixed(1), y: +((45 + (spot.y / 100) * 810) / 9).toFixed(1) });
    console.log(`✓ ${name}${suffix}  ${((Date.now() - t0) / 1000).toFixed(1)} s  point cliquable : ${board ? `${board.x} % / ${board.y} %` : "—"}`);
  } else {
    const [N, LOOP, Q = 74] = process.env.FRAMES ? [Number(process.env.FRAMES), Number(process.env.LOOP_MS ?? 4000), Number(process.env.Q ?? 74)] : (LOOPS[name] ?? [96, 4000]);
    const frames = [];
    for (let i = 0; i < N; i++) {
      const url = await page.evaluate(([i, n]) => window.renderFrame(i, n), [i, N]);
      frames.push(Buffer.from(url.split(",")[1], "base64"));
    }
    const out = MOBILE ? `${name}${suffix}.webp` : `${name}-light-laiton.webp`;
    const info = await sharp(frames, { join: { animated: true } })
      .webp({ quality: Q, alphaQuality: 85, effort: 5, loop: 0, delay: Math.round(LOOP / N) })
      .toFile(join(dir, "anim", out));
    console.log(`✓ ${out}  ${Math.round(info.size / 1024)} Ko  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
}
await browser.close();
server.close();
