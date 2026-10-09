/**
 * Prépare la page web de Hublot pour Cloudflare : copie docs/ dans dist/page/, que sert le Worker.
 */

import { cp, mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = join(root, "dist/page");

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(join(root, "docs"), out, { recursive: true });

console.log(`Page prête dans ${out}`);
