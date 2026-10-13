/**
 * Les écrans « En images » des fiches du portfolio : apps/portfolio/src/assets/screens/<slug>/<nom>.jpg.
 *
 *   node scripts/fiche-screens.ts             # tous
 *   node scripts/fiche-screens.ts magellan    # un seul projet
 *   SHEET=1 node scripts/fiche-screens.ts …   # en plus, une planche par projet dans scripts/.demo-sheets/
 *
 * Deux sources, sans donnée personnelle :
 * - l'app en ligne, avec ses données de démo (Magellan, Cancionero…) ou son mode démo (`?demo` pour gym-picker et
 *   Hublot), sur un téléphone (390 × 844, en 2×) ou un ordinateur (1440 × 900) ;
 * - une image tirée d'une vidéo, pour les projets d'école qui ne tournent plus : les enregistrements de Cantin
 *   (scripts/.demo-sources/, hors du dépôt) ou les démos déjà publiées (apps/portfolio/public/demos/).
 * Utilise le navigateur Edge déjà installé (playwright-core, channel msedge) : aucun téléchargement.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Browser, type Locator, type Page } from "playwright-core";
import { ROOT, serveFiles, SHEETS, sharp } from "./demo/lib.ts";

const OUT = join(ROOT, "apps/portfolio/src/assets/screens");

interface Shot {
  name: string;
  /** Ce qu'on fait avant la photo : toucher un onglet, ouvrir un voyage… */
  go?: (page: Page) => Promise<void>;
  settleMs?: number;
}
interface Live {
  slug: string;
  url: string;
  device: "phone" | "desktop";
  settleMs?: number;
  /** Un script lancé avant chaque page : passer un accueil déjà vu… */
  init?: () => void;
  shots: Shot[];
}
interface Frame {
  name: string;
  /** L'instant, en secondes. */
  at: number;
  /** Le cadre à garder, en pixels de la vidéo. */
  crop?: { left: number; top: number; width: number; height: number };
}
interface FromVideo {
  slug: string;
  video: string;
  frames: Frame[];
}
type Target = Live | FromVideo;

const DEVICES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
} as const;

const tapText = (page: Page, text: string | RegExp) => page.getByText(text, { exact: typeof text === "string" }).last().click();
/** Fait défiler la page jusqu'à mettre l'élément en haut de l'écran, à 12 px du bord. */
const scrollTo = (page: Page, target: Locator) =>
  target.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 12));

/** L'écran du téléphone, dans les montages 1280 × 720 de Cantin (Tonalli). */
const PHONE_IN_MONTAGE = { left: 776, top: 74, width: 258, height: 560 };
/** La console de la démo de l'API REST .NET (1280 × 720). */
const API_CONSOLE = { left: 656, top: 66, width: 600, height: 588 };
/** L'écran du téléphone dans l'enregistrement de l'émulateur (Visit Match, 1280 × 720). */
const VISIT_MATCH_SCREEN = { left: 480, top: 68, width: 245, height: 532 };

const TARGETS: Target[] = [
  {
    // Les voyages de démo (data/initialTrips.ts), sur ordinateur.
    slug: "magellan",
    url: "https://magellan.cantin-roquier.workers.dev",
    device: "desktop",
    settleMs: 6000,
    shots: [
      { name: "globe" },
      { name: "voyages", go: (page) => tapText(page, "Voyages") },
      { name: "voyage", go: (page) => page.locator("button").filter({ hasText: "Tokyo" }).first().click(), settleMs: 3500 },
    ],
  },
  {
    // Le jeu de 2022, tiré de sa démo filmée (scripts/demo-videos.ts) : le menu, le départ, puis le chemin posé.
    slug: "galactic-escape",
    video: "apps/portfolio/public/demos/galactic-escape.mp4",
    frames: [
      { name: "menu", at: 1 },
      { name: "depart", at: 22 },
      { name: "chemin", at: 46 },
    ],
  },
  {
    // L'enregistrement de 2022 : la fenêtre de l'app seule, sans le bureau autour.
    slug: "metro-pathfinder",
    video: "scripts/.demo-sources/metro.mp4",
    frames: [
      { name: "plan", at: 9.6, crop: { left: 190, top: 30, width: 657, height: 632 } },
      { name: "trajet", at: 14.8, crop: { left: 190, top: 30, width: 657, height: 632 } },
    ],
  },
  {
    // Une vraie partie rejouée contre l'API (scripts/demo/shard-capture.ts) : la console seule, sans les textes du montage.
    slug: "api-rest-dotnet",
    video: "apps/portfolio/public/demos/api-rest-dotnet.mp4",
    frames: [
      { name: "systemes", at: 12.5, crop: API_CONSOLE },
      { name: "voyage", at: 30, crop: API_CONSOLE },
      { name: "combat", at: 54, crop: API_CONSOLE },
      { name: "tests", at: 71, crop: API_CONSOLE },
    ],
  },
  {
    // L'enregistrement de l'émulateur Android : l'écran du téléphone seul (sans le compte de test, vers 45 s).
    slug: "visit-match",
    video: "scripts/.demo-sources/visit-match.mp4",
    frames: [
      { name: "carte-lieu", at: 70, crop: VISIT_MATCH_SCREEN },
      { name: "detail", at: 88, crop: VISIT_MATCH_SCREEN },
      { name: "likes", at: 150, crop: VISIT_MATCH_SCREEN },
      { name: "plan", at: 195, crop: VISIT_MATCH_SCREEN },
    ],
  },
  {
    // Tonalli est derrière un compte : ses écrans viennent du montage de Cantin, déjà sur la fiche (le téléphone
    // de droite, sans son cadre).
    slug: "tonalli",
    video: "apps/portfolio/public/demos/tonalli.mp4",
    frames: [
      { name: "emotion", at: 30, crop: PHONE_IN_MONTAGE },
      { name: "aujourdhui", at: 78, crop: PHONE_IN_MONTAGE },
      { name: "calendrier", at: 87, crop: PHONE_IN_MONTAGE },
      { name: "personnage", at: 97, crop: PHONE_IN_MONTAGE },
    ],
  },
  {
    // Les trois chansons originales de l'app (src/data/songs.ts) ; les mots touchés partent dans les cartes.
    slug: "cancionero",
    url: "https://cancionero.cantin-roquier.workers.dev",
    device: "phone",
    shots: [
      { name: "accueil" },
      {
        name: "chanson",
        go: async (page) => {
          await page.getByRole("button", { name: /Hola, ¿cómo estás\?/ }).click();
          await page.waitForTimeout(2000);
          for (const word of ["gracias,", "días,", "noches,"]) {
            await page.getByText(word, { exact: true }).first().click();
            await page.waitForTimeout(700);
          }
          await page.getByText("Traduction", { exact: true }).click();
        },
        settleMs: 1200,
      },
      { name: "karaoke", go: (page) => page.getByRole("button", { name: /Lancer le karaoké/ }).click(), settleMs: 5000 },
      {
        name: "cartes",
        go: async (page) => {
          await page.getByRole("button", { name: /Fermer le karaoké/ }).click();
          await page.waitForTimeout(1200);
          await page.getByRole("button", { name: /^Retour$/ }).click();
          await page.waitForTimeout(1200);
          await page.getByRole("button", { name: /Vocabulaire à réviser/ }).click();
          await page.waitForTimeout(3000);
        },
      },
    ],
  },
  {
    // Ce site, sur ordinateur : les accueils du copilote passés, comme pour qui revient.
    slug: "index",
    url: "https://index.cantin-roquier.workers.dev/#escale-10",
    device: "desktop",
    settleMs: 5000,
    init: () => {
      for (const key of ["index:copilote-accueil", "index:copilote-decollage", "index:copilote-fiche"]) localStorage.setItem(key, "vu");
    },
    shots: [
      { name: "escale" },
      { name: "carnet", go: (page) => page.goto("https://index.cantin-roquier.workers.dev/projets", { waitUntil: "networkidle" }), settleMs: 4000 },
      { name: "a-propos", go: (page) => page.goto("https://index.cantin-roquier.workers.dev/a-propos", { waitUntil: "networkidle" }), settleMs: 3000 },
    ],
  },
  {
    // Le mode démo (src/demo.ts) : quatre salles fictives autour de l'Hôtel de Ville, sans GPS ni appel à TomTom.
    slug: "gym-picker",
    url: "https://gym-picker.cantin-roquier.workers.dev/?demo",
    device: "phone",
    shots: [
      { name: "classement" },
      { name: "actualiser", go: (page) => page.getByRole("button", { name: "Actualiser" }).click(), settleMs: 3500 },
      { name: "domicile", go: (page) => page.goto("https://gym-picker.cantin-roquier.workers.dev/?demo=domicile"), settleMs: 3500 },
    ],
  },
  {
    // Le mode démo (docs/demo.js) : cinq surveillances fictives, ni GitHub ni API de prix.
    slug: "hublot",
    url: "https://hublot.cantin-roquier.workers.dev/?demo",
    device: "phone",
    settleMs: 3000,
    // La page porte encore son ancien nom, « fare-radar » : les écrans partent du titre de leur rubrique.
    shots: [
      { name: "bons-plans", go: (page) => scrollTo(page, page.getByRole("heading", { name: "Bons plans" })) },
      {
        name: "surveillances",
        go: async (page) => {
          await page.getByText("Meilleur prix par mois de départ").first().click();
          await scrollTo(page, page.getByRole("heading", { name: "Mes surveillances" }));
        },
      },
      {
        name: "nouvelle",
        go: async (page) => {
          await page.getByRole("button", { name: "+ Ajouter" }).click();
          await page.locator("#city-input").pressSequentially("Rey", { delay: 120 });
        },
      },
    ],
  },
];

async function shootLive(browser: Browser, target: Live): Promise<Buffer[]> {
  const context = await browser.newContext({ ...DEVICES[target.device], locale: "fr-FR", colorScheme: "light" });
  if (target.init) await context.addInitScript(target.init);
  const page = await context.newPage();
  const shots: Buffer[] = [];
  try {
    await page.goto(target.url, { waitUntil: "networkidle", timeout: 90_000 });
    await page.waitForTimeout(target.settleMs ?? 2500);
    for (const shot of target.shots) {
      await shot.go?.(page);
      await page.waitForTimeout(shot.settleMs ?? 2000);
      shots.push(await save(target.slug, shot.name, await page.screenshot({ type: "png" })));
    }
  } finally {
    await context.close();
  }
  return shots;
}

// La page qui tire une image d'une vidéo : elle se cale sur l'instant demandé et le dessine dans un canevas.
const GRAB = `<!doctype html><meta charset="utf-8"><video src="/video.mp4" muted playsinline preload="auto"></video><script>
window.grab = async (at) => {
  const video = document.querySelector("video");
  if (video.readyState < 1) await new Promise((done) => video.addEventListener("loadedmetadata", done, { once: true }));
  video.currentTime = at;
  await new Promise((done) => video.addEventListener("seeked", done, { once: true }));
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  const canvas = Object.assign(document.createElement("canvas"), { width: video.videoWidth, height: video.videoHeight });
  canvas.getContext("2d").drawImage(video, 0, 0);
  return canvas.toDataURL("image/png");
};
</script>`;

async function grabFrames(browser: Browser, target: FromVideo): Promise<Buffer[]> {
  const page = join(ROOT, "scripts/.demo-sheets/.grab.html");
  await mkdir(SHEETS, { recursive: true });
  await writeFile(page, GRAB);
  const served = await serveFiles({ "/": page, "/video.mp4": join(ROOT, target.video) });
  const context = await browser.newContext();
  const tab = await context.newPage();
  const shots: Buffer[] = [];
  try {
    await tab.goto(served.url);
    for (const frame of target.frames) {
      const url = await tab.evaluate((at) => (window as unknown as { grab: (at: number) => Promise<string> }).grab(at), frame.at);
      let png = Buffer.from(url.split(",")[1]!, "base64");
      if (frame.crop) png = await sharp(png).extract(frame.crop).png().toBuffer();
      shots.push(await save(target.slug, frame.name, png));
    }
  } finally {
    await context.close();
    served.server.close();
  }
  return shots;
}

async function save(slug: string, name: string, png: Buffer): Promise<Buffer> {
  const dir = join(OUT, slug);
  await mkdir(dir, { recursive: true });
  const jpeg = await sharp(png).flatten({ background: "#ffffff" }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  await writeFile(join(dir, `${name}.jpg`), jpeg);
  console.log(`✓ ${slug}/${name}.jpg`);
  return jpeg;
}

/** La planche : les écrans côte à côte, à la même hauteur, pour les relire d'un coup d'œil. */
async function sheet(slug: string, shots: Buffer[]) {
  const height = 640;
  const tiles = await Promise.all(shots.map((s) => sharp(s).resize({ height }).toBuffer({ resolveWithObject: true })));
  const width = tiles.reduce((sum, t) => sum + t.info.width + 16, 16);
  let x = 16;
  const composite = tiles.map((t) => {
    const tile = { input: t.data, left: x, top: 16 };
    x += t.info.width + 16;
    return tile;
  });
  const out = join(SHEETS, `${slug}-ecrans.jpg`);
  await sharp({ create: { width, height: height + 32, channels: 3, background: "#f6f1e9" } }).composite(composite).jpeg({ quality: 80 }).toFile(out);
  console.log(`  planche → ${out}`);
}

const only = process.argv[2];
const browser = await chromium.launch({ channel: "msedge" });
try {
  for (const target of TARGETS.filter((t) => !only || t.slug === only)) {
    const shots = await ("url" in target ? shootLive(browser, target) : grabFrames(browser, target)).catch((error: unknown) => {
      console.error(`✗ ${target.slug} : ${String(error)}`);
      return [];
    });
    if (process.env.SHEET && shots.length) await sheet(target.slug, shots);
  }
} finally {
  await browser.close();
}
