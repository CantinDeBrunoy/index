// Le CV de Cantin, en français et en anglais : cv.fr.html et cv.en.html, imprimés en PDF par Edge dans
// ../../public/cv/, que le bouton « Mon CV » de la page À propos télécharge (src/data/apropos.ts).
// node cv.mjs   (playwright-core vient du monorepo ; Edge déjà installé)
// Le numéro de téléphone ne va pas sur le site : le script refuse un CV qui en porte un.
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(join(here, "../../../../package.json"))("playwright-core");
const out = join(here, "../../public/cv");
mkdirSync(out, { recursive: true });

const CVS = [
  { lang: "fr", file: "cantin-roquier-cv.pdf" },
  { lang: "en", file: "cantin-roquier-resume.pdf" },
];

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage();
for (const { lang, file } of CVS) {
  const source = join(here, `cv.${lang}.html`);
  if (/\+33|\b0[1-9](?:[ .]?\d\d){4}\b/.test(readFileSync(source, "utf8"))) {
    throw new Error(`cv.${lang}.html porte un numéro de téléphone : il ne va pas sur le site.`);
  }
  await page.goto(pathToFileURL(source).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: join(out, file), preferCSSPageSize: true, printBackground: true });
  console.log(`✓ ${file}`);
}
await browser.close();
