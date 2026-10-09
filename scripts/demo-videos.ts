/**
 * Les vidéos de démo des fiches du portfolio, filmées sur les apps en ligne :
 *   apps/portfolio/public/demos/<slug>.mp4 (H.264, 1280 × 800, sans son) et <slug>.webp (l'affiche).
 *
 * Usage :
 *   node scripts/demo-videos.ts             # toutes
 *   node scripts/demo-videos.ts magellan    # une seule
 *   SHEET=1 node scripts/demo-videos.ts …   # en plus, une planche de vignettes dans scripts/.demo-sheets/
 *
 * Chaque démo est un scénario joué dans Edge sans écran (playwright-core, channel msedge) : la page est
 * filmée image par image (le screencast de Chrome DevTools), un curseur dessiné suit la souris pour qu'on
 * voie où l'on clique, puis les images sont encodées en MP4 dans une seconde page, par WebCodecs et
 * mp4-muxer (design/renders/vendor), comme les scènes du voyage. Aucun téléchargement, aucun ffmpeg.
 *
 * Pas de vidéo pour les apps qui affichent des données personnelles sans mode démo (gym-picker : les
 * salles ; Hublot : les vols surveillés ; Tonalli : derrière un compte), ni pour les archives sans site.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Locator, type Page } from "playwright-core";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, "apps/portfolio/public/demos");
const SHEETS = join(ROOT, "scripts/.demo-sheets");
const MUXER = join(ROOT, "apps/portfolio/design/renders/vendor/mp4-muxer.mjs");
const sharp = createRequire(pathToFileURL(join(ROOT, "apps/portfolio/package.json")))("sharp") as typeof import("sharp");

const WIDTH = 1280;
const HEIGHT = 800;
const FPS = 30;

/** Les gestes d'un scénario : la souris glisse jusqu'à sa cible, comme une vraie main. */
class Hand {
  x = WIDTH / 2;
  y = HEIGHT * 0.6;
  page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  wait(ms: number) {
    return this.page.waitForTimeout(ms);
  }

  /** Glisse jusqu'à (x, y) en `ms`, sur une courbe douce, calée sur l'horloge. */
  async glide(x: number, y: number, ms = 700) {
    const from = { x: this.x, y: this.y };
    const start = Date.now();
    for (;;) {
      const t = Math.min(1, (Date.now() - start) / ms);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      await this.page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
      if (t === 1) break;
      await this.page.waitForTimeout(12);
    }
    this.x = x;
    this.y = y;
  }

  async click(x: number, y: number, ms = 700) {
    await this.glide(x, y, ms);
    await this.wait(120);
    await this.page.mouse.down();
    await this.wait(90);
    await this.page.mouse.up();
  }

  /** Le centre d'un élément, une fois à l'écran. */
  async center(target: Locator) {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error(`introuvable : ${target}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  async tap(target: Locator, ms = 700) {
    const { x, y } = await this.center(target);
    await this.click(x, y, ms);
  }

  async hover(target: Locator, ms = 700) {
    const { x, y } = await this.center(target);
    await this.glide(x, y, ms);
  }

  /** Fait défiler la page de `dy` pixels en `ms`, à la molette. */
  async scroll(dy: number, ms = 1200) {
    const start = Date.now();
    let done = 0;
    for (;;) {
      const t = Math.min(1, (Date.now() - start) / ms);
      const target = dy * (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
      await this.page.mouse.wheel(0, target - done);
      done = target;
      if (t === 1) break;
      await this.page.waitForTimeout(16);
    }
  }

  /** Un glisser-déposer, pour tourner un globe. */
  async drag(dx: number, dy: number, ms = 1200) {
    await this.page.mouse.down();
    await this.glide(this.x + dx, this.y + dy, ms);
    await this.page.mouse.up();
  }
}

interface Demo {
  slug: string;
  url: string;
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
      await hand.tap(page.locator(".nav-desktop").getByRole("link", { name: "Les projets" }));
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

// Le curseur dessiné : un rond sombre cerclé de blanc, qui se tasse au clic. Il ne capte aucun clic.
const CURSOR = `(() => {
  let x = -100, y = -100, down = false;
  const paint = (c) => (c.style.transform = "translate(" + x + "px," + y + "px) scale(" + (down ? 0.72 : 1) + ")");
  const install = () => {
    let c = document.getElementById("__demo-cursor");
    if (c) return c;
    c = document.createElement("div");
    c.id = "__demo-cursor";
    c.style.cssText = "position:fixed;left:-13px;top:-13px;width:26px;height:26px;border-radius:50%;box-sizing:border-box;" +
      "background:rgba(25,22,20,.38);border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);pointer-events:none;" +
      "z-index:2147483647;transition:transform .12s ease-out";
    (document.body || document.documentElement).appendChild(c);
    paint(c);
    return c;
  };
  addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; paint(install()); }, true);
  addEventListener("mousedown", () => { down = true; paint(install()); }, true);
  addEventListener("mouseup", () => { down = false; paint(install()); }, true);
  setInterval(install, 300);
})();`;

// L'encodeur : une page qui reçoit les images (JPEG) et rend le MP4.
const ENCODER = `<!doctype html><meta charset="utf-8"><script type="module">
import { Muxer, ArrayBufferTarget } from "/mp4-muxer.mjs";
let muxer, encoder, fps, n = 0, failure = null;
window.start = ({ width, height, fps: f, bitrate }) => {
  fps = f;
  muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width, height, frameRate: fps }, fastStart: "in-memory" });
  encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => (failure = e) });
  encoder.configure({ codec: "avc1.640028", width, height, framerate: fps, bitrateMode: "variable", bitrate,
    latencyMode: "quality", hardwareAcceleration: "prefer-software", avc: { format: "avc" } });
};
window.add = async (b64, repeat) => {
  const bitmap = await createImageBitmap(await (await fetch("data:image/jpeg;base64," + b64)).blob());
  for (let k = 0; k < repeat; k++) {
    const frame = new VideoFrame(bitmap, { timestamp: Math.round((n * 1e6) / fps), duration: Math.round(1e6 / fps) });
    // Une image clé toutes les deux secondes : la vidéo se parcourt sans attendre.
    encoder.encode(frame, { keyFrame: n % (fps * 2) === 0 });
    frame.close();
    n++;
    while (encoder.encodeQueueSize > 4) await new Promise((r) => encoder.addEventListener("dequeue", r, { once: true }));
    if (failure) throw failure;
  }
  bitmap.close();
};
window.finish = async () => {
  await encoder.flush();
  muxer.finalize();
  const bytes = new Uint8Array(muxer.target.buffer);
  let s = "";
  for (let k = 0; k < bytes.length; k += 0x8000) s += String.fromCharCode(...bytes.subarray(k, k + 0x8000));
  return btoa(s);
};
window.ready = true;
</script>`;

async function serveEncoder(): Promise<{ url: string; server: Server }> {
  const muxer = await readFile(MUXER);
  const server = createServer((req, res) => {
    if (req.url === "/mp4-muxer.mjs") res.writeHead(200, { "content-type": "text/javascript" }).end(muxer);
    else res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(ENCODER);
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("serveur local introuvable");
  return { url: `http://127.0.0.1:${address.port}/`, server };
}

interface Frame {
  t: number;
  data: string;
}

/** Joue le scénario et rend ses images, horodatées. */
async function film(browser: Browser, demo: Demo): Promise<Frame[]> {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, locale: "fr-FR", colorScheme: "light" });
  await context.addInitScript(CURSOR);
  const page = await context.newPage();
  await page.goto(demo.url, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForTimeout(demo.settleMs ?? 2500);

  const cdp = await context.newCDPSession(page);
  const frames: Frame[] = [];
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    frames.push({ t: metadata.timestamp ?? Date.now() / 1000, data });
    void cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: WIDTH, maxHeight: HEIGHT, everyNthFrame: 1 });
  const hand = new Hand(page);
  await page.mouse.move(hand.x, hand.y);
  await demo.play(hand, page);
  await cdp.send("Page.stopScreencast");
  await context.close();
  if (frames.length === 0) throw new Error("aucune image filmée");
  return frames.sort((a, b) => a.t - b.t);
}

/** Les images à cadence fixe : chacune dure jusqu'à la suivante ([image, nombre de répétitions]). */
function resample(frames: Frame[]): [Frame, number][] {
  const start = frames[0]!.t;
  const end = frames.at(-1)!.t + 0.6;
  const out: [Frame, number][] = [];
  let j = 0;
  for (let n = 0; start + n / FPS < end; n++) {
    const t = start + n / FPS;
    while (j + 1 < frames.length && frames[j + 1]!.t <= t) j++;
    const last = out.at(-1);
    if (last && last[0] === frames[j]) last[1]++;
    else out.push([frames[j]!, 1]);
  }
  return out;
}

async function encode(browser: Browser, url: string, timeline: [Frame, number][], bitrate: number): Promise<Buffer> {
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);
  await page.evaluate((o) => (window as unknown as { start: (o: object) => void }).start(o), { width: WIDTH, height: HEIGHT, fps: FPS, bitrate });
  for (const [frame, repeat] of timeline) {
    await page.evaluate(([b64, k]) => (window as unknown as { add: (b: string, k: number) => Promise<void> }).add(b64, k), [frame.data, repeat] as const);
  }
  const b64 = await page.evaluate(() => (window as unknown as { finish: () => Promise<string> }).finish());
  await page.close();
  return Buffer.from(b64, "base64");
}

/** L'image affichée à `seconds` dans la vidéo. */
function frameAt(timeline: [Frame, number][], seconds: number): Frame {
  let n = Math.round(seconds * FPS);
  for (const [frame, repeat] of timeline) {
    if (n < repeat) return frame;
    n -= repeat;
  }
  return timeline.at(-1)![0];
}

async function make(browser: Browser, encoderUrl: string, demo: Demo) {
  const frames = await film(browser, demo);
  const timeline = resample(frames);
  const seconds = timeline.reduce((sum, [, k]) => sum + k, 0) / FPS;
  const mp4 = await encode(browser, encoderUrl, timeline, demo.bitrate ?? 1_400_000);
  await writeFile(join(OUT, `${demo.slug}.mp4`), mp4);
  const poster = Buffer.from(frameAt(timeline, demo.posterAt).data, "base64");
  await sharp(poster).webp({ quality: 82 }).toFile(join(OUT, `${demo.slug}.webp`));
  console.log(`✓ ${demo.slug} : ${seconds.toFixed(1)} s, ${frames.length} images filmées, ${(mp4.length / 1e6).toFixed(1)} Mo`);

  if (process.env.SHEET) {
    // Une planche de 12 vignettes, pour relire le film sans le lancer.
    await mkdir(SHEETS, { recursive: true });
    const thumbs = await Promise.all(
      Array.from({ length: 12 }, (_, k) =>
        sharp(Buffer.from(frameAt(timeline, (seconds * (k + 0.5)) / 12).data, "base64"))
          .resize(426, 266)
          .toBuffer(),
      ),
    );
    await sharp({ create: { width: 426 * 4, height: 266 * 3, channels: 3, background: "#222" } })
      .composite(thumbs.map((input, k) => ({ input, left: (k % 4) * 426, top: Math.floor(k / 4) * 266 })))
      .jpeg({ quality: 80 })
      .toFile(join(SHEETS, `${demo.slug}.jpg`));
  }
}

await mkdir(OUT, { recursive: true });
const only = process.argv[2];
const { url: encoderUrl, server } = await serveEncoder();
const browser = await chromium.launch({ channel: "msedge" });
try {
  for (const demo of DEMOS.filter((d) => !only || d.slug === only)) {
    await make(browser, encoderUrl, demo).catch((error: unknown) => console.error(`✗ ${demo.slug} : ${String(error)}`));
  }
} finally {
  await browser.close();
  server.close();
}
