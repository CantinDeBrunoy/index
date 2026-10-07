/**
 * Captures d'écran des projets pour le portfolio :
 *   apps/portfolio/src/assets/shots/<slug>-desktop.jpg et <slug>-mobile.jpg
 * plus l'image Open Graph par défaut : apps/portfolio/public/og.png.
 *
 * Usage (après `pnpm build`, les builds locaux servent de source quand l'app n'a pas d'URL publique) :
 *   node scripts/screenshots.ts            # tout
 *   node scripts/screenshots.ts tonalli    # une seule entrée (ou « og »)
 *
 * Utilise le navigateur Edge déjà installé (playwright-core, channel msedge) : aucun téléchargement.
 */

import { readFile, stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright-core";

const ROOT = resolve(import.meta.dirname, "..");
const SHOTS = join(ROOT, "apps/portfolio/src/assets/shots");

interface Target {
  slug: string;
  /** URL publique, sinon un dossier de build servi en local. */
  url?: string;
  dist?: string;
  /** Pause après le chargement (animations, tuiles du globe…). */
  settleMs?: number;
  prepare?: (context: BrowserContext, page: Page) => Promise<void>;
}

// gym-picker (ses salles) et Hublot (les vols surveillés) affichent des données personnelles :
// pas de capture tant qu'ils n'ont pas de mode démo. Elles ont été retirées du dépôt et de son historique.
const TARGETS: Target[] = [
  { slug: "magellan", dist: "apps/magellan/dist", settleMs: 8000 },
  { slug: "cancionero", dist: "apps/cancionero/dist", settleMs: 2500 },
  { slug: "tonalli", url: "https://teinte-du-jour-eight.vercel.app", settleMs: 3000 },
];

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
} as const;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
};

async function isFile(path: string) {
  return (await stat(path).catch(() => null))?.isFile() ?? false;
}

/** Petit serveur statique avec repli SPA (index.html) pour servir un dossier de build. */
async function serve(dir: string): Promise<{ url: string; server: Server }> {
  const base = join(ROOT, dir);
  const server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    const candidates = [join(base, safe), join(base, safe, "index.html"), join(base, `${safe}.html`), join(base, "index.html")];
    for (const file of candidates) {
      if (await isFile(file)) {
        res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
        res.end(await readFile(file));
        return;
      }
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("serveur local introuvable");
  return { url: `http://127.0.0.1:${address.port}/`, server };
}

async function capture(target: Target) {
  const local = target.dist ? await serve(target.dist) : undefined;
  const url = target.url ?? local?.url;
  if (!url) throw new Error(`${target.slug} : ni URL ni dossier de build`);

  const browser = await chromium.launch({ channel: "msedge" });
  try {
    for (const [variant, options] of Object.entries(VIEWPORTS)) {
      const context = await browser.newContext({ ...options, locale: "fr-FR", colorScheme: "light" });
      const page = await context.newPage();
      await target.prepare?.(context, page);
      await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForTimeout(target.settleMs ?? 1500);
      const path = join(SHOTS, `${target.slug}-${variant}.jpg`);
      await page.screenshot({ path, type: "jpeg", quality: 85 });
      console.log(`✓ ${target.slug} (${variant}) → ${path}`);
      await context.close();
    }
  } finally {
    await browser.close();
    local?.server.close();
  }
}

/** Image Open Graph par défaut : le hero du portfolio en 1200 × 630. */
async function captureOg() {
  const local = await serve("apps/portfolio/dist");
  const browser = await chromium.launch({ channel: "msedge" });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.goto(local.url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const path = join(ROOT, "apps/portfolio/public/og.png");
    await page.screenshot({ path });
    console.log(`✓ og → ${path}`);
  } finally {
    await browser.close();
    local.server.close();
  }
}

const only = process.argv[2];
for (const target of TARGETS.filter((t) => !only || t.slug === only)) {
  await capture(target).catch((error: unknown) => console.error(`✗ ${target.slug} : ${String(error)}`));
}
if (!only || only === "og") await captureOg();
