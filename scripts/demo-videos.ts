/**
 * Les vidéos de démo des fiches du portfolio, filmées sur les apps en ligne :
 *   apps/portfolio/public/demos/<slug>.mp4 (H.264, 1280 × 800, sans son) et <slug>.webp (l'affiche).
 *
 * Usage :
 *   node scripts/demo-videos.ts             # toutes
 *   node scripts/demo-videos.ts magellan    # une seule
 *   SHEET=1 node scripts/demo-videos.ts …   # en plus, une planche de vignettes dans scripts/.demo-sheets/
 *
 * Chaque démo est un scénario joué dans Edge sans écran (playwright-core, channel msedge), filmé et encodé
 * par le moteur commun, scripts/demo/lib.ts.
 *
 * Les apps qui affichent des données personnelles (gym-picker, Hublot) sont filmées dans leur mode démo, dans
 * un montage : scripts/demo-montage.ts. Tonalli a sa propre vidéo, montée par Cantin.
 */

import { chromium, type Browser, type Page } from "playwright-core";
import { CURSOR, filmPage, Hand, serveDist, serveEncoder, sharp, writeDemo, type Frame } from "./demo/lib.ts";

const WIDTH = 1280;
const HEIGHT = 800;

interface Demo {
  slug: string;
  /** L'adresse filmée ; avec `dist`, son chemin dans le build local (« /?demo »). */
  url: string;
  /** Un build local à servir, pour une app filmée dans son mode démo avant qu'il soit en ligne. */
  dist?: string;
  /** Débit visé (bit/s) : plus haut pour ce qui bouge beaucoup (un globe, un jeu). */
  bitrate?: number;
  /** L'image de l'affiche, en secondes depuis le début. */
  posterAt: number;
  /** Pause après le chargement, avant de filmer. */
  settleMs?: number;
  play: (hand: Hand, page: Page) => Promise<void>;
}

const DEMOS: Demo[] = [
  {
    // Les voyages de démo (data/initialTrips.ts) : le globe, la liste, puis une carte postale.
    slug: "magellan",
    url: "https://magellan.cantin-roquier.workers.dev",
    bitrate: 2_200_000,
    posterAt: 1,
    settleMs: 5000,
    async play(hand, page) {
      await hand.wait(2500);
      await hand.glide(640, 380, 900);
      await hand.drag(-260, 30, 1600);
      await hand.wait(1800);
      await hand.drag(180, -60, 1400);
      await hand.wait(2200);
      await hand.tap(page.getByText("Voyages", { exact: true }).last());
      await hand.wait(2200);
      await hand.tap(page.getByText(/^Road trips/));
      await hand.wait(1800);
      await hand.tap(page.getByText(/^Tous/));
      await hand.wait(1400);
      await hand.tap(page.locator("button").filter({ hasText: "Tokyo" }).first());
      await hand.wait(3200);
      await hand.scroll(500, 1600);
      await hand.wait(2000);
      await hand.scroll(-500, 1200);
      await hand.wait(800);
      await hand.tap(page.getByRole("button", { name: /Retour/ }));
      await hand.wait(1500);
      await hand.tap(page.locator("button").filter({ hasText: "Marrakech" }).first());
      await hand.wait(3500);
      await hand.tap(page.getByRole("button", { name: /Retour/ }));
      await hand.wait(1200);
      await hand.tap(page.getByText("Globe", { exact: true }).last());
      await hand.wait(3500);
    },
  },
  {
    // Les chansons originales de l'app : des mots mis de côté, le karaoké, puis les cartes à réviser.
    slug: "cancionero",
    url: "https://cancionero.cantin-roquier.workers.dev",
    posterAt: 9,
    async play(hand, page) {
      await hand.wait(1800);
      await hand.hover(page.getByRole("button", { name: /Mi familia/ }), 800);
      await hand.wait(500);
      await hand.tap(page.getByRole("button", { name: /Hola, ¿cómo estás\?/ }));
      await hand.wait(2200);
      for (const word of ["gracias,", "días,", "noches,"]) {
        await hand.tap(page.getByText(word, { exact: true }).first(), 600);
        await hand.wait(900);
      }
      await hand.tap(page.getByText("Traduction", { exact: true }), 700);
      await hand.wait(1400);
      await hand.tap(page.getByText("Traduction", { exact: true }), 500);
      await hand.wait(1000);
      await hand.tap(page.getByRole("button", { name: /Lancer le karaoké/ }));
      await hand.glide(1000, 600, 900);
      await hand.wait(9000);
      await hand.tap(page.getByRole("button", { name: /Fermer le karaoké/ }));
      await hand.wait(1500);
      await hand.tap(page.getByRole("button", { name: /^Retour$/ }));
      await hand.wait(1500);
      await hand.tap(page.getByRole("button", { name: /Vocabulaire à réviser/ }));
      await hand.wait(2500);
      // Les cartes : la retourner, puis passer à la suivante.
      for (let k = 0; k < 2; k++) {
        await hand.click(640, 380, 700);
        await hand.wait(1800);
        const next = page.getByRole("button", { name: /Je le connais/i }).first();
        if (await next.isVisible().catch(() => false)) await hand.tap(next, 600);
        await hand.wait(1600);
      }
      await hand.wait(1500);
    },
  },
  {
    // Le jeu de 2022 : le menu sur Mars, une partie en facile, quelques cases posées devant le monstre.
    slug: "galactic-escape",
    url: "https://galactic-escape.cantin-roquier.workers.dev",
    bitrate: 2_000_000,
    posterAt: 2,
    async play(hand, page) {
      await hand.wait(3000);
      await hand.tap(page.locator("nav.menu ul > div").first());
      await hand.wait(1800);
      await hand.click(223, 266, 600); // Facile
      await hand.wait(1400);
      await hand.click(258, 413, 600); // Lancer
      await hand.wait(5500);
      let slot = 0;
      for (let move = 0; move < 9; move++) {
        let placed = false;
        // Une case de l'inventaire, puis l'une des places autour du personnage, celle du haut d'abord.
        for (let attempt = 0; attempt < 6 && !placed; attempt++) {
          if (attempt % 3 === 0) {
            await hand.click(47, 162 + 98 * (slot % 3), 500);
            slot++;
            await hand.wait(400);
          }
          const before = await placesOnScreen(page);
          const target = before[attempt % 3] ?? before[0];
          if (!target) break;
          await hand.click(target.x, target.y, 450);
          await hand.wait(700);
          placed = !samePlaces(before, await placesOnScreen(page));
        }
        await hand.wait(placed ? 500 : 1500);
      }
      await hand.wait(3000);
    },
  },
  {
    // Ce site : le départ, trois escales, une fiche, puis le carnet et ses raccourcis.
    slug: "index",
    url: "https://index.cantin-roquier.workers.dev",
    bitrate: 1_800_000,
    posterAt: 1,
    settleMs: 3500,
    async play(hand, page) {
      await hand.wait(2500);
      await hand.tap(page.locator('a.go[data-go="1"]'));
      await hand.wait(4200);
      const welcome = page.locator("[data-copilote-voyage]");
      if (await welcome.isVisible().catch(() => false)) {
        await hand.tap(welcome);
        await hand.wait(1500);
      }
      for (const n of [1, 2]) {
        await hand.tap(page.locator(`#escale-${n} a.spot`), 900);
        await hand.wait(4200);
      }
      await hand.tap(page.locator("#escale-3").getByRole("link", { name: /fiche/i }).first());
      await hand.wait(2500);
      await hand.scroll(900, 2400);
      await hand.wait(2000);
      await hand.scroll(900, 2400);
      await hand.wait(1800);
      await hand.scroll(-1800, 1500);
      await hand.wait(800);
      await hand.tap(page.locator("[data-sommaire-open]"));
      await hand.wait(1400);
      await hand.tap(page.locator(".sommaire__site").getByRole("link", { name: /^Les projets/ }));
      await hand.wait(2500);
      await hand.hover(page.locator(".app-chip").nth(1), 900);
      await hand.wait(1200);
      await hand.hover(page.locator(".app-chip").nth(5), 900);
      await hand.wait(1200);
      await hand.scroll(700, 1800);
      await hand.wait(2500);
    },
  },
];

/**
 * Les places où poser une case, autour du personnage de Galactic Escape : les carrés jaunes de la scène,
 * repérés à l'image (le jeu ne les expose pas). Celle du haut d'abord.
 */
async function placesOnScreen(page: Page): Promise<{ x: number; y: number }[]> {
  const png = await page.screenshot({ type: "png" });
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const CELL = 4;
  const cols = Math.ceil(info.width / CELL);
  const rows = Math.ceil(info.height / CELL);
  const hit = new Uint8Array(cols * rows);
  for (let y = 0; y < info.height; y += 2) {
    for (let x = 140; x < info.width; x += 2) {
      const i = (y * info.width + x) * 3;
      const [r, g, b] = [data[i]!, data[i + 1]!, data[i + 2]!];
      if (r > 90 && g > 90 && b < 60 && Math.abs(r - g) < 40) hit[Math.floor(y / CELL) * cols + Math.floor(x / CELL)] = 1;
    }
  }
  const seen = new Uint8Array(cols * rows);
  const boxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
  for (let start = 0; start < hit.length; start++) {
    if (!hit[start] || seen[start]) continue;
    const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const k = stack.pop()!;
      const cx = k % cols;
      const cy = Math.floor(k / cols);
      box.x0 = Math.min(box.x0, cx);
      box.x1 = Math.max(box.x1, cx);
      box.y0 = Math.min(box.y0, cy);
      box.y1 = Math.max(box.y1, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx;
        const ny = cy + dy;
        const n = ny * cols + nx;
        if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && hit[n] && !seen[n]) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    boxes.push(box);
  }
  return boxes
    .map((b) => ({ w: (b.x1 - b.x0 + 1) * CELL, h: (b.y1 - b.y0 + 1) * CELL, x: ((b.x0 + b.x1 + 1) * CELL) / 2, y: ((b.y0 + b.y1 + 1) * CELL) / 2 }))
    .filter((b) => b.w > 40 && b.h > 40 && b.w < 200 && b.h < 200)
    .sort((a, b) => a.y - b.y)
    .map(({ x, y }) => ({ x, y }));
}

const samePlaces = (a: { x: number; y: number }[], b: { x: number; y: number }[]) =>
  a.length === b.length && a.every((p, k) => Math.abs(p.x - b[k]!.x) < 10 && Math.abs(p.y - b[k]!.y) < 10);

/** Joue le scénario d'une démo et rend ses images. */
async function film(browser: Browser, demo: Demo): Promise<Frame[]> {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, locale: "fr-FR", colorScheme: "light" });
  await context.addInitScript(CURSOR);
  const page = await context.newPage();
  const local = demo.dist ? await serveDist(demo.dist) : undefined;
  try {
    await page.goto(local ? local.url + demo.url : demo.url, { waitUntil: "networkidle", timeout: 90_000 });
    await page.waitForTimeout(demo.settleMs ?? 2500);
    const hand = new Hand(page, WIDTH / 2, HEIGHT * 0.6);
    await page.mouse.move(hand.x, hand.y);
    return await filmPage(context, page, { width: WIDTH, height: HEIGHT }, () => demo.play(hand, page));
  } finally {
    await context.close();
    local?.server.close();
  }
}

const only = process.argv[2];
const { url: encoderUrl, server } = await serveEncoder();
const browser = await chromium.launch({ channel: "msedge" });
try {
  for (const demo of DEMOS.filter((d) => !only || d.slug === only)) {
    await film(browser, demo)
      .then((frames) => writeDemo(browser, encoderUrl, demo.slug, frames, { width: WIDTH, height: HEIGHT, bitrate: demo.bitrate ?? 1_400_000, posterAt: demo.posterAt }))
      .catch((error: unknown) => console.error(`✗ ${demo.slug} : ${String(error)}`));
  }
} finally {
  await browser.close();
  server.close();
}
