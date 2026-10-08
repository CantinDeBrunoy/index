// Range les trois propositions de bulle du copilote sous les propositions de cartel, dont elles reprennent les
// planches : une rangée par proposition, de jour (Hublot), de nuit (Magellan), puis sur téléphone (Tonalli).
// node place-bulle-propals.cjs [chemin du canvas.json]   (par défaut : project/canvas.json)
const fs = require("fs");
const path = require("path");

const file = process.argv[2] ?? path.join(__dirname, "project", "canvas.json");
const canvas = JSON.parse(fs.readFileSync(file, "utf8"));

const X = 38400, Y = 4600, ROW = 900 + 180;
const put = (f, frame) => {
  canvas.boards[f] = { ...(canvas.boards[f] ?? {}), ...frame };
  if (!canvas.order.includes(f)) canvas.order.push(f);
};
const PROPALS = [
  ["A", "Bulle A — la grande bulle : à la taille de l'affiche, liseré de laiton, lui en pied (Play)"],
  ["B", "Bulle B — le projecteur : la scène s'assombrit autour (Play)"],
  ["C", "Bulle C — le contraste : couleurs inversées, grosse pointe (Play)"],
];
PROPALS.forEach(([k, title], n) => {
  const y = Y + n * ROW;
  put(`Bulle-${k}.dc.html`, { h: 900, is_interactive: true, title, w: 1440, x: X, y });
  put(`Bulle-${k}-nuit.dc.html`, { h: 900, is_interactive: true, title: `Bulle ${k} — de nuit`, w: 1440, x: X + 1520, y });
  put(`Bulle-${k}-mobile.dc.html`, { h: 844, is_interactive: true, title: `Bulle ${k} — téléphone`, w: 390, x: X + 3040, y });
});
canvas.notes["titre-bulle"] = { kind: "title1", maxW: 3430, text: "La bulle du copilote — trois façons de la rendre visible", w: 240, x: X, y: Y - 270 };
canvas.notes["bulle-propals"] = {
  fill: "blue",
  text: "Quand on clique sur le copilote, sa bulle rouvre le tuto (les deux façons de visiter). Sur le site, elle restait à 380 px quand l'affiche du cartel grandit avec l'écran : sur un écran de 1920 px, elle paraissait petite, et elle prenait la couleur des cartes, qui se fond dans le décor. Ici, elle grandit comme l'affiche, et chaque proposition la fait ressortir à sa façon. A, la grande bulle : liseré de laiton, et le copilote en pied debout dessus. B, le projecteur : la même, et la scène s'assombrit autour (un clic dans le noir la referme). C, le contraste : les couleurs inversées de l'escale (encre sur les escales claires, crème sur les sombres) et une grosse pointe vers la pastille. Les planches reprennent le site vu sur un écran de 1920 px, aux trois quarts. Play : la pastille ouvre et ferme la bulle.",
  w: 380,
  x: X - 460,
  y: Y,
};
fs.writeFileSync(file, JSON.stringify(canvas, null, 2) + "\n");
console.log("bulles rangées · artboards :", Object.keys(canvas.boards).length);
