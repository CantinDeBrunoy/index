// Les aperçus de partage (1200 × 630) : chaque page /apercu/<carte> du serveur de développement, photographiée
// dans ../../public/og/<carte>.jpg (src/data/apercus.ts). Le serveur d'abord : `astro dev` (la configuration
// « portfolio-astro » de .claude/launch.json, sur le port 4321).
// node og.mjs [adresse du serveur]   (playwright-core vient du monorepo, sharp du portfolio ; Edge déjà installé)
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sharp = createRequire(join(here, "../../package.json"))("sharp");
const { chromium } = createRequire(join(here, "../../../../package.json"))("playwright-core");
const base = process.argv[2] ?? "http://localhost:4321";
const out = join(here, "../../public/og");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(`${base}/apercu/index`, { waitUntil: "networkidle" });
const cards = await page.$$eval("[data-card]", (links) => links.map((a) => a.dataset.card));
if (cards.length === 0) throw new Error(`Aucune carte sur ${base}/apercu/index : le serveur de développement tourne-t-il ?`);

for (const card of cards) {
  await page.goto(`${base}/apercu/${card}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  // La barre d'outils du serveur de développement n'a rien à faire sur la photo.
  await page.addStyleTag({ content: "astro-dev-toolbar { display: none !important; }" });
  const missing = await page.evaluate(() =>
    ['400 76px "Instrument Serif"', 'italic 400 38px "Instrument Serif"', '400 22px "Geist"', '400 15px "Geist Mono"'].filter((f) => !document.fonts.check(f)),
  );
  if (missing.length) throw new Error(`${card} : polices absentes (${missing.join(", ")})`);
  const shot = await page.locator(".og").screenshot();
  const info = await sharp(shot).jpeg({ quality: 84, mozjpeg: true }).toFile(join(out, `${card}.jpg`));
  console.log(`✓ ${card}.jpg  ${Math.round(info.size / 1024)} Ko`);
}
await browser.close();
