// « Les apps » façon tableau des départs : trois propositions, chacune sur ordinateur (1440) et téléphone (390).
// A « Le tableau » : d'après la référence de Cantin (capitales condensées, destinations jaunes, étiquettes).
// B « Les volets » : le tableau à palettes, les lettres tombent à l'arrivée.
// C « L'écran ambré » : l'affichage à points lumineux, un bandeau d'infos qui défile.
// Le statut : À l'heure (l'app répond), Retardé (elle se réveille), Annulé (hors ligne), Atterri (archive).
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "project");
const FONTS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&amp;family=Geist:wght@300..600&amp;family=Geist+Mono:wght@400..500&amp;family=Barlow+Condensed:wght@500;600;700&amp;family=Oswald:wght@500;600&amp;family=Doto:wght@500..900&amp;display=swap">`;

const DEPARTS = [
  { num: "005", name: "Magellan", via: "Le globe de mes voyages", gate: "Cloudflare", year: "2026", status: "ontime" },
  { num: "006", name: "Cancionero", via: "L'espagnol en chansons", gate: "Vercel", year: "2026", status: "ontime" },
  { num: "007", name: "Mithril", via: "Coffre à mots de passe, Windows", gate: "GitHub", year: "2026", status: "download" },
  { num: "008", name: "Tonalli", via: "Un rituel à deux, chaque jour", gate: "Vercel", year: "2026", status: "delayed" },
  { num: "009", name: "gym-picker", via: "La salle la moins embouteillée", gate: "Cloudflare", year: "2026", status: "ontime" },
  { num: "010", name: "Hublot", via: "Le guet des prix des vols", gate: "GitHub", year: "2026", status: "ontime" },
  { num: "011", name: "INDEX", via: "Ce site, et le dépôt qui réunit tout", gate: "Cloudflare", year: "2026", status: "here" },
];
const ARRIVEES = [
  { num: "001", name: "Métro Pathfinder", via: "Le plus court chemin dans le métro", gate: "—", year: "2022", status: "landed" },
  { num: "002", name: "API REST .NET", via: "Des microservices C#, tests d'abord", gate: "—", year: "2023", status: "landed" },
  { num: "003", name: "Visit Match", via: "Des voyageurs solo qui se trouvent", gate: "—", year: "2023", status: "landed" },
  { num: "004", name: "Galaxy Escape", via: "Une course sans fin dans l'espace", gate: "—", year: "2024", status: "landed" },
];
const STATUS = {
  ontime: { label: "À l'heure", tone: "green", action: "Embarquer →" },
  delayed: { label: "Retardé", tone: "amber", action: "Embarquer →" },
  download: { label: "À télécharger", tone: "blue", action: "Télécharger ↓" },
  here: { label: "Vous y êtes", tone: "white", action: "Le code ↗" },
  landed: { label: "Atterri", tone: "grey", action: "La fiche →" },
};
const LEGEND = [
  ["green", "À l'heure", "l'app répond"],
  ["amber", "Retardé", "elle se réveille, quelques secondes"],
  ["red", "Annulé", "hors ligne, je suis prévenu"],
  ["grey", "Atterri", "une archive, sa fiche raconte le voyage"],
];
const up = (s) => s.toLocaleUpperCase("fr-FR");

// — L'en-tête du site, comme sur les autres pages (onglet « Les apps ») —
const BASE_STYLE = `<style>
body{margin:0}
.v a{color:inherit}
.v a:focus-visible{outline:2px solid #d9b475;outline-offset:3px}
.serif{font-family:'Instrument Serif',Georgia,serif;font-weight:400}
.mono{font-family:'Geist Mono',ui-monospace,monospace}
.site{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 0}
.brand{display:inline-flex;align-items:baseline;gap:12px;min-height:44px;text-decoration:none;color:#f1e8da}
.tabs{display:inline-flex;align-items:center;gap:2px;padding:4px;border-radius:999px;border:1px solid #2b3040;background:#171a24}
.tabs a{display:inline-flex;align-items:center;min-height:38px;padding:0 14px;border-radius:999px;font-family:'Geist',system-ui,sans-serif;font-size:14px;text-decoration:none;color:#f1e8da;white-space:nowrap}
.tabs a[aria-current]{background:#f1e8da;color:#171a24}
.lang a{min-width:40px;justify-content:center;padding:0 10px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px}
.burger{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:999px;border:1px solid #2b3040;background:#171a24;color:#f1e8da}
</style>`;
const header = (phone) =>
  phone
    ? `<header class="site" style="padding:8px 0"><a class="brand" href="#"><span class="serif" style="font-style:italic;font-size:28px">Index</span></a><div style="display:flex;align-items:center;gap:8px"><nav class="tabs lang"><a href="#" aria-current="page">FR</a><a href="#">EN</a></nav><span class="burger" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 20 20"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span></div></header>`
    : `<header class="site"><a class="brand" href="#"><span class="serif" style="font-style:italic;font-size:32px">Index</span><span class="mono" style="font-size:12px;color:#b3aa9c">Cantin Roquier</span></a><div style="display:flex;align-items:center;gap:10px"><nav class="tabs"><a href="#">Le voyage</a><a href="#" aria-current="page">Les apps</a><a href="#">Les projets</a><a href="#">À propos</a></nav><nav class="tabs lang"><a href="#" aria-current="page">FR</a><a href="#">EN</a></nav></div></header>`;

// L'heure du tableau tourne pour de vrai sur le canvas.
const LOGIC = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { now: Date.now() };
  }
  componentDidMount() {
    this.timer = setInterval(() => this.setState({ now: Date.now() }), 10000);
  }
  componentWillUnmount() {
    clearInterval(this.timer);
  }
  renderVals() {
    const d = new Date(this.state.now);
    return {
      time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      date: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }).toUpperCase(),
    };
  }
}`;

const page = (title, body, w, h, style) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
${FONTS}
${BASE_STYLE}
${style}
</helmet>
${body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${w},"height":${h}}}'>
${LOGIC}
</script>
</body>
</html>
`;
const write = (name, html) => fs.writeFileSync(path.join(out, `${name}.dc.html`), html);

// ————————————————————————— A. Le tableau —————————————————————————
const A_STYLE = `<style>
.a{min-height:100vh;background:#0a0b0e;color:#ece8df;font-family:'Barlow Condensed','Oswald',sans-serif;-webkit-font-smoothing:antialiased}
.a-wrap{max-width:1280px;margin:0 auto;padding:0 64px 56px}
.a-top{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:36px 0 22px}
.a-h1{margin:0;font-size:104px;font-weight:700;line-height:.86;letter-spacing:.01em;text-transform:uppercase}
.a-sub{margin:10px 0 0;font-size:18px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:#8f95a0}
.a-clock{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.a-clock b{font-size:72px;font-weight:600;line-height:.9;color:#f5c443;font-variant-numeric:tabular-nums}
.a-clock span{font-size:15px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#8f95a0}
.a-board{border:1px solid #1b1e25;border-radius:6px;background:#0e1014;padding:4px 22px}
.a-row{display:grid;grid-template-columns:132px 84px 250px minmax(0,1fr) 128px 74px 156px;align-items:center;gap:16px;min-height:58px;border-bottom:1px solid #1b1e25}
.a-row:last-child{border-bottom:0}
.a-head{min-height:40px;font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#6c727d}
.a-tag{justify-self:start;display:inline-flex;align-items:center;padding:3px 9px;border:1.5px solid currentColor;border-radius:3px;font-size:14px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.t-green{color:#63d297}.t-amber{color:#f5c443}.t-red{color:#ef6b6b}.t-grey{color:#7d838e}
.t-blue{background:#6ec1f0;border-color:#6ec1f0;color:#0a0b0e}.t-white{background:#ece8df;border-color:#ece8df;color:#0a0b0e}
.a-num{font-size:17px;font-weight:500;letter-spacing:.08em;color:#8f95a0}
.a-dest{font-size:30px;font-weight:600;letter-spacing:.02em;text-transform:uppercase;color:#f5c443;white-space:nowrap}
.a-via{overflow:hidden;font-size:16px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:#a9a49a;text-overflow:ellipsis;white-space:nowrap}
.a-gate,.a-year{font-size:17px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
.a-go{justify-self:end;display:inline-flex;align-items:center;min-height:38px;padding:0 16px;border-radius:3px;background:#f5c443;color:#0a0b0e !important;font-size:16px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;white-space:nowrap}
.a-go.ghost{background:none;border:1.5px solid #ece8df;color:#ece8df !important}
.a-go.link{background:none;padding:0;color:#a9a49a !important}
.blink{animation:blink 1.2s steps(2,start) infinite}
@keyframes blink{to{visibility:hidden}}
.a-old .a-dest{color:#bdb7ab}
.a-h2{margin:0;font-size:56px;font-weight:700;line-height:.9;text-transform:uppercase}
.a-legend{display:flex;flex-wrap:wrap;gap:10px 26px;margin:22px 4px 0;padding:0;list-style:none;font-size:16px;font-weight:500;letter-spacing:.04em;color:#8f95a0}
.a-legend li{display:flex;align-items:center;gap:10px}
.a-legend .a-tag{font-size:12px;padding:2px 7px}
/* Téléphone */
.ap .a-wrap{padding:0 16px 24px}
.ap .a-top{padding:6px 0 14px}
.ap .a-h1{font-size:58px}
.ap .a-sub{font-size:13px}
.ap .a-clock b{font-size:34px}
.ap .a-clock span{font-size:11px}
.ap .a-board{padding:2px 14px}
.ap .a-row{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"dest tag" "meta go";gap:3px 10px;min-height:0;padding:8px 0}
.ap .a-dest{grid-area:dest;font-size:25px}
.ap .a-tag{grid-area:tag;justify-self:end;font-size:12px;padding:2px 7px}
.ap .a-meta{grid-area:meta;font-size:13px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:#8f95a0}
.ap .a-go{grid-area:go;min-height:32px;padding:0 12px;font-size:14px}
.ap .a-arr{margin:14px 2px 0;font-size:15px;font-weight:500;letter-spacing:.04em;line-height:1.4;color:#8f95a0}
.ap .a-arr b{font-weight:600;color:#bdb7ab;text-transform:uppercase}
</style>`;
const aTag = (s) => `<span class="a-tag t-${STATUS[s].tone}${s === "delayed" ? " blink" : ""}">${STATUS[s].label}</span>`;
const aGo = (s) => `<a class="a-go${s === "here" ? " ghost" : s === "landed" ? " link" : ""}" href="#">${STATUS[s].action}</a>`;
const aRow = (r) =>
  `<div class="a-row">${aTag(r.status)}<span class="a-num">IDX ${r.num}</span><span class="a-dest">${r.name}</span><span class="a-via">${r.via}</span><span class="a-gate">${r.gate}</span><span class="a-year">${r.year}</span>${aGo(r.status)}</div>`;
const aHead = `<div class="a-row a-head"><span>Statut</span><span>Vol</span><span>Destination</span><span>Via</span><span>Porte</span><span>Depuis</span><span></span></div>`;
const aDesktop = `<div class="v a">
<div class="a-wrap">
${header(false)}
<section class="a-top"><div><h1 class="a-h1">Départs</h1><p class="a-sub">Departures · toutes mes apps, prêtes à embarquer</p></div><div class="a-clock"><b>{{time}}</b><span>{{date}} · statut vérifié il y a 6 min</span></div></section>
<div class="a-board">${aHead}${DEPARTS.map(aRow).join("")}</div>
<section class="a-top" style="padding-top:44px"><div><h2 class="a-h2">Arrivées</h2><p class="a-sub">Arrivals · les archives, déjà posées</p></div></section>
<div class="a-board a-old">${ARRIVEES.map(aRow).join("")}</div>
<ul class="a-legend">${LEGEND.map(([tone, label, text]) => `<li><span class="a-tag t-${tone}">${label}</span>${text}</li>`).join("")}</ul>
</div>
</div>`;
const aPhone = `<div class="v a ap">
<div class="a-wrap">
${header(true)}
<section class="a-top"><div><h1 class="a-h1">Départs</h1><p class="a-sub">Mes apps, prêtes à embarquer</p></div><div class="a-clock"><b>{{time}}</b><span>{{date}}</span></div></section>
<div class="a-board">${DEPARTS.map((r) => `<div class="a-row"><span class="a-dest">${r.name}</span>${aTag(r.status)}<span class="a-meta">IDX ${r.num} · ${r.gate} · ${r.year}</span>${aGo(r.status)}</div>`).join("")}</div>
<p class="a-arr">Arrivées : ${ARRIVEES.map((r) => `<b>${r.name}</b>`).join(", ")} →</p>
</div>
</div>`;

// ————————————————————————— B. Les volets —————————————————————————
// Chaque caractère sur sa palette ; à l'arrivée, les palettes tombent l'une après l'autre.
const B_STYLE = `<style>
.b{min-height:100vh;background:#0b0b0c;color:#f3efe6;font-family:'Oswald','Barlow Condensed',sans-serif;-webkit-font-smoothing:antialiased}
.b-wrap{max-width:1280px;margin:0 auto;padding:0 64px 56px}
.b-top{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:34px 0 22px}
.b-title{display:flex;align-items:center;gap:18px}
.b-title small{font-size:15px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:#8a8a8a}
.b-board{padding:22px 26px 18px;border-radius:12px;border:1px solid #262626;background:#121212;box-shadow:inset 0 2px 0 rgba(255,255,255,.03),0 30px 70px rgba(0,0,0,.45)}
.b-cols,.b-row{display:grid;grid-template-columns:auto auto auto auto 1fr;align-items:center;gap:18px}
.b-cols{padding:0 0 12px;font-size:12px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#7a7a7a}
.b-row{padding:5px 0}
.fl{display:inline-flex;gap:2px}
.fl i{position:relative;display:inline-flex;align-items:center;justify-content:center;width:21px;height:34px;border-radius:3px;background:linear-gradient(180deg,#262626 0 50%,#1d1d1d 50% 100%);font-style:normal;font-size:21px;font-weight:500;line-height:1;transform-origin:50% 50%;animation:flap .55s cubic-bezier(.3,1.4,.5,1) calc(var(--d) * 1ms) both}
.fl i::after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:rgba(0,0,0,.75)}
.fl.big i{width:46px;height:68px;font-size:46px;border-radius:5px}
.fl.amber i{color:#f5c443}.fl.green i{color:#6bd49a}.fl.blue i{color:#7cc6f2}.fl.grey i{color:#8a8a8a}.fl.white i{color:#f3efe6}
@keyframes flap{0%{transform:rotateX(90deg);filter:brightness(.4)}70%{transform:rotateX(-12deg)}100%{transform:none;filter:none}}
.b-go{justify-self:end;display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border-radius:4px;background:#f5c443;color:#0b0b0c !important;font-size:15px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;white-space:nowrap}
.b-go.ghost{background:none;border:1.5px solid #f3efe6;color:#f3efe6 !important}
.b-go.link{background:none;padding:0;color:#8a8a8a !important}
.b-blink i{animation:flap .55s cubic-bezier(.3,1.4,.5,1) calc(var(--d) * 1ms) both,dim 1.4s steps(2,start) 2s infinite}
@keyframes dim{to{color:#5a4a1e}}
.b-legend{display:flex;flex-wrap:wrap;gap:10px 28px;margin:20px 4px 0;padding:0;list-style:none;font-size:15px;letter-spacing:.04em;color:#8a8a8a}
.b-legend b{font-weight:500;letter-spacing:.1em;text-transform:uppercase}
/* Téléphone */
.bp .b-wrap{padding:0 14px 24px}
.bp .b-top{padding:4px 0 14px}
.bp .fl.big i{width:24px;height:38px;font-size:25px;border-radius:4px}
.bp .b-board{padding:12px 12px 10px;border-radius:10px}
.bp .b-row{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"dest go" "meta meta";gap:4px 8px;padding:7px 0;border-bottom:1px solid #1f1f1f}
.bp .b-row:last-child{border-bottom:0}
.bp .fl i{width:15px;height:24px;font-size:15px;border-radius:2px}
.bp .b-dest{grid-area:dest}
.bp .b-go{grid-area:go;min-height:30px;padding:0 10px;font-size:13px}
.bp .b-meta{grid-area:meta;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#7a7a7a}
.bp .b-meta em{font-style:normal}
.bp .b-arr{margin:12px 2px 0;font-size:14px;letter-spacing:.04em;line-height:1.45;color:#8a8a8a}
</style>`;
const pad = (s, n) => up(s).slice(0, n).padEnd(n, " ");
let delay = 0;
const flaps = (text, n, cls = "", step = 16) =>
  `<span class="fl${cls ? ` ${cls}` : ""}">${[...pad(text, n)].map((c) => `<i style="--d:${(delay += step)}">${c === " " ? "" : c}</i>`).join("")}</span>`;
const bTone = { ontime: "green", delayed: "amber", download: "blue", here: "white", landed: "grey" };
const bGo = (s) => `<a class="b-go${s === "here" ? " ghost" : s === "landed" ? " link" : ""}" href="#">${STATUS[s].action}</a>`;
const bRow = (r, i) => {
  delay = i * 70;
  const statusFlaps = flaps(STATUS[r.status].label, 13, bTone[r.status], 10);
  return `<div class="b-row">${flaps(r.num, 3)}${flaps(r.name, 16)}${flaps(r.gate, 10)}${r.status === "delayed" ? statusFlaps.replace('class="fl amber"', 'class="fl amber b-blink"') : statusFlaps}${bGo(r.status)}</div>`;
};
const bCols = `<div class="b-cols"><span style="width:67px">Vol</span><span style="width:366px">Destination</span><span style="width:228px">Porte</span><span>Remarque</span><span></span></div>`;
delay = 0;
const bTitle = (big) => `<h1 class="b-title" aria-label="Départs" style="margin:0">${flaps("Départs", 7, `white${big ? " big" : ""}`, 40)}${big ? `<small aria-hidden="true">Departures<br>toutes mes apps</small>` : ""}</h1>`;
const bDesktop = `<div class="v b">
<div class="b-wrap">
${header(false)}
<section class="b-top">${bTitle(true)}${(() => { delay = 300; return flaps("21:47", 5, "amber big", 60); })()}</section>
<div class="b-board">${bCols}${DEPARTS.map(bRow).join("")}</div>
<section class="b-top" style="padding-top:40px">${(() => { delay = 900; return `<div class="b-title">${flaps("Arrivées", 8, "white big", 40)}<small>Arrivals<br>les archives</small></div>`; })()}</section>
<div class="b-board">${ARRIVEES.map((r, i) => bRow(r, i + 8)).join("")}</div>
<ul class="b-legend">${LEGEND.map(([, label, text]) => `<li><b>${label}</b> ${text}</li>`).join("")}</ul>
</div>
</div>`;
delay = 0;
const bPhone = `<div class="v b bp">
<div class="b-wrap">
${header(true)}
<section class="b-top"><h1 aria-label="Départs" style="margin:0">${(() => { delay = 0; return flaps("Départs", 7, "white big", 40); })()}</h1>${(() => { delay = 200; return flaps("21:47", 5, "amber big", 50); })()}</section>
<div class="b-board">${DEPARTS.map((r, i) => {
  delay = i * 60;
  return `<div class="b-row"><span class="b-dest">${flaps(r.name, 12)}</span>${bGo(r.status)}<span class="b-meta">IDX ${r.num} · ${r.gate} · <em style="color:${{ green: "#6bd49a", amber: "#f5c443", blue: "#7cc6f2", white: "#f3efe6", grey: "#8a8a8a" }[bTone[r.status]]}">${STATUS[r.status].label}</em></span></div>`;
}).join("")}</div>
<p class="b-arr">Arrivées : ${ARRIVEES.map((r) => r.name).join(", ")} →</p>
</div>
</div>`;

// ————————————————————————— C. L'écran ambré —————————————————————————
const C_STYLE = `<style>
.c{min-height:100vh;background:#08080a;color:#ffb020;font-family:'Doto','Geist Mono',monospace;-webkit-font-smoothing:antialiased}
.c-wrap{max-width:1280px;margin:0 auto;padding:0 64px 56px}
.c-panel{position:relative;margin-top:22px;padding:26px 30px 0;border-radius:10px;border:1px solid #1e1a12;background:radial-gradient(circle,#1c1407 1px,transparent 1.6px) 0 0/6px 6px,#050404;box-shadow:0 30px 80px rgba(0,0,0,.5);overflow:hidden}
.led{font-weight:800;text-shadow:0 0 6px rgba(255,176,32,.55),0 0 18px rgba(255,140,0,.25);letter-spacing:.04em;text-transform:uppercase}
.c-top{display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:18px;border-bottom:1px dashed #3a2a0c}
.c-top h1{margin:0;font-size:64px;line-height:1}
.c-top small{display:block;margin-top:6px;font-size:18px;color:#b97d14}
.c-clock{font-size:56px;line-height:1}
.c-cols,.c-row{display:grid;grid-template-columns:96px 120px 330px 200px minmax(0,1fr) auto;align-items:center;gap:14px}
.c-cols{padding:16px 0 8px;font-family:'Geist Mono',monospace;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#7d5410}
.c-row{min-height:50px;font-size:26px;border-bottom:1px solid #1a1309}
.c-row:last-of-type{border-bottom:0}
.c-dim{color:#b97d14}
.c-on{color:#ffd27a}
.c-blink{animation:cblink 1s steps(2,start) infinite}
@keyframes cblink{to{opacity:.15}}
.c-go{justify-self:end;display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border:1.5px solid #ffb020;border-radius:3px;font-family:'Geist Mono',monospace;font-size:13px;font-weight:500;letter-spacing:.08em;color:#ffb020 !important;text-decoration:none;text-transform:uppercase;white-space:nowrap;text-shadow:none}
.c-go.solid{background:#ffb020;color:#08080a !important}
.c-sep{padding:22px 0 6px;font-size:30px;border-top:1px dashed #3a2a0c;margin-top:8px}
.c-ticker{display:flex;margin:18px -30px 0;padding:12px 0;border-top:1px solid #2a1d08;background:#0b0804;white-space:nowrap;overflow:hidden}
.c-ticker span{display:inline-block;padding-left:100%;font-size:22px;animation:tick 26s linear infinite}
@keyframes tick{to{transform:translateX(-100%)}}
.c-legend{display:flex;flex-wrap:wrap;gap:10px 28px;margin:20px 4px 0;padding:0;list-style:none;font-family:'Geist Mono',monospace;font-size:13px;color:#a0742a}
.c-legend b{color:#ffb020;font-weight:500}
/* Téléphone */
.cp .c-wrap{padding:0 12px 20px}
.cp .c-panel{margin-top:6px;padding:16px 14px 0}
.cp .c-top h1{font-size:40px}
.cp .c-top small{font-size:12px}
.cp .c-clock{font-size:34px}
.cp .c-row{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"dest go" "rem rem";gap:2px 8px;min-height:0;padding:8px 0;font-size:20px}
.cp .c-dest{grid-area:dest}
.cp .c-rem{grid-area:rem;font-size:15px}
.cp .c-go{grid-area:go;min-height:30px;padding:0 10px;font-size:11px}
.cp .c-ticker{margin:12px -14px 0;padding:9px 0}
.cp .c-ticker span{font-size:16px;animation-duration:20s}
</style>`;
const cRem = { ontime: ["À l'heure", "c-on"], delayed: ["Retardé", "c-on c-blink"], download: ["À télécharger", "c-on"], here: ["Vous y êtes", "c-on"], landed: ["Atterri", "c-dim"] };
const cGo = (s) => `<a class="c-go${s === "ontime" || s === "delayed" ? " solid" : ""}" href="#">${STATUS[s].action}</a>`;
const cRow = (r) =>
  `<div class="c-row led"><span class="c-dim">${r.year}</span><span class="c-dim">IDX${r.num}</span><span>${up(r.name)}</span><span class="c-dim">${up(r.gate)}</span><span class="${cRem[r.status][1]}">${up(cRem[r.status][0])}</span>${cGo(r.status)}</div>`;
const TICKER =
  "Info voyageurs ··· Tonalli : retardé, la base se réveille, quelques secondes ··· Mithril : à télécharger porte GitHub ··· Index : vous y êtes ··· Bon voyage ···";
const cDesktop = `<div class="v c">
<div class="c-wrap">
${header(false)}
<div class="c-panel">
<div class="c-top led"><div><h1>Départs</h1><small>Departures · toutes mes apps</small></div><div class="c-clock">{{time}}</div></div>
<div class="c-cols"><span>Depuis</span><span>Vol</span><span>Destination</span><span>Porte</span><span>Remarque</span><span></span></div>
${DEPARTS.map(cRow).join("")}
<div class="c-sep led">Arrivées <span class="c-dim" style="font-size:18px">· les archives</span></div>
${ARRIVEES.map(cRow).join("")}
<div class="c-ticker led"><span>${up(TICKER)}</span></div>
</div>
<ul class="c-legend">${LEGEND.map(([, label, text]) => `<li><b>${up(label)}</b> ${text}</li>`).join("")}</ul>
</div>
</div>`;
const cPhone = `<div class="v c cp">
<div class="c-wrap">
${header(true)}
<div class="c-panel">
<div class="c-top led"><div><h1>Départs</h1><small>Toutes mes apps</small></div><div class="c-clock">{{time}}</div></div>
${DEPARTS.map((r) => `<div class="c-row led"><span class="c-dest">${up(r.name)}</span>${cGo(r.status)}<span class="c-rem"><span class="c-dim">IDX${r.num} · ${up(r.gate)} · </span><span class="${cRem[r.status][1]}">${up(cRem[r.status][0])}</span></span></div>`).join("")}
<div class="c-ticker led"><span>${up(TICKER)}</span></div>
</div>
</div>
</div>`;

const H = { A: 1230, B: 1070, C: 1100 };
write("Departs-A", page("INDEX — Les apps, proposition A : le tableau", aDesktop, 1440, H.A, A_STYLE));
write("Departs-A-mobile", page("INDEX — Les apps, proposition A : le tableau · mobile", aPhone, 390, 844, A_STYLE));
write("Departs-B", page("INDEX — Les apps, proposition B : les volets", bDesktop, 1440, H.B, B_STYLE));
write("Departs-B-mobile", page("INDEX — Les apps, proposition B : les volets · mobile", bPhone, 390, 844, B_STYLE));
write("Departs-C", page("INDEX — Les apps, proposition C : l'écran ambré", cDesktop, 1440, H.C, C_STYLE));
write("Departs-C-mobile", page("INDEX — Les apps, proposition C : l'écran ambré · mobile", cPhone, 390, 844, C_STYLE));
console.log("ok : 6 planches (3 propositions × ordinateur et téléphone)");
