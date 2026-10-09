// Range les propositions de fiche (build-fiche-propals.cjs) sur le canvas : la section 9, sous la
// proposition de fusion (section 8, qui descend jusqu'à y ≈ 27 665). Ne touche qu'à ses propres clés.
// node place-fiche-propals.cjs <canvas.json>
const fs = require("fs");

const file = process.argv[2];
const c = JSON.parse(fs.readFileSync(file, "utf8"));
const Y = 28200;

const boards = [
  ["Fiche-propal-A.dc.html", 0, 1440, 1750, "A · Le hublot — un vrai bouton de retour, des flèches dans les marges, la démo en grand"],
  ["Fiche-propal-B.dc.html", 1520, 1440, 1348, "B · L'écran de bord — la démo devant la scène, un fil d'Ariane, des onglets sur les bords"],
  ["Fiche-propal-C.dc.html", 3040, 1440, 1664, "C · Le carnet de vol — la scène en plein écran, la démo à cheval, la bande des escales"],
  ["Fiche-propal-A-mobile.dc.html", 4560, 390, 1812, "A · sur téléphone"],
  ["Fiche-propal-B-mobile.dc.html", 5030, 390, 1236, "B · sur téléphone"],
  ["Fiche-propal-C-mobile.dc.html", 5500, 390, 1464, "C · sur téléphone"],
];
for (const [path, x, w, h, title] of boards) {
  c.boards[path] = { x, y: Y, w, h, title };
  if (!c.order.includes(path)) c.order.push(path);
}

c.notes["t9"] = { x: 0, y: Y - 300, text: "9 · Propositions — la fiche projet : la démo, le retour au voyage, les escales voisines", kind: "title1", maxW: 5890 };
c.notes["fiche-propals"] = {
  x: -460,
  y: Y,
  w: 380,
  fill: "blue",
  text:
    "Trois façons de refaire la fiche, montrées sur Magellan (escale 2), d'après tes notes : la vidéo de démo intégrée, un retour au voyage bien visible, et des boutons escale précédente / suivante dans les marges. Tes croix rouges, je les ai lues ainsi : dis-moi si c'était autre chose.\n\nA « Le hublot » : la fiche d'aujourd'hui, avec un vrai bouton de retour (la vignette de l'escale et « Revenir au voyage »), des flèches rondes dans les marges, et la démo en grand juste sous l'en-tête.\n\nB « L'écran de bord » : la démo prend la place de la scène, dans une fenêtre posée devant la Terre (un téléphone sur mobile) ; un fil d'Ariane « ← Le voyage › Escale 2 › Magellan » ; des onglets de page sur les bords.\n\nC « Le carnet de vol » : la scène en plein écran comme au voyage, avec l'anneau doré « Reprendre le voyage » ; la démo à cheval sur la scène et le papier ; une bande de vol : l'escale d'avant, où on en est, l'escale d'après.",
};
c.notes["fiche-propals-demo"] = {
  x: -460,
  y: Y + 760,
  w: 380,
  fill: "gray",
  text:
    "La vidéo est pour l'instant une affiche : la capture de Magellan. Les démos restent à enregistrer (45 s, sans le son, sous-titrées) : je peux filmer les apps web moi-même ; Mithril, appli Windows, demande une capture d'écran chez toi.\n\nPartout, les escales voisines suivent l'ordre du voyage (1 L'espace → 2 La Terre → 3 L'avion), comme la carte « Escale suivante » en bas des fiches.",
};

fs.writeFileSync(file, JSON.stringify(c, null, 2) + "\n");
console.log(`${boards.length} planches et 3 notes rangées à y ${Y}`);
