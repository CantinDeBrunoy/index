// Le copilote pour le site : copie ses boucles dans ../../public/voyage/copilote/ et en tire une image fixe chacune,
// pour le mouvement réduit. Les boucles se rendent d'abord avec voyage-render.mjs (voir le README) :
//   MODE=encode SIZE=400x400 SUFFIX=-site FRAMES=72 Q=72 node voyage-render.mjs tenue-espace tenue-terre …
//   MODE=encode SIZE=640x640 SUFFIX=-accueil FRAMES=72 Q=72 node voyage-render.mjs tenue-espace
// <tenue>.webp : la pastille et la bulle (400 × 400) ; accueil.webp : l'accueil de l'escale 1, en grand (640 × 640).
import { createRequire } from "node:module";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const portfolio = join(here, "..", "..");
const sharp = createRequire(pathToFileURL(join(portfolio, "package.json")))("sharp");
const out = join(portfolio, "public", "voyage", "copilote");
await mkdir(out, { recursive: true });

const TENUES = ["espace", "terre", "avion", "paris", "monuments", "route", "maison", "salon", "calendrier", "dossiers"];
const files = [...TENUES.map((t) => [`tenue-${t}-site.webp`, t]), ["tenue-espace-accueil.webp", "accueil"]];
for (const [src, name] of files) {
  const from = join(here, "anim", src);
  await copyFile(from, join(out, `${name}.webp`));
  // La première image de la boucle, fixe.
  const info = await sharp(from, { pages: 1 }).webp({ quality: 80, alphaQuality: 90 }).toFile(join(out, `${name}-fixe.webp`));
  console.log(`✓ ${name}.webp + ${name}-fixe.webp (${Math.round(info.size / 1024)} Ko)`);
}
