// Mesure la hauteur réelle de chaque fiche (pour régler h dans fiches-data.cjs) et repère les débordements.
// La fiche est rendue hors du canvas : <helmet> passe dans <head>, les /_blob/<id> pointent vers les copies
// locales (rendus du voyage, captures). Une vue réduite de chaque fiche part dans measure/<fiche>.png.
import { createServer } from "node:http";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const repo = process.env.REPO_DIR;
const sharp = createRequire(pathToFileURL(join(repo, "apps/portfolio/package.json")))("sharp");
const { chromium } = createRequire(pathToFileURL(join(repo, "package.json")))("playwright-core");

const IDS = JSON.parse(await readFile(join(here, "ids.json"), "utf8"));
const local = Object.fromEntries(Object.entries(IDS).map(([scene, id]) => [id, `/renders/anim/${scene}-light-laiton.webp`]));
// Les trois objets du cabinet repris dans « À propos ».
Object.assign(local, {
  "0944878b185c6092e8b8d85eaf588df6": "/renders/anim/gloves-light-laiton.webp",
  "9a98212eefa17bab2da90179a73a55e2": "/renders/anim/hold-light-laiton.webp",
  "33f2e78196e9a623469c70d106773eee": "/renders/anim/book-light-laiton.webp",
  "8563c7c32a51084d38d631ab09236273": "/renders/anim/randonnee-light-laiton.webp",
});
// Les captures des fiches, telles que téléchargées du canvas (Artifact read) : facultatives. Sans elles, les trois
// fiches qui en ont une se mesurent plus courtes.
const SHOTS = "artifact-files/f8f160c6-ddd3-4779-92f2-9a3a3c72f488";
for (const f of await readdir(join(root, SHOTS)).catch(() => [])) if (f.endsWith(".jpg")) local[f.slice(0, -4)] = `/${SHOTS}/${f}`;

const TYPES = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const rel = normalize(decodeURIComponent(new URL(req.url, "http://local").pathname)).replace(/^[\\/]+/, "");
    if (rel.startsWith("..")) throw new Error("hors du dossier");
    const body = await readFile(join(root, rel));
    res.writeHead(200, { "content-type": TYPES[extname(rel)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}`;

const toPlain = (dc) => {
  const helmet = dc.match(/<helmet>([\s\S]*?)<\/helmet>/)[1];
  const body = dc.split("</helmet>")[1].split("</x-dc>")[0];
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">${helmet}</head><body>${body}</body></html>`
    .replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => local[id] ?? m);
};

await mkdir(join(here, "measure"), { recursive: true });
// Les hauteurs mesurées, relues par le générateur pour régler chaque artboard (heights.json, fusionné).
const heightsFile = join(here, "measure", "heights.json");
const heights = await readFile(heightsFile, "utf8").then(JSON.parse).catch(() => ({}));
// WIDTH=390 : contrôle sur téléphone (captures suffixées, sans toucher aux hauteurs des artboards).
const WIDTH = Number(process.env.WIDTH ?? 1440), PHONE = WIDTH !== 1440;
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: WIDTH, height: PHONE ? 844 : 900 } });
page.on("pageerror", (e) => console.error("page error:", e.message));
const only = process.argv.slice(2);
const files = (await readdir(join(here, "project")))
  .filter((f) => /^(Fiche-.+|Carnet|Apropos|Mentions|Apps|Apps-mobile|Onglet)(-en)?\.dc\.html$/.test(f))
  .filter((f) => !only.length || only.includes(f.replace(".dc.html", "")));
for (const f of files) {
  const name = f.replace(".dc.html", "");
  // Les écrans de téléphone du canvas (Apps-mobile…) se mesurent à 390 px, pour vérifier qu'ils tiennent.
  const phoneBoard = /-mobile(-en)?$/.test(name);
  await page.setViewportSize({ width: phoneBoard ? 390 : WIDTH, height: phoneBoard || PHONE ? 844 : 900 });
  await writeFile(join(here, "measure", `${name}.html`), toPlain(await readFile(join(here, "project", f), "utf8")));
  await page.goto(`${base}/design-canvas/measure/${name}.html`, { waitUntil: "networkidle" });
  const r = await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => i.decode().catch(() => null)));
    const broken = [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src);
    // Déborde : sort de la page, ou son texte dépasse sa propre boîte (un mot trop long pour la colonne).
    // La souche du billet écrit à la verticale : ses glyphes dépassent un peu de leur boîte, sans rien couper.
    const vw = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll("h1,h2,h3,p,dt,dd,a,span,li")]
      .filter((el) => !el.closest(".souche"))
      .filter((el) => el.getBoundingClientRect().right > vw + 1 || (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1))
      .map((el) => `${el.tagName} « ${el.textContent.trim().slice(0, 40)} »`);
    const v = document.querySelector(".v");
    const h1 = document.querySelector("h1");
    return {
      height: Math.ceil(v.getBoundingClientRect().height),
      scrollW: document.documentElement.scrollWidth,
      h1: { w: Math.round(h1.getBoundingClientRect().width), lines: Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)) },
      broken,
      wide,
    };
  });
  if (!PHONE && !phoneBoard) heights[name] = r.height;
  const shot = await page.screenshot({ fullPage: true });
  await sharp(shot).resize({ width: PHONE ? WIDTH : phoneBoard ? 390 : 720 }).png().toFile(join(here, "measure", `${name}${PHONE ? `-${WIDTH}` : ""}.png`));
  console.log(`${name.padEnd(28)} h=${r.height}  largeur=${r.scrollW}  titre=${r.h1.w}px/${r.h1.lines} ligne(s)${r.broken.length ? "  IMAGES CASSÉES " + r.broken.join(", ") : ""}${r.wide.length ? "  DÉBORDE " + r.wide.join(" | ") : ""}`);
}
await writeFile(heightsFile, JSON.stringify(heights, null, 2) + "\n");
await browser.close();
server.close();
