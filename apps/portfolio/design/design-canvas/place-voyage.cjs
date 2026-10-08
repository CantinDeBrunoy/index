// Range le voyage sur le canvas, en français puis en anglais, côte à côte : le storyboard (Départ, dix escales,
// carnet), « À propos » en cinquième colonne, puis les fiches projet en grille de quatre colonnes.
// Les hauteurs viennent des artboards générés (data-props) ; les titres français existants sont gardés.
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "project");
const file = path.join(dir, "canvas.json");
const canvas = JSON.parse(fs.readFileSync(file, "utf8"));
const heightOf = (f) => +fs.readFileSync(path.join(dir, f), "utf8").match(/"\$preview":\{"width":\d+,"height":(\d+)\}/)[1];
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

const NAMES = ["Galaxy Escape", "Magellan", "Hublot", "Métro Pathfinder", "Visit Match", "gym-picker", "Mithril", "Cancionero", "Tonalli", "INDEX"];
const NUMS = ["004", "005", "010", "001", "003", "009", "007", "006", "008", "011"];
const SECTIONS = [
  {
    sfx: "", X: 9830,
    depart: "Départ — le voyage animé (Play)",
    places: ["l'espace", "la Terre", "dans l'avion", "Paris vu du ciel", "au pied des monuments", "sur la route", "à la maison", "le tourne-disque", "le calendrier", "les dossiers"],
    stop: (n, place, num, name) => `Escale ${n} — ${place} · ${num} ${name}${name === "Mithril" ? " et 002 API REST .NET" : ""}`,
    carnet: "Le carnet de voyage — tous les projets",
    apropos: "À propos — le passeport",
    fiche: (n, name) => `Fiche — ${n}. ${name}`,
  },
  {
    sfx: "-en", X: 18800,
    depart: "EN · Departure — the animated journey (Play)",
    places: ["space", "the Earth", "on the plane", "Paris from above", "at the foot of the monuments", "on the road", "at home", "the record player", "the calendar", "the folders"],
    stop: (n, place, num, name) => `EN · Stop ${n} — ${place} · ${num} ${name}${name === "Mithril" ? " and 002 .NET REST API" : ""}`,
    carnet: "EN · The travel journal — all projects",
    apropos: "EN · About — the passport",
    fiche: (n, name) => `EN · Project page — ${n}. ${name}`,
  },
];
const STEP = 1520, ROW = 980, GAP = 120, COLS = 4;
const board = (key, x, y, h, title, extra = {}) => {
  const prev = canvas.boards[key] ?? {};
  canvas.boards[key] = { ...prev, h, is_interactive: true, title: prev.title && !prev.title.startsWith("EN ·") && key.indexOf("-en.") < 0 ? prev.title : title, w: 1440, x, y, ...extra };
  if (!canvas.order.includes(key)) canvas.order.push(key);
};

// Les fiches commencent sous le plus long des deux carnets, à la même hauteur dans les deux langues.
const carnetMax = Math.max(...SECTIONS.map((s) => heightOf(`Carnet${s.sfx}.dc.html`)));
const Y0 = 1960 + carnetMax + 450;
let yEnd = Y0;
for (const S of SECTIONS) {
  const f = (base) => `${base}${S.sfx}.dc.html`;
  board(f("Depart"), S.X, 0, 900, S.depart);
  NAMES.forEach((name, i) => {
    const slot = i + 1; // la case 0 est le départ
    board(f(`Escale${i + 1}`), S.X + (slot % COLS) * STEP, Math.floor(slot / COLS) * ROW, 900, S.stop(i + 1, S.places[i], NUMS[i], name));
  });
  // Le carnet prend la case qui suit la dernière escale.
  const last = NAMES.length + 1;
  board(f("Carnet"), S.X + (last % COLS) * STEP, Math.floor(last / COLS) * ROW, heightOf(f("Carnet")), S.carnet, { expand: "fill" });
  board(f("Apropos"), S.X + 4 * STEP, 0, heightOf(f("Apropos")), S.apropos, { expand: "fill" });
  let y = Y0;
  for (let r = 0; r * COLS < NAMES.length; r++) {
    const row = NAMES.slice(r * COLS, r * COLS + COLS);
    const hs = row.map((name) => heightOf(f(`Fiche-${slug(name)}`)));
    row.forEach((name, c) => board(f(`Fiche-${slug(name)}`), S.X + c * STEP, y, hs[c], S.fiche(NAMES.indexOf(name) + 1, name), { expand: "fill" }));
    y += Math.max(...hs) + GAP;
  }
  yEnd = Math.max(yEnd, y - GAP);
}

// Le voyage sur mobile : une rangée de onze écrans de téléphone par langue, à droite de la version anglaise.
const XM = 27100, MSTEP = 430;
const MOBILE = [
  { sfx: "", y: 0, depart: "Mobile — Départ", stop: (n, name) => `Mobile — Escale ${n} · ${name}` },
  { sfx: "-en", y: 1000, depart: "EN · Mobile — Departure", stop: (n, name) => `EN · Mobile — Stop ${n} · ${name}` },
];
for (const R of MOBILE) {
  board(`Depart-mobile${R.sfx}.dc.html`, XM, R.y, 844, R.depart, { w: 390 });
  NAMES.forEach((name, i) => board(`Escale${i + 1}-mobile${R.sfx}.dc.html`, XM + (i + 1) * MSTEP, R.y, 844, R.stop(i + 1, name), { w: 390 }));
}
canvas.notes["titre-mobile"] = {
  kind: "title1",
  maxW: 4800,
  text: "Le voyage sur mobile — en français, puis en anglais",
  w: 240,
  x: XM,
  y: -300,
};
canvas.notes["mobile-voyage"] = {
  fill: "blue",
  text: "Sur téléphone, chaque escale tient dans l'écran : la scène, recadrée autour de l'objet à toucher (l'anneau reste dessus), puis le cartel, puis en bas, à portée de pouce, le retour (←) et l'escale suivante. Le menu ☰ ouvre les trois onglets ; FR / EN reste en haut. Mêmes transitions que sur ordinateur. Sur le site, ce sera le même composant, qui change de disposition sous 600 px de large ; les fiches, le carnet et « À propos » s'adaptent déjà à la largeur. Pour essayer : Play sur un écran, puis touche l'anneau ou le bouton du bas.",
  w: 380,
  x: XM - 460,
  y: 0,
};

// Les pages annexes (404, mentions légales, aperçus de partage) : la cinquième colonne, sous « À propos »,
// à la hauteur des fiches. La 404 sur téléphone ferme la rangée mobile de sa langue.
const ANNEX = [
  { sfx: "", X: 9830 + 4 * STEP, mobileY: 0,
    titles: ["404 — l'escale introuvable", "Mentions légales", "Aperçu de partage — le site (1200 × 630)", "Aperçu de partage — une fiche, ici Magellan"],
    mobile: "Mobile — 404, l'escale introuvable" },
  { sfx: "-en", X: 18800 + 4 * STEP, mobileY: 1000,
    titles: ["EN · 404 — stop not found", "EN · Legal notice", "EN · Share preview — the site (1200 × 630)", "EN · Share preview — a project page, here Magellan"],
    mobile: "EN · Mobile — 404, stop not found" },
];
for (const A of ANNEX) {
  let y = Y0;
  ["Introuvable", "Mentions", "Apercu", "Apercu-fiche"].forEach((base, k) => {
    const key = `${base}${A.sfx}.dc.html`;
    const h = heightOf(key);
    board(key, A.X, y, h, A.titles[k], base.startsWith("Apercu") ? { w: 1200, expand: undefined } : base === "Mentions" ? { expand: "fill" } : {});
    y += h + GAP;
  });
  board(`Introuvable-mobile${A.sfx}.dc.html`, XM + 12 * MSTEP, A.mobileY, 844, A.mobile, { w: 390 });
}

// Le hub : « Les apps » et l'onglet « ← Index » prennent les cases qui suivent le carnet dans le storyboard
// (rangée 4, colonnes 1 et 2) ; « Les apps » sur téléphone prend place dans la rangée mobile, avant la 404.
const HUBS = [
  { sfx: "", X: 9830, mobileY: 0, apps: "Les apps — le hub : chaque app s'ouvre d'ici", tab: "L'onglet « ← Index », dans chaque app", mobile: "Mobile — Les apps, le hub" },
  { sfx: "-en", X: 18800, mobileY: 1000, apps: "EN · Apps — the hub: every app opens from here", tab: "EN · The “← Index” tab, in every app", mobile: "EN · Mobile — Apps, the hub" },
];
for (const B of HUBS) {
  board(`Apps${B.sfx}.dc.html`, B.X, 3 * ROW, heightOf(`Apps${B.sfx}.dc.html`), B.apps, { expand: "fill" });
  board(`Onglet${B.sfx}.dc.html`, B.X + STEP, 3 * ROW, heightOf(`Onglet${B.sfx}.dc.html`), B.tab, { expand: "fill" });
  board(`Apps-mobile${B.sfx}.dc.html`, XM + 11 * MSTEP, B.mobileY, 844, B.mobile, { w: 390 });
}
canvas.notes["hub-voyage"] = {
  fill: "blue",
  text: "INDEX est un hub, pas une vitrine : chaque app s'ouvre d'ici. « Les apps » est le deuxième onglet, dans l'en-tête de chaque page, et le départ propose « Ouvrir une app ». Le tableau des départs donne une ligne par app : son numéro en volets, sa destination, sa porte (l'hébergeur), son statut vérifié toutes les heures par les sondes de packages/projects, et le bouton pour l'ouvrir. Mithril se télécharge, INDEX, c'est ici, et les archives n'ont pas de départ : leur fiche raconte ce qu'elles faisaient. Sur le site, « Ouvrir » ouvre l'app dans le même onglet, et dans chaque app l'onglet « ← Index » ramène au hub (packages/ui, index-bar.js, redessiné ici dans la matière du voyage). Partout, « La démo » devient « Ouvrir l'app ». Sur téléphone, le tableau tient dans un écran.",
  w: 380,
  x: 9370,
  y: 3 * ROW,
};
const textes = canvas.notes["textes-voyage"];
textes.text = textes.text
  .replace("Chaque cartel porte la démo (bouton de laiton ; « Télécharger » pour Mithril)", "Chaque cartel porte « Ouvrir l'app » (bouton de laiton ; « Télécharger » pour Mithril)")
  .replace("Les démos de Magellan, Cancionero et gym-picker sont à brancher : leur adresse n'existera qu'au déploiement.", "Les adresses de Magellan, Cancionero et gym-picker sont à brancher : elles n'existeront qu'au déploiement.");
canvas.notes["titre-annexes"] = { kind: "title1", maxW: 2400, text: "Les pages annexes — 404, mentions légales, aperçus de partage", w: 240, x: 9830 + 4 * STEP, y: Y0 - 300 };
canvas.notes["titre-annexes-en"] = { kind: "title1", maxW: 2400, text: "Les pages annexes, en anglais", w: 240, x: 18800 + 4 * STEP, y: Y0 - 300 };
canvas.notes["annexes-voyage"] = {
  fill: "orange",
  text: "Les pages annexes, en français et en anglais. La 404, « Bagage égaré » : une escale hors itinéraire. De nuit, un tapis à bagages tourne à vide sous le panneau du tapis 404 ; à côté, une valise attend seule, l'étiquette « 404 » à la poignée. La valise reprend le voyage ; le cartel mène aux onze projets, le plus utile quand on arrive par un vieux lien. Sur téléphone, c'est la même page, disposée comme le voyage mobile (au bout de la rangée mobile). Les mentions légales sont obligatoires même pour un site perso : pour un particulier, ton nom et ton e-mail suffisent, mais l'hébergeur doit figurer avec son adresse et son téléphone. Le lien est en bas du carnet, de « À propos » et des fiches. Pour que la page reste vraie sur le site : aucun cookie, pas de mesure d'audience, et des polices servies par le site lui-même (chargées depuis Google, elles lui envoient l'adresse IP des visiteurs). Les aperçus de partage : l'image qui s'affiche quand on colle un lien sur LinkedIn, Slack ou WhatsApp, en 1200 × 630. Celui du site montre le passeport ; chaque fiche a le sien, avec son escale et son cartel (ici Magellan).",
  w: 380,
  x: 17430,
  y: Y0,
};

// Les notes : les titres des fiches suivent leur grille ; la version anglaise a son titre et sa note.
canvas.notes["titre-fiches"] = { ...canvas.notes["titre-fiches"], x: 9830, y: Y0 - 300 };
canvas.notes["fiches-voyage"] = { ...canvas.notes["fiches-voyage"], x: 9370, y: Y0 };
canvas.notes["titre-voyage-en"] = {
  kind: "title1",
  maxW: 7500,
  text: "Proposition 3, en anglais — the journey, in English",
  w: 240,
  x: 18800,
  y: -300,
};
canvas.notes["titre-fiches-en"] = {
  kind: "title1",
  maxW: 6000,
  text: "Les fiches projet, en anglais",
  w: 240,
  x: 18800,
  y: Y0 - 300,
};
canvas.notes["anglais-voyage"] = {
  fill: "blue",
  text: "La version anglaise reprend toutes les pages : le voyage animé, le carnet, « À propos » et les dix fiches. Dans chaque en-tête, l'interrupteur FR / EN mène à la même page dans l'autre langue ; dans le voyage, il garde l'escale affichée. Le vocabulaire : « escale » devient stop, « le carnet de voyage » the travel journal, « la fiche » the project page, « le billet » the ticket. Orthographe britannique, comme ton CV. Le passeport est bilingue, comme un vrai passeport français : le même rendu sert aux deux langues. Les textes anglais sont des brouillons traduits des français, à relire.",
  w: 380,
  x: 18800 - 460,
  y: 0,
};
canvas.notes["apropos-voyage"] = {
  ...canvas.notes["apropos-voyage"],
  text: "« À propos » est le troisième onglet du site, dans l'en-tête de chaque page, à côté de l'interrupteur FR / EN. La page s'ouvre sur ton passeport : un visa par projet, et le tampon de laiton qui pose INDEX 2026. Les textes viennent de ton CV : expériences (avec ton employeur), formation, langues, compétences, centres d'intérêt, et Brunoy. « Mon CV » télécharge le PDF de la langue de la page ; LinkedIn mène à ton profil. Ni téléphone ni photo sur la page, ni nom de projet interne. Les phrases entre crochets t'attendent.",
};
// La dixième escale prend la place des notes de la rangée du bas : elles passent sous la note d'« À propos ».
for (const [key, y] of [["interaction-voyage", 560], ["textes-voyage", 1000], ["couleurs-voyage", 1500]]) {
  canvas.notes[key] = { ...canvas.notes[key], x: 17430, y };
}
const tryIt = canvas.notes["essayer-voyage"];
if (!tryIt.text.includes("dossiers")) {
  tryIt.text = tryIt.text.replace("puis le calendrier punaisé derrière le tourne-disque.", "le calendrier punaisé derrière le tourne-disque, puis la pile de dossiers sous le calendrier, qui mène à INDEX.");
}
// La pile a quitté le dessous des photos pour le côté droit, sous le calendrier (à l'écart du cartel).
tryIt.text = tryIt.text.replace("la pile de dossiers sous les photos", "la pile de dossiers sous le calendrier");
const inter = canvas.notes["interaction-voyage"];
inter.text = inter.text.replace("« Tous les projets »", "les onglets « Les projets » et « À propos »");
if (!inter.text.includes("FR / EN")) {
  inter.text = inter.text.replace(/ Mouvement réduit : un simple fondu entre les escales\.$/, " L'interrupteur FR / EN garde l'escale affichée. Mouvement réduit : un simple fondu entre les escales.");
}
fs.writeFileSync(file, JSON.stringify(canvas, null, 2) + "\n");
console.log("voyage rangé : fiches de y =", Y0, "à", yEnd, "· artboards :", Object.keys(canvas.boards).length);
