// Les textes de la page « À propos », d'après le CV de Cantin (octobre 2026) et ses projets. Employeur et ville
// affichés à sa demande ; ni téléphone, ni photo, ni nom de projet interne. Les crochets attendent ses mots.
// Les liens internes sont des noms de base (« Depart », « Fiche-cancionero ») : le générateur ajoute la langue.
// h : hauteur de l'artboard, mesurée sur le rendu (measure-fiches.mjs).
const OBJ = {
  gloves: "0944878b185c6092e8b8d85eaf588df6",
  hold: "9a98212eefa17bab2da90179a73a55e2",
  book: "33f2e78196e9a623469c70d106773eee",
  hike: "8563c7c32a51084d38d631ab09236273",
};
module.exports = {
  h: 4600,
  label: "À propos · le passeport",
  role: "Ingénieur développeur fullstack & mobile",
  where: "Brunoy (91), près de Paris",
  status: "Ingénieur en CDI chez la STIME",
  lead: "Ingénieur diplômé de l'EFREI, j'ai six ans d'expérience à la DSI du Groupement Les Mousquetaires : je conçois des applications web et mobiles utilisées à grande échelle, du recueil des besoins jusqu'à la mise en production.",
  write: "M'écrire",
  cv: { id: "5f2e2582a12b6aab6bda9ca5318b0852", file: "CV_ROQUIER_Cantin.pdf", label: "Mon CV ↓" },
  linkedin: "https://fr.linkedin.com/in/cantin-roquier-2a0a50228",
  alt: "Mon passeport sur le bureau : à gauche, la page d'identité et mon monogramme ; à droite, un visa par projet, chacun à l'encre de son escale. Le tampon de laiton passe par l'encreur et pose un nouveau visa : INDEX 2026.",
  labels: { words: "En quelques mots", route: "L'itinéraire", langs: "Les langues", ways: "Ma façon de faire", team: "En équipe", bag: "Dans mon sac", away: "En dehors du code", also: "Et aussi" },
  words: "J'aime les outils qui servent dès le premier jour : ceux que je construis pour les autres, et ceux que je fabrique quand il m'en manque un.",
  more: "À la DSI des Mousquetaires, j'ai contribué à l'application mobile des collaborateurs de plus de 3 000 points de vente Intermarché, construit de zéro deux applications React pour le service après-vente et participé au BFF Node.js qui les alimente. Aujourd'hui en CDI, je développe l'application React Native de commande des produits frais de 1 700 magasins. Chez moi, je fabrique un globe pour mes voyages, un radar à billets d'avion, un coffre à mots de passe, une façon d'apprendre l'espagnol en chanson.",
  // L'itinéraire : une frise à deux voies (l'école, l'entreprise) qui montre l'alternance d'un coup d'œil,
  // puis le détail de chaque voie. Les dates sont en années décimales (septembre 2020 = 2020 + 8/12).
  route: {
    intro: "De 2020 à 2025, j'ai fait mes études en alternance : l'école et l'entreprise en même temps. Diplômé en 2025, je suis resté chez la STIME comme ingénieur, aujourd'hui en CDI.",
    axis: [2019, 2027],
    band: { from: 2020 + 8 / 12, to: 2025 + 8 / 12, label: "Cinq ans d'alternance : l'école et la STIME en même temps" },
    now: { at: 2026 + 9.5 / 12, label: "Aujourd'hui" },
    // Pas de légende sous la frise : Cantin l'a retirée sur le canvas.
    lanes: [
      { label: "À l'école", bars: [
        { from: 2019 + 8 / 12, to: 2021.5, title: "DUT Informatique", sub: "UPEC" },
        { from: 2021 + 8 / 12, to: 2022 + 8 / 12, title: "Licence pro", sub: "CY Gennevilliers" },
        { from: 2022 + 8 / 12, to: 2025 + 8 / 12, title: "Diplôme d'ingénieur", sub: "EFREI Paris" },
      ] },
      { label: "Chez la STIME", bars: [
        { from: 2020 + 8 / 12, to: 2025 + 8 / 12, title: "Développeur, en alternance", sub: "frontend et fullstack", tone: "alt" },
        { from: 2025 + 8 / 12, to: 2026 + 9.5 / 12, title: "Ingénieur développeur", sub: "fullstack et web", tone: "now" },
      ] },
      { label: "À l'étranger", bars: [
        { from: 2024 + 7.5 / 12, to: 2024 + 10.5 / 12, title: "Stage en Espagne · 3 mois", tone: "trip", outside: true },
      ] },
    ],
    school: {
      title: "À l'école",
      sub: "En alternance de 2020 à 2025",
      items: [
        ["2019 – 2021", "DUT Informatique", "UPEC", "Première année à temps plein, la seconde en alternance."],
        ["2021 – 2022", "Licence pro Développement web et mobile", "CY Cergy Paris Université · Gennevilliers", "En alternance."],
        ["2022 – 2025", "Diplôme d'ingénieur", "EFREI Paris", "En alternance, filière Logiciels et systèmes d'information."],
        ["2024", "Stage ingénieur à l'étranger", "Krakento · Cullera, Espagne", "Trois mois pendant l'alternance : des sites e-commerce sous Odoo pour des restaurants, des artistes, des golfeurs, et leurs maquettes sur Figma."],
      ],
    },
    work: {
      title: "Chez la STIME",
      sub: "DSI du Groupement Les Mousquetaires · Paris",
      items: [
        ["2020 – 2021", "Développeur frontend, en alternance", "", "Une application web mobile-first de flex office, pendant la crise sanitaire."],
        ["2020 – 2025", "Développeur fullstack, en alternance", "", "L'application mobile des collaborateurs de plus de 3 000 points de vente (inventaires, dates limites, mise en rayon), deux applications React construites de zéro pour le service après-vente, et le BFF Node.js qui alimente les trois."],
        ["2025 – 2026", "Développeur mobile, ingénieur diplômé", "", "Une application React Native pour que les adhérents Intermarché pilotent la performance de leur point de vente : indicateurs clés, tableaux de bord, migration d'API."],
        ["Depuis 2026", "Développeur fullstack mobile", "", "Une application React Native / Expo (Android, iOS, web) de commande des produits frais pour 1 700 points de vente Intermarché, et son back-office React : refonte du panier, module d'actualités, front du module de déstockage."],
      ],
    },
    projects: ["Et en parallèle, onze projets à moi, de 2022 à 2026 : chaque escale de ce site, et le site lui-même.", "Revoir le voyage →", "Depart"],
  },
  langs: [
    { name: "Français", level: "Langue maternelle", ink: "#8A6A35", rot: -4 },
    { name: "Anglais", level: "C1 · TOEIC 900", ink: "#3E7696", rot: 3 },
    { name: "Espagnol", level: "B1, en progrès", ink: "#B8693F", rot: -2, link: ["Avec Cancionero →", "Fiche-cancionero"] },
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
  // Mis en avant à la demande de Cantin : la randonnée, l'histoire, les sports de combat.
  away: [
    { img: OBJ.hike, title: "Randonnée", alt: "Une petite montagne d'argile, son sentier de laiton en lacets jusqu'au fanion du sommet ; un randonneur y monte", todo: "[Une phrase à toi : ton plus beau sentier, ou celui qui t'attend.]" },
    { img: OBJ.book, title: "Histoire", alt: "Une pile de livres d'histoire, celui du dessus qui s'entrouvre, un signet en laiton", todo: "[Une phrase à toi : la période ou le livre qui t'a marqué.]" },
    { img: OBJ.gloves, title: "Sports de combat", text: "Boxe française, MMA, jiu-jitsu brésilien.", alt: "Une paire de gants de boxe en argile, le laçage en laiton", todo: "[Une phrase à toi : ce que le combat t'apporte.]" },
  ],
  also: ["Voyages", "Escalade", "Tennis", "Natation", "Course à pied"],
};
