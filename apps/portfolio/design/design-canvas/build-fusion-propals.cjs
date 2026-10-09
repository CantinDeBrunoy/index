// « Les apps » fondue dans « Les projets » : trois façons de faire du carnet le seul endroit d'où tout s'ouvre.
// A « Le bouton » : la carte postale garde sa forme ; le statut se pose sur la vignette, « Ouvrir l'app ↗ » dessous.
// B « Le talon » : chaque carte devient un billet, dont le talon ambré, à points lumineux, embarque.
// C « L'écran en tête » : le tableau des départs, en petit, au-dessus du carnet d'aujourd'hui.
// L'en-tête passe à trois onglets : Le voyage, Les projets, À propos. Chaque proposition est une seule page,
// posée à deux largeurs : Fusion-<X>.dc.html (1440) et Fusion-<X>-mobile.dc.html (390).
// Usage : node build-fusion-propals.cjs <dossier racine>   (écrit <racine>/project/Fusion-*.dc.html)
// Les hauteurs viennent de <racine>/heights.json, s'il existe (mesurées par measure-fusion.mjs).
const fs = require("fs");
const path = require("path");

const ROOT = process.argv[2] ?? __dirname;
const OUT = path.join(ROOT, "project");
fs.mkdirSync(OUT, { recursive: true });
const HEIGHTS = fs.existsSync(path.join(ROOT, "heights.json")) ? JSON.parse(fs.readFileSync(path.join(ROOT, "heights.json"), "utf8")) : {};

const NB = " ";
const typo = (s) => s.replace(/ ([:;?!])/g, `${NB}$1`).replace(/« /g, `«${NB}`).replace(/ »/g, `${NB}»`);
const up = (s) => s.toLocaleUpperCase("fr-FR");
const join = (parts) => parts.map((p) => p.replaceAll(" ", NB)).join(`${NB}· `);

// Les escales dans l'ordre du voyage. Les vignettes sont les images fixes du site (public/voyage/stills/*-640),
// téléversées sur le canvas. Pour la maquette, Tonalli « se réveille » : on voit l'état.
const STOPS = [
  { n: 1, code: "GLX", place: "L'espace", bg: "#0B0C14", img: "fca5c04fc33751af8d3747d9efe7be64", name: "Galactic Escape", num: "001", meta: ["Jeu 3D", "2022"], badges: ["École"], fiche: "Fiche-galaxy-escape", app: { kind: "web", url: "https://galactic-escape.cantin-roquier.workers.dev", gate: "Cloudflare", state: "on" } },
  { n: 2, code: "MGL", place: "La Terre", bg: "#10131C", img: "762814146c9c0de8460d43bdc0504de8", name: "Magellan", num: "005", meta: ["App web et mobile", "2026"], badges: ["Refonte assistée par IA"], fiche: "Fiche-magellan", app: { kind: "web", url: "https://magellan.cantin-roquier.workers.dev", gate: "Cloudflare", state: "on" } },
  { n: 3, code: "HBL", place: "Dans l'avion", bg: "#DCE9F0", img: "72d7fe2feb1b44c6aa6049828e670a33", name: "Hublot", num: "010", meta: ["Robot et page web", "2026"], badges: ["Assisté par IA"], fiche: "Fiche-hublot", app: { kind: "web", url: "https://cantindebrunoy.github.io/Hublot/", gate: "GitHub", state: "on" } },
  { n: 4, code: "MTR", place: "Paris vu du ciel", bg: "#DCE3EA", img: "1d4344d80134ebe5edca106f740a2c10", name: "Métro Pathfinder", num: "002", meta: ["Algorithme", "2022"], badges: ["École"], fiche: "Fiche-metro-pathfinder", app: { kind: "archive", code: "https://github.com/CantinDeBrunoy/Metro" } },
  { n: 5, code: "VSM", place: "Au pied des monuments", bg: "#E0E8DA", img: "91e89fe33c438343b9013dc216a117df", name: "Visit Match", num: "004", meta: ["App mobile", "2023"], badges: ["École"], fiche: "Fiche-visit-match", app: { kind: "archive" } },
  { n: 6, code: "GYM", place: "Sur la route", bg: "#F2DFD3", img: "437d40644368aa8d532ad826cddc06c0", name: "gym-picker", num: "009", meta: ["App web", "2026"], badges: ["Assisté par IA"], fiche: "Fiche-gym-picker", app: { kind: "web", url: "https://gym-picker.cantin-roquier.workers.dev", gate: "Cloudflare", state: "on" } },
  { n: 7, code: "MTH", place: "À la maison", bg: "#F1E7DA", img: "a28c7368f3da783eb9fca0b078615529", name: "Mithril", num: "007", meta: ["Logiciel Windows", "2026"], badges: ["Assisté par IA"], shelf: "Sur l'étagère aussi : 003 API REST .NET", fiche: "Fiche-mithril", app: { kind: "desktop", url: "https://github.com/CantinDeBrunoy/Mithril/releases", gate: "GitHub" } },
  { n: 8, code: "CNC", place: "Le tourne-disque", bg: "#F3D5B5", img: "4c5314cb9dd2e182ff1bc5b542c986ed", name: "Cancionero", num: "006", meta: ["Application installable", "2026"], badges: ["Assisté par IA"], fiche: "Fiche-cancionero", app: { kind: "web", url: "https://cancionero.cantin-roquier.workers.dev", gate: "Cloudflare", state: "on" } },
  { n: 9, code: "TNL", place: "Le calendrier", bg: "#D8C2C6", img: "872cf8f3f6669e48dddba2884b4b6fa3", name: "Tonalli", num: "008", meta: ["Application web à deux", "2026"], badges: ["Assisté par IA"], fiche: "Fiche-tonalli", app: { kind: "web", url: "https://teinte-du-jour-eight.vercel.app", gate: "Vercel", state: "wake" } },
  { n: 10, code: "IDX", place: "Les dossiers", bg: "#E6D5B8", img: "bed3b78368fe1eb2a589bec1e8acfc94", name: "INDEX", num: "011", meta: ["Monorepo et portfolio", "2026"], badges: ["Assisté par IA"], fiche: "Fiche-index", app: { kind: "here", code: "https://github.com/CantinDeBrunoy/index", gate: "Cloudflare" } },
];

/** L'état d'une carte : sondé en direct pour une app web, fixe sinon. */
const stateOf = (s) => (s.app.kind === "web" ? s.app.state : s.app.kind);
// A parle simplement ; B et C gardent les mots de l'aéroport du tableau des départs.
const PLAIN = { on: "En ligne", wake: "Se réveille", off: "Hors ligne", desktop: "À télécharger", here: "Vous y êtes", archive: "Archive" };
const AIR = { on: "À l'heure", wake: "Retardé", off: "Annulé", desktop: "À télécharger", here: "Vous y êtes", archive: "Atterri" };
// Le statut d'aujourd'hui, dans la ligne du carnet (C).
const TODAY = { web: "En ligne", archive: "Archive", here: "En cours", desktop: null };

/** Le lien vers l'app, ou ce qui en tient lieu : [libellé, adresse, plein ?]. */
function actionOf(s, open) {
  const a = s.app;
  if (a.kind === "web") return [open, a.url, true];
  if (a.kind === "desktop") return ["Télécharger ↓", a.url, false];
  if (a.code) return ["Le code ↗", a.code, false];
  return null;
}

const FONTS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&amp;family=Geist:wght@300..600&amp;family=Geist+Mono:wght@400..500&amp;family=Doto:wght@500..900&amp;display=swap">`;

// Le socle du carnet (Carnet.dc.html), plus la vignette en position relative pour y poser le statut.
const BASE = `<style>
body{margin:0}
.v a{color:inherit}
.v a:focus-visible{outline:2px solid var(--brass);outline-offset:3px;border-radius:6px}
.serif{font-family:'Instrument Serif',Georgia,serif;font-weight:400}
.mono{font-family:'Geist Mono',ui-monospace,monospace}
.wrap{max-width:1280px;margin:0 auto;padding:0 clamp(20px,4vw,64px) 72px}
.site{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;padding:22px 0}
.brand{display:inline-flex;align-items:baseline;gap:12px;min-height:44px;text-decoration:none}
.pill{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ink);font-size:14px;text-decoration:none;white-space:nowrap;transition:background .2s,color .2s}
.pill:hover{background:var(--ink);color:var(--card)}
.v a.pill:hover{color:var(--card)}
.go{display:inline-flex;align-items:center;min-height:52px;padding:0 26px;border-radius:999px;background:var(--brass);color:var(--on-brass);font-size:16px;font-weight:500;text-decoration:none;white-space:nowrap;transition:filter .2s}
.go:hover{filter:brightness(1.08)}
.v a.go{color:var(--on-brass)}
.link{display:inline-flex;align-items:center;min-height:44px;font-size:14px;font-weight:500;text-decoration:none;color:var(--brass-text)}
.v a.link{color:var(--brass-text)}
.link:hover{text-decoration:underline;text-underline-offset:4px}
.tabs{display:inline-flex;align-items:center;gap:2px;padding:4px;border-radius:999px;border:1px solid var(--line);background:var(--card)}
.tabs a{display:inline-flex;align-items:center;min-height:38px;padding:0 14px;border-radius:999px;font-size:14px;text-decoration:none;color:var(--ink);white-space:nowrap;transition:background .2s,color .2s}
.tabs a:hover{background:var(--line)}
.v .tabs a[aria-current]{background:var(--ink);color:var(--card)}
.lang a{min-width:40px;justify-content:center;padding:0 10px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;letter-spacing:.04em}
.intro{display:flex;flex-direction:column;gap:20px;max-width:760px;padding:56px 0 64px}
.intro h1{margin:0;font-size:clamp(56px,7vw,104px);line-height:.95}
.intro p{margin:0}
.label{font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;color:var(--brass-text)}
.lead{font-size:19px;line-height:1.6;color:var(--muted)}
.cards{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr));gap:48px 28px}
.card{display:flex;flex-direction:column;gap:4px}
.post{display:flex;flex-direction:column;gap:8px;text-decoration:none}
.thumb{position:relative;display:block;aspect-ratio:16/9;border-radius:14px;overflow:hidden;border:1px solid var(--line);transition:transform .25s,border-color .25s}
.thumb img{display:block;width:100%;height:100%;object-fit:cover}
.post:hover .thumb{transform:translateY(-4px);border-color:var(--brass)}
.stop{padding-top:6px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--brass-text)}
.name{font-size:34px;line-height:1}
.kind{font-size:14px;color:var(--muted)}
.badges{display:flex;flex-wrap:wrap;gap:6px;color:var(--muted);font-family:'Geist Mono',ui-monospace,monospace;font-size:12px}
.badge{display:inline-flex;align-items:center;height:2em;padding:0 .8em;border:1px solid currentColor;border-radius:999px;white-space:nowrap}
.shelf{font-size:13px;color:var(--muted)}
.foot{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:32px;margin-top:112px;padding-top:48px;border-top:1px solid var(--line)}
.foot h2{margin:0;max-width:640px;font-size:clamp(40px,5vw,68px);line-height:1}
.foot div{display:flex;flex-wrap:wrap;gap:12px}
.credits{margin:40px 0 0;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;line-height:1.6;color:var(--muted)}
.credits a{text-underline-offset:3px}
.m-only{display:none}
.m-bar{align-items:center;gap:8px}
.m-menu{position:relative}
.m-menu summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:44px;min-height:44px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ink)}
.m-menu summary::-webkit-details-marker{display:none}
.m-menu summary:focus-visible{outline:2px solid var(--brass);outline-offset:3px}
.m-drop{display:none;position:absolute;right:0;top:52px;z-index:10;min-width:230px;flex-direction:column;padding:8px;border-radius:16px;border:1px solid var(--line);background:var(--card);box-shadow:0 14px 36px rgba(0,0,0,.18)}
.m-menu[open] .m-drop{display:flex}
.m-drop a{display:flex;align-items:center;min-height:48px;padding:0 14px;border-radius:10px;font-size:16px;text-decoration:none;color:var(--ink)}
.v .m-drop a[aria-current]{color:var(--brass-text)}
.led{font-family:'Doto','Geist Mono',monospace;font-weight:800;letter-spacing:.04em;text-transform:uppercase;text-shadow:0 0 6px rgba(255,176,32,.55),0 0 18px rgba(255,140,0,.25)}
.blink{animation:blink 1s steps(2,start) infinite}
@keyframes blink{to{opacity:.2}}
@media (max-width: 700px){.d-only{display:none !important}.m-only{display:flex}.intro{padding:32px 0 44px}.foot{margin-top:80px}.foot .go{font-size:15px}}
@media (prefers-reduced-motion: reduce){.pill,.thumb,.go,.tabs a{transition:none}.post:hover .thumb{transform:none}.blink{animation:none}}
</style>`;

// A · le statut sur la vignette, le bouton de l'app sous la carte.
const STYLE_A = `<style>
.live{position:absolute;top:12px;left:12px;display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 12px;border-radius:999px;background:rgba(11,12,20,.84);color:#F1E8DA;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px}
.live i{flex:none;width:8px;height:8px;border-radius:999px;box-sizing:border-box}
.live.on i{background:#7DD39A;animation:pulse 2.2s ease-out infinite}
.live.wake i{background:#FFB020;animation:blink 1s steps(2,start) infinite}
.live.off i{background:#FF7A6B}
.live.desktop i,.live.here i{background:#D9B475}
.live.archive{color:#C9C0B2}
.live.archive i{border:1.5px solid #C9C0B2}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(125,211,154,.6)}100%{box-shadow:0 0 0 8px rgba(125,211,154,0)}}
.acts{display:flex;flex-wrap:wrap;align-items:center;gap:6px 20px;margin-top:12px}
.acts .go{min-height:46px;padding:0 22px;font-size:15px}
.acts .pill{min-height:46px}
.checked{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;color:var(--muted)}
.checked i{width:8px;height:8px;border-radius:999px;background:#7DD39A}
@media (prefers-reduced-motion: reduce){.live i{animation:none !important}}
</style>`;

// B · la carte devient un billet ; le talon, perforé, reprend l'écran ambré du tableau des départs.
const STYLE_B = `<style>
.tk{position:relative;display:flex;flex-direction:column;border-radius:16px;border:1px solid var(--line);background:var(--card);overflow:hidden}
.tk .post{padding:12px 12px 0}
.tk .thumb{border-radius:10px}
.tk-txt{display:flex;flex-direction:column;gap:4px;padding:0 8px}
.tk .link{align-self:flex-start;margin:0 20px 6px}
.stub{position:relative;margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:84px;padding:14px 20px;box-sizing:border-box;border-top:2px dashed #3a2a0c;background:radial-gradient(circle,#1c1407 1px,transparent 1.6px) 0 0/6px 6px,#050404;color:#ffb020;text-decoration:none}
.v a.stub{color:#ffb020}
.stub::before,.stub::after{content:"";position:absolute;top:-11px;width:20px;height:20px;border-radius:999px;background:#0E1018;border:1px solid var(--line);box-sizing:border-box}
.stub::before{left:-11px}
.stub::after{right:-11px}
.stub-l,.stub-r{display:flex;flex-direction:column;gap:6px}
.stub-r{align-items:flex-end}
.stub-route{font-size:24px;line-height:1}
.stub-sub{font-size:13px;color:#b97d14;text-shadow:none}
.stub-state{font-size:17px;line-height:1;color:#ffd27a}
.stub-go{display:inline-flex;align-items:center;min-height:32px;padding:0 12px;border:1.5px solid #ffb020;border-radius:3px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;text-shadow:none}
.stub-go.solid{background:#ffb020;color:#08080a}
a.stub:hover .stub-go.solid{background:#ffd27a;border-color:#ffd27a}
a.stub:hover .stub-go{color:#ffd27a;border-color:#ffd27a}
.stub.landed{color:#b97d14}
.stub.landed .stub-route,.stub.landed .stub-state{color:#b97d14;text-shadow:none}
a.stub:focus-visible{outline:2px solid #ffb020;outline-offset:-4px;border-radius:0 0 14px 14px}
.legend{display:flex;flex-wrap:wrap;gap:8px 24px;margin:0;padding:0;list-style:none;font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;color:var(--muted)}
.legend b{color:#ffb020;font-weight:500}
</style>`;

// D · A, plus le filtre « Tout / Les apps / Les archives ».
const STYLE_D = `<style>
.seg{display:inline-flex;flex-wrap:wrap;align-self:flex-start;gap:4px;padding:4px;border-radius:999px;border:1px solid var(--line);background:var(--card)}
.seg button{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border:0;border-radius:999px;background:transparent;color:var(--ink);font:inherit;font-size:15px;cursor:pointer;transition:background .2s,color .2s}
.seg button:hover{background:var(--line)}
.seg button[aria-pressed="true"]{background:var(--ink);color:var(--card)}
.seg button:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
.seg b{font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;font-weight:400;opacity:.7}
.cards > sc-if{display:contents}
@media (max-width: 700px){.seg{border-radius:18px}.seg button{padding:0 13px;font-size:14px}}
@media (prefers-reduced-motion: reduce){.seg button{transition:none}}
</style>`;

// E · une rangée de raccourcis, une pastille par app, au-dessus du carnet d'aujourd'hui.
const STYLE_E = `<style>
.quick{display:flex;flex-direction:column;gap:14px;margin:-24px 0 72px}
.quick h2{margin:0;font-weight:400}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin:0;padding:0;list-style:none}
.chip{position:relative;display:inline-flex;align-items:center;gap:10px;min-height:52px;padding:5px 18px 5px 5px;box-sizing:border-box;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ink);font-size:15px;text-decoration:none;white-space:nowrap;transition:border-color .2s}
.chip:hover{border-color:var(--brass)}
.chip-img{position:relative;flex:none;width:40px;height:40px;border-radius:999px;overflow:hidden}
.chip-img img{display:block;width:100%;height:100%;object-fit:cover;transform:scale(1.7)}
.chip .dot{flex:none;width:8px;height:8px;border-radius:999px}
.dot.on{background:#7DD39A}
.dot.wake{background:#FFB020;animation:blink 1s steps(2,start) infinite}
.chip-go{color:var(--muted);font-size:14px}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width: 700px){.quick{margin:-12px 0 52px}.chips{flex-wrap:nowrap;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -20px;padding:0 20px 6px;scrollbar-width:none}.chips li{flex:none;scroll-snap-align:start}}
@media (prefers-reduced-motion: reduce){.chip{transition:none}.dot.wake{animation:none}}
</style>`;

// F · la carte postale se retourne : au dos, un timbre, le cachet du statut, l'app et la fiche.
const STYLE_F = `<style>
.pc{perspective:1400px}
.pc-in{position:relative;display:grid;aspect-ratio:16/9;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.3,.7,.2,1)}
.pc.is-flipped .pc-in{transform:rotateY(180deg)}
.face{grid-area:1/1;position:relative;box-sizing:border-box;border-radius:14px;overflow:hidden;border:1px solid var(--line);-webkit-backface-visibility:hidden;backface-visibility:hidden}
.recto{display:block;width:100%;height:100%;margin:0;padding:0;cursor:pointer;font:inherit;color:inherit;text-align:left;transition:border-color .25s}
.recto img{display:block;width:100%;height:100%;object-fit:cover}
.recto:hover{border-color:var(--brass)}
.recto:focus-visible{outline:2px solid var(--brass);outline-offset:3px}
.turn{position:absolute;right:12px;bottom:12px;display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;background:rgba(11,12,20,.84);color:#F1E8DA;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px}
.recto:hover .turn{background:#D9B475;color:#0B0C14}
.verso{transform:rotateY(180deg);display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);background:#F4ECDF;color:#2A2620;border-color:#E2D6C2}
.v-msg{display:flex;flex-direction:column;gap:8px;padding:14px 12px 12px 16px}
.v-text{margin:0;font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-size:22px;line-height:1.1}
.v-from{margin:0;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;color:#6B6257}
.v-back{margin-top:auto;align-self:flex-start;display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 12px;border-radius:999px;border:1px solid #CDBFA8;background:transparent;color:#2A2620;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;cursor:pointer}
.v-back:hover{background:#2A2620;color:#F4ECDF}
.v-back:focus-visible{outline:2px solid #84652f;outline-offset:2px}
.v-side{display:flex;flex-direction:column;justify-content:space-between;margin:12px 0;padding:0 14px 0 14px;border-left:1px solid #CDBFA8}
.v-top{position:relative;display:flex;justify-content:flex-end;height:58px}
.stamp{width:44px;height:54px;box-sizing:border-box;border:3px dotted #F4ECDF;outline:1px solid #CDBFA8;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;font-family:'Instrument Serif',Georgia,serif;font-size:16px}
.postmark{position:absolute;z-index:1;right:38px;top:4px;width:62px;height:62px;box-sizing:border-box;border-radius:999px;border:1.5px solid currentColor;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Geist Mono',ui-monospace,monospace;font-size:8px;line-height:1.35;letter-spacing:.05em;text-transform:uppercase;transform:rotate(-14deg)}
.postmark.on{color:#2F6B45}
.postmark.wake{color:#8F5400}
.postmark.archive{color:#6B6257}
.postmark.here,.postmark.desktop{color:#7A5B27}
.v-lines{display:flex;flex-direction:column}
.v a.v-line{display:flex;align-items:center;min-height:40px;border-bottom:1px solid #CDBFA8;color:#2A2620;font-size:14px;text-decoration:none}
.v a.v-line.strong{color:#6E5226;font-weight:600}
.v a.v-line:hover{text-decoration:underline;text-underline-offset:3px}
.v a.name-link{text-decoration:none}
.v a.name-link:hover{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:5px}
@media (prefers-reduced-motion: reduce){.pc-in{transition:none}.recto{transition:none}}
</style>`;

// — L'en-tête : trois onglets, « Les apps » a disparu —
function header(self) {
  const tabs = `<a href="Depart.dc.html">Le voyage</a><a href="${self}" aria-current="page">Les projets</a><a href="Apropos.dc.html">À propos</a>`;
  const lang = `<nav aria-label="Langue" class="tabs lang"><a href="${self}" hreflang="fr" lang="fr" aria-label="Français" aria-current="page">FR</a><a href="Carnet-en.dc.html" hreflang="en" lang="en" aria-label="English">EN</a></nav>`;
  return `<header class="site">
<a class="brand" href="Depart.dc.html"><span class="serif" style="font-style:italic;font-size:32px">Index</span><span class="mono d-only" style="font-size:12px;color:var(--muted)">Cantin Roquier</span></a>
<div class="d-only" style="display:flex;flex-wrap:wrap;align-items:center;gap:10px"><nav aria-label="Le site" class="tabs">${tabs}</nav>${lang}</div>
<div class="m-only m-bar">${lang}<details class="m-menu"><summary aria-label="Ouvrir le menu"><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></summary><nav class="m-drop" aria-label="Le site">${tabs}</nav></details></div>
</header>`;
}

const intro = (lead, extra = "") => `<section class="intro">
<p class="label">Fin du voyage</p>
<h1 class="serif">Le carnet de <em>voyage</em></h1>
<p class="lead">${typo(lead)}</p>
${extra}</section>`;

const FOOT = `<footer class="foot">
<h2 class="serif">Une idée pour la prochaine <em>escale</em>${NB}?</h2>
<div><a class="go" href="mailto:cantin.roquier@gmail.com">cantin.roquier@gmail.com</a><a class="pill" href="https://github.com/CantinDeBrunoy" target="_blank" rel="noopener" style="min-height:52px">GitHub ↗</a></div>
</footer>
<p class="credits">${typo("Crédits, tous repeints : l'avion de ligne est « very cute airplane » d'Akash Rudra, sous licence")} <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>, via <a href="https://poly.pizza/m/3UtIosDm9u-" target="_blank" rel="noopener">Poly Pizza</a>${NB}; l'arc de triomphe est un modèle de Microsoft, sous licence <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>, via <a href="https://commons.wikimedia.org/wiki/File:Arc_de_Triomphe.stl" target="_blank" rel="noopener">Wikimedia Commons</a>${NB}; ${typo("la tour Eiffel, d'ingoenius (CC0) ; les voitures, de Quaternius (CC0) ; le coffre-fort, de CreativeTrio (CC0) ; la carte du monde vient de Natural Earth (domaine public).")}</p>
<p class="mono" style="margin:0;padding:16px 0 0;font-size:12px"><a href="Mentions.dc.html" style="color:var(--muted);text-underline-offset:3px">Mentions légales</a></p>`;

const thumb = (s, over = "") => `<span class="thumb" style="background:${s.bg}"><img src="/_blob/${s.img}" alt="">${over}</span>`;
const badges = (s) => (s.badges.length ? `<span class="badges">${s.badges.map((b) => `<span class="badge">${b}</span>`).join("")}</span>` : "");
const shelf = (s) => (s.shelf ? `<span class="shelf">${typo(s.shelf)}</span>` : "");
const revisit = (s) => `<a class="link" href="Escale${s.n}.dc.html" aria-label="Revoir l'escale ${s.n}${NB}: ${s.place}">Revoir l'escale →</a>`;
const ext = (url) => (url.startsWith("http") ? ` target="_blank" rel="noopener"` : "");

// — A · Le bouton —
function cardA(s) {
  const st = stateOf(s);
  const a = actionOf(s, "Ouvrir l'app ↗");
  const btn = a ? `<a class="${a[2] ? "go" : "pill"}" href="${a[1]}"${ext(a[1])}>${a[0]}</a>` : "";
  return `<li class="card">
<a class="post" href="${s.fiche}.dc.html">${thumb(s, `<span class="live ${st}"><i></i>${PLAIN[st]}</span>`)}
<span class="stop">Escale ${s.n} · ${s.place}</span>
<span class="serif name">${s.name}</span>
<span class="kind">${join([s.num, ...s.meta])}</span>
${badges(s)}${shelf(s)}</a>
<div class="acts">${btn}${revisit(s)}</div>
</li>`;
}

// — B · Le talon —
function cardB(s) {
  const st = stateOf(s);
  const a = actionOf(s, "Embarquer ↗");
  const landed = st === "archive";
  const sub = landed ? `Vol de ${s.meta[1]}` : `Porte ${s.app.gate}`;
  const inner = `<span class="stub-l"><span class="led stub-route">IDX → ${s.code}</span><span class="led stub-sub">${up(sub)}</span></span>
<span class="stub-r"><span class="led stub-state${st === "wake" ? " blink" : ""}">${up(AIR[st])}</span>${a ? `<span class="stub-go${a[2] ? " solid" : ""}">${a[0]}</span>` : ""}</span>`;
  const stub = a
    ? `<a class="stub${landed ? " landed" : ""}" href="${a[1]}"${ext(a[1])} aria-label="${s.name}${NB}: ${a[0].replace(/ [↗↓]$/, "")}, ${AIR[st].toLowerCase()}">${inner}</a>`
    : `<div class="stub landed">${inner}</div>`;
  return `<li class="tk">
<a class="post" href="${s.fiche}.dc.html">${thumb(s)}
<span class="tk-txt"><span class="stop">Escale ${s.n} · ${s.place}</span>
<span class="serif name">${s.name}</span>
<span class="kind">${join([s.num, ...s.meta])}</span>
${badges(s)}${shelf(s)}</span></a>
${revisit(s)}
${stub}
</li>`;
}

// — La carte du carnet d'aujourd'hui (E) —
function cardToday(s) {
  const status = TODAY[s.app.kind];
  return `<li class="card">
<a class="post" href="${s.fiche}.dc.html">${thumb(s)}
<span class="stop">Escale ${s.n} · ${s.place}</span>
<span class="serif name">${s.name}</span>
<span class="kind">${join([s.num, ...s.meta, ...(status ? [status] : [])])}</span>
${badges(s)}${shelf(s)}</a>
${revisit(s)}
</li>`;
}

// — D · Le filtre : les cartes de A, chacune montrée selon le filtre choisi —
const groupOf = (s) => (s.app.kind === "archive" ? "archive" : "apps");
const cardD = (s) => `<sc-if value="{{show.s${s.n}}}" hint-placeholder-val="{{ true }}">${cardA(s)}</sc-if>`;

// — E · Les raccourcis : une pastille par app à ouvrir, dans l'ordre du voyage —
// Le cadrage de la pastille, en % de la vignette : l'objet du projet dans sa scène.
const FOCUS = { 1: [33, 45], 2: [46, 52], 3: [50, 45], 6: [50, 50], 7: [44, 50], 8: [52, 66], 9: [56, 40] };
function chipE(s) {
  const st = stateOf(s);
  const [label, url] = actionOf(s, "↗");
  const [fx, fy] = FOCUS[s.n];
  const tail = s.app.kind === "desktop" ? `<span class="chip-go">Windows ↓</span>` : `<i class="dot ${st}" aria-hidden="true"></i><span class="vh">, ${PLAIN[st].toLowerCase()}</span><span class="chip-go" aria-hidden="true">↗</span>`;
  return `<li><a class="chip" href="${url}"${ext(url)}><span class="chip-img" style="background:${s.bg}"><img src="/_blob/${s.img}" alt="" style="object-position:${fx}% ${fy}%;transform-origin:${fx}% ${fy}%"></span><span>${s.name}</span>${tail}</a></li>`;
}

// — F · Le verso —
const DEST = {
  1: "Une course-poursuite dans l'espace, case par case.",
  2: "Le globe de mes voyages.",
  3: "Le guet des prix des vols.",
  4: "Le plus court chemin dans le métro.",
  5: "Des voyageurs solo qui se trouvent.",
  6: "La salle la moins embouteillée.",
  7: "Le coffre à mots de passe, sous Windows.",
  8: "L'espagnol en chansons.",
  9: "Un rituel à deux, chaque jour.",
  10: "Ce site, et le dépôt qui réunit tout.",
};
const NIGHT = new Set(["#0B0C14", "#10131C"]);
function cardF(s) {
  const st = stateOf(s);
  const a = actionOf(s, "Ouvrir l'app ↗");
  const k = `s${s.n}`;
  const lines = [
    ...(a ? [`<a class="v-line strong" href="${a[1]}"${ext(a[1])}>${a[0]}</a>`] : []),
    `<a class="v-line" href="${s.fiche}.dc.html">La fiche du projet →</a>`,
  ];
  return `<li class="card">
<div class="{{c.${k}.cls}}"><div class="pc-in">
<button type="button" class="face recto" style="background:${s.bg}" onClick="{{c.${k}.flip}}" aria-label="Retourner la carte de ${s.name}${NB}: au dos, ${a ? "l'app et " : ""}la fiche"><img src="/_blob/${s.img}" alt=""><span class="live ${st}"><i></i>${PLAIN[st]}</span><span class="turn" aria-hidden="true">↻ Retourner</span></button>
<div class="face verso">
<div class="v-msg"><p class="v-text">${typo(DEST[s.n])}</p><p class="v-from">Escale ${s.n} · ${s.place}</p><button type="button" class="v-back" onClick="{{c.${k}.flip}}" aria-label="Remettre la carte de ${s.name} à l'endroit">↻ L'image</button></div>
<div class="v-side"><div class="v-top" aria-hidden="true"><span class="stamp" style="background:${s.bg};color:${NIGHT.has(s.bg) ? "#F1E8DA" : "#2A2620"}">${s.code}</span><span class="postmark ${st}"><span>Index</span><span>${PLAIN[st]}</span><span>09·10·26</span></span></div>
<div class="v-lines">${lines.join("")}</div></div>
</div>
</div></div>
<span class="stop">Escale ${s.n} · ${s.place}</span>
<a class="serif name name-link" href="${s.fiche}.dc.html">${s.name}</a>
<span class="kind">${join([s.num, ...s.meta])}</span>
${badges(s)}${shelf(s)}
${revisit(s)}
</li>`;
}

const live = STOPS.filter((s) => s.app.kind === "web");
const awake = live.filter((s) => s.app.state === "on").length;
const waking = live.filter((s) => s.app.state === "wake").length;
const openable = STOPS.filter((s) => s.app.kind === "web" || s.app.kind === "desktop");
const count = (g) => STOPS.filter((s) => groupOf(s) === g).length;
const checked = `<p class="checked"><i aria-hidden="true"></i>${awake} apps en ligne, ${waking} qui se réveille<span aria-hidden="true">·</span>statut vérifié il y a 2${NB}min</p>\n`;
const LEGEND = [
  ["À l'heure", "l'app répond"],
  ["Retardé", "elle se réveille, quelques secondes"],
  ["Annulé", "hors ligne, je suis prévenu"],
  ["Atterri", "une archive, sa fiche raconte le voyage"],
];
const legend = (cls, rows = LEGEND, lead = "") => `<ul class="${cls}">${lead}${rows.map(([b, t]) => `<li><b>${up(b)}</b> ${t}</li>`).join("")}</ul>`;

// Le script de chaque planche : rien pour A, B et E ; le filtre pour D ; les cartes retournées pour F.
const STATIC = `class Component extends DCLogic {
  renderVals() {
    return {};
  }
}`;
const GROUPS = Object.fromEntries(STOPS.map((s) => [`s${s.n}`, groupOf(s)]));
const SCRIPT_D = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { filter: "all" };
  }
  renderVals() {
    const f = this.state.filter;
    const groups = ${JSON.stringify(GROUPS)};
    const show = {};
    for (const k of Object.keys(groups)) show[k] = f === "all" || f === groups[k];
    const pick = (v) => () => this.setState({ filter: v });
    return { show, pAll: f === "all", pApps: f === "apps", pArch: f === "archive", showAll: pick("all"), showApps: pick("apps"), showArch: pick("archive") };
  }
}`;
const SCRIPT_F = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    // Magellan est déjà retourné, pour qu'on voie le dos sans chercher.
    this.state = { flipped: { s2: true } };
  }
  renderVals() {
    const c = {};
    for (let i = 1; i <= 10; i++) {
      const k = "s" + i;
      const on = !!this.state.flipped[k];
      c[k] = { cls: on ? "pc is-flipped" : "pc", flip: () => this.setState({ flipped: { ...this.state.flipped, [k]: !on } }) };
    }
    return { c };
  }
}`;

const PAGES = {
  A: {
    title: "INDEX — le carnet, chaque carte ouvre son app",
    style: STYLE_A,
    script: STATIC,
    body: () =>
      intro("Les onze projets, escale par escale. Chaque carte ouvre la fiche du projet ; les apps s'ouvrent d'ici, leur statut vérifié en direct.", checked) +
      `<ol class="cards">${STOPS.map(cardA).join("\n")}</ol>`,
  },
  B: {
    title: "INDEX — le carnet, chaque carte est un billet",
    style: STYLE_B,
    script: STATIC,
    body: () =>
      intro(
        "Les onze projets, escale par escale. Chaque billet ouvre la fiche du projet ; son talon embarque dans l'app.",
        legend("legend", LEGEND, `<li>Statut vérifié il y a 2${NB}min</li>`) + "\n",
      ) + `<ol class="cards">${STOPS.map(cardB).join("\n")}</ol>`,
  },
  D: {
    title: "INDEX — le carnet, avec un filtre pour les apps",
    style: STYLE_A + "\n" + STYLE_D,
    script: SCRIPT_D,
    body: () =>
      intro(
        "Les onze projets, escale par escale. Chaque carte ouvre la fiche du projet ; les apps s'ouvrent d'ici, leur statut vérifié en direct.",
        `<div class="seg" role="group" aria-label="Montrer"><button type="button" aria-pressed="{{pAll}}" onClick="{{showAll}}">Tout <b>${STOPS.length}</b></button><button type="button" aria-pressed="{{pApps}}" onClick="{{showApps}}">Les apps <b>${count("apps")}</b></button><button type="button" aria-pressed="{{pArch}}" onClick="{{showArch}}">Les archives <b>${count("archive")}</b></button></div>\n` + checked,
      ) + `<ol class="cards">${STOPS.map(cardD).join("\n")}</ol>`,
  },
  E: {
    title: "INDEX — le carnet, avec les raccourcis des apps",
    style: STYLE_A + "\n" + STYLE_E,
    script: STATIC,
    body: () =>
      intro("Les onze projets, escale par escale. Chaque carte ouvre la fiche du projet ; son escale reste à un clic.") +
      `<section class="quick" aria-labelledby="quick-t">
<h2 id="quick-t" class="label">Ouvrir une app directement</h2>
<ul class="chips">${openable.map(chipE).join("")}</ul>
${checked}</section>
<ol class="cards">${STOPS.map(cardToday).join("\n")}</ol>`,
  },
  F: {
    title: "INDEX — le carnet, des cartes postales à retourner",
    style: STYLE_A + "\n" + STYLE_F,
    script: SCRIPT_F,
    body: () =>
      intro("Les onze projets, escale par escale, en cartes postales. Retournez-en une : au dos, son app et sa fiche.", checked) +
      `<ol class="cards">${STOPS.map(cardF).join("\n")}</ol>`,
  },
};

for (const [k, p] of Object.entries(PAGES)) {
  for (const [file, width] of [[`Fusion-${k}.dc.html`, 1440], [`Fusion-${k}-mobile.dc.html`, 390]]) {
    const height = HEIGHTS[file] ?? (width === 1440 ? 3000 : 6000);
    const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${p.title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
${FONTS}
${BASE}
${p.style}
</helmet>
<div class="v" style="--ink:#F1E8DA;--muted:#B3AA9C;--card:#171A24;--line:#2B3040;--brass:#D9B475;--brass-text:#D9B475;--halo:rgba(23,26,36,.6);--on-brass:#0B0C14;min-height:100vh;background:#0E1018;color:var(--ink);font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased">
<div class="wrap">
${header(file)}
<main>
${p.body()}
</main>
${FOOT}
</div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${width},"height":${height}}}'>
${p.script}
</script>
</body>
</html>
`;
    fs.writeFileSync(path.join(OUT, file), html);
  }
}
console.log("planches écrites dans", OUT);
