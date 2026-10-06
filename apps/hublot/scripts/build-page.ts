/**
 * Prépare la page web de Hublot pour Cloudflare : copie docs/ dans dist/page/ et y ajoute
 * l'onglet « ← INDEX » commun aux apps du monorepo (lien et numéro lus dans @index/projects).
 */

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { portfolioLink } from "@index/projects";

const root = resolve(import.meta.dirname, "..");
const out = join(root, "dist/page");

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(join(root, "docs"), out, { recursive: true });

const indexBar = createRequire(import.meta.url).resolve("@index/ui/index-bar");
await cp(indexBar, join(out, "index-bar.js"));
const options = { ...portfolioLink("hublot"), corner: "bottom-left" };
await writeFile(
  join(out, "index-bar-init.js"),
  `import { mountIndexBar } from "./index-bar.js";\n\nmountIndexBar(${JSON.stringify(options)});\n`,
);

const htmlPath = join(out, "index.html");
const html = await readFile(htmlPath, "utf8");
await writeFile(htmlPath, html.replace("</body>", `  <script type="module" src="index-bar-init.js"></script>\n</body>`));

console.log(`Page prête dans ${out}`);
