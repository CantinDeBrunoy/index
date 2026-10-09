/**
 * Les montages de démo des fiches, dans l'esprit de ceux de Tonalli et de Magellan montés par Cantin : un titre,
 * des chapitres (une étiquette, un titre, un texte) avec l'app dans un téléphone ou une fenêtre, « Sous le
 * capot », puis le générique. 1280 × 720, sans son :
 *   apps/portfolio/public/demos/<slug>.mp4 et <slug>.webp (l'affiche).
 *
 * Usage :
 *   node scripts/demo-montage.ts               # tous
 *   node scripts/demo-montage.ts metro-pathfinder
 *   SHEET=1 node scripts/demo-montage.ts …     # en plus, une planche de vignettes dans scripts/.demo-sheets/
 *
 * Le plateau est une page (scripts/demo/stage.html) pilotée par window.stage, filmée et encodée par le moteur
 * commun (scripts/demo/lib.ts). Ce qui passe dans l'appareil vient :
 *   - d'un enregistrement de Cantin, recadré et accéléré (Visit Match), ou de plans arrêtés qu'on parcourt
 *     (Métro Pathfinder). Ces sources, lourdes, restent hors du dépôt : scripts/.demo-sources/<nom>.mp4 ;
 *   - ou de l'app elle-même, servie depuis son build local dans son mode démo (gym-picker, Hublot).
 */

import { join } from "node:path";
import { chromium, type Browser, type Locator, type Page } from "playwright-core";
import { CURSOR, filmPage, Hand, ROOT, serveDist, serveEncoder, serveFiles, writeDemo, type Frame } from "./demo/lib.ts";

const W = 1280;
const H = 720;
const SOURCES = process.env.DEMO_SOURCES ?? join(ROOT, "scripts/.demo-sources");

/** Les commandes du plateau, envoyées à window.stage. */
class Stage {
  page: Page;
  constructor(page: Page) {
    this.page = page;
  }
  private call(name: string, ...args: unknown[]) {
    return this.page.evaluate(([n, a]) => (window as unknown as { stage: Record<string, (...x: unknown[]) => unknown> }).stage[n as string]!(...(a as unknown[])), [name, args] as const);
  }
  theme(vars: Record<string, string>, strip: string[] = []) {
    return this.call("theme", vars, strip);
  }
  title(o: { name: string; tag?: string; meta?: string[] }) {
    return this.call("title", o);
  }
  outro(o: { name: string; tag?: string }) {
    return this.call("outro", o);
  }
  chapter(o: { kicker: string; title: string; text: string }) {
    return this.call("chapter", o);
  }
  capot(o: { kicker?: string; title: string; sub?: string; cards: { name: string; lines: string[]; dot?: string }[]; meta?: string[] }) {
    return this.call("capot", o);
  }
  device(kind: "phone" | "window") {
    return this.call("device", kind);
  }
  video(o: { src: string; crop: Crop; from?: number; rate?: number }) {
    return this.call("video", o);
  }
  cut(t: number, rate?: number) {
    return this.call("cut", t, rate);
  }
  pause() {
    return this.call("pause");
  }
  prepare(stills: { key: string; src: string; t: number }[]) {
    return this.call("prepare", stills);
  }
  image(o: { still: string; crop: Crop }) {
    return this.call("image", o);
  }
  pan(o: { x: number; y: number; zoom: number; ms?: number }) {
    return this.call("pan", o);
  }
  app(o: { src: string; width: number; height: number }) {
    return this.call("app", o);
  }
}

interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Montage {
  slug: string;
  bitrate?: number;
  /** L'image de l'affiche, en secondes depuis le début. */
  posterAt: number;
  /** Les enregistrements sources, servis sous /media/<nom> (fichiers de scripts/.demo-sources). */
  sources?: string[];
  /** Une app à filmer dans son mode démo : son build local, servi à part. */
  dist?: string;
  play: (s: { stage: Stage; hand: Hand; page: Page; wait: (ms: number) => Promise<void>; app?: string }) => Promise<void>;
}

// Le plan du métro de l'enregistrement de 2022 : la fenêtre de l'app, immobile à partir de 9 s.
const METRO_MAP: Crop = { x: 190, y: 30, w: 657, h: 632 };
// L'écran de l'émulateur Android, dans l'enregistrement de Visit Match.
const VISIT_SCREEN: Crop = { x: 480, y: 68, w: 245, h: 532 };

const MONTAGES: Montage[] = [
  {
    slug: "metro-pathfinder",
    posterAt: 9,
    sources: ["metro.mp4"],
    async play({ stage, wait }) {
      // Les couleurs des lignes du métro, en bande en bas de l'image.
      await stage.theme(
        { bg: "#0f1a33", ink: "#f3efe6", muted: "#aab3c5", accent: "#00a88f", card: "#172446", line: "rgba(255,255,255,.1)", bezel: "#0b1226" },
        ["#ffcd00", "#003ca6", "#837902", "#be418d", "#ff7e2e", "#6eca97", "#fa9aba", "#e19bdf", "#b6bd00", "#c9910d", "#704b1c", "#007852", "#6ec4e8", "#62259d"],
      );
      await stage.prepare([
        { key: "plan", src: "/media/metro.mp4", t: 9.6 },
        { key: "trajet", src: "/media/metro.mp4", t: 14.8 },
      ]);
      await stage.title({ name: "Métro Pathfinder", tag: "Le plus court chemin entre deux stations du métro parisien.", meta: ["2022", "Projet d'école", "Java · Swing"] });
      await wait(4200);
      await stage.device("window");
      await stage.image({ still: "plan", crop: METRO_MAP });
      await stage.chapter({ kicker: "Le réseau", title: "Le métro, en graphe", text: "Les stations sont des <b>nœuds</b>, les tronçons qui les relient sont des <b>arêtes</b>." });
      await wait(400);
      await stage.pan({ x: 300, y: 280, zoom: 1.18, ms: 5600 });
      await wait(6000);
      await stage.chapter({ kicker: "Le trajet", title: "Deux stations, un trajet", text: "On choisit le départ et l'arrivée : le plus court chemin s'affiche sur le plan, <b>station par station</b>." });
      await stage.image({ still: "trajet", crop: METRO_MAP });
      await stage.pan({ x: 290, y: 225, zoom: 1.9, ms: 5200 });
      await wait(6200);
      await stage.chapter({ kicker: "L'algorithme", title: "Dijkstra, vérifiable à la main", text: "Le plus court chemin dans un graphe aux distances positives : <b>exact</b>, et simple à vérifier sur le papier. Mon premier algorithme sur un graphe." });
      await stage.pan({ x: 380, y: 270, zoom: 2.5, ms: 5600 });
      await wait(6400);
      await stage.capot({
        title: "Une application de bureau",
        sub: "Un projet d'école, en 2022.",
        cards: [
          { name: "Le graphe", lines: ["Les stations en nœuds, les tronçons en arêtes", "Le réseau du métro parisien"] },
          { name: "Dijkstra", lines: ["Le plus court chemin, distances positives", "Exact, et vérifiable à la main"] },
          { name: "Java et Swing", lines: ["Un langage et une interface connus", "Tout l'effort va à l'algorithme"] },
        ],
        meta: ["Projet d'école", "2022", "Le code sur GitHub"],
      });
      await wait(5600);
      await stage.outro({ name: "Métro Pathfinder", tag: "Projet d'école, 2022 · Cantin Roquier" });
      await wait(3000);
    },
  },
  {
    slug: "visit-match",
    bitrate: 1_800_000,
    posterAt: 7,
    sources: ["visit-match.mp4"],
    async play({ stage, wait }) {
      await stage.theme(
        { bg: "#fbf8f3", ink: "#1d2533", muted: "#5d6575", accent: "#d9952c", card: "#ffffff", line: "rgba(0,0,0,.08)" },
        ["#d9952c", "#9ec9e8", "#5cb85c", "#e05a4f", "#4a90c2"],
      );
      await stage.title({ name: "Visit Match", tag: "Les voyageurs solo qui partagent les mêmes envies.", meta: ["2023", "Projet d'école", "Flutter · Firebase"] });
      await wait(4200);
      await stage.device("phone");
      // Chaque séquence : [début, fin] dans l'enregistrement, et sa vitesse.
      const play = async (from: number, to: number, rate: number) => {
        await stage.cut(from, rate);
        await wait(((to - from) / rate) * 1000);
      };
      await stage.video({ src: "/media/visit-match.mp4", crop: VISIT_SCREEN, from: 6, rate: 3 });
      await stage.chapter({ kicker: "L'inscription", title: "Un compte, ses envies", text: "Un nom, une adresse, puis <b>ses centres d'intérêt</b> : monuments, musées, parcs, randonnées…" });
      await wait(((57 - 6) / 3) * 1000);
      await stage.chapter({ kicker: "Le match", title: "Un lieu, un geste", text: "Des lieux autour de soi, à <b>garder</b> ou à <b>passer</b>, d'un geste." });
      await play(60, 74, 1.4);
      await stage.chapter({ kicker: "Le lieu", title: "Tout sur une visite", text: "Distance, catégorie, prix : chaque lieu a sa fiche, ses photos et <b>son plan</b>." });
      await play(74, 94, 1.6);
      await stage.chapter({ kicker: "Les carnets", title: "Un voyage, un carnet", text: "On range les lieux dans un carnet par voyage, ici « paris »." });
      await play(94, 110, 1.6);
      await play(210, 218, 1.5);
      await stage.chapter({ kicker: "Les likes", title: "Triés à sa façon", text: "Les lieux gardés, triés <b>par date</b>, <b>par prix</b> ou <b>par catégorie</b>." });
      await play(130, 158, 2);
      await stage.chapter({ kicker: "La carte", title: "Tout sur le plan", text: "Les lieux gardés, épinglés sur la carte de la ville." });
      await play(186, 202, 1.6);
      await stage.chapter({ kicker: "Le profil", title: "Ses préférences", text: "Centres d'intérêt, rayon de recherche, <b>thème clair ou sombre</b>." });
      await play(222, 250, 2);
      await stage.pause();
      await stage.capot({
        title: "Un projet d'école, jusqu'au business plan",
        sub: "Une app mobile, pensée avec ses futurs utilisateurs.",
        cards: [
          { name: "Flutter", lines: ["Une seule base de code", "Pour iOS et Android"], dot: "#4a90c2" },
          { name: "Firebase", lines: ["Les comptes et les données", "Sans serveur à maintenir"], dot: "#d9952c" },
          { name: "Figma d'abord", lines: ["Les écrans dessinés et discutés", "Avant la première ligne de code"], dot: "#5cb85c" },
        ],
        meta: ["2023", "Projet d'école d'ingénieur", "Business plan"],
      });
      await wait(6000);
      await stage.outro({ name: "Visit Match", tag: "Projet d'école d'ingénieur, 2023" });
      await wait(3000);
    },
  },
  {
    // Le mode démo de l'app (src/demo.ts) : quatre salles fictives autour de l'Hôtel de Ville, des trajets
    // calculés dans la page, sans GPS ni appel à TomTom.
    slug: "gym-picker",
    posterAt: 9,
    dist: "apps/gym-picker/dist/client",
    async play({ stage, hand, page, wait, app }) {
      await stage.theme(
        { bg: "#0b1120", ink: "#f1f5f9", muted: "#8d9ab0", accent: "#a3e635", card: "#151e32", line: "#26324b", bezel: "#26324b", shadow: "0 30px 70px rgba(0,0,0,.5)" },
        ["#a3e635", "#facc15", "#fb923c", "#f87171"],
      );
      await stage.title({ name: "gym-picker", tag: "La salle la moins embouteillée, en un coup d'œil.", meta: ["2026", "App web", "TomTom · Cloudflare Workers"] });
      await wait(4200);
      await stage.device("phone");
      await stage.chapter({ kicker: "Le trafic", title: "Toutes les salles, classées", text: "Toutes les salles classées par <b>temps de trajet en voiture</b>, bouchons compris." });
      await stage.app({ src: `${app}/?demo`, width: 390, height: 844 });
      const $ = page.frameLocator("#app");
      await wait(2600);
      for (let k = 0; k < 4; k++) {
        await hoverApp(page, hand, $.locator("li.gym").nth(k), 650);
        await wait(500);
      }
      await stage.chapter({ kicker: "En direct", title: "Le classement bouge", text: "Un appui sur <b>Actualiser</b> : les temps suivent le trafic, et la meilleure salle change." });
      for (let k = 0; k < 2; k++) {
        await tapApp(page, hand, $.getByRole("button", { name: "Actualiser" }));
        await wait(2600);
        await hoverApp(page, hand, $.locator("li.gym--best .gym__time"), 700);
        await wait(800);
      }
      await stage.chapter({ kicker: "Un appui", title: "Et c'est parti", text: "Toucher une salle ouvre <b>Waze</b> ou <b>Google Maps</b> sur le bon trajet." });
      await hoverApp(page, hand, $.locator("li.gym--best a.gym__go"), 900);
      await wait(1600);
      await hoverApp(page, hand, $.locator("li.gym--best a.gym__alt"), 600);
      await wait(1600);
      await stage.chapter({ kicker: "Le domicile", title: "Un domicile de secours", text: "Si le GPS tarde, le calcul part d'une adresse gardée <b>sur le téléphone</b>." });
      await tapApp(page, hand, $.getByRole("button", { name: "Utiliser ma position actuelle" }));
      await wait(3200);
      await tapApp(page, hand, $.getByRole("button", { name: "Effacer" }));
      await wait(1800);
      await stage.capot({
        title: "Une clé qui ne quitte pas le serveur",
        sub: "Une app web, et un Worker Cloudflare devant l'API de TomTom.",
        cards: [
          { name: "TomTom", lines: ["Pas de carte bancaire", "Au-delà du quota, l'API refuse au lieu de facturer"] },
          { name: "Un Worker", lines: ["La clé reste côté serveur", "20 appels par minute et par adresse IP"], dot: "#facc15" },
          { name: "Le domicile", lines: ["Gardé sur le téléphone", "Dans le corps de la requête, jamais dans l'adresse"], dot: "#fb923c" },
        ],
        meta: ["Démo : salles et trajets fictifs", "React · Vite", "Cloudflare Workers"],
      });
      await wait(6000);
      await stage.outro({ name: "gym-picker", tag: "2026 · Cantin Roquier" });
      await wait(3000);
    },
  },
  {
    // Le mode démo de la page (docs/demo.js) : des surveillances et des prix fictifs, au départ de Paris.
    slug: "hublot",
    posterAt: 9,
    dist: "apps/hublot/dist/page",
    async play({ stage, hand, page, wait, app }) {
      await stage.theme(
        { bg: "#f4f6fa", ink: "#16202e", muted: "#5d6b7e", accent: "#1f6feb", card: "#ffffff", line: "#dde3ec" },
        ["#1f6feb", "#11845b", "#9a6700", "#c93c37"],
      );
      await stage.title({ name: "Hublot", tag: "Un robot guette le prix des vols à ma place.", meta: ["2026", "Robot et page web", "GitHub Actions · ntfy"] });
      await wait(4200);
      await stage.device("phone");
      await stage.chapter({ kicker: "Les bons plans", title: "Sous le seuil, et pas plus", text: "Les allers-retours qui passent <b>sous le prix fixé</b>, du moins cher au plus cher." });
      await stage.app({ src: `${app}/?demo`, width: 390, height: 844 });
      const $ = page.frameLocator("#app");
      await wait(2200);
      await hand.glide(980, 420, 800);
      await hand.scroll(420, 1800);
      await wait(900);
      await tapApp(page, hand, $.getByText("Voir 1 autre bon plan pour Lisbonne"));
      await wait(2200);
      await stage.chapter({ kicker: "Les surveillances", title: "Une destination, un seuil", text: "Une destination, une période de départ, une durée de séjour, <b>un prix à ne pas dépasser</b>." });
      await hoverApp(page, hand, $.locator("#watches-title"), 700);
      await wait(800);
      await tapApp(page, hand, $.locator("#watches article").filter({ hasText: "Montréal" }).getByText("Meilleur prix par mois de départ"));
      await wait(2600);
      await stage.chapter({ kicker: "Une nouvelle", title: "Reykjavik, en quelques secondes", text: "Le robot relève les prix de la nouvelle surveillance : une alerte quand l'un passe <b>sous le seuil</b>." });
      await tapApp(page, hand, $.locator("#add-watch"));
      await wait(1200);
      await tapApp(page, hand, $.locator("#city-input"), 500);
      await page.keyboard.type("Rey", { delay: 160 });
      await wait(900);
      await tapApp(page, hand, $.locator("#city-suggestions button").filter({ hasText: "Reykjavik" }), 500);
      for (const [field, value] of [["#min-days", "4"], ["#max-days", "7"], ["#max-price", "250"]] as const) {
        await tapApp(page, hand, $.locator(field), 450);
        await page.keyboard.press("Control+A");
        await page.keyboard.type(value, { delay: 120 });
      }
      await wait(500);
      await tapApp(page, hand, $.locator("#watch-submit"));
      await wait(5200);
      await hoverApp(page, hand, $.locator("#watches article").filter({ hasText: "Reykjavik" }), 800);
      await wait(1800);
      await stage.capot({
        title: "Pas de serveur à entretenir",
        sub: "Un robot dans GitHub Actions, une page, des alertes sur le téléphone.",
        cards: [
          { name: "GitHub Actions", lines: ["Une tâche planifiée gratuite", "Un relevé toutes les six heures"] },
          { name: "Les relevés à part", lines: ["Sur leur propre branche", "L'historique du code reste lisible"], dot: "#11845b" },
          { name: "ntfy", lines: ["Une notification sur le téléphone", "Une seule par mois de départ"], dot: "#9a6700" },
        ],
        meta: ["Démo : surveillances et prix fictifs", "TypeScript · Node.js", "GitHub Actions"],
      });
      await wait(6000);
      await stage.outro({ name: "Hublot", tag: "2026 · Cantin Roquier" });
      await wait(3000);
    },
  },
];

/**
 * Le centre, sur la page, d'un élément de l'app filmée dans son cadre réduit : l'élément est d'abord amené
 * à l'écran dans l'app, puis sa position est ramenée à l'échelle du cadre.
 */
async function inApp(page: Page, target: Locator) {
  await target.evaluate((e) => e.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  await page.waitForTimeout(450);
  const frame = (await page.locator("#app").boundingBox())!;
  const scale = frame.width / Number(await page.locator("#app").getAttribute("width"));
  const r = await target.evaluate((e) => {
    const b = e.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  return { x: frame.x + r.x * scale, y: frame.y + r.y * scale };
}

async function tapApp(page: Page, hand: Hand, target: Locator, ms = 700) {
  const { x, y } = await inApp(page, target);
  await hand.click(x, y, ms);
}

async function hoverApp(page: Page, hand: Hand, target: Locator, ms = 700) {
  const { x, y } = await inApp(page, target);
  await hand.glide(x, y, ms);
}

const FONTS = { "/fonts/geist.woff2": "packages/ui/fonts/geist-latin-wght-normal.woff2", "/fonts/geist-mono.woff2": "packages/ui/fonts/geist-mono-latin-wght-normal.woff2" };

async function film(browser: Browser, montage: Montage): Promise<Frame[]> {
  const routes: Record<string, string> = { "/": join(ROOT, "scripts/demo/stage.html") };
  for (const [path, file] of Object.entries(FONTS)) routes[path] = join(ROOT, file);
  for (const name of montage.sources ?? []) routes[`/media/${name}`] = join(SOURCES, name);
  const site = await serveFiles(routes);
  const app = montage.dist ? await serveDist(montage.dist) : undefined;
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: "fr-FR", colorScheme: "light" });
  await context.addInitScript(CURSOR);
  const page = await context.newPage();
  try {
    await page.goto(site.url + "/", { waitUntil: "load" });
    await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);
    await page.evaluate(() => document.fonts.ready);
    const hand = new Hand(page, W * 0.75, H * 0.8);
    const stage = new Stage(page);
    const wait = (ms: number) => page.waitForTimeout(ms);
    return await filmPage(context, page, { width: W, height: H }, () => montage.play({ stage, hand, page, wait, app: app?.url }));
  } finally {
    await context.close();
    site.server.close();
    app?.server.close();
  }
}

const only = process.argv[2];
const { url: encoderUrl, server } = await serveEncoder();
const browser = await chromium.launch({ channel: "msedge" });
try {
  for (const montage of MONTAGES.filter((m) => !only || m.slug === only)) {
    await film(browser, montage)
      .then((frames) => writeDemo(browser, encoderUrl, montage.slug, frames, { width: W, height: H, bitrate: montage.bitrate ?? 1_400_000, posterAt: montage.posterAt }))
      .catch((error: unknown) => console.error(`✗ ${montage.slug} : ${String(error)}`));
  }
} finally {
  await browser.close();
  server.close();
}
