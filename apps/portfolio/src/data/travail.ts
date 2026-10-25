/**
 * « Au travail », sur la page À propos : quatre apps faites à la STIME, chacune à l'endroit du magasin où elle sert.
 * La scène est un magasin en coupe (design/renders/magasin-scenes.js), avec un point par app ; dessous, la tournée
 * d'un camion de livraison, un arrêt par app dans l'ordre où Cantin les a faites, et la fiche de l'app choisie.
 * D'après son CV, sans nom de projet interne. [Entre crochets] : à écrire par Cantin.
 */

import type { Lang } from "../i18n/voyage";

export type TravailId = "rayon" | "sav" | "bureau" | "frais";

/** Les arrêts de la tournée : l'alternance (1, 2), puis le poste d'ingénieur (3, 4). Le dernier est choisi d'abord. */
export const ORDER: readonly TravailId[] = ["rayon", "sav", "bureau", "frais"];

/**
 * Les points de la scène, en % de l'image (première image de la boucle, que voyage-render.mjs affiche en MODE=shot) :
 * sur ordinateur (magasin.webp, 16:9), puis sur téléphone (magasin-mobile.webp). `side` : le côté de l'étiquette.
 */
export const SPOTS: Record<TravailId, { desk: [number, number]; phone: [number, number]; side: "left" | "right" }> = {
  rayon: { desk: [43.4, 69.1], phone: [42.4, 60.9], side: "right" },
  sav: { desk: [80.2, 63.6], phone: [75.7, 57], side: "left" },
  bureau: { desk: [83.4, 41.4], phone: [83.4, 44.8], side: "left" },
  frais: { desk: [29.4, 33.6], phone: [27, 39.9], side: "right" },
};

interface Projet {
  /** L'endroit du magasin, dans l'étiquette du point et la fiche. */
  lieu: string;
  /** Son nom sous l'arrêt de la tournée. */
  court: string;
  titre: string;
  /** Le groupe de la tournée : l'alternance ou le poste d'ingénieur. */
  groupe: string;
  quand: string;
  role: string;
  equipe: string;
  chiffre: string;
  chiffreLabel: string;
  quoi: string;
  moi: string;
  resultat: string;
  outils: string[];
}

interface TravailStrings {
  label: string;
  title: string;
  lead: string;
  /** Sous la fiche : pourquoi il n'y a ni capture ni démo. */
  note: string;
  alt: string;
  /** Les deux groupes de la tournée, au-dessus des arrêts 1–2 et 3–4. */
  groups: [string, string];
  stops: string;
  prev: string;
  next: string;
  projets: Record<TravailId, Projet>;
}

// Les chiffres prennent une espace insécable, de la largeur de celle des chiffres d'« À propos » : ils ne se coupent pas.
const N = " ";

export const TRAVAIL: Record<Lang, TravailStrings> = {
  fr: {
    label: "Au travail",
    title: "Mes apps en magasin",
    lead: "Depuis 2020, je fais des apps pour les magasins du Groupement Les Mousquetaires, à la STIME. En voici quatre, chacune à l'endroit du magasin où elle sert. Clique sur un point de la scène, ou sur un arrêt de la tournée, pour voir ce que j'y ai fait.",
    note: "Ce sont des apps internes, donc pas de captures ni de démo ici, seulement ce que j'y ai fait.",
    alt: "Un supermarché en coupe, aux bandeaux rouges. À gauche, le rayon frais et son étal de fruits et légumes ; au milieu, deux rayons, et Adam, le copilote, en gilet rouge, téléphone en main ; à droite, le bureau du directeur derrière sa vitre, et devant, le comptoir SAV.",
    groups: ["En alternance · 2020 – 2025", "Ingénieur · depuis 2025"],
    stops: "Les arrêts de la tournée",
    prev: "L'app d'avant",
    next: "L'app suivante",
    projets: {
      rayon: {
        lieu: "En rayon",
        court: "En rayon",
        titre: "L'app des équipes en magasin",
        groupe: "En alternance",
        quand: "2020 – 2025, en alternance",
        role: "Développeur fullstack",
        equipe: "Équipe d'une quinzaine de personnes",
        chiffre: `3${N}000+`,
        chiffreLabel: "magasins Intermarché, et certains Bricomarché",
        quoi: "L'app mobile des employés en magasin. Ils s'en servent pour les inventaires, les dates limites de consommation et la mise en rayon.",
        moi: "J'y ai contribué pendant cinq ans, avec de nouvelles fonctions et des correctifs au fil des besoins.",
        resultat: "[À toi : un exemple de ce que tu y as apporté]",
        outils: ["React Native", "Node.js"],
      },
      sav: {
        lieu: "Le comptoir SAV",
        court: "SAV",
        titre: "Le dépannage des magasins",
        groupe: "En alternance",
        quand: "2020 – 2025, en alternance",
        role: "Développeur fullstack",
        equipe: "Équipe d'une quinzaine de personnes",
        chiffre: "2",
        chiffreLabel: "apps web créées de zéro, pour tout le service après-vente",
        quoi: "Deux apps web dont tout le service après-vente se sert pour dépanner un magasin lors d'un incident.",
        moi: "Je les ai développées de zéro. J'ai aussi travaillé sur le BFF, un petit serveur Node.js qui prépare les données de ces deux apps et de celle des magasins.",
        resultat: "[À toi : ce que ça a changé pour le SAV]",
        outils: ["React", "Node.js"],
      },
      bureau: {
        lieu: "Le bureau du directeur",
        court: "Bureau",
        titre: "Les chiffres du magasin",
        groupe: "Ingénieur",
        quand: "2025 – 2026",
        role: "Développeur mobile",
        equipe: "Équipe d'environ six personnes",
        chiffre: "[?]",
        chiffreLabel: "[à compléter : combien d'adhérents, ou d'indicateurs]",
        quoi: "Une app mobile pour les adhérents, les patrons indépendants qui possèdent chacun leur magasin Intermarché. Elle leur montre comment se porte leur magasin.",
        moi: "J'ai ajouté de nombreux indicateurs et tableaux de bord. J'ai aussi mené le passage de l'app à une nouvelle API, le service qui lui fournit ses données.",
        resultat: "[À toi : ce que ça a changé pour les adhérents]",
        outils: ["React Native"],
      },
      frais: {
        lieu: "Le rayon frais",
        court: "Rayon frais",
        titre: "La commande des produits frais",
        groupe: "Ingénieur",
        quand: "Depuis 2026",
        role: "Développeur fullstack mobile",
        equipe: "Équipe d'une douzaine de personnes",
        chiffre: `1${N}700`,
        chiffreLabel: "magasins Intermarché s'en servent",
        quoi: "Une app pour commander les fruits, les légumes et tous les produits frais du magasin. Elle marche sur Android, sur iPhone et sur le web, avec un site de gestion à part, le back-office.",
        moi: "J'ai refait le panier de l'app. J'ai aussi ajouté un module d'actualités et développé les écrans du déstockage.",
        resultat: "[À toi : ce que ça a changé pour les magasins, avec un chiffre si tu peux]",
        outils: ["React Native", "Expo", "React"],
      },
    },
  },
  en: {
    label: "At work",
    title: "My apps in the store",
    lead: "Since 2020, I've been building apps for the stores of Les Mousquetaires Group, at STIME. Here are four of them, each at the spot in the store where it's used. Click a point in the scene, or a stop on the delivery round, to see what I did on it.",
    note: "These are internal apps, so there are no screenshots or demos here, only what I did on them.",
    alt: "A cut-away supermarket with red bands. On the left, the fresh aisle and its fruit and vegetable stall; in the middle, two aisles, and Adam, the copilot, in a red vest, phone in hand; on the right, the manager's office behind its glass, and in front, the after-sales desk.",
    groups: ["Work-study · 2020 – 2025", "Engineer · since 2025"],
    stops: "The stops of the delivery round",
    prev: "Previous app",
    next: "Next app",
    projets: {
      rayon: {
        lieu: "In the aisles",
        court: "Aisles",
        titre: "The store staff app",
        groupe: "Work-study",
        quand: "2020 – 2025, work-study",
        role: "Full-stack developer",
        equipe: "A team of about fifteen",
        chiffre: "3,000+",
        chiffreLabel: "Intermarché stores, and some Bricomarché",
        quoi: "The mobile app store staff use for stock counts, use-by dates and restocking the shelves.",
        moi: "I contributed to it for five years, with new features and fixes as needed.",
        resultat: "[To write: an example of what you brought to it]",
        outils: ["React Native", "Node.js"],
      },
      sav: {
        lieu: "The after-sales desk",
        court: "After-sales",
        titre: "Helping stores during incidents",
        groupe: "Work-study",
        quand: "2020 – 2025, work-study",
        role: "Full-stack developer",
        equipe: "A team of about fifteen",
        chiffre: "2",
        chiffreLabel: "web apps built from scratch, for the whole after-sales team",
        quoi: "Two web apps the whole after-sales team uses to help a store during an incident.",
        moi: "I built them from scratch. I also worked on the BFF, a small Node.js server that prepares the data for these two apps and for the store app.",
        resultat: "[To write: what it changed for after-sales]",
        outils: ["React", "Node.js"],
      },
      bureau: {
        lieu: "The manager's office",
        court: "Office",
        titre: "The store's figures",
        groupe: "Engineer",
        quand: "2025 – 2026",
        role: "Mobile developer",
        equipe: "A team of about six",
        chiffre: "[?]",
        chiffreLabel: "[To complete: how many store owners, or indicators]",
        quoi: "A mobile app for Intermarché's store owners, the independent bosses who each own their store. It shows them how their store is doing.",
        moi: "I added many indicators and dashboards. I also led the app's move to a new API, the service that supplies its data.",
        resultat: "[To write: what it changed for store owners]",
        outils: ["React Native"],
      },
      frais: {
        lieu: "The fresh aisle",
        court: "Fresh aisle",
        titre: "Ordering fresh produce",
        groupe: "Engineer",
        quand: "Since 2026",
        role: "Full-stack mobile developer",
        equipe: "A team of about twelve",
        chiffre: "1,700",
        chiffreLabel: "Intermarché stores use it",
        quoi: "An app to order fruit, vegetables and all the store's fresh products. It runs on Android, on iPhone and on the web, with a separate management site, the back office.",
        moi: "I rebuilt the app's shopping cart. I also added a news module and built the clearance screens.",
        resultat: "[To write: what it changed for the stores, with a figure if you can]",
        outils: ["React Native", "Expo", "React"],
      },
    },
  },
};
