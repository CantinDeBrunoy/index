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


const workersDev = (worker: string) =>
  WORKERS_SUBDOMAIN ? `https://${worker}.${WORKERS_SUBDOMAIN}.workers.dev` : undefined;

const code = (app: string) => `${MONOREPO_URL}/tree/main/apps/${app}`;

/** Les apps web sont surveillées sur leur URL de démo, quand elle est connue. */
const httpMonitor = (url: string | undefined) => (url ? [{ kind: "http" as const, url }] : []);

/** URL publique du portfolio (Worker « index »). */
export const PORTFOLIO_URL = workersDev("index");

const GALACTIC_ESCAPE_URL = workersDev("galactic-escape");
const MAGELLAN_URL = workersDev("magellan");
const CANCIONERO_URL = workersDev("cancionero");
const TONALLI_URL = "https://teinte-du-jour-eight.vercel.app";
const GYM_PICKER_URL = workersDev("gym-picker");
/**
 * La page de Hublot est servie par le Worker « hublot » (connexion du propriétaire, clé GitHub côté
 * serveur), mais le cron et les données restent dans l'ancien dépôt jusqu'à la bascule : variable
 * HUBLOT_ENABLED=true sur le monorepo, cron de l'ancien dépôt désactivé, dépôt des données changé dans
 * apps/hublot (worker/github.ts, docs/app.js). Passer à true ce jour-là.
 */
const HUBLOT_MIGRATED: boolean = false;
const HUBLOT_URL = workersDev("hublot");
const HUBLOT_LATEST_JSON = HUBLOT_MIGRATED
  ? "https://raw.githubusercontent.com/CantinDeBrunoy/index/hublot-data/data/latest.json"
  : "https://raw.githubusercontent.com/CantinDeBrunoy/Hublot/main/data/latest.json";

export const PROJECTS = [
  {
    slug: "galactic-escape",
    name: "Galactic Escape",
    started: "2022-01",
    kind: "web",
    badges: ["ecole"],
    pitch: {
      fr: "Un jeu de survie en 3D inspiré du jeu du plombier : poser des cases pour se tracer un chemin dans l'espace, entre les météores, un monstre aux trousses.",
    },
    stack: ["React", "Three.js", "JavaScript", "Sass"],
    app: "galactic-escape",
    host: "Cloudflare Workers",
    // Le code vit dans le monorepo depuis 2026 ; l'historique de l'équipe, lui, reste sur run4urlife.
    links: { demo: GALACTIC_ESCAPE_URL, code: `${GITHUB_URL}/run4urlife` },
    monitors: httpMonitor(GALACTIC_ESCAPE_URL),
  },
  {
    slug: "metro-pathfinder",
    name: "Métro Pathfinder",
    started: "2022-10",
    kind: "archive",
    badges: ["ecole"],
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
    badges: ["ecole"],
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
    badges: ["ecole"],
    pitch: {
      fr: "Une app mobile pour découvrir les lieux d'une ville, à garder ou à passer d'un geste.",
    },
    stack: ["Flutter", "Dart", "Firebase", "Figma"],
    links: {},
  },
  {
    slug: "magellan",
    name: "Magellan",
    started: "2026-01",
    kind: "web",
    badges: ["ia-refonte"],
    app: "magellan",
    host: "Cloudflare Workers",
    pitch: {
      fr: "Un globe 3D qui colorie les pays visités et trace chaque voyage étape par étape.",
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
    badges: ["ia"],
    app: "cancionero",
    host: "Cloudflare Workers",
    pitch: {
      fr: "Apprendre l'espagnol en chansons : paroles traduites à écouter, karaoké et cartes de vocabulaire, même hors ligne.",
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
    badges: ["ia"],
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
    badges: ["ia"],
    app: "tonalli",
    host: "Vercel + Supabase",
    pitch: {
      fr: "Chaque jour prend la couleur de son émotion.",
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
    badges: ["ia"],
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
    badges: ["ia"],
    app: "hublot",
    host: "GitHub Actions + Cloudflare Workers",
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
    badges: ["ia"],
    app: "portfolio",
    host: "Cloudflare Workers",
    pitch: {
      fr: "Mes projets réunis dans un seul dépôt, gardés éveillés par des robots, et présentés ici escale par escale.",
    },
    stack: ["pnpm", "Turborepo", "Astro", "TypeScript", "GitHub Actions", "Cloudflare Workers"],
    links: { demo: PORTFOLIO_URL, code: MONOREPO_URL },
  },
] as const satisfies readonly ProjectInput[];
