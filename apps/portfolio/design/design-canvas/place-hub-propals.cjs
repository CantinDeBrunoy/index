// Range les trois propositions de « Les apps » en tableau des départs, à droite des écrans de téléphone :
// une rangée par proposition, l'ordinateur puis le téléphone, et une note qui les présente.
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "project", "canvas.json");
const canvas = JSON.parse(fs.readFileSync(file, "utf8"));
const heightOf = (f) => +fs.readFileSync(path.join(__dirname, "project", f), "utf8").match(/"\$preview":\{"width":\d+,"height":(\d+)\}/)[1];

const X = 33400, XM = X + 1520, GAP = 180;
const PROPALS = [
  ["A", "Proposition A — le tableau, d'après ta référence"],
  ["B", "Proposition B — les volets : les lettres tombent à l'arrivée (Play)"],
  ["C", "Proposition C — l'écran ambré, avec le bandeau d'infos qui défile"],
];
let y = 0;
for (const [k, title] of PROPALS) {
  const desk = `Departs-${k}.dc.html`, phone = `Departs-${k}-mobile.dc.html`;
  const h = heightOf(desk);
  canvas.boards[desk] = { ...(canvas.boards[desk] ?? {}), h, is_interactive: true, title, w: 1440, x: X, y };
  canvas.boards[phone] = { ...(canvas.boards[phone] ?? {}), h: 844, is_interactive: true, title: `Proposition ${k} — téléphone`, w: 390, x: XM, y };
  for (const f of [desk, phone]) if (!canvas.order.includes(f)) canvas.order.push(f);
  y += h + GAP;
}
canvas.notes["titre-departs"] = { kind: "title1", maxW: 2400, text: "« Les apps » — trois propositions de tableau des départs", w: 240, x: X, y: -300 };
canvas.notes["departs-propals"] = {
  fill: "blue",
  text: "« Les apps » en vrai tableau des départs, trois façons. Le contenu est le même : les sept apps au départ (Vol : le numéro d'entrée ; Destination : l'app ; Via : ce qu'elle fait ; Porte : son hébergeur), le bouton pour embarquer, puis les archives en arrivées. Les statuts parlent aéroport : À l'heure (l'app répond), Retardé (elle se réveille), Annulé (hors ligne, je suis prévenu), Atterri (une archive). Ici, Tonalli est « retardé » pour montrer l'état. A suit ta référence : capitales condensées, destinations en jaune, étiquettes de statut. B reprend les tableaux à palettes : chaque lettre sur son volet, qui tombe à l'arrivée. C est un écran à points lumineux ambrés, avec un bandeau d'infos voyageurs qui défile. L'heure tourne pour de vrai. L'en-tête et le reste du site ne changent pas.",
  w: 380,
  x: X - 460,
  y: 0,
};
fs.writeFileSync(file, JSON.stringify(canvas, null, 2) + "\n");
console.log("propositions rangées · artboards :", Object.keys(canvas.boards).length);
