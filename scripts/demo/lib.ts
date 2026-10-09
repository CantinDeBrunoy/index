/**
 * Le moteur des vidéos de démo, commun à scripts/demo-videos.ts (les apps filmées telles quelles) et à
 * scripts/demo-montage.ts (les montages : chapitres, appareil, générique). Une page est filmée image par image
 * (le screencast de Chrome DevTools), un curseur dessiné suit la souris, puis les images sont encodées en
 * H.264 dans une seconde page, par WebCodecs et mp4-muxer (design/renders/vendor). Aucun ffmpeg.
 */

import { mkdir, open, readFile, stat, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Browser, BrowserContext, Locator, Page } from "playwright-core";

export const ROOT = resolve(import.meta.dirname, "../..");
export const OUT = join(ROOT, "apps/portfolio/public/demos");
export const SHEETS = join(ROOT, "scripts/.demo-sheets");
const MUXER = join(ROOT, "apps/portfolio/design/renders/vendor/mp4-muxer.mjs");
export const sharp = createRequire(pathToFileURL(join(ROOT, "apps/portfolio/package.json")))("sharp") as typeof import("sharp");

export const FPS = 30;

/** Les gestes d'un scénario : la souris glisse jusqu'à sa cible, comme une vraie main. */
export class Hand {
  x: number;
  y: number;
  page: Page;
  constructor(page: Page, x = 640, y = 480) {
    this.page = page;
    this.x = x;
    this.y = y;
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

// Le curseur dessiné : un rond sombre cerclé de blanc, qui se tasse au clic. Il ne capte aucun clic. Dans une
// page qui en contient une autre (un montage, l'app dans son téléphone), il s'efface au-dessus du cadre :
// c'est celui de la page du cadre qui prend le relais, et réciproquement.
export const CURSOR = `(() => {
  let x = -100, y = -100, down = false, shown = true;
  const paint = (c) => {
    c.style.transform = "translate(" + x + "px," + y + "px) scale(" + (down ? 0.72 : 1) + ")";
    c.style.opacity = shown ? "1" : "0";
  };
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
  addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; shown = true; paint(install()); }, true);
  addEventListener("mousedown", () => { down = true; paint(install()); }, true);
  addEventListener("mouseup", () => { down = false; paint(install()); }, true);
  addEventListener("mouseover", (e) => { if (e.target && e.target.tagName === "IFRAME") { shown = false; paint(install()); } }, true);
  document.addEventListener("mouseleave", () => { if (window !== top) { shown = false; paint(install()); } });
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
  ".mp4": "video/mp4",
};

type Served = { url: string; server: Server };

async function listen(server: Server): Promise<string> {
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("serveur local introuvable");
  return `http://127.0.0.1:${address.port}`;
}

const isFile = async (path: string) => (await stat(path).catch(() => null))?.isFile() ?? false;

/** Un fichier, en entier ou par morceaux (une vidéo, que le navigateur lit par plages pour s'y déplacer). */
async function sendFile(req: IncomingMessage, res: ServerResponse, file: string) {
  const type = MIME[extname(file).toLowerCase()] ?? "application/octet-stream";
  const { size } = await stat(file);
  const range = /bytes=(\d+)-(\d*)/.exec(req.headers.range ?? "");
  if (!range) {
    res.writeHead(200, { "content-type": type, "content-length": size, "accept-ranges": "bytes" }).end(await readFile(file));
    return;
  }
  const a = Number(range[1]);
  const b = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  const handle = await open(file);
  const chunk = Buffer.alloc(b - a + 1);
  await handle.read(chunk, 0, chunk.length, a);
  await handle.close();
  res.writeHead(206, { "content-type": type, "content-range": `bytes ${a}-${b}/${size}`, "content-length": chunk.length, "accept-ranges": "bytes" }).end(chunk);
}

/** Sert un dossier de build, avec repli sur index.html pour les apps d'une seule page. */
export async function serveDist(dir: string): Promise<Served> {
  const base = join(ROOT, dir);
  const server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    for (const file of [join(base, safe), join(base, safe, "index.html"), join(base, `${safe}.html`), join(base, "index.html")]) {
      if (await isFile(file)) return sendFile(req, res, file);
    }
    res.writeHead(404).end();
  });
  return { url: await listen(server), server };
}

/** Sert des routes nommées, chacune un fichier : une page, une police, une vidéo source. */
export async function serveFiles(routes: Record<string, string>): Promise<Served> {
  const server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    const file = routes[pathname];
    if (file && (await isFile(file))) return sendFile(req, res, file);
    res.writeHead(404).end();
  });
  return { url: await listen(server), server };
}

export async function serveEncoder(): Promise<Served> {
  const muxer = await readFile(MUXER);
  const server = createServer((req, res) => {
    if (req.url === "/mp4-muxer.mjs") res.writeHead(200, { "content-type": "text/javascript" }).end(muxer);
    else res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(ENCODER);
  });
  return { url: (await listen(server)) + "/", server };
}

export interface Frame {
  t: number;
  data: string;
}

/** Filme la page pendant que le scénario se joue : ses images, horodatées. */
export async function filmPage(context: BrowserContext, page: Page, size: { width: number; height: number }, play: () => Promise<void>): Promise<Frame[]> {
  const cdp = await context.newCDPSession(page);
  const frames: Frame[] = [];
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    frames.push({ t: metadata.timestamp ?? Date.now() / 1000, data });
    void cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: size.width, maxHeight: size.height, everyNthFrame: 1 });
  await play();
  await cdp.send("Page.stopScreencast");
  if (frames.length === 0) throw new Error("aucune image filmée");
  return frames.sort((a, b) => a.t - b.t);
}

/** Les images à cadence fixe : chacune dure jusqu'à la suivante ([image, nombre de répétitions]). */
export function resample(frames: Frame[]): [Frame, number][] {
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

async function encode(browser: Browser, url: string, timeline: [Frame, number][], options: { width: number; height: number; bitrate: number }): Promise<Buffer> {
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);
  await page.evaluate((o) => (window as unknown as { start: (o: object) => void }).start(o), { ...options, fps: FPS });
  for (const [frame, repeat] of timeline) {
    await page.evaluate(([b64, k]) => (window as unknown as { add: (b: string, k: number) => Promise<void> }).add(b64, k), [frame.data, repeat] as const);
  }
  const b64 = await page.evaluate(() => (window as unknown as { finish: () => Promise<string> }).finish());
  await page.close();
  return Buffer.from(b64, "base64");
}

/** L'image affichée à `seconds` dans la vidéo. */
export function frameAt(timeline: [Frame, number][], seconds: number): Frame {
  let n = Math.round(seconds * FPS);
  for (const [frame, repeat] of timeline) {
    if (n < repeat) return frame;
    n -= repeat;
  }
  return timeline.at(-1)![0];
}

/** Encode le film, puis écrit public/demos/<slug>.mp4, son affiche <slug>.webp et, avec SHEET=1, sa planche. */
export async function writeDemo(
  browser: Browser,
  encoderUrl: string,
  slug: string,
  frames: Frame[],
  options: { width: number; height: number; bitrate: number; posterAt: number },
) {
  const timeline = resample(frames);
  const seconds = timeline.reduce((sum, [, k]) => sum + k, 0) / FPS;
  const mp4 = await encode(browser, encoderUrl, timeline, options);
  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, `${slug}.mp4`), mp4);
  const poster = Buffer.from(frameAt(timeline, options.posterAt).data, "base64");
  await sharp(poster).webp({ quality: 82 }).toFile(join(OUT, `${slug}.webp`));
  console.log(`✓ ${slug} : ${seconds.toFixed(1)} s, ${frames.length} images filmées, ${(mp4.length / 1e6).toFixed(1)} Mo`);

  if (process.env.SHEET) {
    // Une planche de 12 vignettes, pour relire le film sans le lancer.
    await mkdir(SHEETS, { recursive: true });
    const tw = 426;
    const th = Math.round((tw * options.height) / options.width);
    const thumbs = await Promise.all(
      Array.from({ length: 12 }, (_, k) =>
        sharp(Buffer.from(frameAt(timeline, (seconds * (k + 0.5)) / 12).data, "base64"))
          .resize(tw, th)
          .toBuffer(),
      ),
    );
    await sharp({ create: { width: tw * 4, height: th * 3, channels: 3, background: "#222" } })
      .composite(thumbs.map((input, k) => ({ input, left: (k % 4) * tw, top: Math.floor(k / 4) * th })))
      .jpeg({ quality: 80 })
      .toFile(join(SHEETS, `${slug}.jpg`));
  }
}
