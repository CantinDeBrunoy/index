/**
 * Le voyage : l'accueil du site, dix escales, une par projet, dont chacune mène à la suivante.
 * Ici le décor de chaque escale (sa scène, ses couleurs, le point à cliquer) et ses textes en
 * français et en anglais. Les liens (l'app, le code) et le numéro viennent de @index/projects.
 * Textes relus par Cantin le 10 octobre 2026 (accueil, accroches).
 */

import type { Project } from "@index/projects";
import { inWords, NBSP, type Lang } from "../i18n/voyage";

export type Palette = "night" | "day" | "dusk" | "kraft";

export interface Stop {
  /** Le projet de l'escale (slug de @index/projects). */
  slug: string;
  /** Son code, à la façon des aéroports : la carte d'embarquement de la fiche va d'Index (IDX) jusqu'à lui. */
  code: string;
  /** Le rendu : /voyage/<scene>.webp (ordinateur, 16:9) et /voyage/<scene>-mobile.webp (téléphone). */
  scene: string;
  bg: string;
  palette: Palette;
  /** Le point à cliquer, en % de l'image d'ordinateur, puis de l'image du téléphone. */
  spot: [number, number];
  spotMobile: [number, number];
}

export const STOPS: Stop[] = [
  { slug: "galactic-escape", code: "GLX", scene: "espace", bg: "#0b0c14", palette: "night", spot: [66.2, 21.7], spotMobile: [83.9, 34.6] },
  { slug: "magellan", code: "MGL", scene: "terre", bg: "#10131c", palette: "night", spot: [83, 43.8], spotMobile: [82.1, 46.4] },
  { slug: "hublot", code: "HBL", scene: "avion", bg: "#dce9f0", palette: "day", spot: [52.9, 56], spotMobile: [51, 56.4] },
  { slug: "metro-pathfinder", code: "MTR", scene: "paris", bg: "#dce3ea", palette: "day", spot: [79.5, 55.7], spotMobile: [77.9, 52.2] },
  { slug: "visit-match", code: "VSM", scene: "monuments", bg: "#e0e8da", palette: "day", spot: [68.2, 57], spotMobile: [71.7, 56.2] },
  { slug: "gym-picker", code: "GYM", scene: "route", bg: "#f2dfd3", palette: "day", spot: [53.4, 70.3], spotMobile: [52.2, 59.3] },
  { slug: "api-rest-dotnet", code: "API", scene: "maison", bg: "#f1e7da", palette: "day", spot: [70.7, 42.7], spotMobile: [75.7, 45] },
  { slug: "cancionero", code: "CNC", scene: "salon", bg: "#f3d5b5", palette: "day", spot: [39.6, 34.8], spotMobile: [30.7, 37.7] },
  { slug: "tonalli", code: "TNL", scene: "calendrier", bg: "#d8c2c6", palette: "dusk", spot: [71.6, 72.8], spotMobile: [78.9, 67.6] },
  { slug: "index", code: "IDX", scene: "dossiers", bg: "#e6d5b8", palette: "kraft", spot: [65.8, 44.1], spotMobile: [71, 45.4] },
];

/** Le départ : l'espace, de nuit, avant le décollage (la scène de l'escale 1, sans la fusée du copilote). */
export const START = { scene: "depart", bg: "#0b0c14", palette: "night" as Palette };

/**
 * La sortie du voyage, par « Faire connaissance » à la dernière escale : le stylo se couche, le dossier se ferme,
 * puis « À propos » s'ouvre (scripts/voyage-sortie.ts). Sur ordinateur, le clip /voyage/sortie/<clip>(-av1).mp4
 * (scène « dossiers-ferme », FERME dans design/renders/voyage-scenes.js) : `starts` départs de `segment` images,
 * un par huitième de la boucle, dont `lift` de geste, puis la fermeture, commune à tous. Sur téléphone,
 * <clip>-mobile.mp4 (780 × 760, cadré comme la boucle) : la fermeture seule.
 */
export const EXIT = { clip: "dossiers-ferme", starts: 8, segment: 17, lift: 11, fps: 24 };

export interface StopText {
  /** Le lieu de l'escale. */
  place: string;
  /** Ce que montre la scène, pour les lecteurs d'écran. */
  alt: string;
  /** Type · année · statut. */
  kind: string;
  pitch: string;
  /** L'invitation à cliquer, qui mène à l'escale suivante. */
  cta: string;
  /** Remplace le lien vers l'app quand il n'y en a pas (INDEX : vous y êtes). */
  noApp?: string;
}

export const STOP_TEXTS: Record<Lang, Record<string, StopText>> = {
  fr: {
    "galactic-escape": {
      place: "L'espace",
      alt: "L'espace : une planète à l'anneau de laiton et aux bandes lavande, ses lunes, la fusée du copilote en route, et la Terre au loin parmi les étoiles.",
      kind: "Jeu 3D · 2022 · En ligne",
      pitch: "Un runner en 3D inspiré de Temple Run : fuir un monstre à travers l'espace, en posant les cases de son chemin entre les météores.",
      cta: "Descendre vers la Terre",
    },
    magellan: {
      place: "La Terre",
      alt: "La Terre tourne : les pays de la démo de Magellan en laiton, les voyages tracés en arcs depuis Paris ; à côté, un avion de ligne attend, incliné vers elle.",
      kind: "App web et mobile · 2026 · En ligne",
      pitch: "Un globe qui colore les pays que j'ai traversés et trace chacun de mes voyages.",
      cta: "Prendre l'avion",
    },
    hublot: {
      place: "Dans l'avion",
      alt: "Dans l'avion : par le hublot, sous son volet un peu baissé, l'aile, son réacteur et son winglet de laiton, au-dessus d'une mer de nuages.",
      kind: "Robot et page web · 2026 · En ligne",
      pitch: "Je fixe mon prix, un robot surveille les vols au départ de Paris, et mon téléphone ne sonne que quand ça vaut le coup.",
      cta: "Regarder par le hublot",
    },
    "metro-pathfinder": {
      place: "Paris vu du ciel",
      alt: "Paris vu du ciel : la Seine, la tour Eiffel, les toits de zinc, les lignes de métro, et le plus court chemin en laiton qu'une rame parcourt jusqu'à sa station.",
      kind: "Algorithme · 2022 · Archive",
      pitch: "Mon premier algorithme sur un graphe : le trajet le plus court entre deux stations du métro parisien.",
      cta: "Descendre à la station",
    },
    "visit-match": {
      place: "Au pied des monuments",
      alt: "Au pied des monuments : la tour Eiffel et l'arc de triomphe, reliés par un arc de laiton sur lequel deux voyageurs se rejoignent ; la pelouse et les arbres vert sauge.",
      kind: "App mobile · 2023 · Archive",
      pitch: "Une app pour découvrir les lieux d'une ville : on garde ou on passe chacun d'un geste, et on range ses favoris dans un carnet de voyage.",
      cta: "Prendre la route",
    },
    "gym-picker": {
      place: "Sur la route",
      alt: "Sur la route : des voitures circulent dans les deux sens, quelques toits de tuile, quatre salles de sport ; une voiture de laiton suit le trajet le plus rapide, de la maison à la salle la moins embouteillée.",
      kind: "App web · 2026 · En ligne",
      pitch: "Mes quatre salles de sport classées selon les bouchons. Un geste et Waze m'y emmène.",
      cta: "Rentrer à la maison",
    },
    "api-rest-dotnet": {
      place: "À la maison",
      alt: "À la maison : sur le bureau, la lampe et le portable, dont l'écran affiche une requête et sa réponse en JSON ; un câble mène au petit serveur, et une perle de laiton y fait l'aller-retour ; au-dessus, sur une étagère, une platine et sa pochette terre cuite ; une plante et un tapis vert sauge.",
      kind: "API REST · 2023 · Archive",
      pitch: "Shard : l'API REST d'un jeu de stratégie spatiale, en C# .NET, écrite en équipe et validée version après version par des tests.",
      cta: "Mettre un disque",
    },
    cancionero: {
      place: "Le tourne-disque",
      alt: "Le tourne-disque : le vinyle tourne sous le bras de lecture, des notes de laiton s'envolent, certaines vers le calendrier punaisé au mur ; à côté, la pochette du disque, couleur terre cuite.",
      kind: "Application installable · 2026 · En ligne",
      pitch: "Une chanson qu'on aime, on la retient sans effort. Alors j'apprends l'espagnol en chantant.",
      cta: "Choisir la couleur du jour",
    },
    tonalli: {
      place: "Le calendrier",
      alt: "Le calendrier collé au mur : chaque jour d'octobre a sa couleur d'émotion, un jour manqué est hachuré, la case d'aujourd'hui se remplit d'une couleur après l'autre ; à gauche, les photos des journées affichées au mur ; à droite, sous le calendrier, une pile de dossiers ouverts sur un banc.",
      kind: "Application web · 2026 · En ligne",
      pitch: "Chaque jour prend la couleur de son émotion.",
      cta: "Ouvrir les dossiers",
    },
    index: {
      place: "Les dossiers",
      alt: "Les dossiers : celui du dessus est ouvert sur sa page de titre et sur le sommaire des dix projets, de 001 à 010 ; un stylo de laiton parcourt la liste ; dessous, les onglets des autres dossiers, aux couleurs des escales.",
      kind: "Monorepo et portfolio · 2026 · En cours",
      pitch: "Un seul dépôt pour tous mes projets, des robots pour qu'aucun ne s'endorme, et ce voyage pour les montrer.",
      cta: "Faire connaissance",
      noApp: "Vous y êtes : c'est ce site",
    },
  },
  en: {
    "galactic-escape": {
      place: "Space",
      alt: "Space: a planet with a brass ring and lavender bands, its moons, the co-pilot's rocket on its way, and the Earth far off among the stars.",
      kind: "3D game · 2022 · Live",
      pitch: "A 3D runner inspired by Temple Run: flee a monster through space, laying the tiles of your path between the meteors.",
      cta: "Descend to Earth",
    },
    magellan: {
      place: "The Earth",
      alt: "The Earth turns: the countries of the Magellan demo in brass, trips drawn as arcs from Paris; nearby, an airliner waits, banking towards it.",
      kind: "Web and mobile app · 2026 · Live",
      pitch: "A globe that colours in the countries I've travelled through and traces each of my trips.",
      cta: "Board the plane",
    },
    hublot: {
      place: "On the plane",
      alt: "On the plane: through the window, under its partly lowered blind, the wing, its engine and brass winglet above a sea of clouds.",
      kind: "Bot and web page · 2026 · Live",
      pitch: "I set my price, a bot watches flights from Paris, and my phone only rings when it's worth it.",
      cta: "Look out of the window",
    },
    "metro-pathfinder": {
      place: "Paris from above",
      alt: "Paris from above: the Seine, the Eiffel Tower, the zinc roofs, the metro lines, and the shortest route in brass, which a train follows to its station.",
      kind: "Algorithm · 2022 · Archive",
      pitch: "My first graph algorithm: the shortest route between two Paris metro stations.",
      cta: "Get off at the station",
    },
    "visit-match": {
      place: "At the foot of the monuments",
      alt: "At the foot of the monuments: the Eiffel Tower and the Arc de Triomphe, joined by a brass arc on which two travellers meet; the lawn and the sage-green trees.",
      kind: "Mobile app · 2023 · Archive",
      pitch: "An app to discover a city's sights: keep or skip each one with a swipe, and file your favourites in a travel notebook.",
      cta: "Hit the road",
    },
    "gym-picker": {
      place: "On the road",
      alt: "On the road: cars drive both ways, a few tiled roofs, four gyms; a brass car takes the fastest route, from home to the least congested gym.",
      kind: "Web app · 2026 · Live",
      pitch: "My four gyms ranked by traffic. One tap and Waze takes me there.",
      cta: "Head home",
    },
    "api-rest-dotnet": {
      place: "At home",
      alt: "At home: on the desk, the lamp and the laptop, whose screen shows a request and its JSON response; a cable runs to the small server, and a brass bead travels back and forth along it; above it, on a shelf, a record player and its terracotta sleeve; a plant and a sage-green rug.",
      kind: "REST API · 2023 · Archive",
      pitch: "Shard: the REST API of a space strategy game, in C# .NET, built as a team and validated version after version by tests.",
      cta: "Put on a record",
    },
    cancionero: {
      place: "The record player",
      alt: "The record player: the vinyl spins under the tonearm, brass notes float up, some towards the calendar pinned on the wall; beside it, the terracotta record sleeve.",
      kind: "Installable app · 2026 · Live",
      pitch: "A song you love sticks without effort. So I'm learning Spanish by singing.",
      cta: "Pick today's colour",
    },
    tonalli: {
      place: "The calendar",
      alt: "The calendar on the wall: each day of October has its emotion colour, a missed day is hatched, today's square fills with one colour after another; on the left, photos of the days pinned to the wall; on the right, below the calendar, a pile of open folders on a bench.",
      kind: "Web app · 2026 · Live",
      pitch: "Every day takes on the colour of its emotion.",
      cta: "Open the folders",
    },
    index: {
      place: "The folders",
      alt: "The folders: the top one lies open on its title page and on the contents of all ten projects, from 001 to 010; a brass pen runs down the list; below, the tabs of the other folders, in the colours of the stops.",
      kind: "Monorepo and portfolio · 2026 · In progress",
      pitch: "One repository for all my projects, bots so that none of them falls asleep, and this journey to show them.",
      cta: "Get to know me",
      noApp: "You're on it: this very site",
    },
  },
};

/** Les textes du voyage. Le nombre d'escales et de projets suit les listes ; {i}, {k}, {place}, {name} : remplacés à l'affichage. */
export const VOYAGE: Record<Lang, Record<string, string>> = {
  fr: {
    introLabel: "Le portfolio de Cantin Roquier",
    introTitle: `Un voyage en ${inWords("fr", STOPS.length)} <em>escales</em>.`,
    introText: `Je suis développeur full-stack et mobile, et voici mes ${inWords("fr", STOPS.length)} projets. Chacun est une escale : une scène en 3D, sa fiche et son app quand elle est en ligne. À chaque escale, tu auras le choix : découvrir la fiche projet ou passer au suivant.`,
    takeOff: "Décoller →",
    start: "Le départ",
    /** Le retour de l'escale 1 : il rejoue le décollage (scripts/decollage.ts). */
    relaunch: "Le décollage",
    announce: "Escale {i} : {place}, {name}",
    dotsAria: "Les escales du voyage",
    fiche: "La fiche du projet →",
    ficheShort: "La fiche →",
    /** Au voyage, le nom de la fiche posée sous l'escale (scripts/voyage-fiche.ts). */
    ficheTab: "La fiche du projet",
    app: "Ouvrir l'app ↗",
    appShort: "L'app ↗",
    download: "Télécharger ↓",
    code: "Le code ↗",
    noApp: "Archive · pas d'app en ligne",
    soon: "App bientôt en ligne",
    statusSoon: "Bientôt en ligne",
    statusDownload: "À télécharger",
    backTo: "Revenir : {place}",
    /** Au milieu de la barre des escales : {i} l'escale, {n} leur nombre, {place} son lieu. */
    where: "Escale {i} / {n} · {place}",
  },
  en: {
    introLabel: "Cantin Roquier's portfolio",
    introTitle: `A journey in ${inWords("en", STOPS.length)} <em>stops</em>.`,
    introText: `I'm a full-stack and mobile developer, and these are my ${inWords("en", STOPS.length)} projects. Each one is a stop: a 3D scene, its project page and its app when it's live. At each stop, you'll have a choice: discover the project page or move on to the next one.`,
    takeOff: "Take off →",
    start: "Departure",
    relaunch: "Take-off",
    announce: "Stop {i}: {place}, {name}",
    dotsAria: "The journey's stops",
    fiche: "Project page →",
    ficheShort: "Project page →",
    ficheTab: "Project page",
    app: "Open the app ↗",
    appShort: "The app ↗",
    download: "Download ↓",
    code: "Source code ↗",
    noApp: "Archive · no live app",
    soon: "App coming soon",
    statusSoon: "Coming soon",
    statusDownload: "Download",
    backTo: "Back: {place}",
    where: "Stop {i} / {n} · {place}",
  },
};

export const fill = (s: string, values: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));

/**
 * Le lien vers l'app d'une escale, ou la note qui le remplace : une archive, INDEX, une app pas encore en ligne.
 * Une app web s'ouvre dans un nouvel onglet (`target`), pour que le voyage reste là ; un téléchargement, sur place.
 */
export function appOf(
  project: Project,
  text: StopText,
  lang: Lang,
): { href: string; label: string; short: string; target?: "_blank"; rel?: "noopener" } | { note: string } {
  const v = VOYAGE[lang];
  const { kind, links } = project;
  if (text.noApp) return { note: text.noApp };
  if (kind === "desktop" && links.download) return { href: links.download, label: v.download, short: v.download };
  if (kind === "web" && links.demo) return { href: links.demo, label: v.app, short: v.appShort, target: "_blank", rel: "noopener" };
  return { note: kind === "archive" ? v.noApp : v.soon };
}

/**
 * Le type, l'année et le statut d'une escale, d'après son « Type · année · statut ». Une app dont
 * l'adresse n'est pas encore connue est « bientôt en ligne » ; un logiciel, sans statut, « à télécharger ».
 * `line` : la ligne du cartel, de la fiche et du carnet, sans numéro de projet ; elle ne se coupe qu'entre ses
 * éléments.
 */
export function kindOf(project: Project, text: StopText, lang: Lang) {
  const v = VOYAGE[lang];
  const [type = "", year = String(project.year), status] = text.kind.split(" · ");
  const soon = project.kind === "web" && !project.links.demo && !text.noApp;
  const shown = status && soon ? v.statusSoon : status;
  const join = (parts: string[]) => parts.map((part) => part.replaceAll(" ", NBSP)).join(`${NBSP}· `);
  const meta = [type, year, ...(shown ? [shown] : [])];
  return {
    type,
    year,
    status: shown ?? v.statusDownload,
    line: join(meta),
  };
}
