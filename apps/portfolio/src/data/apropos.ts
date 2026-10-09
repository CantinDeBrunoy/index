/**
 * « À propos », le passeport : d'après les CV de Cantin (octobre 2026) et ses projets. Employeur et ville
 * affichés à sa demande ; ni téléphone, ni photo, ni nom de projet interne. Brouillons, à relire.
 *
 * L'itinéraire est un plan de ligne : la ligne de l'école et celle de la STIME, côte à côte pendant les cinq ans
 * d'alternance, la correspondance du diplôme, l'embranchement de l'Espagne ; puis le détail de chaque ligne.
 * Les dates sont en années décimales (septembre 2020 = 2020 + 8 / 12) ; aujourd'hui, c'est le jour de la
 * construction du site : le plan et le poste actuel suivent sans qu'on y touche.
 */

import { projects } from "@index/projects";
import { inWords, type Lang } from "../i18n/voyage";

const built = new Date();
/** Aujourd'hui, en année décimale. */
export const NOW = built.getFullYear() + (built.getMonth() + (built.getDate() - 1) / 31) / 12;

/** Le plan de ligne : l'axe des années, la bande de l'alternance, les stations de chaque ligne. */
export const LINES = {
  axis: [2019, Math.max(2027, Math.ceil(NOW))] as const,
  band: { from: 2020 + 8 / 12, to: 2025 + 8 / 12 },
  school: [
    { id: "dut", at: 2019 + 8 / 12 },
    { id: "licence", at: 2021 + 8 / 12 },
    { id: "ingenieur", at: 2022 + 8 / 12 },
  ],
  work: [
    { id: "frontend", at: 2020 + 8 / 12 },
    { id: "fullstack", at: 2021 + 8 / 12 },
    { id: "mobile", at: 2025 + 8 / 12 },
    { id: "today", at: NOW },
  ],
  /** Le diplôme : la ligne de l'école s'arrête, correspondance avec celle de la STIME. */
  interchange: 2025 + 8 / 12,
  /** Le stage en Espagne, un embranchement de la ligne de l'école. */
  branch: 2024 + 9 / 12,
} as const;

export type StationId = "dut" | "licence" | "ingenieur" | "diplome" | "espagne" | "frontend" | "fullstack" | "mobile" | "today";
/** Les lignes du plan, et la couleur de chaque étape du détail. */
export type LineId = "school" | "work" | "branch";

/** Les langues en pastilles de ligne : leur code et leur couleur (4,5:1 au moins avec le papier). */
export const LANG_LINES = [
  { code: "FR", ink: "#84652f" },
  { code: "EN", ink: "#346885" },
  { code: "ES", ink: "#9e5530", fiche: "cancionero" },
] as const;

/** Le sac en lignes de bus : une couleur par famille d'outils, dans l'ordre de `bag`. */
export const BAG_LINES = ["#346885", "#4f6d3a", "#7a3b5c", "#84652f", "#a54e22", "#6a5f52"] as const;

/** En dehors du code : les objets du cabinet, en boucle (public/voyage) et en image fixe (stills). */
export const AWAY = ["randonnee", "book", "gloves", "valise", "escalade", "tennis", "natation", "course"] as const;

interface Leg {
  title: string;
  sub: string;
  /** [quand, quoi, où, ce que j'y ai fait (une ligne), la ligne du plan] */
  items: [string, string, string, string, LineId][];
}

interface AproposStrings {
  pageTitle: string;
  description: string;
  label: string;
  role: string;
  where: string;
  status: string;
  lead: string;
  write: string;
  /**
   * Le CV à télécharger. En attente : les PDF actuels portent le numéro de téléphone, qui ne va pas sur le
   * site. Le bouton apparaît dès qu'une version sans numéro est là ({ href, file, label }).
   */
  cv?: { href: string; file: string; label: string };
  linkedin: string;
  alt: string;
  labels: { route: string; langs: string; bag: string; away: string };
  /** Sous l'en-tête, quatre chiffres : [le chiffre, ce qu'il compte]. */
  stats: [string, string][];
  /** Les titres des rubriques. */
  titles: { route: string; langs: string; bag: string; away: string };
  route: {
    band: string;
    /** Les lettres des deux lignes, dans leur pastille. */
    codes: [string, string];
    stations: Record<StationId, [string, string]>;
    school: Leg;
    work: Leg;
    projects: string;
    projectsLink: string;
  };
  /** Dans l'ordre de LANG_LINES : la langue, le niveau, et le lien de l'espagnol vers Cancionero. */
  langs: { name: string; level: string; link?: string }[];
  bag: [string, string[]][];
  /** Dans l'ordre d'AWAY. `text` : une phrase de Cantin, à écrire (les questions sont en commentaire). */
  away: { title: string; alt: string; text?: string }[];
  /** Le carrousel « en dehors du code » : ses boutons. */
  carousel: { prev: string; next: string; pause: string; play: string; slide: string };
}

export const APROPOS: Record<Lang, AproposStrings> = {
  fr: {
    pageTitle: "À propos",
    description:
      "Cantin Roquier, ingénieur développeur fullstack et mobile à la DSI du Groupement Les Mousquetaires : son itinéraire, ses langues, ses outils.",
    label: "À propos · le passeport",
    role: "Ingénieur développeur fullstack & mobile",
    where: "Brunoy (91), près de Paris",
    status: "Ingénieur en CDI chez la STIME",
    lead: "Ingénieur diplômé de l'EFREI, je travaille depuis 2020 à la DSI du Groupement Les Mousquetaires : je conçois des applications web et mobiles utilisées à grande échelle, du recueil des besoins jusqu'à la mise en production.",
    write: "M'écrire",
    linkedin: "https://fr.linkedin.com/in/cantin-roquier-2a0a50228",
    alt: "Mon passeport sur le bureau : à gauche, la page d'identité et mon monogramme ; à droite, un visa par projet, chacun à l'encre de son escale. Le tampon de laiton passe par l'encreur et pose un nouveau visa : INDEX 2026.",
    labels: {
      route: "L'itinéraire",
      langs: "Les langues",
      bag: "Dans mon sac",
      away: "En dehors du code",
    },
    stats: [
      ["5 ans", "d'alternance : l'école et la STIME en même temps"],
      ["3 000+", "points de vente utilisent l'app mobile à laquelle j'ai contribué en alternance"],
      ["1 700", "magasins commandent leurs produits frais sur l'app que je développe aujourd'hui"],
      [String(projects.length), "projets à moi, à côté : chaque escale de ce site"],
    ],
    titles: {
      route: "Deux lignes, une correspondance",
      langs: "Trois lignes parlées",
      bag: "Six lignes de bus",
      away: "Ce que je fais quand l'écran s'éteint",
    },
    route: {
      band: "Cinq ans d'alternance : les deux lignes en même temps",
      codes: ["É", "S"],
      stations: {
        dut: ["DUT Informatique", "UPEC · 2019"],
        licence: ["Licence pro", "CY Gennevilliers · 2021"],
        ingenieur: ["École d'ingénieurs", "EFREI Paris · 2022"],
        diplome: ["Diplômé", "correspondance · 2025"],
        espagne: ["Espagne · 3 mois", "Krakento, Cullera · 2024"],
        frontend: ["Frontend", "en alternance · 2020"],
        fullstack: ["Fullstack", "en alternance, jusqu'en 2025"],
        mobile: ["Ingénieur diplômé", "mobile · 2025"],
        today: ["Aujourd'hui", "fullstack mobile, en CDI"],
      },
      school: {
        title: "À l'école",
        sub: "En alternance de 2020 à 2025",
        items: [
          ["2019 – 2021", "DUT Informatique", "UPEC", "", "school"],
          ["2021 – 2022", "Licence pro Développement web et mobile", "CY Cergy Paris Université · Gennevilliers", "", "school"],
          ["2022 – 2025", "Diplôme d'ingénieur", "EFREI Paris · filière Logiciels et systèmes d'information", "", "school"],
          ["2024", "Stage ingénieur à l'étranger", "Krakento · Cullera, Espagne · 3 mois", "Des sites e-commerce sous Odoo, et leurs maquettes sur Figma.", "branch"],
        ],
      },
      work: {
        title: "Chez la STIME",
        sub: "DSI du Groupement Les Mousquetaires · Paris",
        items: [
          ["2020 – 2021", "Développeur frontend, en alternance", "", "Une application web mobile-first de flex office.", "work"],
          ["2020 – 2025", "Développeur fullstack, en alternance", "", "L'app mobile de plus de 3 000 points de vente, deux apps React pour le SAV et leur BFF Node.js.", "work"],
          ["2025 – 2026", "Développeur mobile, ingénieur diplômé", "", "Une app React Native de pilotage pour les adhérents Intermarché.", "work"],
          ["Depuis 2026", "Développeur fullstack mobile", "", "L'app React Native / Expo de commande des produits frais de 1 700 magasins, et son back-office React.", "work"],
        ],
      },
      projects: `Et en parallèle, ${inWords("fr", projects.length)} projets à moi depuis 2022 : chaque escale de ce site, et le site lui-même.`,
      projectsLink: "Revoir le voyage →",
    },
    langs: [
      { name: "Français", level: "Langue maternelle" },
      { name: "Anglais", level: "C1 · TOEIC 900" },
      { name: "Espagnol", level: "B1, en progrès", link: "Avec Cancionero →" },
    ],
    bag: [
      ["Front-end et mobile", ["React", "React Native", "Expo", "TypeScript", "JavaScript", "HTML", "CSS"]],
      ["Back-end et données", ["Node.js", "Supabase", "PostgreSQL", "C# et .NET", "Java", "SQL", "Couchbase"]],
      ["En 3D", ["Three.js", "WebGL"]],
      ["Outils et CI", ["Git", "GitHub", "GitHub Actions", "Docker", "Figma", "Odoo"]],
      ["Tests et IA", ["Playwright", "GitHub Copilot", "Claude Code"]],
      ["Méthodes", ["Scrum", "SAFe", "Kanban"]],
    ],
    // Mis en avant à sa demande : la randonnée, l'histoire, les sports de combat ; puis les autres loisirs, qui
    // étaient en pastilles sous le carrousel (« Et aussi »). Les phrases à écrire, à la première personne : pour
    // la randonnée, son plus beau sentier ou celui qui l'attend ; pour l'histoire, la période ou le livre qui l'a
    // marqué ; pour les sports de combat, ce que le combat lui apporte.
    away: [
      { title: "Randonnée", alt: "Une petite montagne d'argile, son sentier de laiton en lacets jusqu'au fanion du sommet ; un randonneur y monte." },
      { title: "Histoire", alt: "Une pile de livres d'histoire, celui du dessus qui s'entrouvre, un signet en laiton." },
      { title: "Sports de combat", alt: "Une paire de gants de boxe en argile, le laçage en laiton.", text: "Boxe française, MMA, jiu-jitsu brésilien." },
      { title: "Voyages", alt: "Une valise d'argile aux coins de laiton, couverte d'étiquettes de voyage ; son étiquette à bagages se balance, un avion de papier en fait le tour." },
      { title: "Escalade", alt: "Un pan d'escalade qui surplombe son tapis, une voie de prises en laiton ; un grimpeur encordé la monte et la redescend." },
      { title: "Tennis", alt: "Une raquette d'argile debout, le manche en laiton ; une balle de laiton rebondit à côté." },
      { title: "Natation", alt: "Un bassin d'argile, deux lignes d'eau qui suivent la houle, une échelle de laiton et trois plots de départ." },
      { title: "Course à pied", alt: "Une paire de baskets d'argile à semelle de laiton, qui déroulent le pas chacune son tour." },
    ],
    carousel: { prev: "Loisir précédent", next: "Loisir suivant", pause: "Mettre le carrousel en pause", play: "Relancer le carrousel", slide: "Loisir {n} sur {count}" },
  },
  en: {
    pageTitle: "About",
    description:
      "Cantin Roquier, full-stack and mobile software engineer in the IT department of Les Mousquetaires Group: his itinerary, his languages, his tools.",
    label: "About · the passport",
    role: "Full-stack & mobile software engineer",
    where: "Brunoy, Paris area, France",
    status: "Engineer at STIME, on a permanent contract",
    lead: "An EFREI Paris engineer, I have worked in the IT department of Les Mousquetaires Group (Intermarché) since 2020, building web and mobile apps used at scale, from requirements gathering to production release.",
    write: "Email me",
    linkedin: "https://www.linkedin.com/in/cantin-roquier-2a0a50228",
    alt: "My passport on the desk: on the left, the identity page and my monogram; on the right, one visa per project, each in the ink of its stop. The brass stamp dips into the ink pad and adds a new visa: INDEX 2026.",
    labels: {
      route: "The itinerary",
      langs: "Languages",
      bag: "In my bag",
      away: "Away from the code",
    },
    stats: [
      ["5 years", "of work-study: school and STIME at the same time"],
      ["3,000+", "stores use the mobile app I worked on as an apprentice"],
      ["1,700", "stores order their fresh products on the app I build today"],
      [String(projects.length), "projects of my own, on the side: every stop on this site"],
    ],
    titles: {
      route: "Two lines, one interchange",
      langs: "Three spoken lines",
      bag: "Six bus routes",
      away: "What I do when the screen goes dark",
    },
    route: {
      band: "Five years of work-study: both lines at the same time",
      codes: ["S", "W"],
      stations: {
        dut: ["Technical degree", "UPEC · 2019"],
        licence: ["Bachelor's", "CY Gennevilliers · 2021"],
        ingenieur: ["Engineering school", "EFREI Paris · 2022"],
        diplome: ["Graduated", "interchange · 2025"],
        espagne: ["Spain · 3 months", "Krakento, Cullera · 2024"],
        frontend: ["Front end", "work-study · 2020"],
        fullstack: ["Full-stack", "work-study, until 2025"],
        mobile: ["Graduate engineer", "mobile · 2025"],
        today: ["Today", "full-stack mobile, permanent"],
      },
      school: {
        title: "At school",
        sub: "Work-study from 2020 to 2025",
        items: [
          ["2019 – 2021", "Two-year technical degree (DUT) in computer science", "UPEC", "", "school"],
          ["2021 – 2022", "Professional bachelor's in web and mobile development", "CY Cergy Paris University · Gennevilliers", "", "school"],
          ["2022 – 2025", "Master's-level engineering degree", "EFREI Paris · Software and Information Systems track", "", "school"],
          ["2024", "Engineering internship abroad", "Krakento · Cullera, Spain · 3 months", "E-commerce websites on Odoo, with their mockups in Figma.", "branch"],
        ],
      },
      work: {
        title: "At STIME",
        sub: "IT department of Les Mousquetaires Group · Paris",
        items: [
          ["2020 – 2021", "Front-end developer, work-study", "", "A mobile-first flex-office web app.", "work"],
          ["2020 – 2025", "Full-stack developer, work-study", "", "The mobile app of over 3,000 stores, two React apps for after-sales support and their Node.js back-for-front.", "work"],
          ["2025 – 2026", "Mobile developer, graduate engineer", "", "A React Native app for Intermarché store owners to track their store's performance.", "work"],
          ["Since 2026", "Full-stack mobile developer", "", "The React Native / Expo app 1,700 stores use to order fresh products, and its React back office.", "work"],
        ],
      },
      projects: `And alongside, ${inWords("en", projects.length)} projects of my own since 2022: every stop on this site, and the site itself.`,
      projectsLink: "Back to the journey →",
    },
    langs: [
      { name: "French", level: "Native" },
      { name: "English", level: "C1 · TOEIC 900" },
      { name: "Spanish", level: "B1, improving", link: "With Cancionero →" },
    ],
    bag: [
      ["Front end and mobile", ["React", "React Native", "Expo", "TypeScript", "JavaScript", "HTML", "CSS"]],
      ["Back end and data", ["Node.js", "Supabase", "PostgreSQL", "C# and .NET", "Java", "SQL", "Couchbase"]],
      ["3D", ["Three.js", "WebGL"]],
      ["Tools and CI", ["Git", "GitHub", "GitHub Actions", "Docker", "Figma", "Odoo"]],
      ["Testing and AI", ["Playwright", "GitHub Copilot", "Claude Code"]],
      ["Methods", ["Scrum", "SAFe", "Kanban"]],
    ],
    // Les mêmes phrases à écrire, en anglais : your best trail, or the one still waiting for you; the period or
    // the book that stayed with you; what fighting gives you.
    away: [
      { title: "Hiking", alt: "A small clay mountain, its brass trail switching back up to the summit flag; a hiker climbs it." },
      { title: "History", alt: "A stack of history books, the top one falling open, with a brass bookmark." },
      { title: "Combat sports", alt: "A pair of clay boxing gloves with brass lacing.", text: "Savate (French kickboxing), MMA, Brazilian jiu-jitsu." },
      { title: "Travel", alt: "A clay suitcase with brass corners, covered in travel stickers; its luggage tag swings and a paper plane circles it." },
      { title: "Climbing", alt: "An overhanging climbing wall above its crash pad, a route of brass holds; a roped climber goes up and back down." },
      { title: "Tennis", alt: "A clay racket standing upright with a brass grip; a brass ball bounces beside it." },
      { title: "Swimming", alt: "A clay pool, two lane ropes riding the swell, a brass ladder and three starting blocks." },
      { title: "Running", alt: "A pair of clay sneakers with brass soles, taking turns to roll through a stride." },
    ],
    carousel: { prev: "Previous hobby", next: "Next hobby", pause: "Pause the carousel", play: "Play the carousel", slide: "Hobby {n} of {count}" },
  },
};
