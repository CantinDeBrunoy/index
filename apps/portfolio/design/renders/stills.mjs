// Les images fixes des scènes : la première image de chaque boucle, dans ../../public/voyage/stills/.
// Elles servent aux vignettes (la carte de l'escale suivante d'une fiche, le carnet) et au mouvement
// réduit, où rien ne doit bouger. Une scène = une boucle qui a sa version téléphone (<scène>-mobile.webp).
//   <scène>.webp         1280 × 720, l'image d'ordinateur
//   <scène>-640.webp     640 × 360, la vignette
//   <scène>-mobile.webp  780 × 760, l'image du téléphone
// node stills.mjs   (sharp vient du portfolio)
import { mkdirSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sharp = createRequire(join(here, "../../package.json"))("sharp");
const voyage = join(here, "../../public/voyage");
const out = join(voyage, "stills");
mkdirSync(out, { recursive: true });

const scenes = readdirSync(voyage)
  .filter((f) => f.endsWith("-mobile.webp"))
  .map((f) => f.slice(0, -"-mobile.webp".length));

const first = (file) => sharp(join(voyage, file), { page: 0 });
for (const scene of scenes) {
  await first(`${scene}.webp`).webp({ quality: 80 }).toFile(join(out, `${scene}.webp`));
  await first(`${scene}.webp`).resize({ width: 640 }).webp({ quality: 80 }).toFile(join(out, `${scene}-640.webp`));
  await first(`${scene}-mobile.webp`).webp({ quality: 78 }).toFile(join(out, `${scene}-mobile.webp`));
  console.log(`✓ ${scene}`);
}
