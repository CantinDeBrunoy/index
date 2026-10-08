// Aperçu local d'un artboard animé, figé sur une étape : la logique calcule ses valeurs, le gabarit est rempli
// (sc-for, sc-if, trous), les /_blob/ pointent vers les copies locales ; une capture part dans measure/.
// node preview-board.mjs <Board> <étape>[,<étape>…] [menu]   (ex. : Escale1-mobile 0,1,7,10)
import { createServer } from "node:http";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const { chromium } = createRequire(pathToFileURL(join(process.env.REPO_DIR, "package.json")))("playwright-core");
const [name, steps = "0", menu] = process.argv.slice(2);

const IDS = JSON.parse(await readFile(join(here, "ids.json"), "utf8"));
const local = Object.fromEntries(Object.entries(IDS).map(([scene, id]) => [id, `/renders/anim/${scene}-light-laiton.webp`]));
// Les rendus du voyage sur téléphone.
const MOB = JSON.parse(await readFile(join(here, "mobile.json"), "utf8"));
for (const [scene, { id }] of Object.entries(MOB)) local[id] = `/renders/anim/${scene}-mobile.webp`;
// L'astronaute du guide (build-guide-propals.cjs).
const GUIDE = JSON.parse(await readFile(join(here, "guide.json"), "utf8"));
local[GUIDE.astronaute] = "/renders/anim/astronaute-guide.webp";
for (const [scene, id] of Object.entries(GUIDE.tenues ?? {})) local[id] = `/renders/anim/tenue-${scene}-guide.webp`;

const html = await readFile(join(here, "project", `${name}.dc.html`), "utf8");
const code = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
class DCLogic {
  constructor(props) {
    this.props = props || {};
  }
  setState(p) {
    this.state = { ...this.state, ...p };
  }
}
const Component = new Function("DCLogic", "setTimeout", "clearTimeout", `${code}; return Component;`)(DCLogic, () => 0, () => {});
const helmet = html.match(/<helmet>([\s\S]*?)<\/helmet>/)[1];
const template = html.match(/<x-dc>[\s\S]*?<\/helmet>([\s\S]*?)<\/x-dc>/)[1];
const { width, height } = JSON.parse(html.match(/data-props='([^']+)'/)[1]).$preview;
const lookup = (vals, p) => p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), vals);
const show = (v) => (typeof v === "function" ? "" : v == null ? "" : String(v));

const render = (vals) => {
  let out = template.replace(/<sc-for list="\{\{(\w+)\}\}" as="(\w+)"[^>]*>([\s\S]*?)<\/sc-for>/g, (_, list, as, inner) =>
    (vals[list] ?? []).map((item) => inner.replace(new RegExp(`\\{\\{${as}\\.([\\w.]+)\\}\\}`, "g"), (m, p) => show(lookup(item, p)))).join(""));
  // Les sc-if s'emboîtent : on résout d'abord les plus intérieurs.
  const inner = /<sc-if value="\{\{\s*([\w.]+)\s*\}\}"[^>]*>((?:(?!<sc-if)[\s\S])*?)<\/sc-if>/;
  while (inner.test(out)) out = out.replace(inner, (_, p, body) => (lookup(vals, p) ? body : ""));
  return out.replace(/\{\{\s*([\w.$]+)\s*\}\}/g, (_, p) => show(lookup(vals, p)));
};

const TYPES = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".jpg": "image/jpeg" };
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

await mkdir(join(here, "measure"), { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width, height } });
for (const i of steps.split(",").map(Number)) {
  const c = new Component({});
  // STATE='{"step":2}' fige d'autres valeurs de l'état ; WAIT=3000 laisse finir les animations d'entrée.
  c.state = { ...c.state, i, menu: menu === "menu", ...JSON.parse(process.env.STATE ?? "{}") };
  const vals = c.renderVals();
  const doc = `<!doctype html><html><head><meta charset="utf-8">${helmet}</head><body>${render(vals)}</body></html>`
    .replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => local[id] ?? m);
  const file = `${name}-${i}${menu ? "-menu" : ""}${process.env.TAG ?? ""}`;
  await writeFile(join(here, "measure", `${file}.html`), doc);
  await page.goto(`${base}/design-canvas/measure/${file}.html`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (process.env.WAIT) await page.waitForTimeout(Number(process.env.WAIT));
  await page.screenshot({ path: join(here, "measure", `${file}.png`) });
  console.log("✓", file);
}
await browser.close();
server.close();
