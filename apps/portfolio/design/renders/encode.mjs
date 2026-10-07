import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = process.env.RENDER_DIR;
const repo = process.env.REPO_DIR;
// sharp et playwright-core viennent du monorepo : le script tourne depuis le dossier de travail.
const sharp = createRequire(pathToFileURL(join(repo, "apps/portfolio/package.json")))("sharp");
const { chromium } = createRequire(pathToFileURL(join(repo, "package.json")))("playwright-core");
// THEMES=light pour ne rendre que la version claire.
const THEMES = (process.env.THEMES ?? "light,dark").split(",");
const out = join(dir, "anim");
await mkdir(out, { recursive: true });
const N = Number(process.env.FRAMES ?? 96);
const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["hero", "metro-pathfinder", "api-rest-dotnet", "visit-match", "galaxy-escape", "magellan", "cancionero", "mithril", "tonalli", "gym-picker", "hublot"];

const browser = await chromium.launch({ channel: "msedge", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1300, height: 820 } });
page.on("pageerror", (e) => console.error("page error:", e.message));
await page.goto(pathToFileURL(join(dir, "anim.html")).href);
await page.waitForFunction(() => window.ready === true, null, { timeout: 60_000 });
// Variante d'accent : ACCENT=bleu → suffixe -bleu, couleurs d'accent bleues.
const ACCENTS = { bleu: { light: 0x2a56d6, dark: 0x7aa2ff }, laiton: { light: 0xb08a4f, dark: 0xd9b475 } };
const variant = process.env.ACCENT;
for (const name of names) {
  for (const theme of THEMES) {
    const t0 = Date.now();
    const accent = variant ? ACCENTS[variant][theme] : undefined;
    if (name === "cabinet") await page.evaluate(([t, a]) => window.setupCabinet(t, a), [theme, accent]);
    else await page.evaluate(([n, t, a]) => window.setupAnim(n, t, a), [name, theme, accent]);
    const frames = [];
    for (let i = 0; i < N; i++) {
      const url = await page.evaluate(([i, n]) => window.renderFrame(i, n), [i, N]);
      frames.push(Buffer.from(url.split(",")[1], "base64"));
    }
    const file = join(out, `${name}-${theme}${variant ? '-' + variant : ''}.webp`);
    const info = await sharp(frames, { join: { animated: true } })
      .webp({ quality: 74, alphaQuality: 85, effort: 5, loop: 0, delay: Math.round(4000 / N) })
      .toFile(file);
    console.log(`✓ ${name}-${theme}${variant ? '-' + variant : ''}.webp  ${Math.round(info.size / 1024)} Ko  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
}
await browser.close();
