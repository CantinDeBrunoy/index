// Range les propositions du guide (le copilote de la première escale) à droite des tableaux des départs :
// une rangée par proposition, l'ordinateur puis le téléphone, une note qui les présente. C, retenu, a dessous sa vue
// « à l'escale de Paris », puis sa garde-robe (les propositions de cartel occupent la colonne de droite).
// node place-guide-propals.cjs [chemin du canvas.json]   (par défaut : project/canvas.json)
const fs = require("fs");
const path = require("path");

const file = process.argv[2] ?? path.join(__dirname, "project", "canvas.json");
const canvas = JSON.parse(fs.readFileSync(file, "utf8"));

const X = 35900, XM = X + 1520, ROW = 900 + 180;
const put = (f, frame) => {
  canvas.boards[f] = { ...(canvas.boards[f] ?? {}), ...frame };
  if (!canvas.order.includes(f)) canvas.order.push(f);
};
const PROPALS = [
  ["A", "Guide A — la bulle : un message, puis il s'en va (Play)"],
  ["B", "Guide B — la visite guidée en trois temps (Play)"],
  ["C", "Guide C, retenu — le copilote : accueil, deux façons de visiter (Play)"],
];
PROPALS.forEach(([k, title], n) => {
  put(`Guide-${k}.dc.html`, { h: 900, is_interactive: true, title, w: 1440, x: X, y: n * ROW });
  put(`Guide-${k}-mobile.dc.html`, { h: 844, is_interactive: true, title: `Guide ${k} — téléphone`, w: 390, x: XM, y: n * ROW });
});
put("Guide-C-aide.dc.html", { h: 900, is_interactive: true, title: "Guide C — à l'escale de Paris, sa bulle ouverte (Play)", w: 1440, x: X, y: 3 * ROW });
put("Guide-C-aide-mobile.dc.html", { h: 844, is_interactive: true, title: "Guide C — à l'escale de Paris, téléphone (Play)", w: 390, x: XM, y: 3 * ROW });
put("Guide-C-tenues.dc.html", { h: 1040, title: "Guide C — la garde-robe : une tenue par escale", w: 1440, x: X, y: 4 * ROW });

canvas.notes["titre-guide"] = { kind: "title1", maxW: 1910, text: "Le guide — un astronaute explique le voyage à la première escale", w: 240, x: X, y: -300 };
canvas.notes["guide-propals"] = {
  fill: "blue",
  text: "À la première escale, juste après « Décoller », un petit astronaute (argile et laiton, comme les scènes) arrive en flottant dans le coin vide, en bas à droite, et explique le principe. Trois façons de faire. A, la bulle : un seul message de bienvenue ; « Compris » et il s'en va, puis l'anneau bat plus fort quelques secondes. B, la visite : il propose de montrer comment on avance ; trois étapes éclairent la carte de l'escale, l'anneau doré, puis les points des escales, reliés à sa bulle par un fil de laiton. C, le copilote (retenu, voir sa rangée) : il accueille, puis se range en pastille à côté du bouton retour. Play : « ← Le départ » puis « Décoller » rejoue son entrée.",
  w: 380,
  x: X - 460,
  y: 0,
};
canvas.notes["guide-c"] = {
  fill: "green",
  text: "C, retenu. À l'arrivée, il donne les deux façons de visiter : le voyage (cliquer l'objet entouré d'or) ou le détail (« La fiche du projet » sur la carte, ou « Les projets » pour tout voir). « Faire le voyage » le range en pastille à côté du bouton retour ; « Voir les projets » mène au carnet. Il ne porte la combinaison que dans l'espace : dès la Terre, il la laisse (casque à la main) et devient un bonhomme habillé pour chaque escale (la garde-robe, dessous). À chaque escale, il annonce sa tenue en une phrase à côté de sa pastille. Un clic sur lui ouvre « où en suis-je » : l'escale, le projet, l'escale suivante, le détail des projets, les apps, le départ. Sur le site, il n'accueillerait qu'à la première arrivée.",
  w: 380,
  x: X - 460,
  y: 2 * ROW,
};
fs.writeFileSync(file, JSON.stringify(canvas, null, 2) + "\n");
console.log("guide rangé · artboards :", Object.keys(canvas.boards).length);
