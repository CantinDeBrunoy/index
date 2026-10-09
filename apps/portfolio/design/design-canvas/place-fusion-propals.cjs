// Range les propositions de fusion (« Les apps » dans « Les projets ») en rangée 8, sous les annexes :
// les pages d'ordinateur côte à côte, puis les téléphones dans le même ordre, et les notes qui les présentent.
// C, le tableau des départs en tête, a été écartée par Cantin : ses planches sont retirées.
// Usage : node place-fusion-propals.cjs <canvas.json lu> <dossier des planches> <sortie>
const fs = require("fs");
const path = require("path");

const [inPath, boardsDir, outPath] = process.argv.slice(2);
const canvas = JSON.parse(fs.readFileSync(inPath, "utf8"));
const heightOf = (f) => +fs.readFileSync(path.join(boardsDir, f), "utf8").match(/"\$preview":\{"width":\d+,"height":(\d+)\}/)[1];

const NB = " ";
const typo = (s) => s.replace(/ ([:;?!])/g, `${NB}$1`).replace(/« /g, `«${NB}`).replace(/ »/g, `${NB}»`);
const W = 1440, PH = 390, GAP = 80, SECTION = 520, NOTE_X = -460;

// La rangée 8 garde sa place ; la première fois, elle part sous le bas des annexes (rangée 7).
const annexes = ["Introuvable.dc.html", "Mentions.dc.html", "Apercu.dc.html", "Apercu-fiche.dc.html"].map((f) => canvas.boards[f]);
const y = canvas.boards["Fusion-A.dc.html"]?.y ?? Math.max(...annexes.map((b) => b.y + b.h)) + SECTION;

for (const f of ["Fusion-C.dc.html", "Fusion-C-mobile.dc.html"]) {
  delete canvas.boards[f];
  canvas.order = canvas.order.filter((o) => o !== f);
}

const PROPALS = [
  ["A", "A · Le bouton — le statut sur la vignette, « Ouvrir l'app ↗ » sous chaque carte"],
  ["B", "B · Le talon — chaque carte devient un billet, son talon ambré embarque"],
  ["D", "D · Le filtre — A, plus « Tout / Les apps / Les archives » en tête (Play)"],
  ["E", "E · Les raccourcis — une pastille par app, au-dessus du carnet d'aujourd'hui"],
  ["F", "F · Le verso — la carte postale se retourne : au dos, l'app et la fiche (Play)"],
];
const phonesX = PROPALS.length * (W + GAP);
PROPALS.forEach(([k, title], i) => {
  const desk = `Fusion-${k}.dc.html`, phone = `Fusion-${k}-mobile.dc.html`;
  const playable = k === "D" || k === "F";
  canvas.boards[desk] = { expand: "fill", h: heightOf(desk), is_interactive: true, title, w: W, x: i * (W + GAP), y };
  canvas.boards[phone] = { expand: "fill", h: heightOf(phone), is_interactive: true, title: `${k} · téléphone${playable ? " (Play)" : ""}`, w: PH, x: phonesX + i * (PH + GAP), y };
  for (const f of [desk, phone]) if (!canvas.order.includes(f)) canvas.order.push(f);
});

canvas.notes.t8 = { x: 0, y: y - 300, text: "8 · Proposition — « Les apps » fondue dans « Les projets »", kind: "title1", maxW: phonesX + PROPALS.length * (PH + GAP) - GAP };
canvas.notes["fusion"] = {
  x: NOTE_X,
  y,
  w: 380,
  fill: "blue",
  text: typo(
    "Plus que trois onglets : Le voyage, Les projets, À propos ; le carnet fait aussi le hub. A : le statut sur la vignette, « Ouvrir l'app ↗ » sous la carte. B : chaque carte est un billet, son talon ambré embarque. D : A, plus un filtre « Tout / Les apps / Les archives ». E : une rangée de raccourcis, une pastille par app, au-dessus du carnet d'aujourd'hui. F : la carte postale se retourne ; au dos, un timbre, le cachet du statut, l'app et la fiche (Magellan est déjà retournée). Le gros tableau des départs (ancienne C) est retiré. Tonalli « se réveille » ici pour montrer l'état.",
  ),
};
canvas.notes["fusion-ailleurs"] = {
  x: NOTE_X,
  y: y + 640,
  w: 380,
  fill: "orange",
  text: typo(
    "Ailleurs sur le site : /apps redirige vers /projets, et « Ouvrir une app » au départ mène au carnet. L'onglet « ← Index » des apps ne change pas : il ramène déjà à la fiche du projet. Les archives restent dans le carnet, sans bouton d'app.",
  ),
};
// Un renvoi depuis la rangée 5, où vivent « Les apps » et le carnet d'aujourd'hui.
canvas.notes["fusion-renvoi"] = { x: NOTE_X, y: 8040, w: 380, fill: "purple", text: typo("Proposition : fondre « Les apps » dans « Les projets ». Cinq façons, en rangée 8, tout en bas.") };

fs.writeFileSync(outPath, JSON.stringify(canvas, null, 1));
console.log("rangée 8 à y", y, "· artboards :", Object.keys(canvas.boards).length, "· notes :", Object.keys(canvas.notes).length);
