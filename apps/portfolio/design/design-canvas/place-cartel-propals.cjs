// Range les propositions du cartel à droite de celles du guide : une rangée par version (aujourd'hui, A, B, C),
// l'escale de jour, l'escale de nuit puis le téléphone, et une note qui les présente.
// node place-cartel-propals.cjs [chemin du canvas.json]   (par défaut : project/canvas.json)
const fs = require("fs");
const path = require("path");

const file = process.argv[2] ?? path.join(__dirname, "project", "canvas.json");
const canvas = JSON.parse(fs.readFileSync(file, "utf8"));

const X = 38400, ROW = 900 + 180;
const ROWS = [
  ["Aujourdhui", "Aujourd'hui", "sur un écran de 1920 px"],
  ["A", "Cartel A", "le contraste"],
  ["B", "Cartel B", "le billet"],
  ["C", "Cartel C", "l'affiche"],
];
ROWS.forEach(([k, name, what], n) => {
  const boards = [
    [`Cartel-${k}.dc.html`, `${name} — ${what}, de jour (Play)`, X, 1440, 900],
    [`Cartel-${k}-nuit.dc.html`, `${name} — de nuit`, X + 1520, 1440, 900],
    [`Cartel-${k}-mobile.dc.html`, `${name} — téléphone`, X + 3040, 390, 844],
  ];
  for (const [f, title, x, w, h] of boards) {
    canvas.boards[f] = { ...(canvas.boards[f] ?? {}), h, is_interactive: true, title, w, x, y: n * ROW };
    if (!canvas.order.includes(f)) canvas.order.push(f);
  }
});
canvas.notes["titre-cartel"] = { kind: "title1", maxW: 3430, text: "Le cartel des escales — trois façons de le rendre plus voyant", w: 240, x: X, y: -300 };
canvas.notes["cartel-propals"] = {
  fill: "blue",
  text: "Aujourd'hui, sur un écran de 1920 px, le cartel garde ses 460 px fixes : un quart de la largeur. Sa carte crème se fond dans les scènes claires, soit 8 escales sur 10. La première rangée le montre à cette échelle. Dans les trois propositions, il grandit avec l'écran et garde partout la place dessinée ici. Le bouton de l'app passe au premier plan, puisque le site est le hub de mes apps. Le reste de l'interface ne change pas. A, le contraste : la même carte, plus grande, dans la palette inverse de l'escale (la nuit sur les scènes claires, le papier sur l'espace et la Terre), portée par une ombre. B, le billet : une carte d'embarquement posée de biais sur la scène. Son talon de laiton ouvre l'app (« Embarquer »). Sans app, il dit « Atterri » pour une archive, « Bientôt », ou « Vous y êtes » pour INDEX. C, l'affiche : plus de carte, juste le nom du projet en très grand, à même la scène, sur un voile de sa couleur, comme le titre du départ. Chaque rangée montre une escale de jour (Hublot), une de nuit (Magellan) et le téléphone (Tonalli). Play parcourt les dix escales. Sur téléphone, le bouton de l'app passe à l'encre, pour laisser le laiton au bouton de l'escale suivante.",
  w: 380,
  x: X - 460,
  y: 0,
};
fs.writeFileSync(file, JSON.stringify(canvas, null, 2) + "\n");
console.log("cartel rangé · artboards :", Object.keys(canvas.boards).length);
