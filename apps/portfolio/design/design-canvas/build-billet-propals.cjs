// La carte d'embarquement, ailleurs que dans le voyage : trois endroits où la poser.
// 1 « La fiche » : le billet de « Comment c'est fait » devient une vraie carte d'embarquement, d'Index (IDX) vers
//   le projet (HBL) ; son talon de laiton ouvre l'app. Montré sur la fiche de Hublot.
// 2 « Le départ » : le visiteur reçoit son billet pour le voyage, de l'espace aux dossiers ; le talon décolle.
// 3 « L'aperçu » : l'image de partage d'une fiche devient la carte d'embarquement du projet (Magellan).
// Les planches partent de project/Fiche-hublot, Depart(-mobile) et Apercu-fiche (build-voyage-boards.cjs).
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "project");

// Le billet est toujours sur papier ; son bandeau est à l'encre de nuit, son talon en laiton.
const PAPER = "--ink:#241E18;--muted:#6A5F52;--card:#FBF7F0;--line:#E3D8C8;--brass:#B08A4F;--brass-text:#84652F;--on-brass:#241E18";
// Un avion vu de dessus, nez à droite.
const PLANE = `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.5 12c0-1 1-1.2 2.5-1.2h13c1.4 0 2.2.6 2.2 1.2s-.8 1.2-2.2 1.2H6c-1.5 0-2.5-.2-2.5-1.2zM10.5 10.8 8 3.5h2l5 7.3zM10.5 13.2 8 20.5h2l5-7.3zM4.6 10.8 3.4 7.5h1.2l2.2 3.3zM4.6 13.2l-1.2 3.3h1.2l2.2-3.3z"/></svg>`;
// Les encoches de la ligne pointillée : un masque, deux demi-cercles de chaque côté.
const NOTCH_X = (x) =>
  `radial-gradient(circle at ${x} 0,transparent 12px,#000 12.5px) top/100% 51% no-repeat,radial-gradient(circle at ${x} 100%,transparent 12px,#000 12.5px) bottom/100% 51% no-repeat`;
const NOTCH_Y = (y) =>
  `radial-gradient(circle at 0 ${y},transparent 12px,#000 12.5px) left/51% 100% no-repeat,radial-gradient(circle at 100% ${y},transparent 12px,#000 12.5px) right/51% 100% no-repeat`;

// Le style commun des billets.
const COMMON = `
.pass{${PAPER};color:var(--ink)}
.pass .tilt{filter:drop-shadow(0 1px 0 rgba(36,30,24,.14)) drop-shadow(0 22px 30px rgba(20,14,8,.22))}
.pass .paper{background:var(--card);border-radius:18px;overflow:hidden}
.pass .band{display:flex;align-items:center;justify-content:space-between;gap:12px;height:38px;margin:0;padding:0 22px;background:#171A24;color:#D9B475;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}
.pass .k{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.pass .route{display:flex;align-items:flex-end;gap:14px}
.pass .route>div{display:flex;flex-direction:column;gap:2px;min-width:0}
.pass .route>div:last-child{text-align:right;align-items:flex-end}
.pass .code{font-family:'Instrument Serif',Georgia,serif;font-size:56px;line-height:.9;letter-spacing:.02em}
.pass .city{font-size:13px;color:var(--muted)}
.pass .path{flex:1;display:flex;align-items:center;gap:8px;padding-bottom:30px;color:var(--brass)}
.pass .path::before,.pass .path::after{content:"";flex:1;border-top:2px dotted var(--brass)}
.pass dl{display:grid;gap:14px 18px;margin:0}
.pass dl div{display:flex;flex-direction:column;gap:3px;min-width:0}
.pass dt{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.pass dd{margin:0;font-size:14px;font-weight:500}
.pass .gate{display:flex;text-decoration:none;background:var(--brass);color:var(--on-brass);border:0;font:inherit;cursor:pointer;transition:filter .2s}
.v .pass a.gate{color:var(--on-brass)}
.pass .gate:hover{filter:brightness(1.08)}
.pass .gate:focus-visible{outline:2px solid #171A24;outline-offset:-6px}
.pass .gate .k{color:inherit;opacity:.8}
.pass .gate .big{font-family:'Instrument Serif',Georgia,serif;font-size:36px;line-height:.95}
.pass .gate .act{font-size:14px;font-weight:500}
`;

function edit(base, file, title, subs) {
  let h = fs.readFileSync(path.join(out, base), "utf8");
  const sub = (a, b) => {
    if (!h.includes(a)) throw new Error(`${file} : introuvable « ${a.slice(0, 70)} »`);
    h = h.replace(a, b);
  };
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  for (const [a, b] of subs) sub(a, b);
  fs.writeFileSync(path.join(out, file), h);
  console.log("✓", file);
  return h;
}

// ————————————————————————— 1. La fiche —————————————————————————
// Une carte d'embarquement en hauteur, comme celles des portefeuilles de téléphone : elle tient dans la colonne
// du billet, et sur téléphone telle quelle.
const FICHE_CSS = `
.fpass .tilt{transform:rotate(-1deg)}
.fpass .paper{-webkit-mask:${NOTCH_Y("calc(100% - 76px)")};mask:${NOTCH_Y("calc(100% - 76px)")}}
.fpass .body{display:flex;flex-direction:column;gap:20px;padding:22px 24px 18px}
.fpass dl{grid-template-columns:repeat(2,minmax(0,1fr))}
.fpass .wide{grid-column:1/-1}
.fpass .bags ul{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.fpass .gate{align-items:center;justify-content:space-between;gap:14px;height:76px;box-sizing:border-box;padding:0 24px;border-top:2px dashed rgba(36,30,24,.3)}
.fpass .gate>span:first-child{display:flex;flex-direction:column;gap:4px}
`;
const FICHE_PASS = `<aside class="pass fpass" aria-label="La carte d'embarquement de Hublot" style="flex:2 1 360px;align-self:flex-start">
<div class="tilt"><div class="paper">
<p class="band"><span>Carte d'embarquement</span><span>Vol 010</span></p>
<div class="body">
<div class="route">
<div><span class="k">Départ</span><span class="code">IDX</span><span class="city">Index</span></div>
<span class="path">${PLANE}</span>
<div><span class="k">Arrivée</span><span class="code">HBL</span><span class="city">Hublot</span></div>
</div>
<dl>
<div><dt>Passager</dt><dd>Vous</dd></div>
<div><dt>Escale</dt><dd>3 · Dans l'avion</dd></div>
<div><dt>Type</dt><dd>Robot et page web</dd></div>
<div><dt>Année</dt><dd>2026</dd></div>
<div><dt>Statut</dt><dd>En ligne</dd></div>
<div><dt>Porte</dt><dd>GitHub Pages</dd></div>
</dl>
<div class="bags"><p class="k" style="margin:0">Bagages en soute</p><ul><li class="chip">TypeScript</li><li class="chip">Node.js</li><li class="chip">GitHub Actions</li><li class="chip">ntfy</li></ul></div>
<a class="link" href="https://github.com/CantinDeBrunoy/index/tree/main/apps/hublot" target="_blank" rel="noopener" style="align-self:flex-start;min-height:32px">Lire le code ↗</a>
</div>
<a class="gate" href="https://cantindebrunoy.github.io/Hublot/" target="_blank" rel="noopener"><span><span class="k">Embarquement immédiat</span><span class="big">Embarquer</span></span><span class="act">Ouvrir l'app ↗</span></a>
</div></div>
</aside>`;

const fiche = fs.readFileSync(path.join(out, "Fiche-hublot.dc.html"), "utf8");
const oldBillet = fiche.match(/<aside class="billet"[\s\S]*?<\/aside>/);
if (!oldBillet) throw new Error("billet introuvable");
edit("Fiche-hublot.dc.html", "Billet-fiche.dc.html", "INDEX — la carte d'embarquement, sur la fiche (Hublot)", [
  ["</helmet>", `<style>${COMMON}${FICHE_CSS}</style>\n</helmet>`],
  [oldBillet[0], FICHE_PASS],
]);

// ————————————————————————— 2. Le départ —————————————————————————
// Le billet du visiteur remplace le bouton « Décoller » : son talon, c'est le décollage.
const DEPART_CSS = `
.dpass .tilt{transform:rotate(-1.2deg);transform-origin:0 100%}
.dpass .paper{display:grid;grid-template-columns:minmax(0,1fr) 168px;-webkit-mask:${NOTCH_X("calc(100% - 168px)")};mask:${NOTCH_X("calc(100% - 168px)")}}
.dpass .main{display:flex;flex-direction:column;min-width:0}
.dpass .body{display:flex;flex-direction:column;gap:16px;padding:18px 24px 20px}
.dpass .code{font-size:34px}
/* Sur la nuit, le bandeau s'éclaircit un peu pour ne pas se fondre dans le fond. */
.dpass .band,.dpass-m .band{background:#2B3040}
.dpass .path{padding-bottom:22px}
.dpass dl{grid-template-columns:repeat(3,auto);justify-content:start;gap:4px 28px}
.dpass .stub{display:flex;flex-direction:column;border-left:2px dashed rgba(36,30,24,.3)}
.dpass .stub .band{justify-content:center;padding:0 12px}
.dpass .gate{flex:1;flex-direction:column;justify-content:center;align-items:flex-start;gap:6px;padding:16px 18px;text-align:left}
.dpass .gate .big{font-size:31px;white-space:nowrap}
.dpass-m .paper{-webkit-mask:${NOTCH_Y("calc(100% - 56px)")};mask:${NOTCH_Y("calc(100% - 56px)")}}
.dpass-m .band{height:30px;padding:0 16px;font-size:10px}
.dpass-m .body{display:flex;flex-direction:column;gap:6px;padding:12px 16px 12px}
.dpass-m .route{align-items:center;gap:10px}
.dpass-m .route>div{flex-direction:row;align-items:baseline;gap:0}
.dpass-m .code{font-size:26px;letter-spacing:0}
.dpass-m .path{padding-bottom:0}
.dpass-m .meta{margin:0;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;color:var(--brass-text)}
.dpass-m .gate{align-items:center;justify-content:space-between;height:56px;box-sizing:border-box;width:100%;padding:0 18px;border-top:2px dashed rgba(36,30,24,.3)}
.dpass-m .gate .big{font-size:28px}
`;
const DEPART_PASS = `<div class="pass dpass" style="max-width:600px;padding:4px 0 6px">
<div class="tilt"><div class="paper">
<div class="main">
<p class="band"><span>Carte d'embarquement</span><span>Passager : vous</span></p>
<div class="body">
<div class="route">
<div><span class="k">Départ</span><span class="code">L'espace</span></div>
<span class="path">${PLANE}</span>
<div><span class="k">Arrivée</span><span class="code">Les dossiers</span></div>
</div>
<dl><div><dt>Escales</dt><dd>10</dd></div><div><dt>Projets</dt><dd>11</dd></div><div><dt>Formalités</dt><dd>Aucune : ni compte, ni cookie</dd></div></dl>
</div>
</div>
<div class="stub">
<p class="band">Porte 01</p>
<button type="button" class="gate" onClick="{{start}}"><span class="k">Embarquement immédiat</span><span class="big">Décoller →</span></button>
</div>
</div></div>
</div>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:14px">
<a class="pill" href="Apps.dc.html">Ouvrir une app</a>
<a class="pill" href="Carnet.dc.html">Voir tous les projets</a>
</div>`;
edit("Depart.dc.html", "Billet-depart.dc.html", "INDEX — la carte d'embarquement, au départ", [
  ["</helmet>", `<style>${COMMON}${DEPART_CSS}</style>\n</helmet>`],
  [
    `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding-top:6px">
<button type="button" class="go" onClick="{{start}}" style="border:0">Décoller →</button>
<a class="pill" href="Apps.dc.html">Ouvrir une app</a>
<a class="pill" href="Carnet.dc.html">Voir tous les projets</a>
</div>`,
    DEPART_PASS,
  ],
  ['<main class="ui" style="position:absolute;left:96px;top:50%;transform:translateY(-46%);width:660px;display:flex;flex-direction:column;gap:26px">', '<main class="ui" style="position:absolute;left:96px;top:50%;transform:translateY(-48%);width:660px;display:flex;flex-direction:column;gap:22px">'],
]);

const DEPART_PASS_M = `<div class="pass dpass-m">
<div class="tilt"><div class="paper">
<p class="band"><span>Carte d'embarquement</span><span>Passager : vous</span></p>
<div class="body">
<div class="route">
<div><span class="code">L'espace</span></div>
<span class="path">${PLANE}</span>
<div><span class="code">Les dossiers</span></div>
</div>
<p class="meta">10 escales · 11 projets · ni compte, ni cookie</p>
</div>
<button type="button" class="gate" onClick="{{start}}"><span class="big">Décoller</span><span class="act">Porte 01 →</span></button>
</div></div>
</div>
<div style="display:flex;gap:10px"><a class="pill" href="Apps-mobile.dc.html" style="flex:1;justify-content:center">Ouvrir une app</a><a class="pill" href="Carnet.dc.html" style="flex:1;justify-content:center">Tous les projets</a></div>`;
edit("Depart-mobile.dc.html", "Billet-depart-mobile.dc.html", "INDEX — la carte d'embarquement, au départ, sur téléphone", [
  ["</helmet>", `<style>${COMMON}${DEPART_CSS}</style>\n</helmet>`],
  [
    `<div style="display:flex;flex-direction:column;gap:10px;padding-top:4px">
<button type="button" class="go" onClick="{{start}}" style="border:0;justify-content:center">Décoller →</button>
<div style="display:flex;gap:10px"><a class="pill" href="Apps-mobile.dc.html" style="flex:1;justify-content:center">Ouvrir une app</a><a class="pill" href="Carnet.dc.html" style="flex:1;justify-content:center">Tous les projets</a></div>
</div>`,
    `<div style="display:flex;flex-direction:column;gap:12px;padding-top:2px">${DEPART_PASS_M}</div>`,
  ],
  [
    '<main class="ui" style="position:absolute;left:20px;right:20px;top:392px;display:flex;flex-direction:column;gap:14px">\n<p class="mono" style="margin:0;font-size:12px;color:var(--brass-text)">Index · depuis 2022</p>',
    '<main class="ui" style="position:absolute;left:20px;right:20px;top:372px;display:flex;flex-direction:column;gap:12px">',
  ],
  [
    `<p style="margin:0;font-size:15px;line-height:1.6;color:var(--muted)">Je fabrique les outils qui me manquent. Ici, chacun devient un objet du décor : la planète, l'avion, le hublot, la station… Clique dessus pour passer à l'escale suivante.</p>`,
    `<p style="margin:0;font-size:14px;line-height:1.5;color:var(--muted)">Je fabrique les outils qui me manquent. Ici, chacun devient un objet du décor : touche-le pour passer à l'escale suivante.</p>`,
  ],
]);

// ————————————————————————— 3. L'aperçu de partage —————————————————————————
// Ce qu'on voit quand on envoie le lien d'une fiche : la scène de l'escale, et la carte d'embarquement du projet.
const APERCU_CSS = `
.apass .tilt{transform:rotate(-1.5deg);transform-origin:0 100%;filter:drop-shadow(0 26px 40px rgba(0,0,0,.45))}
.apass .paper{display:grid;grid-template-columns:minmax(0,1fr) 170px;-webkit-mask:${NOTCH_X("calc(100% - 170px)")};mask:${NOTCH_X("calc(100% - 170px)")}}
.apass .band{height:44px;font-size:13px;padding:0 26px;background:#2B3040}
.apass .body{display:flex;flex-direction:column;gap:12px;padding:20px 28px 24px}
.apass h1{margin:0;font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:84px;line-height:.92}
.apass .pitch{margin:0;font-size:21px;line-height:1.4}
.apass dl{grid-template-columns:repeat(3,auto);justify-content:start;gap:4px 32px;padding-top:6px}
.apass dt{font-size:12px}
.apass dd{font-size:17px}
.apass .stub{display:flex;flex-direction:column;border-left:2px dashed rgba(36,30,24,.3)}
.apass .stub .band{justify-content:center;padding:0 12px}
.apass .gate{flex:1;flex-direction:column;justify-content:center;align-items:center;gap:6px;cursor:default}
.apass .gate:hover{filter:none}
.apass .gate .big{font-size:88px;line-height:.85}
.apass .gate .k{font-size:12px}
`;
edit("Apercu-fiche.dc.html", "Billet-apercu.dc.html", "INDEX — la carte d'embarquement, en aperçu de partage (Magellan)", [
  ["</helmet>", `<style>${COMMON}${APERCU_CSS}</style>\n</helmet>`],
  [
    /<article style="position:absolute;left:40px;bottom:40px;width:540px[\s\S]*?<\/article>/.exec(
      fs.readFileSync(path.join(out, "Apercu-fiche.dc.html"), "utf8"),
    )[0],
    `<div class="pass apass" style="position:absolute;left:44px;bottom:46px;width:760px">
<div class="tilt"><div class="paper">
<div style="display:flex;flex-direction:column;min-width:0">
<p class="band"><span>Carte d'embarquement</span><span>Escale 2 · La Terre</span></p>
<div class="body">
<h1>Magellan</h1>
<p class="pitch">Un globe qui colorie les pays que j'ai traversés et trace chaque voyage, sans compte ni serveur.</p>
<dl><div><dt>Type</dt><dd>App web et mobile</dd></div><div><dt>Année</dt><dd>2026</dd></div><div><dt>Statut</dt><dd>Bientôt en ligne</dd></div></dl>
</div>
</div>
<div class="stub">
<p class="band">IDX → MGL</p>
<div class="gate"><span class="k">Vol</span><span class="big">005</span></div>
</div>
</div></div>
</div>`,
  ],
]);
