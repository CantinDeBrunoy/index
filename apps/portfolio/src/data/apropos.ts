/**
 * « À propos », le passeport : d'après les CV de Cantin (octobre 2026) et ses projets. Employeur et ville
 * affichés à sa demande ; ni téléphone, ni photo, ni nom de projet interne. Brouillons, à relire.
 *
 * L'itinéraire est une frise à trois voies (l'école, l'entreprise, l'étranger), puis le détail de chaque voie.
 * Les dates sont en années décimales (septembre 2020 = 2020 + 8 / 12) ; aujourd'hui, c'est le jour de la
 * construction du site : la frise et le poste actuel suivent sans qu'on y touche.
 */

import type { Lang } from "../i18n/voyage";

const built = new Date();
/** Aujourd'hui, en année décimale. */
export const NOW = built.getFullYear() + (built.getMonth() + (built.getDate() - 1) / 31) / 12;

/** La frise : ses années, la bande de l'alternance, et chaque barre, rangée sur sa voie. */
export const ROUTE = {
  axis: [2019, Math.max(2027, Math.ceil(NOW))] as const,
  band: { from: 2020 + 8 / 12, to: 2025 + 8 / 12 },
  bars: [
    { id: "dut", lane: 0, from: 2019 + 8 / 12, to: 2021.5 },
    { id: "licence", lane: 0, from: 2021 + 8 / 12, to: 2022 + 8 / 12 },
    { id: "ingenieur", lane: 0, from: 2022 + 8 / 12, to: 2025 + 8 / 12 },
    { id: "alternance", lane: 1, from: 2020 + 8 / 12, to: 2025 + 8 / 12, tone: "alt" },
    { id: "cdi", lane: 1, from: 2025 + 8 / 12, to: NOW, tone: "now" },
    // Trop courte pour son titre : il se lit à côté.
    { id: "espagne", lane: 2, from: 2024 + 7.5 / 12, to: 2024 + 10.5 / 12, tone: "trip", outside: true },
  ],
} as const;

export type BarId = (typeof ROUTE.bars)[number]["id"];

/** Les langues en visas : l'encre de chaque tampon (4,5:1 au moins sur le papier) et son inclinaison. */
export const VISAS = [
  { ink: "#84652f", rot: -4 },
  { ink: "#346885", rot: 3 },
  { ink: "#9e5530", rot: -2, fiche: "cancionero" },
] as const;

/** En dehors du code : les objets du cabinet, en boucle (public/voyage) et en image fixe (stills). */
export const AWAY = ["randonnee", "book", "gloves"] as const;

interface Leg {
  title: string;
  sub: string;
  /** [quand, quoi, où, ce que j'y ai fait] */
  items: [string, string, string, string][];
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
  labels: { words: string; route: string; langs: string; ways: string; team: string; bag: string; away: string; also: string };
  words: string;
  more: string;
  route: {
    intro: string;
    band: string;
    now: string;
    lanes: [string, string, string];
    bars: Record<BarId, [string, string?]>;
    school: Leg;
    work: Leg;
    projects: string;
    projectsLink: string;
  };
  /** Dans l'ordre des VISAS : la langue, le niveau, et le lien de l'espagnol vers Cancionero. */
  langs: { name: string; level: string; link?: string }[];
  ways: [string, string][];
  team: string[];
  bag: [string, string[]][];
  /** Dans l'ordre d'AWAY. `text` : une phrase de Cantin, à écrire (les questions sont en commentaire). */
  away: { title: string; alt: string; text?: string }[];
  also: string[];
}

export const APROPOS: Record<Lang, AproposStrings> = {
  fr: {
    pageTitle: "À propos",
    description:
      "Cantin Roquier, ingénieur développeur fullstack et mobile à la DSI du Groupement Les Mousquetaires : son itinéraire, ses langues, sa façon de faire.",
    label: "À propos · le passeport",
    role: "Ingénieur développeur fullstack & mobile",
    where: "Brunoy (91), près de Paris",
    status: "Ingénieur en CDI chez la STIME",
    lead: "Ingénieur diplômé de l'EFREI, j'ai six ans d'expérience à la DSI du Groupement Les Mousquetaires : je conçois des applications web et mobiles utilisées à grande échelle, du recueil des besoins jusqu'à la mise en production.",
    write: "M'écrire",
    linkedin: "https://fr.linkedin.com/in/cantin-roquier-2a0a50228",
    alt: "Mon passeport sur le bureau : à gauche, la page d'identité et mon monogramme ; à droite, un visa par projet, chacun à l'encre de son escale. Le tampon de laiton passe par l'encreur et pose un nouveau visa : INDEX 2026.",
    labels: {
      words: "En quelques mots",
      route: "L'itinéraire",
      langs: "Les langues",
      ways: "Ma façon de faire",
      team: "En équipe",
      bag: "Dans mon sac",
      away: "En dehors du code",
      also: "Et aussi",
    },
    words:
      "J'aime les outils qui servent dès le premier jour : ceux que je construis pour les autres, et ceux que je fabrique quand il m'en manque un.",
    more: "À la DSI des Mousquetaires, j'ai contribué à l'application mobile des collaborateurs de plus de 3 000 points de vente Intermarché, construit de zéro deux applications React pour le service après-vente et participé au BFF Node.js qui les alimente. Aujourd'hui en CDI, je développe l'application React Native de commande des produits frais de 1 700 magasins. Chez moi, je fabrique un globe pour mes voyages, un radar à billets d'avion, un coffre à mots de passe, une façon d'apprendre l'espagnol en chanson.",
    route: {
      intro:
        "De 2020 à 2025, j'ai fait mes études en alternance : l'école et l'entreprise en même temps. Diplômé en 2025, je suis resté chez la STIME comme ingénieur, aujourd'hui en CDI.",
      band: "Cinq ans d'alternance : l'école et la STIME en même temps",
      now: "Aujourd'hui",
      lanes: ["À l'école", "Chez la STIME", "À l'étranger"],
      bars: {
        dut: ["DUT Informatique", "UPEC"],
        licence: ["Licence pro", "CY Gennevilliers"],
        ingenieur: ["Diplôme d'ingénieur", "EFREI Paris"],
        alternance: ["Développeur, en alternance", "frontend et fullstack"],
        cdi: ["Ingénieur développeur", "fullstack et web"],
        espagne: ["Stage en Espagne · 3 mois"],
      },
      school: {
        title: "À l'école",
        sub: "En alternance de 2020 à 2025",
        items: [
          ["2019 – 2021", "DUT Informatique", "UPEC", "Première année à temps plein, la seconde en alternance."],
          ["2021 – 2022", "Licence pro Développement web et mobile", "CY Cergy Paris Université · Gennevilliers", "En alternance."],
          ["2022 – 2025", "Diplôme d'ingénieur", "EFREI Paris", "En alternance, filière Logiciels et systèmes d'information."],
          [
            "2024",
            "Stage ingénieur à l'étranger",
            "Krakento · Cullera, Espagne",
            "Trois mois pendant l'alternance : des sites e-commerce sous Odoo pour des restaurants, des artistes, des golfeurs, et leurs maquettes sur Figma.",
          ],
        ],
      },
      work: {
        title: "Chez la STIME",
        sub: "DSI du Groupement Les Mousquetaires · Paris",
        items: [
          ["2020 – 2021", "Développeur frontend, en alternance", "", "Une application web mobile-first de flex office, pendant la crise sanitaire."],
          [
            "2020 – 2025",
            "Développeur fullstack, en alternance",
            "",
            "L'application mobile des collaborateurs de plus de 3 000 points de vente (inventaires, dates limites, mise en rayon), deux applications React construites de zéro pour le service après-vente, et le BFF Node.js qui alimente les trois.",
          ],
          [
            "2025 – 2026",
            "Développeur mobile, ingénieur diplômé",
            "",
            "Une application React Native pour que les adhérents Intermarché pilotent la performance de leur point de vente : indicateurs clés, tableaux de bord, migration d'API.",
          ],
          [
            "Depuis 2026",
            "Développeur fullstack mobile",
            "",
            "Une application React Native / Expo (Android, iOS, web) de commande des produits frais pour 1 700 points de vente Intermarché, et son back-office React : refonte du panier, module d'actualités, front du module de déstockage.",
          ],
        ],
      },
      projects: "Et en parallèle, onze projets à moi, de 2022 à 2026 : chaque escale de ce site, et le site lui-même.",
      projectsLink: "Revoir le voyage →",
    },
    langs: [
      { name: "Français", level: "Langue maternelle" },
      { name: "Anglais", level: "C1 · TOEIC 900" },
      { name: "Espagnol", level: "B1, en progrès", link: "Avec Cancionero →" },
    ],
    ways: [
      ["Partir d'un vrai besoin", "Chaque projet de ce voyage répond à une question que je me posais : quelle salle, vu les bouchons ? Quand acheter ce billet ?"],
      ["Rien à installer", "Quand c'est possible, un lien suffit : Tonalli, Cancionero et gym-picker s'ouvrent dans le navigateur et s'installent sur l'écran d'accueil."],
      ["Les données restent chez soi", "Magellan garde les voyages sur le téléphone, Mithril se passe du cloud, gym-picker ne connaît pas mon adresse."],
      ["Des garanties qu'on vérifie", "La réciprocité de Tonalli est écrite dans la base ; les règles de sécurité de Mithril sont revérifiées à chaque modification."],
    ],
    team: ["Autonomie", "Pédagogie", "Esprit d'équipe", "Discipline", "Sociabilité", "Fédérateur"],
    bag: [
      ["Front-end et mobile", ["React", "React Native", "Expo", "TypeScript", "JavaScript", "HTML", "CSS"]],
      ["Back-end et données", ["Node.js", "Supabase", "PostgreSQL", "C# et .NET", "Java", "SQL", "Couchbase"]],
      ["En 3D", ["Three.js", "WebGL"]],
      ["Outils et CI", ["Git", "GitHub", "GitHub Actions", "Docker", "Figma", "Odoo"]],
      ["Tests et IA", ["Playwright", "GitHub Copilot", "Claude Code"]],
      ["Méthodes", ["Scrum", "SAFe", "Kanban"]],
    ],
    // Mis en avant à sa demande : la randonnée, l'histoire, les sports de combat. Les phrases à écrire, à la
    // première personne : pour la randonnée, son plus beau sentier ou celui qui l'attend ; pour l'histoire, la
    // période ou le livre qui l'a marqué ; pour les sports de combat, ce que le combat lui apporte.
    away: [
      { title: "Randonnée", alt: "Une petite montagne d'argile, son sentier de laiton en lacets jusqu'au fanion du sommet ; un randonneur y monte." },
      { title: "Histoire", alt: "Une pile de livres d'histoire, celui du dessus qui s'entrouvre, un signet en laiton." },
      { title: "Sports de combat", alt: "Une paire de gants de boxe en argile, le laçage en laiton.", text: "Boxe française, MMA, jiu-jitsu brésilien." },
    ],
    also: ["Voyages", "Escalade", "Tennis", "Natation", "Course à pied"],
  },
  en: {
    pageTitle: "About",
    description:
      "Cantin Roquier, full-stack and mobile software engineer in the IT department of Les Mousquetaires Group: his itinerary, his languages, how he works.",
    label: "About · the passport",
    role: "Full-stack & mobile software engineer",
    where: "Brunoy, Paris area, France",
    status: "Engineer at STIME, on a permanent contract",
    lead: "An EFREI Paris engineer with six years in the IT department of Les Mousquetaires Group (Intermarché), I build web and mobile apps used at scale, from requirements gathering to production release.",
    write: "Email me",
    linkedin: "https://www.linkedin.com/in/cantin-roquier-2a0a50228",
    alt: "My passport on the desk: on the left, the identity page and my monogram; on the right, one visa per project, each in the ink of its stop. The brass stamp dips into the ink pad and adds a new visa: INDEX 2026.",
    labels: {
      words: "In a few words",
      route: "The itinerary",
      langs: "Languages",
      ways: "How I work",
      team: "In a team",
      bag: "In my bag",
      away: "Away from the code",
      also: "And also",
    },
    words: "I like tools that are useful from day one: the ones I build for others, and the ones I make when I'm missing one.",
    more: "In the IT department of Les Mousquetaires, I worked on the mobile app used by staff in over 3,000 Intermarché stores, built two React apps from scratch for the after-sales support team and contributed to the Node.js back-for-front behind them. Today, on a permanent contract, I'm building the React Native app that 1,700 stores use to order fresh products. At home, I make a globe for my travels, a flight-price radar, a password vault, a way to learn Spanish through songs.",
    route: {
      intro:
        "From 2020 to 2025, I studied on a work-study programme: school and work at the same time. After graduating in 2025, I stayed on at STIME as an engineer, now on a permanent contract.",
      band: "Five years of work-study: school and STIME at the same time",
      now: "Today",
      lanes: ["At school", "At STIME", "Abroad"],
      bars: {
        dut: ["Technical degree (DUT)", "UPEC"],
        licence: ["Bachelor's", "CY Gennevilliers"],
        ingenieur: ["Engineering degree", "EFREI Paris"],
        alternance: ["Developer, work-study", "front end and full-stack"],
        // Trait d'union insécable : « full-stack » ne se coupe pas en fin de ligne dans la barre étroite.
        cdi: ["Software engineer", "full‑stack and web"],
        espagne: ["Internship in Spain · 3 months"],
      },
      school: {
        title: "At school",
        sub: "Work-study from 2020 to 2025",
        items: [
          ["2019 – 2021", "Two-year technical degree (DUT) in computer science", "UPEC", "First year full-time, second year as an apprentice."],
          ["2021 – 2022", "Professional bachelor's in web and mobile development", "CY Cergy Paris University · Gennevilliers", "Work-study."],
          ["2022 – 2025", "Master's-level engineering degree", "EFREI Paris", "Work-study, Software and Information Systems track."],
          [
            "2024",
            "Engineering internship abroad",
            "Krakento · Cullera, Spain",
            "Three months during the work-study: e-commerce websites on Odoo for restaurants, artists and golfers, with their mockups in Figma.",
          ],
        ],
      },
      work: {
        title: "At STIME",
        sub: "IT department of Les Mousquetaires Group · Paris",
        items: [
          ["2020 – 2021", "Front-end developer, work-study", "", "A mobile-first flex-office web app, during the COVID-19 crisis."],
          [
            "2020 – 2025",
            "Full-stack developer, work-study",
            "",
            "The mobile app used by staff in over 3,000 stores (inventory, expiry dates, shelf stocking), two React apps built from scratch for the after-sales support team, and the Node.js back-for-front powering all three.",
          ],
          [
            "2025 – 2026",
            "Mobile developer, graduate engineer",
            "",
            "A React Native app for Intermarché store owners to track their store's performance: key indicators, dashboards, API migration.",
          ],
          [
            "Since 2026",
            "Full-stack mobile developer",
            "",
            "A React Native / Expo app (Android, iOS, web) for ordering fresh products in 1,700 Intermarché stores, and its React back office: shopping cart redesign, news module, clearance-stock front end.",
          ],
        ],
      },
      projects: "And alongside, eleven projects of my own, from 2022 to 2026: every stop on this site, and the site itself.",
      projectsLink: "Back to the journey →",
    },
    langs: [
      { name: "French", level: "Native" },
      { name: "English", level: "C1 · TOEIC 900" },
      { name: "Spanish", level: "B1, improving", link: "With Cancionero →" },
    ],
    ways: [
      ["Start from a real need", "Every project on this journey answers a question I kept asking myself: which gym, given the traffic? When should I buy this ticket?"],
      ["Nothing to install", "Whenever possible, a link is enough: Tonalli, Cancionero and gym-picker open in the browser and install on the home screen."],
      ["Data stays at home", "Magellan keeps trips on the phone, Mithril does without the cloud, gym-picker doesn't know my address."],
      ["Guarantees you can check", "Tonalli's reciprocity is written into the database; Mithril's security rules are checked again on every change."],
    ],
    team: ["Autonomy", "Teaching", "Team spirit", "Discipline", "Sociability", "Bringing people together"],
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
    ],
    also: ["Travel", "Climbing", "Tennis", "Swimming", "Running"],
  },
};
