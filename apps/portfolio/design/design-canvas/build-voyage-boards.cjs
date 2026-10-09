// Fabrique les artboards du « voyage », en français puis en anglais : Départ, Escale1…Escale9, Carnet, À propos
// et une fiche par projet. Les pages anglaises portent le suffixe -en ; chaque en-tête a les trois onglets du site
// et l'interrupteur FR / EN, qui mène à la même page dans l'autre langue.
// Une escale = un écran 1440 × 900 ; l'objet à cliquer mène à l'escale suivante.
// Les identifiants des rendus viennent de ids.json ; les points cliquables sont projetés depuis la 3D.
// Les textes : i18n.cjs (interface, escales), fiches-data(.en).cjs, apropos-data(.en).cjs.
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "project");
const IDS = JSON.parse(fs.readFileSync(path.join(__dirname, "ids.json"), "utf8"));
const I18N = require("./i18n.cjs");
const ANNEXES = require("./annexes-data.cjs");
const HUB = require("./hub-data.cjs");
// carnetH : hauteur du carnet, mesurée sur le rendu (measure-fiches.mjs).
const LANGS = [
  { ...I18N.fr, fiches: require("./fiches-data.cjs"), apropos: require("./apropos-data.cjs"), carnetH: 2150 },
  { ...I18N.en, fiches: require("./fiches-data.en.cjs"), apropos: require("./apropos-data.en.cjs"), carnetH: 2150 },
];

// Les hauteurs mesurées sur le rendu (measure-fiches.mjs) priment sur celles des fichiers de textes :
// l'artboard prend la hauteur de sa page, arrondie à la dizaine au-dessus.
const MEASURED = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "measure", "heights.json"), "utf8"));
  } catch {
    return {};
  }
})();
const heightOf = (name, fallback) => (MEASURED[name] ? Math.ceil((MEASURED[name] + 4) / 10) * 10 : fallback);

const FONTS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&amp;family=Geist:wght@300..600&amp;family=Geist+Mono:wght@400..500&amp;display=swap">`;
const GH = "https://github.com/CantinDeBrunoy";
const MAIL = "cantin.roquier@gmail.com";
const app = (a) => `${GH}/index/tree/main/apps/${a}`;

const NIGHT = { ink: "#F1E8DA", muted: "#B3AA9C", card: "#171A24", line: "#2B3040", brass: "#D9B475", brassText: "#D9B475", halo: "rgba(23,26,36,.6)", onBrass: "#0B0C14" };
// Sur le laiton du jour, l'encre (4,8:1) plutôt que la crème (3:1, trop faible pour un petit texte).
const DAY = { ink: "#241E18", muted: "#6A5F52", card: "#FBF7F0", line: "#E3D8C8", brass: "#B08A4F", brassText: "#8A6A35", halo: "rgba(251,247,240,.72)", onBrass: "#241E18" };
// Le soir, fond mauve : un gris plus sombre pour que les petits textes posés dessus restent lisibles.
const DUSK = { ...DAY, muted: "#5A4B4E" };
// Le kraft des dossiers d'INDEX : gris et laiton plus sombres, pour rester lisibles sur ce fond plus soutenu.
const KRAFT = { ...DAY, muted: "#5A4B40", brassText: "#6E5226" };
// Les liens du panneau de détail, d'après packages/projects/src/projects.ts. « À brancher » : une démo
// qui existe mais dont l'adresse n'est pas encore reportée.
const PENDING = "#a-brancher";
const DEMO = {
  "Galaxy Escape": null,
  Magellan: "https://magellan.cantin-roquier.workers.dev",
  Hublot: "https://cantindebrunoy.github.io/Hublot/",
  "Métro Pathfinder": null,
  "Visit Match": null,
  "gym-picker": "https://gym-picker.cantin-roquier.workers.dev",
  Mithril: "https://github.com/CantinDeBrunoy/Mithril/releases",
  Cancionero: "https://cancionero.cantin-roquier.workers.dev",
  Tonalli: "https://teinte-du-jour-eight.vercel.app",
  // INDEX n'a pas d'autre démo que ce site : le cartel le dit (noDemoText).
  INDEX: null,
};
const CODE = {
  "Galaxy Escape": `${GH}/run4urlife`,
  "Métro Pathfinder": `${GH}/Metro`,
  "Visit Match": null,
};

// Le décor de chaque escale, commun aux deux langues : fond, palette, rendu, numéro, code, point cliquable
// (et, pour Mithril, l'étiquette de l'API REST posée sur l'étagère). `scene` : le nom du rendu (ids.json, mobile.json).
const SCENES = [
  { scene: "espace", name: "Galaxy Escape", num: "004", bg: "#0B0C14", pal: NIGHT, code: GH, spot: [70.5, 33.2] },
  { scene: "terre", name: "Magellan", num: "005", bg: "#10131C", pal: NIGHT, code: app("magellan"), spot: [83, 44.4] },
  { scene: "avion", name: "Hublot", num: "010", bg: "#DCE9F0", pal: DAY, code: app("hublot"), spot: [52.9, 55.4] },
  { scene: "paris", name: "Métro Pathfinder", num: "001", bg: "#DCE3EA", pal: DAY, code: GH, spot: [79.5, 55.1] },
  { scene: "monuments", name: "Visit Match", num: "003", bg: "#E0E8DA", pal: DAY, code: GH, spot: [68.2, 56.3] },
  { scene: "route", name: "gym-picker", num: "009", bg: "#F2DFD3", pal: DAY, code: app("gym-picker"), spot: [53.4, 68.3] },
  { scene: "maison", name: "Mithril", num: "007", bg: "#F1E7DA", pal: DAY, code: app("mithril"), spot: [78.2, 85.6], tagAt: [72.3, 57] },
  { scene: "salon", name: "Cancionero", num: "006", bg: "#F3D5B5", pal: DAY, code: app("cancionero"), spot: [39.6, 36.3] },
  { scene: "calendrier", name: "Tonalli", num: "008", bg: "#D8C2C6", pal: DUSK, code: app("tonalli"), spot: [71.6, 70.5] },
  { scene: "dossiers", name: "INDEX", num: "011", bg: "#E6D5B8", pal: KRAFT, code: `${GH}/index`, spot: [65.8, 44.7] },
].map((s) => ({ ...s, img: IDS[s.scene] }));
// Les rendus du voyage sur téléphone, cadrés pour un écran plus haut que large, et leur point cliquable (en %).
const MOBILE_RENDERS = JSON.parse(fs.readFileSync(path.join(__dirname, "mobile.json"), "utf8"));
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));

const vars = (p) =>
  `--ink:${p.ink};--muted:${p.muted};--card:${p.card};--line:${p.line};--brass:${p.brass};--brass-text:${p.brassText};--halo:${p.halo};--on-brass:${p.onBrass}`;

const STYLE = `<style>
body{margin:0}
.v a{color:inherit}
.v a:focus-visible{outline:2px solid var(--brass);outline-offset:3px;border-radius:999px}
.serif{font-family:'Instrument Serif',Georgia,serif;font-weight:400}
.mono{font-family:'Geist Mono',ui-monospace,monospace}
.brand{display:inline-flex;align-items:baseline;gap:12px;min-height:44px;text-decoration:none}
.pill{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ink);font-size:14px;text-decoration:none;white-space:nowrap;transition:background .2s,color .2s}
.pill:hover{background:var(--ink);color:var(--card)}
.go{display:inline-flex;align-items:center;min-height:52px;padding:0 26px;border-radius:999px;background:var(--brass);color:var(--on-brass);font-size:16px;font-weight:500;text-decoration:none;transition:filter .2s}
.go:hover{filter:brightness(1.08)}
.v a.go{color:var(--on-brass)}
.dots{display:flex;align-items:center;gap:2px;margin:0;padding:0;list-style:none}
.dot{display:flex;align-items:center;justify-content:center;width:26px;height:26px;text-decoration:none}
.dot span{width:8px;height:8px;border-radius:999px;border:1.5px solid var(--muted);box-sizing:border-box;transition:transform .2s}
.dot.done span{background:var(--brass);border-color:var(--brass)}
.dot.now span{width:13px;height:13px;background:var(--brass);border-color:var(--brass)}
.dot:hover span{transform:scale(1.35)}
.spot{position:absolute;display:flex;align-items:center;gap:12px;text-decoration:none;transform:translate(-26px,-26px)}
.ring{position:relative;flex:none;width:52px;height:52px;border-radius:999px;border:2px solid var(--brass);box-shadow:0 0 0 5px var(--halo);display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.ring::before{content:"";width:12px;height:12px;border-radius:999px;background:var(--brass)}
.ring::after{content:"";position:absolute;inset:-2px;border-radius:999px;border:2px solid var(--brass);animation:sonar 2.4s ease-out infinite}
@keyframes sonar{from{transform:scale(1);opacity:.8}to{transform:scale(1.9);opacity:0}}
.lab{display:inline-flex;align-items:center;min-height:42px;padding:0 18px;border-radius:999px;background:var(--card);border:1px solid var(--line);color:var(--ink);font-size:15px;font-weight:500;white-space:nowrap;transition:background .2s,color .2s}
.spot:hover .lab,.spot:focus-visible .lab{background:var(--ink);color:var(--card)}
.tag{position:absolute;display:flex;align-items:center;gap:10px;margin:0;transform:translate(-7px,-7px)}
.tag i{flex:none;width:14px;height:14px;border-radius:999px;background:var(--brass);box-shadow:0 0 0 4px var(--halo)}
.tag span{display:inline-flex;align-items:center;min-height:30px;padding:0 12px;border-radius:999px;background:var(--card);border:1px solid var(--line);font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--muted);white-space:nowrap}
.link{display:inline-flex;align-items:center;min-height:44px;font-size:14px;font-weight:500;text-decoration:none;color:var(--brass-text)}
.link:hover{text-decoration:underline;text-underline-offset:4px}
.tabs{display:inline-flex;align-items:center;gap:2px;padding:4px;border-radius:999px;border:1px solid var(--line);background:var(--card)}
.tabs a{display:inline-flex;align-items:center;min-height:38px;padding:0 14px;border-radius:999px;font-size:14px;text-decoration:none;color:var(--ink);white-space:nowrap;transition:background .2s,color .2s}
.tabs a:hover{background:var(--line)}
.tabs a[aria-current]{background:var(--ink);color:var(--card)}
.lang a{min-width:40px;justify-content:center;padding:0 10px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;letter-spacing:.04em}
.post{display:flex;flex-direction:column;gap:8px;text-decoration:none}
.thumb{display:block;aspect-ratio:16/9;border-radius:14px;overflow:hidden;border:1px solid var(--line);transition:transform .25s,border-color .25s}
.thumb img{display:block;width:100%;height:100%;object-fit:cover}
.post:hover .thumb{transform:translateY(-4px);border-color:var(--brass)}
.m-only{display:none}
.m-bar{align-items:center;gap:8px}
.m-menu{position:relative}
.m-menu summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:44px;min-height:44px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ink)}
.m-menu summary::-webkit-details-marker{display:none}
.m-menu summary:focus-visible{outline:2px solid var(--brass);outline-offset:3px}
.m-drop{display:none;position:absolute;right:0;top:52px;z-index:10;min-width:230px;flex-direction:column;padding:8px;border-radius:16px;border:1px solid var(--line);background:var(--card);box-shadow:0 14px 36px rgba(0,0,0,.18)}
.m-menu[open] .m-drop{display:flex}
.m-drop a{display:flex;align-items:center;min-height:48px;padding:0 14px;border-radius:10px;font-size:16px;text-decoration:none;color:var(--ink)}
.m-drop a[aria-current]{color:var(--brass-text)}
@media (max-width: 700px){.d-only{display:none !important}.m-only{display:flex}}
@media (prefers-reduced-motion: reduce){.ring::after{animation:none;opacity:0}.pill,.lab,.dot span,.thumb,.go,.tabs a{transition:none}.post:hover .thumb{transform:none}}
</style>`;
const MENU_ICON = `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

// Une page statique : son style en plus du style commun, une logique vide.
const page = (lang, title, body, w, h, extra = "") => `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
${FONTS}
${STYLE}${extra ? `\n${extra}` : ""}
</helmet>
${body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${w},"height":${h}}}'>
class Component extends DCLogic {
  renderVals() {
    return {};
  }
}
</script>
</body>
</html>
`;

// Le style des pages de lecture (fiches, à propos) : étiquettes, puces, billet, itinéraire, visas.
const READ_STYLE = `<style>
.chip{display:inline-flex;align-items:center;min-height:30px;padding:0 12px;border-radius:999px;border:1px solid var(--line);background:#F6F1E9;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--ink)}
.label{margin:0;font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;font-weight:400;color:var(--brass-text)}
.todo{margin:0;font-size:15px;line-height:1.6;color:var(--muted);font-style:italic}
.billet{position:relative;display:flex;border:1px solid var(--line);border-radius:18px;background:var(--card)}
.billet dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 20px;margin:0}
.billet dt{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.billet dd{margin:4px 0 0;font-size:15px;line-height:1.45}
.souche{position:relative;flex:none;width:92px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;border-left:2px dashed var(--line)}
.souche::before,.souche::after{content:"";position:absolute;left:-12px;width:22px;height:22px;border-radius:999px;background:#F6F1E9;border:1px solid var(--line)}
.souche::before{top:-12px;clip-path:inset(50% 0 0 0)}
.souche::after{bottom:-12px;clip-path:inset(0 0 50% 0)}
.souche span{writing-mode:vertical-rl;transform:rotate(180deg)}
.gantt{display:grid;grid-template-columns:132px minmax(0,1fr);grid-template-rows:22px 34px 92px 92px 64px auto;column-gap:16px;row-gap:6px;min-width:860px}
.gantt .lane{display:flex;align-items:center;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--muted)}
.gantt .axis,.gantt .brace,.gantt .track{position:relative}
.gantt .track{background-image:linear-gradient(to right,var(--line) 1px,transparent 1px);background-size:12.5% 100%}
.gantt .axis span{position:absolute;top:0;width:12.5%;text-align:center;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--muted)}
.gantt .brace i{position:absolute;bottom:0;height:16px;box-sizing:border-box;border:2px solid var(--brass);border-bottom:0;border-radius:10px 10px 0 0}
.gantt .brace span{position:absolute;top:0;transform:translateX(-50%);padding:0 10px;background:#F6F1E9;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--brass-text);white-space:nowrap}
.gantt .tint{position:relative;pointer-events:none}
.gantt .tint i{position:absolute;top:0;bottom:0;border-radius:14px;background:rgba(176,138,79,.11)}
.gantt .bar{position:absolute;top:8px;bottom:8px;z-index:1;box-sizing:border-box;padding:8px 12px;border-radius:12px;border:1px solid var(--line);background:var(--card);overflow:hidden;display:flex;flex-direction:column;justify-content:center;gap:3px}
.gantt .bar b{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:20px;line-height:1.05}
.gantt .bar small{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;line-height:1.35;color:var(--muted)}
.gantt .bar.alt{border-color:var(--brass);background:#F4EBDC}
.gantt .bar.now{border-color:var(--brass);background:var(--brass);color:var(--on-brass)}
.gantt .bar.now small{color:var(--on-brass)}
.gantt .bar.trip{top:16px;bottom:16px;padding:0;background:#E7C3AC;border-color:#C08A66}
.gantt .out{position:absolute;top:50%;z-index:1;transform:translateY(-50%);padding-left:12px;font-size:15px;white-space:nowrap}
.gantt .today{position:relative;z-index:2;pointer-events:none}
.gantt .today i{position:absolute;top:0;bottom:0;border-left:2px dashed var(--brass)}
.gantt .today span{position:absolute;top:34px;transform:translateX(calc(-100% - 8px));padding:0 6px;background:#F6F1E9;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--brass-text);white-space:nowrap}
.gantt .callout{margin:0;text-align:right;font-size:15px;line-height:1.5}
.legs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:40px 56px;margin-top:48px}
.legs ol{list-style:none;margin:20px 0 0;padding:0;display:flex;flex-direction:column;gap:18px}
.legs li{display:grid;grid-template-columns:104px minmax(0,1fr);gap:4px 16px}
.visa{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:196px;height:196px;border-radius:999px;border:3px solid currentColor;outline:1.5px solid currentColor;outline-offset:-14px;box-sizing:border-box;text-align:center}
</style>`;

// La 404 : le fond de nuit du terminal, et le point cliquable (la valise) en % du rendu d'ordinateur.
const NF_BG = "#121522";
const NF_SPOT = [66.6, 54.8];

for (const L of LANGS) build(L);
console.log("ok", LANGS.length * (SCENES.length * 2 + 9), "artboards, et", LANGS.length * (SCENES.length + 3), "écrans mobiles");

function build(L) {
  const t = L.ui;
  const F = (base) => `${base}${L.sfx}.dc.html`;
  const E = SCENES.map((s, i) => {
    const x = L.escales[s.name];
    const ficheBase = `Fiche-${slug(s.name)}`;
    return {
      ...s, ...x, n: i + 1, base: `Escale${i + 1}`, file: F(`Escale${i + 1}`), ficheBase, fiche: F(ficheBase),
      spot: [...s.spot, x.cta], tag: s.tagAt ? [...s.tagAt, x.tag] : undefined,
    };
  });
  const write = (base, html) => fs.writeFileSync(path.join(out, F(base)), html);
  const H = (base, fallback) => heightOf(`${base}${L.sfx}`, fallback);
  const demoOf = (e) => DEMO[e.name] ?? null;
  const codeOf = (e) => (e.name in CODE ? CODE[e.name] : e.code);
  const demoLabel = (e) => (e.name === "Mithril" ? t.download : t.demo);

  // Les quatre onglets du site : `here` est l'onglet de la page ; `exact` à faux pour une page qui en dépend
  // (une fiche, sous « Les projets »). « Les apps » est le hub : chaque app s'ouvre de là.
  // MTABS : les mêmes, pour les écrans de téléphone du canvas (le voyage et le hub ont leur version mobile).
  const HB = HUB[L.lang];
  t.tabs.apps = HB.tab;
  const TABS = [["voyage", F("Depart")], ["apps", F("Apps")], ["projets", F("Carnet")], ["apropos", F("Apropos")]];
  const MTABS = [["voyage", F("Depart-mobile")], ["apps", F("Apps-mobile")], ["projets", F("Carnet")], ["apropos", F("Apropos")]];
  const tabs = (here, exact = true) =>
    `<nav aria-label="${t.tabsAria}" class="tabs">${TABS.map(([k, href]) => `<a href="${href}"${k === here ? ` aria-current="${exact ? "page" : "true"}"` : ""}>${t.tabs[k]}</a>`).join("")}</nav>`;
  // L'interrupteur de langue : la même page, dans l'une ou l'autre langue.
  const LANG_LINKS = [["fr", "", "Français"], ["en", "-en", "English"]];
  const langs = (base) =>
    `<nav aria-label="${t.langAria}" class="tabs lang">${LANG_LINKS.map(([code, sfx, name]) => `<a href="${base}${sfx}.dc.html" hreflang="${code}" lang="${code}" aria-label="${name}"${code === L.lang ? ' aria-current="page"' : ""}>${code.toUpperCase()}</a>`).join("")}</nav>`;
  // Sur ordinateur, les onglets et la langue ; sous 700 px, la langue et un menu ☰ (un <details>, sans script).
  const menu = (here, exact, list = TABS) =>
    `<details class="m-menu"><summary aria-label="${t.menu}">${MENU_ICON}</summary><nav class="m-drop" aria-label="${t.tabsAria}">${list.map(([k, href]) => `<a href="${href}"${k === here ? ` aria-current="${exact ? "page" : "true"}"` : ""}>${t.tabs[k]}</a>`).join("")}</nav></details>`;
  const nav = (here, base, exact = true, list = TABS) =>
    `<div class="d-only" style="display:flex;flex-wrap:wrap;align-items:center;gap:10px">${tabs(here, exact)}${langs(base)}</div><div class="m-only m-bar">${langs(base)}${menu(here, exact, list)}</div>`;
  // Sur téléphone, la marque se réduit à « Index » : l'en-tête tient alors sur une ligne, comme dans le voyage mobile.
  const brand = `<a class="brand" href="${F("Depart")}"><span class="serif" style="font-style:italic;font-size:32px">Index</span><span class="mono d-only" style="font-size:12px;color:var(--muted)">Cantin Roquier</span></a>`;
  // Les annexes (404, mentions légales, aperçus de partage) ; le lien vers les mentions, en bas des pages.
  const X = ANNEXES[L.lang];
  const colophon = (pad = "0 0 40px") => `<p class="mono" style="margin:0;padding:${pad};font-size:12px"><a href="${F("Mentions")}" style="color:var(--muted);text-underline-offset:3px">${X.legal.link}</a></p>`;

  voyage();
  carnet();
  apropos();
  fiches();
  annexes();
  hub();

  // Départ : le voyage ANIMÉ, en un seul artboard (l'intro puis les neuf escales). Les escales passent par
  // l'état du composant : au clic, la caméra plonge dans l'objet (zoom sur le point cliqué, voile de la couleur
  // de l'escale suivante), puis la scène suivante se pose (dézoom, flou qui se dissipe), le cartel et l'anneau
  // arrivent en dernier. Les artboards Escale1…9 sont ce même composant, chacun partant de son escale.
  function voyage() {
    const imgY = (y) => +(((y * 9 - 45) / 8.1)).toFixed(1); // % de l'artboard → % de l'image (rendu à 45 px du haut)
    const DATA = [
      { intro: true, bg: "#0B0C14", vars: vars(NIGHT), img: `/_blob/${IDS.espace}`, place: t.start, origin: "24% 50%",
        alt: "", num: "", kind: "", name: "", pitch: "", extra: "", hasExtra: false, code: GH,
        hasTag: false, tagX: 0, tagY: 0, tag: "", spotX: 50, spotY: 50, cta: "",
        hasDemo: false, noDemo: false, noDemoLabel: "", demo: "", demoLabel: "", demoShort: "", demoTarget: "_blank", hasCode: false, fiche: F("Carnet") },
      ...E.map((e) => {
        const demo = demoOf(e), code = codeOf(e);
        return {
          bg: e.bg, vars: vars(e.pal), img: `/_blob/${e.img}`, alt: e.alt, place: e.place, num: e.num, kind: e.kind, name: e.name, fiche: e.fiche,
          pitch: e.pitch, extra: e.extra ?? "", hasExtra: !!e.extra,
          hasTag: !!e.tag, tagX: e.tag?.[0] ?? 0, tagY: e.tag?.[1] ?? 0, tag: e.tag?.[2] ?? "",
          hasDemo: !!demo, noDemo: !demo, noDemoLabel: e.noDemoText ?? t.noDemo, demo: demo ?? "", demoLabel: demoLabel(e),
          demoTarget: demo === PENDING ? "_self" : "_blank", hasCode: !!code, code: code ?? "",
          spotX: e.spot[0], spotY: e.spot[1], cta: e.spot[2], origin: `${e.spot[0]}% ${imgY(e.spot[1])}%`,
          demoShort: e.name === "Mithril" ? t.download : t.demoShort,
        };
      }),
    ];
    // Sur mobile, chaque escale a son propre rendu (mobile.json), cadré pour un écran plus haut que large : toute la
    // composition tient dans MW × MSH, et l'anneau se pose sur le point cliquable mesuré dans ce rendu.
    // L'intro reprend le rendu de l'espace, recouvrant une zone un peu plus haute.
    const MW = 390, MSH = 380, MIH_INTRO = 430;
    DATA.forEach((d, k) => {
      const m = MOBILE_RENDERS[k === 0 ? "espace" : E[k - 1].scene];
      const [x, y] = k === 0 ? [MW / 2, MIH_INTRO / 2] : [(m.spot[0] / 100) * MW, (m.spot[1] / 100) * MSH];
      Object.assign(d, { mImg: `/_blob/${m.id}`, mSpotX: Math.round(x), mSpotY: Math.round(y), mOrigin: `${Math.round(x)}px ${Math.round(y)}px` });
    });
    const T = { caption0: t.caption0, caption: t.caption, announce: t.announce, dot: t.dot, backTo: t.backTo };
    const STAGE = `<style>
.stage .scene{will-change:transform,opacity,filter}
.stage.leave .scene{animation:dive .75s cubic-bezier(.55,0,.9,.4) forwards}
@keyframes dive{to{transform:scale(2.8);opacity:0;filter:blur(6px)}}
.stage.enter .scene{animation:land 1.05s cubic-bezier(.16,.84,.3,1) both}
@keyframes land{from{transform:scale(1.22);opacity:0;filter:blur(10px)}to{transform:scale(1);opacity:1;filter:blur(0)}}
.stage.leave.soft .scene{animation:fadeOut .4s ease-in forwards}
.stage.enter.soft .scene{animation:fadeIn .6s ease-out both}
@keyframes fadeOut{to{opacity:0}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.veil{position:absolute;inset:0;pointer-events:none;opacity:0}
.stage.leave .veil{animation:fadeIn .75s ease-in forwards}
.stage.leave.soft .veil{animation-duration:.4s}
.stage.enter .veil{animation:fadeOut .9s ease-out forwards}
.stage .ui{transition:opacity .3s ease,transform .3s ease}
.stage.leave .ui{opacity:0;transform:translateY(6px)}
.stage.enter .ui{animation:uiIn .6s .45s both}
@keyframes uiIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.stage.leave .spot{opacity:0}
.stage.enter .spot{animation:spotIn .5s .85s both}
@keyframes spotIn{from{opacity:0;transform:translate(-26px,-26px) scale(.6)}to{opacity:1;transform:translate(-26px,-26px) scale(1)}}
.stage button{font:inherit;cursor:pointer}
.stage .spot{border:0;background:none;padding:0;color:inherit}
.stage .brand{border:0;background:none;padding:0;color:inherit}
.stage .dot{border:0;background:none;padding:0}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-reduced-motion: reduce){
.stage.leave .scene,.stage.leave.soft .scene{animation:fadeOut .25s forwards}
.stage.enter .scene,.stage.enter.soft .scene{animation:fadeIn .3s both}
.stage.leave .veil{animation:fadeIn .25s forwards}
.stage.enter .veil{animation:fadeOut .3s forwards}
.stage.enter .ui,.stage.enter .spot{animation:fadeIn .3s both}
}
</style>`;
    // L'interrupteur de langue suit l'escale affichée : on retrouve la même escale dans l'autre langue.
    const langSwitch = `<nav aria-label="${t.langAria}" class="tabs lang">${LANG_LINKS.map(([code, , name]) => `<a href="{{lang${code === "fr" ? "Fr" : "En"}}}" hreflang="${code}" lang="${code}" aria-label="${name}"${code === L.lang ? ' aria-current="page"' : ""}>${code.toUpperCase()}</a>`).join("")}</nav>`;
    const header = `<header class="ui" style="position:absolute;left:40px;right:40px;top:22px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:24px">
<button type="button" class="brand" onClick="{{home}}" style="justify-self:start;display:inline-flex;align-items:baseline;gap:12px;min-height:44px"><span class="serif" style="font-style:italic;font-size:32px">Index</span><span class="mono" style="font-size:12px;color:var(--muted)">Cantin Roquier</span></button>
<nav aria-label="${t.dotsAria}" style="display:flex;flex-direction:column;align-items:center;gap:2px">
<ol class="dots"><sc-for list="{{dots}}" as="d" hint-placeholder-count="10"><li><button type="button" class="{{d.cls}}" onClick="{{d.go}}" aria-label="{{d.label}}"><span></span></button></li></sc-for></ol>
<p class="mono" style="margin:0;font-size:12px;color:var(--muted)">{{caption}}</p>
</nav>
<div style="justify-self:end;display:flex;align-items:center;gap:10px">${tabs("voyage")}${langSwitch}</div>
</header>`;
    const body = `<div class="{{stageClass}}" style="position:relative;width:1440px;height:900px;overflow:hidden;background:{{s.bg}};color:var(--ink);font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased;{{s.vars}}">
<sc-if value="{{isIntro}}" hint-placeholder-val="{{ true }}">
<img class="scene" src="{{s.img}}" alt="" style="position:absolute;left:520px;top:-20px;width:1700px;height:956px;transform-origin:{{s.origin}}">
<div aria-hidden="true" class="ui" style="position:absolute;inset:0;background:linear-gradient(90deg,#0B0C14 0%,rgba(11,12,20,.92) 30%,rgba(11,12,20,0) 62%)"></div>
${header}
<main class="ui" style="position:absolute;left:96px;top:50%;transform:translateY(-46%);width:660px;display:flex;flex-direction:column;gap:26px">
<p class="mono" style="margin:0;font-size:13px;color:var(--brass-text)">${t.introLabel}</p>
<h1 class="serif" style="margin:0;font-size:96px;line-height:.95;letter-spacing:-0.01em">${t.introTitle}</h1>
<p style="margin:0;max-width:560px;font-size:19px;line-height:1.6;color:var(--muted)">${t.introText}</p>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding-top:6px">
<button type="button" class="go" onClick="{{start}}" style="border:0">${t.takeOff}</button>
<a class="pill" href="${F("Apps")}">${HB.openApp}</a>
<a class="pill" href="${F("Carnet")}">${t.seeAll}</a>
</div>
</main>
</sc-if>
<sc-if value="{{isScene}}" hint-placeholder-val="{{ false }}">
<img class="scene" src="{{s.img}}" alt="{{s.alt}}" style="position:absolute;left:0;top:45px;width:1440px;height:810px;transform-origin:{{s.origin}}">
${header}
<sc-if value="{{s.hasTag}}" hint-placeholder-val="{{ false }}"><p class="tag ui" style="left:{{s.tagX}}%;top:{{s.tagY}}%"><i aria-hidden="true"></i><span>{{s.tag}}</span></p></sc-if>
<sc-if value="{{notLast}}" hint-placeholder-val="{{ true }}"><button type="button" class="spot" onClick="{{dive}}" style="left:{{s.spotX}}%;top:{{s.spotY}}%"><span class="ring" aria-hidden="true"></span><span class="lab">{{s.cta}} →</span></button></sc-if>
<sc-if value="{{isLast}}" hint-placeholder-val="{{ false }}"><a class="spot" href="${F("Carnet")}" style="left:{{s.spotX}}%;top:{{s.spotY}}%"><span class="ring" aria-hidden="true"></span><span class="lab">{{s.cta}} →</span></a></sc-if>
<article class="ui" style="position:absolute;left:40px;bottom:40px;width:460px;box-sizing:border-box;padding:22px 24px 14px;border-radius:16px;background:var(--card);border:1px solid var(--line);display:flex;flex-direction:column;gap:10px">
<p class="mono" style="margin:0;font-size:12px;color:var(--brass-text)">{{s.num}} · {{s.kind}}</p>
<h1 class="serif" style="margin:0;font-size:48px;line-height:1">{{s.name}}</h1>
<p style="margin:0;font-size:15px;line-height:1.55">{{s.pitch}}</p>
<sc-if value="{{s.hasExtra}}" hint-placeholder-val="{{ false }}"><p style="margin:0;font-size:13px;line-height:1.5;color:var(--muted)">{{s.extra}}</p></sc-if>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0 22px">
<sc-if value="{{s.hasDemo}}" hint-placeholder-val="{{ true }}"><a class="go" href="{{s.demo}}" target="{{s.demoTarget}}" rel="noopener" style="min-height:44px;padding:0 20px;font-size:14px">{{s.demoLabel}}</a></sc-if>
<a class="link" href="{{s.fiche}}">${t.fiche}</a>
<sc-if value="{{s.hasCode}}" hint-placeholder-val="{{ true }}"><a class="link" href="{{s.code}}" target="_blank" rel="noopener">${t.code}</a></sc-if>
<sc-if value="{{s.noDemo}}" hint-placeholder-val="{{ false }}"><span class="mono" style="font-size:12px;color:var(--muted)">{{s.noDemoLabel}}</span></sc-if>
</div>
</article>
<button type="button" class="pill ui" onClick="{{back}}" style="position:absolute;right:40px;bottom:40px">← {{prevPlace}}</button>
</sc-if>
<div class="veil" style="background:{{veil}}"></div>
<p class="sr" aria-live="polite">{{announce}}</p>
</div>`;
    // La même logique pour l'ordinateur et le mobile ; `suffix` désigne les fichiers de la version (« -mobile »),
    // pour que l'interrupteur de langue reste sur la même version. Le menu ne sert que sur mobile.
    const logic = (start, suffix = "") => `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { i: ${start}, phase: "idle", soft: false, veil: Component.DATA[${start}].bg, menu: false };
  }
  static fill(s, o) {
    return s.replace(/\\{(\\w+)\\}/g, (m, k) => (k in o ? o[k] : m));
  }
  componentDidMount() {
    // Les dix rendus sont chargés d'avance : la scène suivante est prête quand le voile se lève.
    this.pre = Component.DATA.map((d) => { const im = new Image(); im.src = d.${suffix ? "mImg" : "img"}; return im; });
  }
  componentWillUnmount() {
    clearTimeout(this.t1);
    clearTimeout(this.t2);
  }
  go(next, soft) {
    const D = Component.DATA;
    if (this.state.phase !== "idle" || next === this.state.i || next < 0 || next >= D.length) return;
    clearTimeout(this.t1);
    clearTimeout(this.t2);
    this.setState({ phase: "leave", soft: !!soft, veil: D[next].bg, menu: false });
    this.t1 = setTimeout(() => {
      this.setState({ i: next, phase: "enter" });
      this.t2 = setTimeout(() => this.setState({ phase: "idle", soft: false }), 1250);
    }, soft ? 400 : 750);
  }
  renderVals() {
    const D = Component.DATA, T = Component.T, fill = Component.fill;
    const { i, phase, soft, veil, menu } = this.state;
    const s = D[i];
    const page = (i === 0 ? "Depart" : "Escale" + i) + "${suffix}";
    return {
      s,
      isIntro: !!s.intro,
      isScene: !s.intro,
      isLast: i === D.length - 1,
      notLast: !s.intro && i < D.length - 1,
      stageClass: "v stage " + phase + (soft ? " soft" : ""),
      veil,
      caption: s.intro ? T.caption0 : fill(T.caption, { i: i, place: s.place }),
      announce: s.intro ? "" : fill(T.announce, { i: i, place: s.place, name: s.name }),
      prevPlace: i > 0 ? D[i - 1].place : "",
      langFr: page + ".dc.html",
      langEn: page + "-en.dc.html",
      dots: D.slice(1).map((d, k) => ({
        cls: k + 1 === i ? "dot now" : k + 1 < i ? "dot done" : "dot",
        label: fill(T.dot, { k: k + 1, place: d.place }),
        go: () => this.go(k + 1, true),
      })),
      start: () => this.go(1, false),
      dive: () => this.go(i + 1, false),
      back: () => this.go(i - 1, true),
      home: () => this.go(0, true),
      backLabel: i > 0 ? fill(T.backTo, { place: D[i - 1].place }) : "",
      menuOpen: !!menu,
      toggleMenu: () => this.setState({ menu: !this.state.menu }),
      closeMenu: () => this.setState({ menu: false }),
    };
  }
}
Component.DATA = ${JSON.stringify(DATA)};
Component.T = ${JSON.stringify(T)};`;
    // ——— Le voyage sur mobile (390 × 844) ———
    // En haut, la marque, la langue et le menu ; dessous, les points des escales. La scène, recadrée autour de
    // l'objet, garde son anneau à toucher ; le cartel suit ; en bas, au pouce, le retour et l'escale suivante.
    // Le menu ☰ ouvre les trois onglets et la langue. Même composant, mêmes transitions que sur ordinateur.
    const MTOP = 104, MCARD = MTOP + MSH + 12;
    const MSTYLE = `<style>
.m-icon{width:44px;padding:0;justify-content:center}
.m-icon svg{display:block}
.m-card{position:absolute;left:16px;right:16px;top:${MCARD}px;box-sizing:border-box;padding:16px 18px 10px;border-radius:16px;background:var(--card);border:1px solid var(--line);display:flex;flex-direction:column;gap:8px}
.m-nav{position:absolute;left:16px;right:16px;bottom:22px;display:flex;align-items:center;gap:10px}
.m-nav .go{flex:1;justify-content:center;border:0;min-height:52px;padding:0 18px;font-size:15px}
.m-nav .pill{flex:none;width:52px;min-height:52px;padding:0;justify-content:center;font-size:18px}
.m-sheet{position:absolute;inset:0;z-index:5;box-sizing:border-box;padding:16px 20px 28px;background:var(--card);display:flex;flex-direction:column;gap:28px}
.m-tab{display:flex;align-items:center;justify-content:space-between;min-height:64px;border-bottom:1px solid var(--line);font-family:'Instrument Serif',Georgia,serif;font-size:36px;text-decoration:none;color:var(--ink)}
.m-tab[aria-current]{color:var(--brass-text)}
.m-tab span{font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--muted)}
</style>`;
    const menuIcon = `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    const closeIcon = `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    const mHeader = `<header class="ui" style="position:absolute;left:16px;right:16px;top:8px;display:flex;align-items:center;justify-content:space-between;gap:12px">
<button type="button" class="brand" onClick="{{home}}" style="display:inline-flex;align-items:baseline;min-height:44px"><span class="serif" style="font-style:italic;font-size:28px">Index</span></button>
<div style="display:flex;align-items:center;gap:8px">${langSwitch}<button type="button" class="pill m-icon" onClick="{{toggleMenu}}" aria-label="${t.menu}" aria-expanded="{{menuOpen}}">${menuIcon}</button></div>
</header>
<nav aria-label="${t.dotsAria}" class="ui" style="position:absolute;left:0;right:0;top:58px;display:flex;flex-direction:column;align-items:center">
<ol class="dots"><sc-for list="{{dots}}" as="d" hint-placeholder-count="10"><li><button type="button" class="{{d.cls}}" onClick="{{d.go}}" aria-label="{{d.label}}"><span></span></button></li></sc-for></ol>
<p class="mono" style="margin:0;font-size:11px;color:var(--muted)">{{caption}}</p>
</nav>`;
    const mSheet = `<sc-if value="{{menuOpen}}" hint-placeholder-val="{{ false }}"><div class="m-sheet" role="dialog" aria-modal="true" aria-label="${t.tabsAria}">
<div style="display:flex;align-items:center;justify-content:space-between"><span class="serif" style="font-style:italic;font-size:28px">Index</span><button type="button" class="pill m-icon" onClick="{{closeMenu}}" aria-label="${t.close}">${closeIcon}</button></div>
<nav aria-label="${t.tabsAria}" style="display:flex;flex-direction:column">
<a class="m-tab" href="${F("Depart-mobile")}" aria-current="page">${t.tabs.voyage}<span>01</span></a>
<a class="m-tab" href="${F("Apps-mobile")}">${t.tabs.apps}<span>02</span></a>
<a class="m-tab" href="${F("Carnet")}">${t.tabs.projets}<span>03</span></a>
<a class="m-tab" href="${F("Apropos")}">${t.tabs.apropos}<span>04</span></a>
</nav>
<div style="margin-top:auto">${langSwitch}</div>
</div></sc-if>`;
    const mBody = `<div class="{{stageClass}}" style="position:relative;width:${MW}px;height:844px;overflow:hidden;background:{{s.bg}};color:var(--ink);font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased;{{s.vars}}">
<sc-if value="{{isIntro}}" hint-placeholder-val="{{ true }}">
<div style="position:absolute;left:0;top:0;width:${MW}px;height:${MIH_INTRO}px;overflow:hidden">
<img class="scene" src="{{s.mImg}}" alt="" style="position:absolute;left:0;top:0;width:${MW}px;height:${MIH_INTRO}px;object-fit:cover;transform-origin:{{s.mOrigin}}">
<div aria-hidden="true" class="ui" style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,12,20,.7) 0%,rgba(11,12,20,0) 26%,rgba(11,12,20,0) 60%,#0B0C14 100%)"></div>
</div>
${mHeader}
<main class="ui" style="position:absolute;left:20px;right:20px;top:392px;display:flex;flex-direction:column;gap:14px">
<p class="mono" style="margin:0;font-size:12px;color:var(--brass-text)">${t.introLabel}</p>
<h1 class="serif" style="margin:0;font-size:46px;line-height:.98;letter-spacing:-0.01em">${t.introTitle}</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:var(--muted)">${t.introText}</p>
<div style="display:flex;flex-direction:column;gap:10px;padding-top:4px">
<button type="button" class="go" onClick="{{start}}" style="border:0;justify-content:center">${t.takeOff}</button>
<div style="display:flex;gap:10px"><a class="pill" href="${F("Apps-mobile")}" style="flex:1;justify-content:center">${HB.openApp}</a><a class="pill" href="${F("Carnet")}" style="flex:1;justify-content:center">${HB.allProjects}</a></div>
</div>
</main>
</sc-if>
<sc-if value="{{isScene}}" hint-placeholder-val="{{ false }}">
<div style="position:absolute;left:0;top:${MTOP}px;width:${MW}px;height:${MSH}px;overflow:hidden">
<img class="scene" src="{{s.mImg}}" alt="{{s.alt}}" style="position:absolute;left:0;top:0;width:${MW}px;height:${MSH}px;transform-origin:{{s.mOrigin}}">
<sc-if value="{{notLast}}" hint-placeholder-val="{{ true }}"><button type="button" class="spot" onClick="{{dive}}" aria-label="{{s.cta}}" style="left:{{s.mSpotX}}px;top:{{s.mSpotY}}px"><span class="ring" aria-hidden="true"></span></button></sc-if>
<sc-if value="{{isLast}}" hint-placeholder-val="{{ false }}"><a class="spot" href="${F("Carnet")}" aria-label="{{s.cta}}" style="left:{{s.mSpotX}}px;top:{{s.mSpotY}}px"><span class="ring" aria-hidden="true"></span></a></sc-if>
</div>
${mHeader}
<article class="ui m-card">
<p class="mono" style="margin:0;font-size:11px;color:var(--brass-text)">{{s.num}} · {{s.kind}}</p>
<h1 class="serif" style="margin:0;font-size:38px;line-height:1">{{s.name}}</h1>
<p style="margin:0;font-size:14px;line-height:1.5">{{s.pitch}}</p>
<sc-if value="{{s.hasExtra}}" hint-placeholder-val="{{ false }}"><p style="margin:0;font-size:12px;line-height:1.45;color:var(--muted)">{{s.extra}}</p></sc-if>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0 18px">
<sc-if value="{{s.hasDemo}}" hint-placeholder-val="{{ true }}"><a class="link" href="{{s.demo}}" target="{{s.demoTarget}}" rel="noopener">{{s.demoShort}}</a></sc-if>
<a class="link" href="{{s.fiche}}">${t.ficheShort}</a>
<sc-if value="{{s.hasCode}}" hint-placeholder-val="{{ true }}"><a class="link" href="{{s.code}}" target="_blank" rel="noopener">${t.codeShort}</a></sc-if>
<sc-if value="{{s.noDemo}}" hint-placeholder-val="{{ false }}"><span class="mono" style="font-size:11px;color:var(--muted)">{{s.noDemoLabel}}</span></sc-if>
</div>
</article>
<nav class="ui m-nav" aria-label="${t.dotsAria}">
<button type="button" class="pill" onClick="{{back}}" aria-label="{{backLabel}}">←</button>
<sc-if value="{{notLast}}" hint-placeholder-val="{{ true }}"><button type="button" class="go" onClick="{{dive}}">{{s.cta}} →</button></sc-if>
<sc-if value="{{isLast}}" hint-placeholder-val="{{ false }}"><a class="go" href="${F("Carnet")}">{{s.cta}} →</a></sc-if>
</nav>
</sc-if>
${mSheet}
<div class="veil" style="background:{{veil}}"></div>
<p class="sr" aria-live="polite">{{announce}}</p>
</div>`;
    // Chaque écran du voyage est ce même composant animé, qui démarre à sa propre étape :
    // le canvas montre le storyboard, et Play sur n'importe lequel joue le voyage avec ses transitions.
    const board = (start, title, { html = body, w = 1440, h = 900, suffix = "", style = "" } = {}) => `<!doctype html>
<html lang="${L.lang}">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
${FONTS}
${STYLE}
${STAGE}${style ? `\n${style}` : ""}
</helmet>
${html}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${w},"height":${h}}}'>
${logic(start, suffix)}
</script>
</body>
</html>
`;
    write("Depart", board(0, t.titleDepart));
    for (const e of E) write(e.base, board(e.n, fill(t.titleEscale, { n: e.n, place: e.place })));
    const MOBILE = { html: mBody, w: MW, h: 844, suffix: "-mobile", style: MSTYLE };
    write("Depart-mobile", board(0, `${t.titleDepart} · mobile`, MOBILE));
    for (const e of E) write(`${e.base}-mobile`, board(e.n, `${fill(t.titleEscale, { n: e.n, place: e.place })} · mobile`, MOBILE));
  }

  // Carnet : le sommaire du voyage, de nuit, une carte postale par escale. La carte ouvre la fiche du projet,
  // le lien du dessous rouvre son escale.
  function carnet() {
    const cards = E.map((e) => {
      const also = e.tag ? `\n<span style="font-size:13px;color:var(--muted)">${t.shelfShort}</span>` : "";
      return `<li style="display:flex;flex-direction:column;gap:4px"><a class="post" href="${e.fiche}">
<span class="thumb" style="background:${e.bg}"><img src="/_blob/${e.img}" alt=""></span>
<span class="mono" style="padding-top:6px;font-size:12px;color:var(--brass-text)">${t.stop} ${e.n} · ${e.place}</span>
<span class="serif" style="font-size:34px;line-height:1">${e.name}</span>
<span style="font-size:14px;color:var(--muted)">${e.num} · ${e.kind}</span>${also}
</a><a class="link" href="${e.file}" style="align-self:flex-start">${t.revisit}</a></li>`;
    }).join("\n");
    const body = `<div class="v" style="${vars(NIGHT)};min-height:100vh;background:#0E1018;color:var(--ink);font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased">
<div style="max-width:1280px;margin:0 auto;padding:0 clamp(20px,4vw,64px) 72px">
<header style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding:22px 0">
${brand}
${nav("projets", "Carnet")}
</header>
<section style="display:flex;flex-direction:column;gap:20px;max-width:760px;padding:56px 0 64px">
<p class="mono" style="margin:0;font-size:13px;color:var(--brass-text)">${t.end}</p>
<h1 class="serif" style="margin:0;font-size:clamp(56px,7vw,104px);line-height:.95">${t.carnetTitle}</h1>
<p style="margin:0;font-size:19px;line-height:1.6;color:var(--muted)">${t.carnetIntro}</p>
</section>
<ol style="list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:48px 28px">
${cards}
</ol>
<footer style="display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:32px;margin-top:112px;padding-top:48px;border-top:1px solid var(--line)">
<h2 class="serif" style="margin:0;max-width:640px;font-size:clamp(40px,5vw,68px);line-height:1">${t.nextIdea}</h2>
<div style="display:flex;flex-wrap:wrap;gap:12px">
<a class="go" href="mailto:${MAIL}">${MAIL}</a>
<a class="pill" href="${GH}" target="_blank" rel="noopener" style="min-height:52px">GitHub ↗</a>
</div>
</footer>
<p class="mono" style="margin:40px 0 0;font-size:12px;line-height:1.6;color:var(--muted)">${t.credits}</p>
${colophon("16px 0 0")}
</div>
</div>`;
    write("Carnet", page(L.lang, t.titleCarnet, body, 1440, H("Carnet", L.carnetH)));
  }

  // À propos : le passeport. L'en-tête de nuit, comme le départ et le carnet ; le passeport ouvert sur le bureau.
  // Puis, sur papier crème : quelques mots, l'itinéraire (formation, expériences, projets), les langues en visas,
  // la façon de faire, le sac à outils, et ce qui se passe en dehors du code.
  function apropos() {
    const A = L.apropos;
    const chips = (list) => `<ul style="list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px">${list.map((s) => `<li class="chip">${s}</li>`).join("")}</ul>`;
    // L'itinéraire en frise : une voie pour l'école, une pour l'entreprise, une pour l'étranger. La bande de
    // laiton marque l'alternance (les deux voies en même temps), le trait pointillé marque aujourd'hui.
    // La frise est décorative pour les lecteurs d'écran : le détail des deux voies, dessous, dit tout.
    const R = A.route;
    const gantt = () => {
      const [a0, a1] = R.axis;
      const cell = 100 / (a1 - a0);
      const pct = (v) => +(((v - a0) / (a1 - a0)) * 100).toFixed(3);
      const span = (from, to) => `left:${pct(from)}%;width:${(pct(to) - pct(from)).toFixed(3)}%`;
      const lanes = R.lanes.map((ln, k) => {
        const bars = ln.bars.map((b) => b.outside
          ? `<span class="bar ${b.tone ?? ""}" style="${span(b.from, b.to)}"></span><span class="out" style="left:${pct(b.to)}%">${b.title}</span>`
          : `<span class="bar ${b.tone ?? ""}" style="${span(b.from, b.to)}"><b>${b.title}</b>${b.sub ? `<small>${b.sub}</small>` : ""}</span>`).join("");
        return `<span class="lane" style="grid-column:1;grid-row:${3 + k}">${ln.label}</span><div class="track" style="grid-column:2;grid-row:${3 + k};background-size:${cell}% 100%">${bars}</div>`;
      }).join("\n");
      return `<div class="gantt" aria-hidden="true">
<div class="axis" style="grid-column:2;grid-row:1">${Array.from({ length: a1 - a0 }, (_, k) => `<span style="left:${k * cell}%;width:${cell}%">${a0 + k}</span>`).join("")}</div>
<div class="brace" style="grid-column:2;grid-row:2"><i style="${span(R.band.from, R.band.to)}"></i><span style="left:${((pct(R.band.from) + pct(R.band.to)) / 2).toFixed(3)}%">${R.band.label}</span></div>
<div class="tint" style="grid-column:2;grid-row:3 / 5"><i style="${span(R.band.from, R.band.to)}"></i></div>
${lanes}
<div class="today" style="grid-column:2;grid-row:1 / 6"><i style="left:${pct(R.now.at)}%"></i><span style="left:${pct(R.now.at)}%">${R.now.label}</span></div>
${R.callout ? `<p class="callout" style="grid-column:2;grid-row:6;padding-right:${(100 - pct(R.now.at)).toFixed(2)}%">${R.callout}</p>` : ""}
</div>`;
    };
    const leg = (G) => `<div><h3 class="serif" style="margin:0;font-size:30px;font-weight:400;line-height:1.1">${G.title}</h3><p class="mono" style="margin:6px 0 0;font-size:12px;color:var(--muted)">${G.sub}</p><ol>${G.items.map(([when, title, where, text]) => `<li><span class="mono" style="padding-top:2px;font-size:12px;color:var(--brass-text)">${when}</span><div><p style="margin:0;font-size:16px;font-weight:500;line-height:1.4">${title}</p>${where ? `<p class="mono" style="margin:4px 0 0;font-size:12px;color:var(--muted)">${where}</p>` : ""}<p style="margin:6px 0 0;font-size:15px;line-height:1.6;color:var(--muted)">${text}</p></div></li>`).join("")}</ol></div>`;
    const body = `<div class="v" style="${vars(DAY)};min-height:100vh;background:#F6F1E9;color:var(--ink);font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased">
<section style="${vars(NIGHT)};background:#0E1018;color:var(--ink)">
<div style="max-width:1200px;margin:0 auto;padding:0 clamp(20px,4vw,48px)">
<header style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding:22px 0">
${brand}
${nav("apropos", "Apropos")}
</header>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:32px 48px;padding:24px 0 72px">
<div style="flex:1 1 400px;display:flex;flex-direction:column;gap:16px">
<p class="mono" style="margin:0;font-size:13px;color:var(--brass-text)">${A.label}</p>
<h1 class="serif" style="margin:0;font-size:clamp(56px,6.6vw,96px);line-height:.95">Cantin Roquier</h1>
<p class="mono" style="margin:0;font-size:13px;line-height:1.6;color:var(--muted)">${A.role}<br>${A.where}</p>
<p style="margin:0;max-width:540px;font-size:19px;line-height:1.6">${A.lead}</p>
<p style="margin:0;display:inline-flex;align-items:center;gap:10px;font-size:15px"><span aria-hidden="true" style="flex:none;width:9px;height:9px;border-radius:999px;background:var(--brass);box-shadow:0 0 0 4px rgba(217,180,117,.2)"></span>${A.status}</p>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;padding-top:6px">
<a class="go" href="mailto:${MAIL}">${A.write}</a>
<a class="pill" href="/_blob/${A.cv.id}" download="${A.cv.file}" target="_blank" rel="noopener">${A.cv.label}</a>
<a class="link" href="${A.linkedin}" target="_blank" rel="noopener">LinkedIn ↗</a>
<a class="link" href="${GH}" target="_blank" rel="noopener">GitHub ↗</a>
</div>
</div>
<figure style="flex:1.6 1 560px;margin:0"><img src="/_blob/${IDS.passeport}" alt="${A.alt}" style="display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:20px"></figure>
</div>
</div>
</section>
<main style="max-width:1200px;margin:0 auto;padding:0 clamp(20px,4vw,48px)">
<section style="padding:88px 0 56px;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:16px 56px">
<h2 class="label" style="flex:1 1 200px">${A.labels.words}</h2>
<div style="flex:3 1 560px;display:flex;flex-direction:column;gap:22px">
<p class="serif" style="margin:0;font-size:clamp(26px,2.6vw,36px);line-height:1.3">${A.words}</p>
<p style="margin:0;font-size:17px;line-height:1.7;color:var(--muted)">${A.more}</p>
${A.seeking ? `<p style="margin:0;font-size:17px;line-height:1.7">${A.seeking}</p>` : ""}
</div>
</section>
<section style="padding:56px 0;border-bottom:1px solid var(--line)">
<h2 class="label">${A.labels.route}</h2>
<p style="margin:16px 0 0;max-width:780px;font-size:17px;line-height:1.7">${R.intro}</p>
<div class="d-only" style="margin-top:36px;overflow-x:auto">
${gantt()}
</div>
<div class="legs">${leg(R.school)}${leg(R.work)}</div>
<p style="margin:40px 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:0 16px;font-size:16px;line-height:1.6;color:var(--muted)">${R.projects[0]} <a class="link" href="${F(R.projects[2])}">${R.projects[1]}</a></p>
</section>
<section style="padding:56px 0;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;align-items:center;gap:28px 56px">
<h2 class="label" style="flex:1 1 200px">${A.labels.langs}</h2>
<ul style="flex:3 1 560px;list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:28px 40px">
${A.langs.map((l) => `<li style="display:flex;flex-direction:column;align-items:center;gap:8px"><div class="visa" style="color:${l.ink};transform:rotate(${l.rot}deg)"><span class="serif" style="font-size:34px;line-height:1">${l.name}</span><span class="mono" style="max-width:130px;font-size:11px;line-height:1.4;letter-spacing:.04em;text-transform:uppercase">${l.level}</span></div>${l.link ? `<a class="link" href="${F(l.link[1])}">${l.link[0]}</a>` : ""}</li>`).join("\n")}
</ul>
</section>
<section style="padding:56px 0;border-bottom:1px solid var(--line)">
<h2 class="label">${A.labels.ways}</h2>
<ol style="list-style:none;margin:28px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:20px">
${A.ways.map(([w, d], k) => `<li style="background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:10px"><span class="mono" style="font-size:12px;color:var(--brass-text)">0${k + 1}</span><h3 class="serif" style="margin:0;font-size:28px;font-weight:400;line-height:1.1">${w}</h3><p style="margin:0;font-size:15px;line-height:1.6;color:var(--muted)">${d}</p></li>`).join("\n")}
</ol>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin-top:28px"><span class="mono" style="font-size:12px;color:var(--muted)">${A.labels.team}</span>${chips(A.team)}</div>
</section>
<section style="padding:56px 0;border-bottom:1px solid var(--line)">
<h2 class="label">${A.labels.bag}</h2>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:28px 56px;margin-top:28px">
${A.bag.map(([g, items]) => `<div style="display:flex;flex-direction:column;gap:12px"><h3 class="serif" style="margin:0;font-size:26px;font-weight:400;line-height:1.1">${g}</h3>${chips(items)}</div>`).join("\n")}
</div>
</section>
<section style="padding:56px 0;border-bottom:1px solid var(--line)">
<h2 class="label">${A.labels.away}</h2>
<ul style="list-style:none;margin:28px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:28px">
${A.away.map((o) => `<li style="display:flex;flex-direction:column;gap:10px"><span style="display:block;aspect-ratio:4/3;border-radius:16px;overflow:hidden;background:#EFE7DA;border:1px solid var(--line)"><img src="/_blob/${o.img}" alt="${o.alt}" style="display:block;width:100%;height:100%;object-fit:cover"></span><h3 class="serif" style="margin:4px 0 0;font-size:30px;font-weight:400;line-height:1.05">${o.title}</h3>${o.text ? `<p style="margin:0;font-size:15px;line-height:1.6">${o.text}</p>` : ""}<p class="todo">${o.todo}</p></li>`).join("\n")}
</ul>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin-top:28px"><span class="mono" style="font-size:12px;color:var(--muted)">${A.labels.also}</span>${chips(A.also)}</div>
</section>
<footer style="display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:32px;padding:88px 0 64px">
<h2 class="serif" style="margin:0;max-width:640px;font-size:clamp(40px,5vw,68px);line-height:1">${t.nextIdea}</h2>
<div style="display:flex;flex-wrap:wrap;gap:12px">
<a class="go" href="mailto:${MAIL}">${MAIL}</a>
<a class="pill" href="${A.linkedin}" target="_blank" rel="noopener" style="min-height:52px">LinkedIn ↗</a>
<a class="pill" href="${GH}" target="_blank" rel="noopener" style="min-height:52px">GitHub ↗</a>
</div>
</footer>
${colophon()}
</main>
</div>`;
    write("Apropos", page(L.lang, t.titleApropos, body, 1440, H("Apropos", A.h), READ_STYLE));
  }

  // Les fiches projet : une par escale, dans la langue du voyage. L'en-tête prend la couleur et la scène de
  // l'escale ; le reste est sur papier crème. Un billet résume l'essentiel, sa souche porte le numéro.
  function fiches() {
    const FICHES = L.fiches;
    const billet = (e, f, code) => {
      const [type, year, status = t.statusDownload] = e.kind.split(" · ");
      const fields = [[t.fields.stop, `${e.n} · ${e.place}`, true], [t.fields.type, type], [t.fields.year, year], [t.fields.status, status], ...(f.host ? [[t.fields.host, f.host, true]] : [])];
      return `<aside class="billet" aria-label="${t.ticketAria}" style="flex:2 1 360px;align-self:flex-start">
<div style="flex:1;min-width:0;padding:26px 26px 22px;display:flex;flex-direction:column;gap:20px">
<h2 class="label">${t.ticket}</h2>
<dl>${fields.map(([k, v, wide]) => `<div${wide ? ' style="grid-column:1/-1"' : ""}><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
<div><p class="mono" style="margin:0 0 10px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">${t.fields.stack}</p><ul style="list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px">${f.stack.map((s) => `<li class="chip">${s}</li>`).join("")}</ul></div>
${code ? `<a class="link" href="${code}" target="_blank" rel="noopener" style="align-self:flex-start">${t.readCode}</a>` : ""}
</div>
<div class="souche" aria-hidden="true"><span class="serif" style="font-size:44px;line-height:1;color:var(--brass-text)">${e.num}</span><span class="mono" style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)">${e.name}</span></div>
</aside>`;
    };
    // Les escales en points, comme dans le voyage : chacun ouvre la fiche de son projet.
    // Sur téléphone, les points s'effacent : le lien « Revenir à l'escale » et la carte du bas suffisent.
    const itineraire = (i) => `<nav aria-label="${t.itinAria}" class="d-only" style="display:flex;align-items:center;gap:12px"><span class="mono" style="font-size:12px;color:var(--muted)">${fill(t.stopOf, { i: i + 1 })}</span><ol class="dots">${E.map((o, k) => `<li><a class="dot${k < i ? " done" : k === i ? " now" : ""}" href="${o.fiche}" aria-label="${o.name}"${k === i ? ' aria-current="page"' : ""}><span></span></a></li>`).join("")}</ol></nav>`;
    E.forEach((e, i) => {
      const f = FICHES[e.name];
      const demo = demoOf(e);
      const code = codeOf(e);
      const next = E[i + 1];
      const nextCard = next
        ? `<a class="post" href="${next.file}" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));align-items:center;gap:24px 40px">
<span class="thumb" style="background:${next.bg}"><img src="/_blob/${next.img}" alt=""></span>
<span style="display:flex;flex-direction:column;gap:10px"><span class="mono" style="font-size:12px;color:var(--brass-text)">${fill(t.next, { place: next.place })}</span><span class="serif" style="font-size:48px;line-height:1">${next.name}</span><span style="font-size:16px;line-height:1.55;color:var(--muted)">${next.pitch}</span><span class="link">${t.go}</span></span>
</a>`
        : `<a class="post" href="${F("Carnet")}" style="display:flex;flex-direction:column;gap:10px"><span class="mono" style="font-size:12px;color:var(--brass-text)">${t.end}</span><span class="serif" style="font-size:48px;line-height:1">${t.journal}</span><span class="link">${t.seeTen}</span></a>`;
      const extra = f.shelf
        ? `<section style="padding:48px 0;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:16px 56px">
<h2 class="label" style="flex:1 1 200px">${t.shelf}</h2>
<div style="flex:3 1 560px;display:flex;flex-direction:column;gap:12px"><p class="serif" style="margin:0;font-size:32px;line-height:1.1">${f.shelf.name}</p><p style="margin:0;font-size:16px;line-height:1.6;color:var(--muted)">${f.shelf.text}</p><ul style="list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px">${f.shelf.stack.map((s) => `<li class="chip">${s}</li>`).join("")}</ul></div>
</section>`
        : "";
      const shots = f.capture
        ? `<section style="padding:56px 0;border-bottom:1px solid var(--line)">
<h2 class="label">${t.pictures}</h2>
<figure style="margin:28px 0 0;display:flex;flex-direction:column;align-items:center;gap:14px"><img src="/_blob/${f.capture.id}" alt="${f.capture.alt}" style="display:block;width:min(100%,${f.capture.w}px);height:auto;border-radius:20px;border:1px solid var(--line);box-shadow:0 18px 48px rgba(36,30,24,.12)"><figcaption class="mono" style="font-size:12px;color:var(--muted)">${f.capture.caption}</figcaption></figure>
</section>`
        : "";
      const body = `<div class="v" style="${vars(DAY)};min-height:100vh;background:#F6F1E9;color:var(--ink);font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased">
<section style="${vars(e.pal)};background:${e.bg};color:var(--ink)">
<div style="max-width:1200px;margin:0 auto;padding:0 clamp(20px,4vw,48px)">
<header style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding:22px 0">
${brand}
${itineraire(i)}
${nav("projets", e.ficheBase, false)}
</header>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:32px 48px;padding:16px 0 72px">
<div style="flex:1 1 400px;display:flex;flex-direction:column;gap:16px">
<a class="link" href="${e.file}" style="align-self:flex-start;min-height:32px;margin-bottom:-4px">${t.back}</a>
<p class="mono" style="margin:0;font-size:13px;color:var(--brass-text)">${t.stop} ${e.n} · ${e.place}</p>
<h1 class="serif" style="margin:0;font-size:clamp(56px,6.6vw,96px);line-height:.95">${e.name}</h1>
<p class="mono" style="margin:0;font-size:13px;color:var(--muted)">${e.num} · ${e.kind}</p>
<p style="margin:0;max-width:540px;font-size:20px;line-height:1.55">${e.pitch}</p>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px 22px;padding-top:6px">
${demo ? `<a class="go" href="${demo}"${demo === PENDING ? "" : ` target="_blank" rel="noopener"`}>${demoLabel(e)}</a>` : `<span class="mono" style="font-size:12px;color:var(--muted)">${e.noDemoText ?? t.noDemo}</span>`}
${code ? `<a class="link" href="${code}" target="_blank" rel="noopener">${t.code}</a>` : ""}
</div>
</div>
<figure style="flex:1.6 1 560px;margin:0"><img src="/_blob/${e.img}" alt="${e.alt}" style="display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:20px"></figure>
</div>
</div>
</section>
<main style="max-width:1200px;margin:0 auto;padding:0 clamp(20px,4vw,48px)">
<section style="padding:88px 0 56px;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:16px 56px">
<h2 class="label" style="flex:1 1 200px">${t.why}</h2>
<p class="serif" style="flex:3 1 560px;margin:0;font-size:clamp(26px,2.6vw,36px);line-height:1.3">${f.why}</p>
</section>
<section style="padding:56px 0;border-bottom:1px solid var(--line)">
<h2 class="label">${t.what}</h2>
<ol style="list-style:none;margin:28px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:20px">
${f.features.map(([w, d], k) => `<li style="background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:10px"><span class="mono" style="font-size:12px;color:var(--brass-text)">0${k + 1}</span><h3 class="serif" style="margin:0;font-size:28px;font-weight:400;line-height:1.1">${w}</h3><p style="margin:0;font-size:15px;line-height:1.6;color:var(--muted)">${d}</p></li>`).join("\n")}
</ol>
</section>
<section style="padding:56px 0;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:40px 56px">
<div style="flex:3 1 520px">
<h2 class="label">${t.how}</h2>
<dl style="margin:28px 0 0;display:flex;flex-direction:column;gap:22px">
${f.choices.map(([c, w]) => `<div><dt style="font-size:18px;font-weight:500">${c}</dt><dd style="margin:6px 0 0;font-size:15px;line-height:1.6;color:var(--muted)">${w}</dd></div>`).join("\n")}
</dl>
</div>
${billet(e, f, code)}
</section>
${shots}
${extra}
<section style="padding:56px 0 40px">
${nextCard}
</section>
<footer style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding:32px 0 56px;border-top:1px solid var(--line)">
<p style="margin:0;font-size:15px;color:var(--muted)">${fill(t.question, { name: e.name })} <a href="mailto:${MAIL}" style="color:var(--brass-text)">${MAIL}</a></p>
<a class="pill" href="${GH}" target="_blank" rel="noopener">GitHub ↗</a>
</footer>
${colophon()}
</main>
</div>`;
      write(e.ficheBase, page(L.lang, fill(t.titleFiche, { name: e.name }), body, 1440, H(e.ficheBase, f.h), READ_STYLE));
    });
  }

  // Les annexes. La 404 : une escale hors itinéraire, de nuit, la valise oubliée près du tapis à bagages.
  // Les mentions légales : qui publie, qui héberge, les données, les crédits. Les aperçus de partage : l'image
  // qui accompagne un lien collé sur LinkedIn, Slack ou WhatsApp (1200 × 630), celle du site et celle d'une fiche.
  function annexes() {
    const N = X.nf;
    // La 404 est UNE page, qui change de disposition sous 700 px : sur ordinateur, comme une escale (la scène en
    // grand, l'anneau sur la valise, le cartel en bas à gauche) ; sur téléphone, comme une escale du voyage mobile
    // (la scène recadrée, le cartel dessous, le bouton au pouce). Le canvas la montre aux deux tailles.
    const NF_STYLE = `<style>
.nf{position:relative;height:100vh;min-height:640px;overflow:hidden}
.nf-scene{position:absolute;left:0;right:0;top:45px;aspect-ratio:16/9}
.nf-scene img{position:absolute;inset:0;width:100%;height:100%;display:block}
.nf .spot{--halo:rgba(246,240,230,.55)}
.nf-head{position:absolute;left:40px;right:40px;top:22px;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:16px}
.nf-cap{position:absolute;left:0;right:0;top:62px;justify-content:center;margin:0;font-size:11px;color:var(--muted)}
.nf-card{position:absolute;left:40px;bottom:40px;width:460px;box-sizing:border-box;padding:22px 24px 14px;border-radius:16px;background:var(--card);border:1px solid var(--line);display:flex;flex-direction:column;gap:10px}
.nf-lab{margin:0;font-size:12px;color:var(--brass-text)}
.nf-card h1{margin:0;font-size:48px;line-height:1}
.nf-text{margin:0;font-size:15px;line-height:1.55}
.nf-go{position:absolute;left:16px;right:16px;bottom:22px}
.nf-go .go{flex:1;justify-content:center;min-height:52px;padding:0 18px;font-size:15px}
@media (max-width: 700px){
.nf-scene{top:104px;height:380px;aspect-ratio:auto}
.nf-head{left:16px;right:16px;top:8px}
.nf-card{left:16px;right:16px;top:496px;bottom:auto;width:auto;padding:16px 18px 10px;gap:8px}
.nf-lab{font-size:11px}
.nf-card h1{font-size:38px}
.nf-text{font-size:14px;line-height:1.5}
}
</style>`;
    const nfPage = (mobile) => {
      const base = `Introuvable${mobile ? "-mobile" : ""}`;
      const dep = F(mobile ? "Depart-mobile" : "Depart");
      const m = MOBILE_RENDERS.bagage;
      // Le menu ☰ du téléphone : le voyage et le hub mènent à leur version mobile.
      const mMenu = menu("", true, mobile ? MTABS : TABS);
      return `<div class="v nf" style="${vars(NIGHT)};background:${NF_BG};color:var(--ink);font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased">
<div class="nf-scene d-only"><img src="/_blob/${IDS.bagage}" alt="${N.alt}"><a class="spot" href="${dep}" style="left:${NF_SPOT[0]}%;top:${NF_SPOT[1]}%"><span class="ring" aria-hidden="true"></span><span class="lab">${N.spot} →</span></a></div>
<div class="nf-scene m-only"><img src="/_blob/${m.id}" alt="${N.alt}"><a class="spot" href="${dep}" aria-label="${N.spot}" style="left:${m.spot[0]}%;top:${m.spot[1]}%"><span class="ring" aria-hidden="true"></span></a></div>
<header class="nf-head">
<a class="brand" href="${dep}"><span class="serif" style="font-style:italic;font-size:32px">Index</span><span class="mono d-only" style="font-size:12px;color:var(--muted)">Cantin Roquier</span></a>
<div class="d-only" style="display:flex;flex-wrap:wrap;align-items:center;gap:10px">${tabs("")}${langs(base)}</div><div class="m-only m-bar">${langs(base)}${mMenu}</div>
</header>
<p class="mono m-only nf-cap">${N.caption}</p>
<article class="nf-card">
<p class="mono nf-lab">${N.label}</p>
<h1 class="serif">${N.title}</h1>
<p class="nf-text">${N.text}</p>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0 22px"><a class="link" href="${F("Carnet")}">${t.seeTen}</a><a class="link d-only" href="${F("Apropos")}">${t.tabs.apropos} →</a></div>
</article>
<nav class="m-only nf-go" aria-label="${N.spot}"><a class="go" href="${dep}">${N.spot} →</a></nav>
</div>`;
    };
    write("Introuvable", page(L.lang, N.pageTitle, nfPage(false), 1440, 900, NF_STYLE));
    write("Introuvable-mobile", page(L.lang, `${N.pageTitle} · mobile`, nfPage(true), 390, 844, NF_STYLE));

    // Les mentions légales : l'en-tête de nuit, puis, sur papier crème, une rangée par rubrique.
    const G = X.legal;
    const LEGAL_STYLE = `<style>
.legal p{margin:0;font-size:17px;line-height:1.7}
.legal a{color:var(--brass-text);text-underline-offset:3px}
.legal strong{font-weight:500}
.legal dl{margin:0;display:flex;flex-direction:column}
.legal dl div{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:4px 28px;padding:12px 0;border-bottom:1px solid var(--line)}
.legal dt{font-size:16px;line-height:1.5}
.legal dd{margin:0;font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;line-height:1.6;color:var(--muted)}
@media (max-width: 700px){.legal dl div{grid-template-columns:minmax(0,1fr)}}
</style>`;
    const row = (label, html) => `<section style="padding:48px 0;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:16px 56px">
<h2 class="label" style="flex:1 1 200px">${label}</h2>
<div class="legal" style="flex:3 1 560px;display:flex;flex-direction:column;gap:14px">${html}</div>
</section>`;
    const legal = `<div class="v" style="${vars(DAY)};min-height:100vh;background:#F6F1E9;color:var(--ink);font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased">
<section style="${vars(NIGHT)};background:#0E1018;color:var(--ink)">
<div style="max-width:1200px;margin:0 auto;padding:0 clamp(20px,4vw,48px)">
<header style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding:22px 0">
${brand}
${nav("", "Mentions")}
</header>
<div style="display:flex;flex-direction:column;gap:16px;max-width:760px;padding:48px 0 72px">
<p class="mono" style="margin:0;font-size:13px;color:var(--brass-text)">${G.label}</p>
<h1 class="serif" style="margin:0;font-size:clamp(56px,6.6vw,96px);line-height:.95">${G.title}</h1>
<p style="margin:0;font-size:19px;line-height:1.6;color:var(--muted)">${G.intro}</p>
</div>
</div>
</section>
<main style="max-width:1200px;margin:0 auto;padding:40px clamp(20px,4vw,48px) 0">
${G.sections.map(([label, ps]) => row(label, ps.map((p) => `<p>${p}</p>`).join(""))).join("\n")}
${row(G.creditsLabel, `<dl>${G.credits.map(([w, l]) => `<div><dt>${w}</dt><dd>${l}</dd></div>`).join("")}</dl><p style="font-size:15px;color:var(--muted)">${G.repainted}</p>`)}
<footer style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding:40px 0 64px">
<p class="mono" style="margin:0;font-size:12px;color:var(--muted)">${G.updated}</p>
<a class="pill" href="${F("Depart")}">${t.start} →</a>
</footer>
</main>
</div>`;
    write("Mentions", page(L.lang, G.pageTitle, legal, 1440, H("Mentions", 2600), `${READ_STYLE}\n${LEGAL_STYLE}`));

    // L'aperçu du site : le passeport ouvert à droite, le nom à gauche, gros pour rester lisible en vignette.
    const A = L.apropos;
    const ogSite = `<div class="v" style="${vars(NIGHT)};position:relative;width:1200px;height:630px;overflow:hidden;background:#0E1018;color:var(--ink);font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased">
<img src="/_blob/${IDS.apercu}" alt="" style="position:absolute;right:0;top:0;width:700px;height:630px;display:block">
<div aria-hidden="true" style="position:absolute;inset:0;background:linear-gradient(90deg,#0E1018 0%,#0E1018 42%,rgba(14,16,24,.72) 50%,rgba(14,16,24,0) 64%)"></div>
<div style="position:absolute;left:64px;top:52px;bottom:54px;width:600px;display:flex;flex-direction:column;justify-content:space-between">
<span class="serif" style="font-style:italic;font-size:46px;line-height:1">Index</span>
<div style="display:flex;flex-direction:column;gap:20px">
<h1 class="serif" style="margin:0;font-size:116px;line-height:.9;letter-spacing:-0.01em">Cantin<br>Roquier</h1>
<p style="margin:0;max-width:430px;font-size:28px;line-height:1.3;color:var(--muted);text-wrap:balance">${A.role}</p>
</div>
<p class="mono" style="margin:0;font-size:19px;color:var(--brass-text)">${X.og.line}</p>
</div>
</div>`;
    write("Apercu", page(L.lang, X.og.pageTitle, ogSite, 1200, 630));
    // L'aperçu d'une fiche : son escale en grand, et son cartel, comme dans le voyage. Ici Magellan ;
    // chaque fiche a le sien, fait sur le même modèle.
    const e = E.find((o) => o.name === "Magellan");
    const ogFiche = `<div class="v" style="${vars(e.pal)};position:relative;width:1200px;height:630px;overflow:hidden;background:${e.bg};color:var(--ink);font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased">
<img src="/_blob/${e.img}" alt="" style="position:absolute;left:0;top:-23px;width:1200px;height:675px;display:block">
<div style="position:absolute;left:40px;top:28px;display:flex;align-items:baseline;gap:12px"><span class="serif" style="font-style:italic;font-size:38px">Index</span><span class="mono" style="font-size:15px;color:var(--muted)">Cantin Roquier</span></div>
<article style="position:absolute;left:40px;bottom:40px;width:540px;box-sizing:border-box;padding:26px 28px 26px;border-radius:18px;background:var(--card);border:1px solid var(--line);display:flex;flex-direction:column;gap:12px">
<p class="mono" style="margin:0;font-size:15px;color:var(--brass-text)">${t.stop} ${e.n} · ${e.place}</p>
<h1 class="serif" style="margin:0;font-size:76px;line-height:1">${e.name}</h1>
<p style="margin:0;font-size:22px;line-height:1.45">${e.pitch}</p>
</article>
</div>`;
    write("Apercu-fiche", page(L.lang, X.og.ficheTitle, ogFiche, 1200, 630));
  }

  // Le hub. « Les apps » : un tableau des départs, une ligne par app, avec son statut vérifié en direct
  // (packages/projects : sondes http, Supabase, fraîcheur) et le bouton pour l'ouvrir ; les archives dessous.
  // Une seule page, en tableau sur ordinateur, en liste compacte sur téléphone (le canvas la montre aux deux
  // tailles). Puis l'onglet « ← Index » que chaque app affiche pour revenir au hub (packages/ui, index-bar.js).
  function hub() {
    const byName = (n) => E.find((e) => e.name === n);
    const LIVE = ["Magellan", "Cancionero", "Mithril", "Tonalli", "gym-picker", "Hublot", "INDEX"];
    // [numéro, nom, fiche où le projet est raconté] : l'API REST .NET vit sur l'étagère de Mithril.
    const ARCH = [["001", "Métro Pathfinder", "Métro Pathfinder"], ["002", "API REST .NET", "Mithril"], ["003", "Visit Match", "Visit Match"], ["004", "Galaxy Escape", "Galaxy Escape"]];
    const shown = (n) => (n === "API REST .NET" && L.lang === "en" ? ".NET REST API" : n);
    const flap = (num) => `<span class="flap" aria-hidden="true">${[...num].map((c) => `<i>${c}</i>`).join("")}</span><span class="sr">${num}</span>`;
    const st = (k) => `<span class="st ${k}">${HB.status[k]}</span>`;
    const ext = (href) => (href === PENDING ? "" : ` target="_blank" rel="noopener"`);
    const cols = `<colgroup><col style="width:104px"><col style="width:210px"><col><col style="width:130px"><col style="width:170px"><col style="width:170px"></colgroup>`;
    const liveRow = (name) => {
      const e = byName(name);
      const kind = name === "Mithril" ? "dl" : name === "INDEX" ? "here" : "on";
      const demo = DEMO[name];
      const act = kind === "dl" ? `<a class="go" href="${demo}"${ext(demo)}>${HB.download}</a>`
        : kind === "here" ? `<a class="pill" href="${GH}/index" target="_blank" rel="noopener">${HB.code}</a>`
        : `<a class="go" href="${demo}"${ext(demo)}>${HB.open}</a>`;
      return `<tr><td class="num">${flap(e.num)}</td><td class="app"><a href="${e.fiche}">${name}</a></td><td class="dest">${HB.dest[name]}</td><td class="gate">${HUB.gate[name]}</td><td class="stat">${st(kind)}</td><td class="act">${act}</td></tr>`;
    };
    const archRow = ([num, name, of]) =>
      `<tr><td class="num">${flap(num)}</td><td class="app"><a href="${byName(of).fiche}">${shown(name)}</a></td><td class="dest">${HB.dest[name]}</td><td class="gate">—</td><td class="stat">${st("arch")}</td><td class="act"><a class="link" href="${byName(of).fiche}">${HB.fiche}</a></td></tr>`;
    const HUB_STYLE = `<style>
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.hub-intro{display:flex;flex-direction:column;gap:16px;max-width:780px;padding:40px 0 40px}
.hub-lab{margin:0;font-size:13px;color:var(--brass-text)}
.hub-intro h1{margin:0;font-size:clamp(56px,7vw,104px);line-height:.95}
.hub-text{margin:0;font-size:19px;line-height:1.6;color:var(--muted)}
.board{border-radius:22px;background:#15171F;border:1px solid #262A36;padding:6px 28px 14px;box-shadow:0 30px 80px rgba(0,0,0,.35)}
.board-top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 0 12px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.board-top b{font-weight:500;color:var(--brass-text)}
.dep{width:100%;border-collapse:collapse;table-layout:fixed}
.dep th{padding:12px 12px 10px;text-align:left;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:400;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);border-top:1px solid var(--line)}
.dep td{padding:13px 12px;border-top:1px solid var(--line);vertical-align:middle}
.flap{display:inline-flex;gap:3px}
.flap i{position:relative;display:inline-flex;align-items:center;justify-content:center;width:24px;height:32px;border-radius:5px;background:#0B0C12;box-shadow:inset 0 0 0 1px #232634;font-style:normal;font-family:'Geist Mono',ui-monospace,monospace;font-size:17px;color:var(--ink)}
.flap i::after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:rgba(0,0,0,.6)}
.dep .app a{font-family:'Instrument Serif',Georgia,serif;font-size:30px;line-height:1;text-decoration:none}
.dep .app a:hover{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:5px}
.dep .dest{font-size:15px;line-height:1.45;color:var(--muted)}
.dep .gate{font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.dep .act{text-align:right}
.dep .act .go,.dep .act .pill{min-height:42px;padding:0 20px;font-size:14px}
.st{display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.st::before,.dot{content:"";flex:none;width:8px;height:8px;border-radius:999px;background:currentColor}
.on{color:#9CC59A}
.st.on::before{box-shadow:0 0 0 4px rgba(156,197,154,.16);animation:live 2.4s ease-in-out infinite}
@keyframes live{50%{box-shadow:0 0 0 7px rgba(156,197,154,0)}}
.wake{color:#E3B064}
.off{color:#D98C7A}
.dl,.here{color:var(--brass-text)}
.arch{color:var(--muted)}
.st.arch::before{background:transparent;border:1.5px solid currentColor;box-sizing:border-box}
.arch-title{margin:22px 0 0;padding:0 12px 4px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.dep.old .app a{font-size:24px;color:var(--muted)}
.arch-link{padding:14px 0 6px;border-top:1px solid var(--line);font-size:13px;line-height:1.45;color:var(--muted);text-decoration:none}
.legend{display:flex;flex-wrap:wrap;gap:8px 28px;margin:20px 6px 0;padding:0;list-style:none;font-size:14px;color:var(--muted)}
.legend li{display:inline-flex;align-items:center;gap:10px}
@media (max-width: 700px){
.hub-intro{gap:8px;padding:2px 0 14px}
.hub-intro h1{font-size:42px}
.hub-text{font-size:14px;line-height:1.5}
.board{padding:0 14px 4px;border-radius:18px}
.board-top{padding:12px 0 8px;font-size:10px;letter-spacing:.1em}
.dep{table-layout:auto}
.dep colgroup,.dep thead{display:none}
.dep,.dep tbody{display:block}
.dep tr{display:grid;grid-template-columns:auto auto minmax(0,1fr) auto;grid-template-areas:"num app app act" "num stat dest dest";align-items:center;column-gap:10px;row-gap:3px;padding:8px 0;border-top:1px solid var(--line)}
.dep td{display:block;padding:0;border:0}
.dep .num{grid-area:num}
.dep .app{grid-area:app}
.dep .app a{font-size:24px}
.dep .stat{grid-area:stat}
.dep .dest{grid-area:dest;font-size:12px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dep .gate{display:none}
.dep .act{grid-area:act}
.dep .act .go,.dep .act .pill{min-height:36px;padding:0 14px;font-size:13px}
.flap{gap:2px}
.flap i{width:16px;height:24px;font-size:13px;border-radius:4px}
.st{font-size:10px;gap:6px;letter-spacing:.04em}
.st::before{width:7px;height:7px}
.legend{display:none}
}
@media (prefers-reduced-motion: reduce){.st.on::before{animation:none}}
</style>`;
    const hubPage = (mobile) => {
      const base = `Apps${mobile ? "-mobile" : ""}`;
      const head = mobile ? brand.replace(`href="${F("Depart")}"`, `href="${F("Depart-mobile")}"`) : brand;
      return `<div class="v" style="${vars(NIGHT)};min-height:100vh;background:#0E1018;color:var(--ink);font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased">
<div style="max-width:1280px;margin:0 auto;padding:0 clamp(16px,4vw,64px)">
<header style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding:${mobile ? "8px 0 0" : "22px 0"}">
${head}
${nav("apps", base, true, mobile ? MTABS : TABS)}
</header>
<section class="hub-intro">
<p class="mono hub-lab">${HB.label}</p>
<h1 class="serif">${HB.title}</h1>
<p class="hub-text d-only">${HB.intro}</p><p class="hub-text m-only">${HB.introShort}</p>
</section>
<section class="board" aria-label="${HB.board}">
<div class="board-top"><b>${HB.board}</b><span>${HB.checked}</span></div>
<table class="dep">${cols}<thead><tr><th scope="col">${HB.cols.num}</th><th scope="col">${HB.cols.app}</th><th scope="col">${HB.cols.dest}</th><th scope="col">${HB.cols.gate}</th><th scope="col">${HB.cols.status}</th><th scope="col"><span class="sr">${HB.open}</span></th></tr></thead>
<tbody>${LIVE.map(liveRow).join("\n")}</tbody></table>
<div class="d-only" style="display:block"><p class="arch-title">${HB.archives}</p>
<table class="dep old">${cols}<tbody>${ARCH.map(archRow).join("\n")}</tbody></table></div>
<a class="m-only arch-link" href="${F("Carnet")}">${HB.archivesShort}</a>
</section>
<ul class="legend">${HB.legend.map(([k, s]) => `<li><span class="dot ${k}" aria-hidden="true"></span>${s}</li>`).join("")}</ul>
${mobile ? "" : colophon("36px 0 40px")}
</div>
</div>`;
    };
    write("Apps", page(L.lang, HB.pageTitle, hubPage(false), 1440, H("Apps", 1500), HUB_STYLE));
    write("Apps-mobile", page(L.lang, `${HB.pageTitle} · mobile`, hubPage(true), 390, 844, HUB_STYLE));

    // L'onglet « ← Index » dans le style du voyage : une pastille de nuit, « ← Index » en italique, le numéro
    // de l'entrée en laiton. Montré à taille réelle dans le coin bas-gauche de trois apps (leurs vraies captures),
    // puis ses états, sur fond sombre et sur fond clair.
    const S = HB.tabSpec;
    const TAB_STYLE = `<style>
.ib{display:inline-flex;align-items:center;gap:9px;height:34px;padding:0 13px 0 11px;border-radius:999px;background:rgba(14,16,24,.9);color:#F1E8DA;box-shadow:0 0 0 1px rgba(241,232,218,.3),0 8px 22px rgba(0,0,0,.22);font:500 13px/1 system-ui,-apple-system,'Segoe UI',sans-serif;white-space:nowrap;text-decoration:none}
.ib .b{font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:17px;font-weight:400}
.ib .s{width:1px;height:14px;background:rgba(241,232,218,.3)}
.ib .n{font-family:ui-monospace,'Cascadia Mono',Consolas,monospace;font-size:11px;letter-spacing:.08em;color:#D9B475}
.ib.hover{background:#F1E8DA;color:#0E1018;box-shadow:0 0 0 1px rgba(14,16,24,.2),0 8px 22px rgba(0,0,0,.22)}
.ib.hover .n{color:#8A6A35}
.ib.hover .s{background:rgba(14,16,24,.25)}
.ib.focus{outline:2px solid #D9B475;outline-offset:3px}
.crops{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:20px}
.crops figure{position:relative;margin:0;overflow:hidden;border:1px solid var(--line);background:#fff}
.whole{aspect-ratio:16/10;border-radius:14px 14px 0 0}
.whole img{display:block;width:100%;height:100%}
.whole .ib{position:absolute;left:2px;bottom:2px;transform:scale(.258);transform-origin:left bottom}
.corner{height:96px;border-top:0 !important;border-radius:0 0 14px 14px}
.corner img{display:block;width:100%;height:100%;object-fit:none;object-position:left bottom}
.corner .ib{position:absolute;left:8px;bottom:8px}
.cap{margin:10px 0 0;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--muted)}
.grounds{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin-top:20px}
.ground{border-radius:14px;padding:22px 24px 26px;display:flex;flex-direction:column;gap:18px}
.ground p{margin:0;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px}
.ground ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:22px 36px}
.ground li{display:flex;flex-direction:column;align-items:flex-start;gap:10px;font-size:13px}
.specs{margin:40px 0 0;display:flex;flex-direction:column;border-top:1px solid var(--line)}
.specs div{display:grid;grid-template-columns:160px minmax(0,1fr);gap:24px;padding:14px 0;border-bottom:1px solid var(--line)}
.specs dt{font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--brass-text)}
.specs dd{margin:0;font-size:16px;line-height:1.5}
</style>`;
    const pill = (num, cls = "") => `<span class="ib${cls}"><span aria-hidden="true">←</span><span class="b">Index</span><span class="s"></span><span class="n">${num}</span></span>`;
    const CROPS = [["Magellan", "39b037e75843fe281240be5b0d6e37ee"], ["Cancionero", "6600e6804d64ff7a3ca3d34521f0fa5d"], ["Tonalli", "74dd8a932852191fba2519d31865d24e"]];
    const crops = CROPS.map(([name, id]) => {
      const e = byName(name);
      return `<div><figure class="whole"><img src="/_blob/${id}" alt="">${pill(e.num)}</figure><figure class="corner"><img src="/_blob/${id}" alt="">${pill(e.num)}</figure><p class="cap">${name} · ${e.num}</p></div>`;
    }).join("\n");
    const ground = (k, bg, fg) => `<div class="ground" style="background:${bg};color:${fg}"><p style="color:${k ? "#6A5F52" : "#B3AA9C"}">${S.grounds[k]}</p><ul>${S.stateNames.map((s, i) => `<li>${pill("008", ["", " hover", " focus"][i])}<span>${s}</span></li>`).join("")}</ul></div>`;
    const tabBody = `<div class="v" style="${vars(NIGHT)};min-height:100vh;background:#0E1018;color:var(--ink);font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased">
<div style="max-width:1280px;margin:0 auto;padding:56px clamp(16px,4vw,64px) 64px">
<p class="mono" style="margin:0;font-size:13px;color:var(--brass-text)">${HB.label}</p>
<h1 class="serif" style="margin:16px 0 0;font-size:clamp(48px,6vw,88px);line-height:.95">${S.title}</h1>
<p style="margin:18px 0 0;max-width:820px;font-size:18px;line-height:1.6;color:var(--muted)">${S.intro}</p>
<h2 class="mono" style="margin:48px 0 0;font-size:13px;font-weight:400;color:var(--brass-text)">${S.inApps}</h2>
<div class="crops">${crops}</div>
<h2 class="mono" style="margin:44px 0 0;font-size:13px;font-weight:400;color:var(--brass-text)">${S.states}</h2>
<div class="grounds">${ground(0, "#121522", "#F1E8DA")}${ground(1, "#F6F1E9", "#241E18")}</div>
<dl class="specs">${S.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
</div>
</div>`;
    write("Onglet", page(L.lang, S.pageTitle, tabBody, 1440, H("Onglet", 1300), TAB_STYLE));
  }
}
