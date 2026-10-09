// Trois propositions pour la fiche projet (2026-10-09, notes 2, 8 et 10 de Cantin) : la vidéo de démo
// intégrée, un retour au voyage bien visible, et des boutons escale précédente / suivante dans les
// marges. Montrées sur la fiche de Magellan (escale 2), en ordinateur et en téléphone.
//   A « Le hublot »       : la fiche d'aujourd'hui, un vrai bouton de retour, des flèches dans les marges,
//                           et la démo en grand juste sous l'en-tête.
//   B « L'écran de bord » : la démo prend la place de la scène, dans une fenêtre posée devant elle ;
//                           un fil d'Ariane sous l'en-tête et des onglets de page sur les bords.
//   C « Le carnet de vol »: la scène en plein écran comme au voyage, la démo à cheval sur la scène et
//                           le papier, puis une bande de vol : escale précédente, position, suivante.
// node build-fiche-propals.cjs <dossier>  → <dossier>/project/Fiche-propal-{A,B,C}(-mobile).dc.html
const fs = require("fs");
const path = require("path");

const root = process.argv[2] ?? path.join(__dirname, "project", "..");
const out = path.join(root, "project");
fs.mkdirSync(out, { recursive: true });

// Les images déjà sur le canvas : la Terre (escale 2), l'espace et l'avion (ses voisines), les captures.
const BLOB = (id) => `/_blob/${id}`;
const TERRE = BLOB("4f4a7b1b78db6bdff96b162c4e86752c");
const TERRE_PHONE = BLOB("619fae54b3ee0736fe3c14058dabac9b");
const ESPACE = BLOB("bdad4e4ea4a4b0cb48bb698164be3df5");
const AVION = BLOB("7027976ed9044371acbd7d06a136fde1");
const SHOT = BLOB("1bfee98ae1c6e0aa3449cfdef841a5f3");
const SHOT_PHONE = BLOB("0b5a8053a11028b5de2cb9a05d5f0ec9");

const P = {
  num: "005",
  name: "Magellan",
  n: 2,
  place: "La Terre",
  kind: "App web et mobile · 2026 · En ligne",
  badge: "Refonte assistée par IA",
  pitch: "Un globe qui colorie les pays que j'ai traversés et trace chaque voyage, sans compte ni serveur.",
  why: "Je voulais ouvrir une app et voir ma propre carte du monde : un globe qui se colore au fil des pays traversés. Et que ces souvenirs restent sur mon téléphone, sans compte ni serveur.",
  features: [
    ["Le globe se colore", "Les pays visités s'allument, chaque ville porte son drapeau, un arc relie les étapes."],
    ["Les voyages en fiches", "Rangés par année : un post-it par étape, une carte postale par ville, le budget."],
    ["Les photos se rangent seules", "L'app lit la date et le lieu de chaque photo et la classe dans la bonne étape."],
  ],
  url: "magellan.cantin-roquier.workers.dev",
  prev: { n: 1, place: "L'espace", name: "Galactic Escape", num: "001", img: ESPACE },
  next: { n: 3, place: "Dans l'avion", name: "Hublot", num: "010", img: AVION },
};

const ARROW_L = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>`;
const ARROW_R = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
const PLAY = `<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>`;

const CSS = `
body{margin:0}
.f{font-family:'Geist',system-ui,sans-serif;color:var(--ink);background:var(--bg)}
.f a{color:inherit}
.f a:focus-visible,.f button:focus-visible{outline:2px solid var(--brass);outline-offset:3px}
.night{--bg:#10131c;--ink:#f1e8da;--muted:#b3aa9c;--card:#171a24;--line:#2b3040;--brass:#d9b475;--brass-text:#d9b475;--on-brass:#0b0c14}
.paper{--bg:#f6f1e9;--ink:#241e18;--muted:#6a5f52;--card:#fbf7f0;--line:#e3d8c8;--brass:#b08a4f;--brass-text:#84652f;--on-brass:#241e18}
.serif{font-family:'Instrument Serif',Georgia,serif;font-weight:400}
.mono{font-family:'Geist Mono',ui-monospace,monospace}
.head{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:22px 40px}
.brand{display:inline-flex;align-items:baseline;gap:12px;text-decoration:none}
.brand b{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-weight:400;font-size:34px}
.brand span{font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--muted)}
.where{display:flex;align-items:center;gap:12px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--muted)}
.dots{display:flex;gap:10px}
.dots i{width:8px;height:8px;border-radius:99px;border:1.5px solid var(--muted);box-sizing:border-box}
.dots i.done{background:var(--brass);border-color:var(--brass)}
.dots i.now{width:13px;height:13px;background:var(--brass);border-color:var(--brass);margin-top:-2.5px}
.tabs{display:flex;gap:2px;padding:4px;border-radius:999px;border:1px solid var(--line);background:var(--card)}
.tabs a{display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border-radius:999px;font-size:14px;text-decoration:none}
.tabs a.on{background:var(--ink);color:var(--bg)}
.label{margin:0;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;letter-spacing:.06em;color:var(--brass-text)}
.kind{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:0;font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;color:var(--muted)}
.badge{display:inline-flex;align-items:center;height:2em;padding:0 .8em;border:1px solid currentColor;border-radius:999px;white-space:nowrap}
.title{margin:0;font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:96px;line-height:.95}
.pitch{margin:0;max-width:540px;font-size:20px;line-height:1.5}
.go{display:inline-flex;align-items:center;gap:8px;min-height:52px;padding:0 26px;border-radius:999px;background:var(--brass);color:var(--on-brass);font-size:16px;font-weight:500;text-decoration:none}
.f a.go{color:var(--on-brass)}
.link{display:inline-flex;align-items:center;min-height:44px;color:var(--brass-text);font-size:15px;font-weight:500;text-decoration:none}
.links{display:flex;flex-wrap:wrap;align-items:center;gap:12px 24px}
.scene{display:block;width:100%;height:100%;object-fit:cover}
.player{position:relative;overflow:hidden;background:#0b0c14}
.player img{display:block;width:100%;height:100%;object-fit:cover}
.player .veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,12,20,0) 45%,rgba(11,12,20,.72) 100%)}
.play{position:absolute;left:50%;top:50%;display:flex;align-items:center;justify-content:center;width:88px;height:88px;margin:-44px 0 0 -44px;border:0;border-radius:999px;background:#d9b475;color:#0b0c14;box-shadow:0 0 0 10px rgba(217,180,117,.25);cursor:pointer;padding:0 0 0 6px;box-sizing:border-box}
.vbar{position:absolute;left:24px;right:24px;bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:16px;color:#f1e8da;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px}
.chip{display:inline-flex;align-items:center;height:28px;padding:0 12px;border-radius:999px;background:rgba(11,12,20,.66);border:1px solid rgba(241,232,218,.25)}
.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin:0;padding:0;list-style:none}
.card{display:flex;flex-direction:column;gap:8px;padding:24px;border-radius:18px;background:var(--card);border:1px solid var(--line)}
.card .mono{font-size:12px;color:var(--brass-text)}
.card h3{margin:0;font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:28px;line-height:1.1}
.card p{margin:0;font-size:15px;line-height:1.5;color:var(--muted)}
.thumb{flex:none;border-radius:999px;overflow:hidden;background:#0b0c14}
.thumb img{display:block;width:100%;height:100%;object-fit:cover}
`;

const fonts = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&amp;family=Geist:wght@300..600&amp;family=Geist+Mono:wght@400..500&amp;display=swap">`;

const page = (title, w, h, body, extraCss = "") => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
${fonts}
<style>
${CSS}${extraCss}
</style>
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

const dots = () => Array.from({ length: 10 }, (_, k) => `<i class="${k + 1 < P.n ? "done" : k + 1 === P.n ? "now" : ""}"></i>`).join("");

const header = () => `<header class="head">
<a class="brand" href="#"><b>Index</b><span>Cantin Roquier</span></a>
<div class="where"><span>Escale ${P.n} / 10</span><div class="dots">${dots()}</div></div>
<div style="display: flex; gap: 10px">
<nav class="tabs" aria-label="Le site"><a href="#">Le voyage</a><a href="#">Les apps</a><a class="on" href="#">Les projets</a><a href="#">À propos</a></nav>
<nav class="tabs" aria-label="Langue"><a class="on" href="#">FR</a><a href="#">EN</a></nav>
</div>
</header>`;

const phoneHeader = () => `<header class="head" style="padding: 18px 20px">
<a class="brand" href="#"><b style="font-size: 30px">Index</b></a>
<div style="display: flex; gap: 8px; align-items: center">
<nav class="tabs" aria-label="Langue"><a class="on" href="#">FR</a><a href="#">EN</a></nav>
<a href="#" aria-label="Ouvrir le menu" style="display: flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 999px; border: 1px solid var(--line); background: var(--card)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></a>
</div>
</header>`;

const kindLine = () => `<p class="kind"><span>${P.num} · ${P.kind}</span><span class="badge">${P.badge}</span></p>`;

const player = (img, w, h, extra = "", size = "") => `<div class="player" style="width: ${w}; height: ${h}; border-radius: ${extra || "20px"}">
<img src="${img}" alt="La démo de Magellan : le globe et ses pays colorés">
<div class="veil"></div>
<button class="play" type="button" aria-label="Lire la démo">${PLAY}</button>
${size === "tiny" ? "" : size === "small" ? `<div class="vbar"><span class="chip">Démo · 0:45</span><span class="chip">[À enregistrer]</span></div>` : `<div class="vbar"><span class="chip">Démo · 0:45 · sans le son</span><span class="chip">[À enregistrer]</span></div>`}
</div>`;

const features = () => `<ol class="cards">${P.features
  .map(([t, d], k) => `<li class="card"><span class="mono">0${k + 1}</span><h3>${t}</h3><p>${d}</p></li>`)
  .join("")}</ol>`;

// ————————————————————————— A « Le hublot » —————————————————————————
const A_CSS = `
.backpill{display:inline-flex;align-items:center;gap:12px;min-height:56px;padding:6px 22px 6px 6px;border-radius:999px;border:1.5px solid var(--brass);background:var(--card);text-decoration:none;align-self:flex-start}
.backpill .thumb{width:44px;height:44px}
.backpill b{font-size:16px;font-weight:500}
.backpill .t{display:flex;flex-direction:column;gap:2px}
.backpill small{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;color:var(--muted)}
.side{position:absolute;top:330px;display:flex;flex-direction:column;align-items:center;gap:10px;width:120px;text-decoration:none;text-align:center}
.side .round{display:flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:999px;border:1.5px solid var(--brass);background:var(--card);color:var(--brass)}
.side .mono{font-size:11px;color:var(--muted)}
.side .nm{font-size:14px;font-weight:500}
`;
const sideBtn = (dir, s, left) => `<a class="side" href="#" style="${left ? "left: 24px" : "right: 24px"}" aria-label="${dir === "prev" ? "Escale précédente" : "Escale suivante"} : ${s.name}">
<span class="round">${dir === "prev" ? ARROW_L : ARROW_R}</span>
<span class="mono">Escale ${s.n}</span>
<span class="nm">${s.name}</span>
</a>`;

const A = page(
  "Fiche — proposition A, le hublot",
  1440,
  1750,
  `<div class="f night" style="width: 1440px; position: relative">
${header()}
<section style="position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 48px; align-items: center; padding: 30px 200px 70px">
<div style="display: flex; flex-direction: column; gap: 22px">
<a class="backpill" href="#"><span class="thumb"><img src="${TERRE}" alt=""></span><span class="t"><b>Revenir au voyage</b><small>Escale ${P.n} · ${P.place}</small></span></a>
<h1 class="title">${P.name}</h1>
${kindLine()}
<p class="pitch">${P.pitch}</p>
<div class="links"><a class="go" href="#">Ouvrir l'app ↗</a><a class="link" href="#">Le code ↗</a></div>
</div>
<div style="aspect-ratio: 16 / 10; border-radius: 24px; overflow: hidden"><img class="scene" src="${TERRE}" alt="La Terre de Magellan et l'avion qui attend"></div>
</section>
${sideBtn("prev", P.prev, true)}
${sideBtn("next", P.next, false)}
</div>
<div class="f paper" style="width: 1440px; padding: 80px 200px 100px; box-sizing: border-box; display: flex; flex-direction: column; gap: 28px">
<p class="label">LA DÉMO</p>
${player(SHOT, "100%", "charge", "24px").replace("height: charge", "aspect-ratio: 16 / 9")}
<p style="margin: 0; color: var(--muted); font-size: 15px">Le globe, puis un voyage ouvert étape par étape : 45 secondes, sans le son, sous-titrées.</p>
<p class="label" style="margin-top: 40px">CE QUE ÇA FAIT</p>
${features()}
</div>`,
  A_CSS,
);

const A_PHONE = page(
  "Fiche — proposition A, le hublot, sur téléphone",
  390,
  1812,
  `<div class="f night" style="width: 390px">
${phoneHeader()}
<div style="padding: 0 20px 24px; display: flex; flex-direction: column; gap: 18px">
<a class="backpill" href="#" style="align-self: stretch"><span class="thumb"><img src="${TERRE}" alt=""></span><span class="t"><b>Revenir au voyage</b><small>Escale ${P.n} · ${P.place}</small></span></a>
<div style="aspect-ratio: 390 / 380; border-radius: 20px; overflow: hidden"><img class="scene" src="${TERRE_PHONE}" alt="La Terre de Magellan"></div>
<h1 class="title" style="font-size: 64px">${P.name}</h1>
${kindLine()}
<p class="pitch" style="font-size: 17px">${P.pitch}</p>
<div class="links"><a class="go" href="#">Ouvrir l'app ↗</a><a class="link" href="#">Le code ↗</a></div>
</div>
</div>
<div class="f paper" style="width: 390px; padding: 36px 20px 120px; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px; position: relative">
<p class="label">LA DÉMO</p>
${player(SHOT_PHONE, "100%", "charge", "20px", "small").replace("height: charge", "aspect-ratio: 390 / 600")}
<p class="label" style="margin-top: 24px">CE QUE ÇA FAIT</p>
<div class="card"><span class="mono">01</span><h3>${P.features[0][0]}</h3><p>${P.features[0][1]}</p></div>
<nav aria-label="Escales voisines" style="position: absolute; left: 12px; right: 12px; bottom: 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 8px; border-radius: 999px; background: #171a24">
<a href="#" style="display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 14px; border-radius: 999px; color: #f1e8da; text-decoration: none; font-size: 14px">${ARROW_L}<span>${P.prev.name}</span></a>
<a href="#" style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; min-height: 48px; padding: 0 14px; border-radius: 999px; background: #d9b475; color: #0b0c14; text-decoration: none; font-size: 14px; font-weight: 500"><span>${P.next.name}</span>${ARROW_R}</a>
</nav>
</div>`,
  A_CSS,
);

// ————————————————————————— B « L'écran de bord » —————————————————————————
const B_CSS = `
.crumbs{display:flex;align-items:center;gap:14px;padding:6px 40px 0;font-size:14px}
.crumbs .sep{color:var(--muted)}
.crumbs a{text-decoration:none}
.crumbs a.voy{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px 0 14px;border-radius:999px;background:var(--brass);color:var(--on-brass);font-weight:500}
.f .crumbs a.voy{color:var(--on-brass)}
.crumbs a.esc{display:inline-flex;align-items:center;min-height:44px;color:var(--brass-text);font-weight:500}
.window{position:relative;border-radius:16px;overflow:hidden;border:1px solid #2b3040;background:#171a24;box-shadow:0 40px 80px rgba(0,0,0,.45)}
.window .bar{display:flex;align-items:center;gap:12px;height:40px;padding:0 16px;border-bottom:1px solid #2b3040;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:#b3aa9c}
.window .bar i{width:10px;height:10px;border-radius:99px;background:#2b3040}
.window .url{flex:1;display:flex;align-items:center;height:26px;padding:0 12px;border-radius:999px;background:#10131c}
.edge{position:absolute;top:300px;display:flex;align-items:center;gap:10px;width:56px;height:260px;padding:18px 0;box-sizing:border-box;flex-direction:column;justify-content:space-between;background:#171a24;border:1px solid #2b3040;text-decoration:none;color:#f1e8da}
.edge .v{writing-mode:vertical-rl;font-size:14px;font-weight:500;letter-spacing:.02em}
.edge .mono{writing-mode:vertical-rl;font-size:11px;color:#b3aa9c}
.edge svg{color:#d9b475}
`;
const edgeTab = (dir, s) => `<a class="edge" href="#" style="${dir === "prev" ? "left: 0; border-left: 0; border-radius: 0 18px 18px 0" : "right: 0; border-right: 0; border-radius: 18px 0 0 18px"}" aria-label="${dir === "prev" ? "Escale précédente" : "Escale suivante"} : ${s.name}">
${dir === "prev" ? ARROW_L : ARROW_R}
<span class="v"${dir === "prev" ? ' style="transform: rotate(180deg)"' : ""}>${s.name}</span>
<span class="mono"${dir === "prev" ? ' style="transform: rotate(180deg)"' : ""}>Escale ${s.n}</span>
</a>`;

const B = page(
  "Fiche — proposition B, l'écran de bord",
  1440,
  1348,
  `<div class="f night" style="width: 1440px; position: relative; overflow: hidden">
${header()}
<nav class="crumbs" aria-label="Où suis-je">
<a class="voy" href="#">${ARROW_L}<span>Le voyage</span></a>
<span class="sep">›</span>
<a class="esc" href="#">Escale ${P.n} · ${P.place}</a>
<span class="sep">›</span>
<span>${P.name}</span>
</nav>
<section style="position: relative; display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 56px; align-items: center; padding: 40px 120px 90px">
<div style="display: flex; flex-direction: column; gap: 22px; position: relative; z-index: 1">
<p class="label">ESCALE ${P.n} · ${P.place.toUpperCase()}</p>
<h1 class="title">${P.name}</h1>
${kindLine()}
<p class="pitch">${P.pitch}</p>
<div class="links"><a class="go" href="#">Ouvrir l'app ↗</a><a class="link" href="#">Le code ↗</a></div>
</div>
<div style="position: relative">
<div style="position: absolute; right: -150px; top: -120px; width: 620px; height: 390px; opacity: .9"><img class="scene" src="${TERRE}" alt="" style="object-fit: contain"></div>
<div class="window">
<div class="bar"><i></i><i></i><i></i><span class="url">${P.url}</span></div>
${player(SHOT, "100%", "charge", "0").replace("height: charge", "aspect-ratio: 16 / 10")}
</div>
</div>
</section>
${edgeTab("prev", P.prev)}
${edgeTab("next", P.next)}
</div>
<div class="f paper" style="width: 1440px; padding: 80px 120px 100px; box-sizing: border-box; display: flex; flex-direction: column; gap: 28px">
<p class="label">POURQUOI JE L'AI FABRIQUÉ</p>
<p class="serif" style="margin: 0; max-width: 900px; font-size: 36px; line-height: 1.25">${P.why}</p>
<p class="label" style="margin-top: 30px">CE QUE ÇA FAIT</p>
${features()}
</div>`,
  B_CSS,
);

const B_PHONE = page(
  "Fiche — proposition B, l'écran de bord, sur téléphone",
  390,
  1236,
  `<div class="f night" style="width: 390px; position: relative">
${phoneHeader()}
<nav class="crumbs" aria-label="Où suis-je" style="padding: 0 20px; flex-wrap: wrap; gap: 8px 12px">
<a class="voy" href="#">${ARROW_L}<span>Le voyage</span></a>
<a class="esc" href="#">Escale ${P.n} · ${P.place}</a>
</nav>
<div style="padding: 24px 20px 32px; display: flex; flex-direction: column; gap: 18px">
<h1 class="title" style="font-size: 64px">${P.name}</h1>
${kindLine()}
<p class="pitch" style="font-size: 17px">${P.pitch}</p>
<div style="position: relative; display: flex; justify-content: center; padding: 30px 0 10px">
<div style="position: absolute; inset: 0 -20px 40% -20px; opacity: .85"><img class="scene" src="${TERRE_PHONE}" alt=""></div>
<div style="position: relative; width: 230px; padding: 10px; border-radius: 40px; background: #0b0c14; border: 1px solid #2b3040; box-shadow: 0 30px 60px rgba(0,0,0,.5)">
${player(SHOT_PHONE, "100%", "charge", "30px", "tiny").replace("height: charge", "aspect-ratio: 390 / 844")}
</div>
</div>
<div class="links"><a class="go" href="#">Ouvrir l'app ↗</a><a class="link" href="#">Le code ↗</a></div>
</div>
</div>
<div class="f paper" style="width: 390px; padding: 30px 20px 40px; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px">
<p class="label">ESCALES VOISINES</p>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">
<a href="#" class="card" style="text-decoration: none; padding: 16px"><span class="mono">← Escale ${P.prev.n}</span><h3 style="font-size: 22px">${P.prev.name}</h3></a>
<a href="#" class="card" style="text-decoration: none; padding: 16px; text-align: right"><span class="mono">Escale ${P.next.n} →</span><h3 style="font-size: 22px">${P.next.name}</h3></a>
</div>
</div>`,
  B_CSS,
);

// ————————————————————————— C « Le carnet de vol » —————————————————————————
const C_CSS = `
.hero{position:relative;width:1440px;height:820px;overflow:hidden}
.hero .veil{position:absolute;inset:0;background:linear-gradient(90deg,rgba(16,19,28,.94) 0%,rgba(16,19,28,.78) 34%,rgba(16,19,28,0) 62%)}
.ret{position:absolute;display:flex;align-items:center;gap:12px;text-decoration:none}
.ret .ring{position:relative;flex:none;width:52px;height:52px;border-radius:999px;border:2px solid #d9b475;box-shadow:0 0 0 5px rgba(23,26,36,.6);display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.ret .ring::before{content:"";width:12px;height:12px;border-radius:999px;background:#d9b475}
.ret .lab{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:999px;background:#171a24;border:1px solid #2b3040;color:#f1e8da;font-size:15px;font-weight:500;white-space:nowrap}
.strip{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:stretch;gap:0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--card)}
.strip a{display:flex;align-items:center;gap:18px;padding:22px 40px;text-decoration:none}
.strip .thumb{width:72px;height:72px}
.strip .mono{font-size:12px;color:var(--muted)}
.strip .nm{display:block;font-family:'Instrument Serif',Georgia,serif;font-size:32px;line-height:1.05}
.strip .mid{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:0 40px;border-left:1px solid var(--line);border-right:1px solid var(--line)}
`;

const C = page(
  "Fiche — proposition C, le carnet de vol",
  1440,
  1664,
  `<div class="f night" style="width: 1440px">
<div class="hero">
<img class="scene" src="${TERRE}" alt="La Terre de Magellan et l'avion qui attend" style="position: absolute; inset: 0">
<div class="veil"></div>
<div style="position: absolute; left: 0; right: 0; top: 0">${header()}</div>
<a class="ret" href="#" style="left: 120px; top: 120px"><span class="ring"></span><span class="lab">← Reprendre le voyage à l'escale ${P.n}</span></a>
<div style="position: absolute; left: 120px; bottom: 150px; width: 640px; display: flex; flex-direction: column; gap: 20px">
<p class="label">ESCALE ${P.n} · ${P.place.toUpperCase()}</p>
<h1 class="title" style="font-size: 120px">${P.name}</h1>
${kindLine()}
<p class="pitch">${P.pitch}</p>
<div class="links"><a class="go" href="#">Ouvrir l'app ↗</a><a class="link" href="#">Le code ↗</a></div>
</div>
</div>
</div>
<div class="f paper" style="width: 1440px; position: relative; padding-top: 0">
<div style="position: absolute; right: 120px; top: -230px; width: 560px; padding: 12px 12px 18px; border-radius: 22px; background: var(--card); border: 1px solid var(--line); box-shadow: 0 30px 60px rgba(20,14,8,.28); display: flex; flex-direction: column; gap: 12px">
${player(SHOT, "100%", "charge", "14px").replace("height: charge", "aspect-ratio: 16 / 10")}
<p class="mono" style="margin: 0 6px; font-size: 12px; color: var(--muted)">LA DÉMO · le globe, puis un voyage étape par étape</p>
</div>
<div style="min-height: 240px; padding: 56px 120px 48px; width: 560px; display: flex; flex-direction: column; gap: 16px">
<p class="label">POURQUOI JE L'AI FABRIQUÉ</p>
<p class="serif" style="margin: 0; font-size: 30px; line-height: 1.25">${P.why}</p>
</div>
<nav class="strip" aria-label="Escales voisines">
<a href="#"><span style="color: var(--brass)">${ARROW_L}</span><span class="thumb"><img src="${P.prev.img}" alt=""></span><span><span class="mono">ESCALE ${P.prev.n} · ${P.prev.place.toUpperCase()}</span><span class="nm">${P.prev.name}</span></span></a>
<div class="mid"><span class="mono">ESCALE ${P.n} SUR 10</span><div class="dots">${dots()}</div></div>
<a href="#" style="justify-content: flex-end; text-align: right"><span><span class="mono">ESCALE ${P.next.n} · ${P.next.place.toUpperCase()}</span><span class="nm">${P.next.name}</span></span><span class="thumb"><img src="${P.next.img}" alt=""></span><span style="color: var(--brass)">${ARROW_R}</span></a>
</nav>
<div style="padding: 80px 120px 100px; display: flex; flex-direction: column; gap: 28px">
<p class="label">CE QUE ÇA FAIT</p>
${features()}
</div>
</div>`,
  C_CSS,
);

const C_PHONE = page(
  "Fiche — proposition C, le carnet de vol, sur téléphone",
  390,
  1464,
  `<div class="f night" style="width: 390px">
<div style="position: relative; height: 560px; overflow: hidden">
<img class="scene" src="${TERRE_PHONE}" alt="La Terre de Magellan" style="position: absolute; inset: 0">
<div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(16,19,28,.7) 0%, rgba(16,19,28,0) 26%, rgba(16,19,28,0) 40%, rgba(16,19,28,.96) 72%)"></div>
<div style="position: absolute; left: 0; right: 0; top: 0">${phoneHeader()}</div>
<a class="ret" href="#" style="left: 20px; top: 96px"><span class="ring" style="width: 46px; height: 46px"></span><span class="lab" style="font-size: 14px">← Reprendre le voyage</span></a>
<div style="position: absolute; left: 20px; right: 20px; bottom: 24px; display: flex; flex-direction: column; gap: 12px">
<p class="label">ESCALE ${P.n} · ${P.place.toUpperCase()}</p>
<h1 class="title" style="font-size: 64px">${P.name}</h1>
${kindLine()}
</div>
</div>
<div style="padding: 0 20px 30px; display: flex; flex-direction: column; gap: 18px">
<p class="pitch" style="font-size: 17px">${P.pitch}</p>
<div class="links"><a class="go" href="#">Ouvrir l'app ↗</a><a class="link" href="#">Le code ↗</a></div>
</div>
</div>
<div class="f paper" style="width: 390px; padding: 0 0 40px">
<div style="padding: 28px 20px; display: flex; flex-direction: column; gap: 12px">
<p class="label">LA DÉMO</p>
${player(SHOT_PHONE, "100%", "charge", "20px", "small").replace("height: charge", "aspect-ratio: 390 / 560")}
</div>
<nav class="strip" aria-label="Escales voisines" style="grid-template-columns: repeat(2, minmax(0, 1fr))">
<a href="#" style="padding: 16px 20px; gap: 12px; border-right: 1px solid var(--line)"><span class="thumb" style="width: 44px; height: 44px"><img src="${P.prev.img}" alt=""></span><span><span class="mono">← ESCALE ${P.prev.n}</span><span class="nm" style="font-size: 22px">${P.prev.name}</span></span></a>
<a href="#" style="padding: 16px 20px; gap: 12px; justify-content: flex-end; text-align: right"><span><span class="mono">ESCALE ${P.next.n} →</span><span class="nm" style="font-size: 22px">${P.next.name}</span></span><span class="thumb" style="width: 44px; height: 44px"><img src="${P.next.img}" alt=""></span></a>
</nav>
</div>`,
  C_CSS,
);

const boards = {
  "Fiche-propal-A.dc.html": A,
  "Fiche-propal-A-mobile.dc.html": A_PHONE,
  "Fiche-propal-B.dc.html": B,
  "Fiche-propal-B-mobile.dc.html": B_PHONE,
  "Fiche-propal-C.dc.html": C,
  "Fiche-propal-C-mobile.dc.html": C_PHONE,
};
for (const [file, html] of Object.entries(boards)) fs.writeFileSync(path.join(out, file), html);
console.log(`${Object.keys(boards).length} planches dans ${out}`);
