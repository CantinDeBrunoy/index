// Le cartel des escales, plus voyant : trois propositions, chacune sur une escale de jour (Hublot), une de nuit
// (Magellan) et sur téléphone (Tonalli), plus la version d'aujourd'hui pour comparer.
// A « Le contraste » : la même carte, plus grande, dans la palette inverse de son escale, et portée par une ombre.
// B « Le billet » : une carte d'embarquement posée sur la scène ; son talon de laiton ouvre l'app.
// C « L'affiche » : plus de carte : le nom du projet en très grand, à même la scène, comme le titre du départ.
// Sur ordinateur, le reste de l'interface (en-tête, anneau, retour) est dessiné à l'échelle d'un écran de 1920 px,
// où il garde ses tailles fixes ; seul le cartel change d'une rangée à l'autre. Sur le site, le cartel grandirait
// avec l'écran : il garde partout la place qu'il a ici.
// Lancer d'abord build-voyage-boards.cjs : les planches partent de project/Escale3(-mobile).dc.html.
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "project");

// Les palettes : la nuit (cartes sombres) et le papier (cartes claires).
const NIGHT = "--ink:#F1E8DA;--muted:#B3AA9C;--card:#171A24;--line:#2B3040;--brass:#D9B475;--brass-text:#D9B475;--on-brass:#0B0C14";
const PAPER = "--ink:#241E18;--muted:#6A5F52;--card:#FBF7F0;--line:#E3D8C8;--brass:#B08A4F;--brass-text:#84652F;--on-brass:#241E18";

// L'état du site aujourd'hui : Magellan, gym-picker et Cancionero n'ont pas encore d'adresse.
const SOON = new Set(["Magellan", "gym-picker", "Cancionero"]);

function patchData(h) {
  const m = h.match(/Component\.DATA = (\[.*?\]);\n/);
  if (!m) throw new Error("DATA introuvable");
  const D = JSON.parse(m[1]).map((s, i) => {
    if (s.intro) return s;
    const night = s.vars.includes("--card:#171A24");
    if (SOON.has(s.name)) {
      s.kind = s.kind.replace(/ · [^·]+$/, " · Bientôt en ligne");
      Object.assign(s, { hasDemo: false, noDemo: true, noDemoLabel: "App bientôt en ligne" });
    }
    const [type, year, status = "À télécharger"] = s.kind.split(" · ");
    const archive = s.noDemoLabel.startsWith("Archive");
    const stub = s.hasDemo
      ? { k: "Porte ouverte", big: "Embarquer", act: s.demoLabel }
      : s.name === "INDEX"
        ? { k: "Embarqué", big: "Vous y êtes", act: "C'est ce site" }
        : archive
          ? { k: "Arrivée", big: "Atterri", act: "Archive, pas d'app" }
          : { k: "Prochain départ", big: "Bientôt", act: "L'app arrive" };
    return Object.assign(s, {
      type,
      year,
      status,
      step: `Escale ${i} / 10`,
      invVars: night ? PAPER : NIGHT,
      paperVars: PAPER,
      stub,
      stubOff: !s.hasDemo,
    });
  });
  return h.replace(m[0], `Component.DATA = ${JSON.stringify(D)};\n`);
}

// Le reste de l'interface à l'échelle d'un écran de 1920 px : ses tailles sont fixes, il y paraît 0,75 fois moins grand.
const ZOOM_UI = `.stage header.ui,.stage .spot,.stage .tag,.stage button.pill.ui{zoom:.75}`;

// Les liens du cartel, communs aux trois propositions (ordinateur).
const LINKS = `<a class="link" href="{{s.fiche}}">La fiche du projet →</a>
<sc-if value="{{s.hasCode}}" hint-placeholder-val="{{ true }}"><a class="link" href="{{s.code}}" target="_blank" rel="noopener">Le code ↗</a></sc-if>`;
const LINKS_M = `<a class="link" href="{{s.fiche}}">La fiche →</a>
<sc-if value="{{s.hasCode}}" hint-placeholder-val="{{ true }}"><a class="link" href="{{s.code}}" target="_blank" rel="noopener">Le code ↗</a></sc-if>`;
const EXTRA = (cls) => `<sc-if value="{{s.hasExtra}}" hint-placeholder-val="{{ false }}"><p class="${cls}">{{s.extra}}</p></sc-if>`;
// Sur téléphone, le bouton du bas (l'escale suivante) reste le seul en laiton : celui de l'app est à l'encre.
const APP_M = `<sc-if value="{{s.hasDemo}}" hint-placeholder-val="{{ true }}"><a class="app-m" href="{{s.demo}}" target="{{s.demoTarget}}" rel="noopener">{{s.demoShort}}</a></sc-if>`;
const COMMON_M = `.app-m{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:999px;background:var(--ink);color:var(--card);font-size:14px;font-weight:500;text-decoration:none;white-space:nowrap}
.v a.app-m{color:var(--card)}`;

// ————————————————————————— Aujourd'hui —————————————————————————
const TODAY = { css: `.stage article.ui{zoom:.75}`, cssM: "" };

// ————————————————————————— A. Le contraste —————————————————————————
const A = {
  css: `.ca{position:absolute;left:40px;bottom:40px;width:560px;box-sizing:border-box;padding:28px 32px 18px;border-radius:20px;background:var(--card);color:var(--ink);display:flex;flex-direction:column;gap:12px;box-shadow:0 32px 70px -24px rgba(20,14,8,.6),0 6px 18px -6px rgba(20,14,8,.28)}
.ca-kind{margin:0;display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;color:var(--brass-text)}
.num{display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:999px;background:var(--brass);color:var(--on-brass);font-weight:500}
.ca h1{margin:0;font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:72px;line-height:.95;letter-spacing:-.01em}
.ca-pitch{margin:0;font-size:17px;line-height:1.5}
.ca-extra{margin:0;font-size:14px;line-height:1.5;color:var(--muted)}
.ca-actions{display:flex;flex-wrap:wrap;align-items:center;gap:4px 24px;padding-top:6px}
.ca-actions .go{min-height:52px;padding:0 26px;font-size:16px}
.note{font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--muted)}`,
  markup: `<article class="ui ca" style="{{s.invVars}}">
<p class="ca-kind"><span class="num">{{s.num}}</span><span>{{s.kind}}</span></p>
<h1>{{s.name}}</h1>
<p class="ca-pitch">{{s.pitch}}</p>
${EXTRA("ca-extra")}
<div class="ca-actions">
<sc-if value="{{s.hasDemo}}" hint-placeholder-val="{{ true }}"><a class="go" href="{{s.demo}}" target="{{s.demoTarget}}" rel="noopener">{{s.demoLabel}}</a></sc-if>
${LINKS}
<sc-if value="{{s.noDemo}}" hint-placeholder-val="{{ false }}"><span class="note">{{s.noDemoLabel}}</span></sc-if>
</div>
</article>`,
  cssM: `${COMMON_M}
.cam{position:absolute;left:16px;right:16px;top:484px;box-sizing:border-box;padding:18px 20px 12px;border-radius:18px;background:var(--card);color:var(--ink);display:flex;flex-direction:column;gap:8px;box-shadow:0 22px 44px -18px rgba(20,14,8,.6)}
.cam .ca-kind{margin:0;display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;color:var(--brass-text)}
.num{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:999px;background:var(--brass);color:var(--on-brass);font-weight:500}
.cam h1{margin:0;font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:46px;line-height:.95}
.cam p.pitch{margin:0;font-size:15px;line-height:1.45}
.cam p.extra{margin:0;font-size:12px;line-height:1.45;color:var(--muted)}
.cam .row{display:flex;flex-wrap:wrap;align-items:center;gap:0 18px;padding-top:2px}
.note{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;color:var(--muted)}`,
  markupM: `<article class="ui cam" style="{{s.invVars}}">
<p class="ca-kind"><span class="num">{{s.num}}</span><span>{{s.kind}}</span></p>
<h1>{{s.name}}</h1>
<p class="pitch">{{s.pitch}}</p>
${EXTRA("extra")}
<div class="row">${APP_M}
${LINKS_M}
<sc-if value="{{s.noDemo}}" hint-placeholder-val="{{ false }}"><span class="note">{{s.noDemoLabel}}</span></sc-if>
</div>
</article>`,
};

// ————————————————————————— B. Le billet —————————————————————————
// Le billet : à gauche le projet, à droite le talon, séparés par une ligne pointillée et deux encoches (un masque).
const NOTCH = (x) =>
  `radial-gradient(circle at ${x} 0,transparent 13px,#000 13.5px) top/100% 51% no-repeat,radial-gradient(circle at ${x} 100%,transparent 13px,#000 13.5px) bottom/100% 51% no-repeat`;
const NOTCH_M = (y) =>
  `radial-gradient(circle at 0 ${y},transparent 11px,#000 11.5px) left/51% 100% no-repeat,radial-gradient(circle at 100% ${y},transparent 11px,#000 11.5px) right/51% 100% no-repeat`;
const B = {
  css: `.cb{position:absolute;left:46px;bottom:50px}
.tilt{transform:rotate(-1.5deg);transform-origin:0 100%;filter:drop-shadow(0 24px 30px rgba(20,14,8,.32)) drop-shadow(0 3px 6px rgba(20,14,8,.18))}
.stage.enter .tilt{animation:ticketIn .8s .4s cubic-bezier(.2,.9,.3,1.12) both}
@keyframes ticketIn{from{opacity:0;transform:translateY(60px) rotate(-7deg)}to{opacity:1;transform:rotate(-1.5deg)}}
.ticket{display:grid;grid-template-columns:450px 190px;width:640px;border-radius:18px;background:var(--card);color:var(--ink);overflow:hidden;-webkit-mask:${NOTCH("450px")};mask:${NOTCH("450px")}}
.band{display:flex;align-items:center;justify-content:space-between;gap:12px;height:38px;padding:0 24px;background:#171A24;color:#D9B475;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}
.main{display:flex;flex-direction:column}
.body{display:flex;flex-direction:column;gap:10px;padding:18px 26px 6px}
.cb h1{margin:0;font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:60px;line-height:.95;letter-spacing:-.01em}
.pitch{margin:0;font-size:15px;line-height:1.5}
.extra{margin:0;font-size:13px;line-height:1.45;color:var(--muted)}
.meta{display:flex;gap:22px;margin:2px 0 0;padding-top:12px;border-top:1px solid var(--line)}
.meta div{display:flex;flex-direction:column;gap:3px}
.meta dt{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.meta dd{margin:0;font-size:14px;font-weight:500;white-space:nowrap}
.links{display:flex;flex-wrap:wrap;gap:0 22px}
.stub{display:flex;flex-direction:column;border-left:2px dashed rgba(36,30,24,.3)}
.stub .band{justify-content:center;padding:0 12px}
.gate{flex:1;display:flex;flex-direction:column;justify-content:center;gap:8px;padding:18px 20px;background:var(--brass);color:var(--on-brass);text-decoration:none;transition:filter .2s}
.v a.gate{color:var(--on-brass)}
a.gate:hover{filter:brightness(1.08)}
a.gate:focus-visible{outline:2px solid #171A24;outline-offset:-6px;border-radius:10px}
.gate.off{background:#EFE6D8;color:var(--muted)}
.gate .k{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.gate .big{font-family:'Instrument Serif',Georgia,serif;font-size:36px;line-height:.95}
.gate .act{font-size:14px;font-weight:500}
@media (prefers-reduced-motion: reduce){.stage.enter .tilt{animation:fadeIn .3s both}}`,
  markup: `<div class="ui cb" style="{{s.paperVars}}"><div class="tilt"><article class="ticket">
<div class="main">
<p class="band" style="margin:0"><span>Carte d'embarquement</span><span>{{s.step}}</span></p>
<div class="body">
<h1>{{s.name}}</h1>
<p class="pitch">{{s.pitch}}</p>
${EXTRA("extra")}
<dl class="meta"><div><dt>Type</dt><dd>{{s.type}}</dd></div><div><dt>Année</dt><dd>{{s.year}}</dd></div><div><dt>Statut</dt><dd>{{s.status}}</dd></div></dl>
<div class="links">${LINKS}</div>
</div>
</div>
<div class="stub">
<p class="band" style="margin:0">Vol {{s.num}}</p>
<sc-if value="{{s.hasDemo}}" hint-placeholder-val="{{ true }}"><a class="gate" href="{{s.demo}}" target="{{s.demoTarget}}" rel="noopener"><span class="k">{{s.stub.k}}</span><span class="big">{{s.stub.big}}</span><span class="act">{{s.stub.act}}</span></a></sc-if>
<sc-if value="{{s.stubOff}}" hint-placeholder-val="{{ false }}"><div class="gate off"><span class="k">{{s.stub.k}}</span><span class="big">{{s.stub.big}}</span><span class="act">{{s.stub.act}}</span></div></sc-if>
</div>
</article></div></div>`,
  cssM: `${COMMON_M}
.cbm{position:absolute;left:16px;right:16px;top:464px}
.tilt{transform:rotate(-1deg);filter:drop-shadow(0 18px 24px rgba(20,14,8,.3)) drop-shadow(0 2px 5px rgba(20,14,8,.16))}
.stage.enter .tilt{animation:ticketIn .8s .4s cubic-bezier(.2,.9,.3,1.12) both}
@keyframes ticketIn{from{opacity:0;transform:translateY(50px) rotate(-5deg)}to{opacity:1;transform:rotate(-1deg)}}
.ticket{display:flex;flex-direction:column;border-radius:16px;background:var(--card);color:var(--ink);overflow:hidden;-webkit-mask:${NOTCH_M("calc(100% - 58px)")};mask:${NOTCH_M("calc(100% - 58px)")}}
.band{display:flex;align-items:center;justify-content:space-between;gap:10px;height:32px;margin:0;padding:0 18px;background:#171A24;color:#D9B475;font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}
.body{display:flex;flex-direction:column;gap:6px;padding:12px 18px 0}
.cbm h1{margin:0;font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:42px;line-height:.95}
.pitch{margin:0;font-size:14px;line-height:1.45}
.extra{margin:0;font-size:12px;line-height:1.4;color:var(--muted)}
.links{display:flex;gap:0 18px}
.gate{display:flex;align-items:center;justify-content:space-between;gap:12px;height:58px;box-sizing:border-box;padding:0 18px;border-top:2px dashed rgba(36,30,24,.3);background:var(--brass);color:var(--on-brass);text-decoration:none}
.v a.gate{color:var(--on-brass)}
.gate.off{background:#EFE6D8;color:var(--muted)}
.gate .big{font-family:'Instrument Serif',Georgia,serif;font-size:28px;line-height:1}
.gate .act{font-size:14px;font-weight:500}
@media (prefers-reduced-motion: reduce){.stage.enter .tilt{animation:fadeIn .3s both}}`,
  markupM: `<div class="ui cbm" style="{{s.paperVars}}"><div class="tilt"><article class="ticket">
<p class="band"><span>Carte d'embarquement</span><span>Vol {{s.num}}</span></p>
<div class="body">
<h1>{{s.name}}</h1>
<p class="pitch">{{s.pitch}}</p>
${EXTRA("extra")}
<div class="links">${LINKS_M}</div>
</div>
<sc-if value="{{s.hasDemo}}" hint-placeholder-val="{{ true }}"><a class="gate" href="{{s.demo}}" target="{{s.demoTarget}}" rel="noopener"><span class="big">{{s.stub.big}}</span><span class="act">{{s.stub.act}}</span></a></sc-if>
<sc-if value="{{s.stubOff}}" hint-placeholder-val="{{ false }}"><div class="gate off"><span class="big">{{s.stub.big}}</span><span class="act">{{s.stub.act}}</span></div></sc-if>
</article></div></div>`,
};

// ————————————————————————— C. L'affiche —————————————————————————
// Un voile de la couleur de l'escale monte du coin, sous le titre ; le reste de la scène reste net.
const C = {
  css: `.cc-veil{position:absolute;left:0;bottom:0;width:62%;height:66%;pointer-events:none}
.cc{position:absolute;left:56px;bottom:46px;width:720px;display:flex;flex-direction:column;gap:14px}
.cc-kind{margin:0;display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;color:var(--brass-text)}
.num{display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:999px;background:var(--brass);color:var(--on-brass);font-weight:500}
.cc h1{margin:0;font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:116px;line-height:.86;letter-spacing:-.02em;text-wrap:balance}
.cc-pitch{margin:0;max-width:540px;font-size:19px;line-height:1.5}
.cc-extra{margin:0;max-width:540px;font-size:14px;line-height:1.5;color:var(--muted)}
.cc-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px 22px;padding-top:6px}
.cc-actions .go{min-height:52px;padding:0 26px;font-size:16px}
.note{font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--muted)}`,
  markup: `<div class="ui cc-veil" aria-hidden="true" style="background:radial-gradient(farthest-side at 0% 100%,{{s.bg}} 0%,{{s.bg}} 38%,transparent 100%)"></div>
<article class="ui cc">
<p class="cc-kind"><span class="num">{{s.num}}</span><span>{{s.kind}}</span></p>
<h1>{{s.name}}</h1>
<p class="cc-pitch">{{s.pitch}}</p>
${EXTRA("cc-extra")}
<div class="cc-actions">
<sc-if value="{{s.hasDemo}}" hint-placeholder-val="{{ true }}"><a class="go" href="{{s.demo}}" target="{{s.demoTarget}}" rel="noopener">{{s.demoLabel}}</a></sc-if>
${LINKS}
<sc-if value="{{s.noDemo}}" hint-placeholder-val="{{ false }}"><span class="note">{{s.noDemoLabel}}</span></sc-if>
</div>
</article>`,
  cssM: `${COMMON_M}
.ccm-veil{position:absolute;left:0;right:0;top:384px;height:100px;pointer-events:none}
.ccm{position:absolute;left:20px;right:20px;top:446px;display:flex;flex-direction:column;gap:8px}
.ccm .kind{margin:0;display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;color:var(--brass-text)}
.num{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:999px;background:var(--brass);color:var(--on-brass);font-weight:500}
.ccm h1{margin:0;font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:64px;line-height:.88;letter-spacing:-.015em}
.ccm .pitch{margin:0;font-size:15px;line-height:1.45}
.ccm .extra{margin:0;font-size:12px;line-height:1.45;color:var(--muted)}
.ccm .row{display:flex;flex-wrap:wrap;align-items:center;gap:0 18px;padding-top:4px}
.note{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;color:var(--muted)}`,
  markupM: `<div class="ui ccm-veil" aria-hidden="true" style="background:linear-gradient(180deg,transparent 0%,{{s.bg}} 100%)"></div>
<article class="ui ccm">
<p class="kind"><span class="num">{{s.num}}</span><span>{{s.kind}}</span></p>
<h1>{{s.name}}</h1>
<p class="pitch">{{s.pitch}}</p>
${EXTRA("extra")}
<div class="row">${APP_M}
${LINKS_M}
<sc-if value="{{s.noDemo}}" hint-placeholder-val="{{ false }}"><span class="note">{{s.noDemoLabel}}</span></sc-if>
</div>
</article>`,
};

// Une planche : l'escale 3 (ou sa version téléphone), qui démarre à l'escale `start`, avec un autre cartel.
function make(file, { phone, start, title, prop }) {
  const base = phone ? "Escale3-mobile.dc.html" : "Escale3.dc.html";
  let h = fs.readFileSync(path.join(out, base), "utf8");
  const sub = (a, b) => {
    if (!h.includes(a)) throw new Error(`${file} : introuvable « ${a.slice(0, 60)} »`);
    h = h.replace(a, b);
  };
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  sub("this.state = { i: 3, phase: \"idle\", soft: false, veil: Component.DATA[3].bg", `this.state = { i: ${start}, phase: "idle", soft: false, veil: Component.DATA[${start}].bg`);
  h = patchData(h);
  const css = phone ? prop.cssM : `${ZOOM_UI}\n${prop.css}`;
  if (css) sub("</helmet>", `<style>\n${css}\n</style>\n</helmet>`);
  const markup = phone ? prop.markupM : prop.markup;
  if (markup) {
    const re = phone ? /<article class="ui m-card">[\s\S]*?<\/article>/ : /<article class="ui" style="position:absolute;left:40px;bottom:40px[\s\S]*?<\/article>/;
    if (!re.test(h)) throw new Error(`${file} : cartel introuvable`);
    h = h.replace(re, markup);
  }
  fs.writeFileSync(path.join(out, file), h);
  console.log("✓", file);
}

const ROWS = [
  ["Aujourdhui", "Le cartel d'aujourd'hui", TODAY],
  ["A", "Cartel A, le contraste", A],
  ["B", "Cartel B, le billet", B],
  ["C", "Cartel C, l'affiche", C],
];
for (const [k, name, prop] of ROWS) {
  make(`Cartel-${k}.dc.html`, { start: 3, title: `INDEX — ${name}, de jour`, prop });
  make(`Cartel-${k}-nuit.dc.html`, { start: 2, title: `INDEX — ${name}, de nuit`, prop });
  make(`Cartel-${k}-mobile.dc.html`, { phone: true, start: 9, title: `INDEX — ${name}, sur téléphone`, prop });
}
