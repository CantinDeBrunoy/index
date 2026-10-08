import type { ProjectInput } from "./types.ts";

/*
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ INDEX — la liste des entrées.                                                 │
 * │                                                                              │
 * │ Ajouter un projet = ajouter un objet EN FIN de liste : son numéro (011, 012…) │
 * │ est attribué d'après sa position, et le portfolio, la page de détail, le     │
 * │ statut live et keep-alive.yml le prennent en compte automatiquement.         │
 * │ Les tests vérifient l'ordre chronologique (champ `started`) et l'unicité.    │
 * └──────────────────────────────────────────────────────────────────────────────┘
 */

export const GITHUB_URL = "https://github.com/CantinDeBrunoy";
export const MONOREPO_URL = `${GITHUB_URL}/index`;

/** Sous-domaine workers.dev du compte Cloudflare (gym-picker.<ici>.workers.dev). */
export const WORKERS_SUBDOMAIN: string | undefined = "cantin-roquier";

/** URL Vercel de Cancionero (projet Vercel « cancionero-cantin »). */
const CANCIONERO_URL: string | undefined = "https://cancionero-cantin.vercel.app";

const workersDev = (worker: string) =>
  WORKERS_SUBDOMAIN ? `https://${worker}.${WORKERS_SUBDOMAIN}.workers.dev` : undefined;

const code = (app: string) => `${MONOREPO_URL}/tree/main/apps/${app}`;

/** Les apps web sont surveillées sur leur URL de démo, quand elle est connue. */
const httpMonitor = (url: string | undefined) => (url ? [{ kind: "http" as const, url }] : []);

/** URL publique du portfolio (Worker « index »). */
export const PORTFOLIO_URL = workersDev("index");

const MAGELLAN_URL = workersDev("magellan");
const TONALLI_URL = "https://teinte-du-jour-eight.vercel.app";
const GYM_PICKER_URL = workersDev("gym-picker");
/**
 * Hublot tourne depuis son ancien dépôt (cron + GitHub Pages) jusqu'à la bascule : variable
 * HUBLOT_ENABLED=true sur le monorepo, cron de l'ancien dépôt désactivé. Passer à true ce jour-là.
 */
const HUBLOT_MIGRATED: boolean = false;
const HUBLOT_URL = HUBLOT_MIGRATED ? workersDev("hublot") : "https://cantindebrunoy.github.io/Hublot/";
const HUBLOT_LATEST_JSON = HUBLOT_MIGRATED
  ? "https://raw.githubusercontent.com/CantinDeBrunoy/index/hublot-data/data/latest.json"
  : "https://raw.githubusercontent.com/CantinDeBrunoy/Hublot/main/data/latest.json";

export const PROJECTS = [
  {
    slug: "metro-pathfinder",
    name: "Métro Pathfinder",
    started: "2022-10",
    kind: "archive",
    pitch: {
      fr: "Le trajet le plus court entre deux stations du métro parisien, calculé avec Dijkstra sur le graphe du réseau.",
    },
    stack: ["Java", "Swing", "Dijkstra"],
    links: { code: `${GITHUB_URL}/Metro` },
  },
  {
    slug: "api-rest-dotnet",
    name: "API REST .NET",
    started: "2023-01",
    kind: "archive",
    pitch: {
      fr: "Une API REST en microservices C# .NET, développée en TDD et conteneurisée avec Docker.",
    },
    stack: ["C#", ".NET", "SQL Server", "Docker", "xUnit"],
    links: {},
  },
  {
    slug: "visit-match",
    name: "Visit Match",
    started: "2023-01",
    kind: "archive",
    pitch: {
      fr: "Une app mobile qui met en relation des voyageurs solo partageant destinations et centres d'intérêt.",
    },
    stack: ["Flutter", "Dart", "Firebase", "Figma"],
    links: {},
  },
  {
    slug: "galaxy-escape",
    name: "Galaxy Escape",
    started: "2024-01",
    kind: "archive",
    pitch: {
      fr: "Un jeu de course infinie en 3D dans le navigateur, avec génération procédurale des niveaux.",
    },
    stack: ["Three.js", "WebGL", "JavaScript"],
    links: { code: `${GITHUB_URL}/run4urlife` },
  },
  {
    slug: "magellan",
    name: "Magellan",
    started: "2026-01",
    kind: "web",
    app: "magellan",
    host: "Cloudflare Workers",
    pitch: {
      fr: "Un globe 3D qui colorie les pays visités et trace chaque voyage étape par étape, sans compte ni serveur.",
    },
    stack: ["Expo", "React Native", "TypeScript", "Three.js", "IndexedDB"],
    links: { demo: MAGELLAN_URL, code: code("magellan") },
    monitors: httpMonitor(MAGELLAN_URL),
  },
  {
    slug: "cancionero",
    name: "Cancionero",
    started: "2026-07",
    kind: "web",
    app: "cancionero",
    host: "Vercel",
    pitch: {
      fr: "Apprendre l'espagnol en chansons : paroles traduites, karaoké à trous, flashcards et quiz, même hors ligne.",
    },
    stack: ["Expo", "React Native Web", "TypeScript", "PWA"],
    links: { demo: CANCIONERO_URL, code: code("cancionero") },
    monitors: httpMonitor(CANCIONERO_URL),
  },
  {
    slug: "mithril",
    name: "Mithril",
    started: "2026-08",
    kind: "desktop",
    app: "mithril",
    host: "GitHub Releases",
    pitch: {
      fr: "Un générateur de mots de passe pour Windows, avec coffre chiffré local et saisie automatique, sans installation ni réseau.",
    },
    stack: ["C#", "WinForms", ".NET Framework", "AES-256"],
    // Les versions publiées de l'ancien dépôt, jusqu'à la première release du monorepo (tag mithril-v*).
    links: { download: `${GITHUB_URL}/Mithril/releases`, code: code("mithril") },
  },
  {
    slug: "tonalli",
    name: "Tonalli",
    started: "2026-08",
    kind: "web",
    app: "tonalli",
    host: "Vercel + Supabase",
    pitch: {
      fr: "Un rituel quotidien à deux : une émotion en couleur et deux photos, puis le calendrier de l'autre se dévoile.",
    },
    stack: ["React", "Vite", "TypeScript", "Supabase", "PWA", "Web Push"],
    links: { demo: TONALLI_URL, code: code("tonalli") },
    monitors: [
      { kind: "http", url: TONALLI_URL },
      {
        kind: "supabase",
        url: "https://iyaqtvcwvylabdjlmpxm.supabase.co",
        table: "emotions",
        anonKeyEnv: "TONALLI_SUPABASE_ANON_KEY",
      },
    ],
  },
  {
    slug: "gym-picker",
    name: "gym-picker",
    started: "2026-09",
    kind: "web",
    app: "gym-picker",
    host: "Cloudflare Workers",
    pitch: {
      fr: "Classe mes salles Fitness Park par temps de trajet réel, trafic compris, et ouvre Waze sur la plus rapide.",
    },
    stack: ["React", "Vite", "Cloudflare Workers", "TomTom"],
    links: { demo: GYM_PICKER_URL, code: code("gym-picker") },
    monitors: httpMonitor(GYM_PICKER_URL),
  },
  {
    slug: "hublot",
    name: "Hublot",
    started: "2026-09",
    kind: "web",
    app: "hublot",
    host: HUBLOT_MIGRATED ? "GitHub Actions + Cloudflare Workers" : "GitHub Actions + GitHub Pages",
    pitch: {
      fr: "Surveille toutes les 6 heures le prix des allers-retours depuis Paris et m'alerte quand un vol passe sous mon seuil.",
    },
    stack: ["TypeScript", "Node.js", "GitHub Actions", "ntfy"],
    links: { demo: HUBLOT_URL, code: code("hublot") },
    monitors: [
      ...httpMonitor(HUBLOT_URL),
      // Le cron tourne toutes les 6 h : au-delà de 13 h sans données neuves, il est arrêté.
      { kind: "freshness", url: HUBLOT_LATEST_JSON, field: "generatedAt", maxAgeHours: 13 },
    ],
  },
  {
    // Le portfolio lui-même : le hub d'où s'ouvrent toutes les apps. Pas de sonde, c'est lui qui sonde.
    slug: "index",
    name: "INDEX",
    started: "2026-10",
    kind: "web",
    app: "portfolio",
    host: "Cloudflare Workers",
    pitch: {
      fr: "Mes projets réunis dans un seul dépôt, gardés éveillés par des robots, et présentés ici escale par escale.",
    },
    stack: ["pnpm", "Turborepo", "Astro", "TypeScript", "GitHub Actions", "Cloudflare Workers"],
    links: { demo: PORTFOLIO_URL, code: MONOREPO_URL },
  },
] as const satisfies readonly ProjectInput[];
