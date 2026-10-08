// Range les trois endroits de la carte d'embarquement à droite des propositions du cartel : la fiche en grand à
// gauche, le départ (ordinateur et téléphone) puis l'aperçu de partage à droite, et une note qui les présente.
// node place-billet-propals.cjs [chemin du canvas.json]   (par défaut : project/canvas.json)
const fs = require("fs");
const path = require("path");

const file = process.argv[2] ?? path.join(__dirname, "project", "canvas.json");
const canvas = JSON.parse(fs.readFileSync(file, "utf8"));
const heightOf = (f) => +fs.readFileSync(path.join(__dirname, "project", f), "utf8").match(/"\$preview":\{"width":\d+,"height":(\d+)\}/)[1];

const X = 42800;
const BOARDS = [
  ["Billet-fiche.dc.html", "1 · Sur la fiche : le billet devient la carte d'embarquement (Hublot)", X, 0, 1440, heightOf("Billet-fiche.dc.html")],
  ["Billet-depart.dc.html", "2 · Au départ : le billet du visiteur, son talon décolle (Play)", X + 1520, 0, 1440, 900],
  ["Billet-depart-mobile.dc.html", "2 · Au départ — téléphone", X + 3040, 0, 390, 844],
  ["Billet-apercu.dc.html", "3 · L'aperçu de partage d'une fiche (Magellan)", X + 1520, 1080, 1200, 630],
];
for (const [f, title, x, y, w, h] of BOARDS) {
  canvas.boards[f] = { ...(canvas.boards[f] ?? {}), h, is_interactive: true, title, w, x, y };
  if (!canvas.order.includes(f)) canvas.order.push(f);
}
canvas.notes["titre-billet"] = { kind: "title1", maxW: 3430, text: "La carte d'embarquement — trois endroits où la garder", w: 240, x: X, y: -300 };
canvas.notes["billet-propals"] = {
  fill: "blue",
  text: "Le cartel C est en place sur le site. La carte d'embarquement de B peut vivre ailleurs : voici trois endroits, et ils se combinent. 1, la fiche : le « billet » de « Comment c'est fait » devient une vraie carte d'embarquement, d'Index (IDX) vers le projet (HBL). Elle porte le passager, l'escale, le type, l'année, le statut, la porte (l'hébergeur) et les bagages en soute (la pile). Son talon de laiton ouvre l'app : la fiche gagne un vrai bouton pour embarquer. Comme elle est en hauteur, elle tient telle quelle sur téléphone. 2, le départ : le visiteur reçoit son billet pour le voyage, de l'espace aux dossiers, 10 escales, 11 projets, sans compte ni cookie. Le talon remplace « Décoller ». Le principe du voyage est annoncé dès l'accueil. 3, l'aperçu : l'image qui s'affiche quand on partage le lien d'une fiche (LinkedIn, messagerie) devient la carte d'embarquement du projet, avec son numéro de vol sur le talon. Elle est montrée avec Magellan.",
  w: 380,
  x: X - 460,
  y: 0,
};
fs.writeFileSync(file, JSON.stringify(canvas, null, 2) + "\n");
console.log("billets rangés · artboards :", Object.keys(canvas.boards).length);
