// La bulle du copilote, plus visible : trois propositions, posées sur les planches « Cartel C » (le site tel qu'il
// est, vu sur un écran de 1920 px montré aux trois quarts) : de jour (Hublot), de nuit (Magellan) et sur téléphone
// (Tonalli). La bulle contient le tuto, comme sur le site ; elle est ouverte d'emblée et la pastille la referme (Play).
// Sur le site, la bulle restait à 380 px quand l'affiche du cartel grandit avec l'écran : ici, elle grandit aussi.
// A « La grande bulle » : liseré de laiton, le copilote en pied debout dessus.
// B « Le projecteur » : la même ; la scène s'assombrit autour, on ne voit plus qu'elle.
// C « Le contraste » : les couleurs inversées (encre sur les escales claires, crème sur les sombres), grosse pointe.
// node build-bulle-propals.cjs [dossier des planches Cartel-C]   (par défaut : project/) ; écrit dans project/.
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "project");
const src = process.argv[2] ?? out;
const IDS = JSON.parse(fs.readFileSync(path.join(__dirname, "guide.json"), "utf8"));
const ORDER = ["espace", "terre", "avion", "paris", "monuments", "route", "maison", "salon", "calendrier", "dossiers"];
const TENUES = ORDER.map((scene) => `/_blob/${IDS.tenues[scene]}`);

const CLOSE = `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const CARD = `<svg width="20" height="20" viewBox="0 0 20 20"><rect x="3" y="4" width="14" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6 8.5h8M6 11.5h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
// Le tuto, tel que sur le site (src/data/copilote.ts) ; sur téléphone, ses textes courts.
const tuto = (phone) => `<button type="button" class="cp-x" onClick="{{closeHelp}}" aria-label="Fermer">${CLOSE}</button>
<p class="cp-who">Ton copilote</p>
<p class="cp-title" id="cp-titre">Deux façons de visiter</p>
<p class="cp-text">Chaque escale est l'un de mes projets.</p>
<ul class="cp-ways">
<li><span class="cp-ic" aria-hidden="true"><span class="cp-ring"></span></span><span><b>Le voyage.</b> ${phone ? "Touche l'anneau doré ou le bouton du bas : il t'emmène à l'escale suivante." : "Clique sur l'objet entouré d'or : il t'emmène à l'escale suivante."}</span></li>
<li><span class="cp-ic" aria-hidden="true">${CARD}</span><span><b>Le détail.</b> ${phone ? "Chaque projet a sa fiche, ouverte depuis son escale. Le menu les montre tous." : "« La fiche du projet », sous le nom de chaque escale, le raconte en détail. « Les projets » les montre tous."}</span></li>
</ul>
<div class="cp-actions"><button type="button" class="go" onClick="{{closeHelp}}">Continuer le voyage →</button><a class="pill" href="Carnet.dc.html">Voir les projets</a></div>`;

// — Le style commun : la pastille, la bulle à la taille de l'affiche, le tuto —
const COMMON = `
.cp-row{position:absolute;z-index:6;right:30px;bottom:25px;display:flex;align-items:center;gap:10px}
.cp-row > .pill{zoom:.75}
.cp-wrap{position:relative;display:block;flex:none;width:64px;height:64px}
.cp-dock{position:relative;display:block;width:64px;height:64px;padding:0;overflow:hidden;border:1px solid var(--line);border-radius:999px;background:var(--card);box-shadow:0 0 0 4px var(--halo);cursor:pointer}
.cp-dock img{position:absolute;left:-24%;top:-12%;width:161%;height:161%;max-width:none;display:block}
.cp-dock[aria-expanded="true"]{border-color:var(--brass);box-shadow:0 0 0 3px var(--brass)}
.cp-bulle{position:absolute;right:-110px;bottom:calc(100% + 22px);display:flex;flex-direction:column;gap:12px;box-sizing:border-box;width:460px;padding:28px 30px 22px;border-radius:26px;background:var(--card);color:var(--ink);box-shadow:0 30px 80px rgba(0,0,0,.35);transform-origin:76% 100%;animation:cpPop .4s cubic-bezier(.2,.9,.3,1.15) both}
.cp-bulle::before{content:"";position:absolute;left:308px;bottom:-11px;width:20px;height:20px;background:inherit;border:inherit;border-top:0;border-left:0;transform:rotate(45deg)}
.cp-fig{position:absolute;pointer-events:none}
.cp-fig img{display:block;width:100%;height:100%}
.cp-x{position:absolute;top:10px;right:10px;display:flex;align-items:center;justify-content:center;width:48px;height:48px;padding:0;border:0;border-radius:999px;background:none;color:var(--muted);cursor:pointer}
.cp-x:hover{background:var(--line);color:var(--ink)}
.cp-who{margin:0;font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;color:var(--brass-text)}
.cp-title{margin:0;padding-right:40px;font-family:'Instrument Serif',Georgia,serif;font-size:44px;line-height:1}
.cp-text{margin:0;font-size:17px;line-height:1.5}
.cp-ways{display:flex;flex-direction:column;gap:12px;margin:2px 0 0;padding:0;list-style:none}
.cp-ways li{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:start;gap:14px;font-size:16px;line-height:1.5;color:var(--muted)}
.cp-ways b{font-weight:600;color:var(--ink)}
.cp-ic{display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:40px;height:40px;border:1px solid var(--line);border-radius:999px;color:var(--brass-text)}
.cp-ring{position:relative;display:block;box-sizing:border-box;width:18px;height:18px;border:2px solid var(--brass);border-radius:999px}
.cp-ring::after{content:"";position:absolute;inset:3px;border-radius:999px;background:var(--brass)}
.cp-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding-top:6px}
.cp-actions .go{min-height:52px;padding:0 24px;font-size:16px;border:0}
.cp-actions .pill{min-height:52px;font-size:15px}
@keyframes cpPop{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:none}}
@keyframes cpFig{from{opacity:0;transform:translate(60px,50px) rotate(18deg) scale(.6)}to{opacity:1;transform:none}}
.cp-scrim{position:absolute;inset:0;z-index:5;border:0;padding:0;background:rgba(11,12,20,.6);animation:fadeIn .3s both;cursor:pointer}
.cp-phone .cp-bulle{left:0;right:0;width:auto;bottom:calc(100% + 16px);padding:20px 20px 16px;gap:9px;border-radius:20px;transform-origin:20% 100%}
.cp-phone .cp-bulle::before{left:78px}
.cp-phone .cp-title{font-size:32px}
.cp-phone .cp-text{font-size:15px}
.cp-phone .cp-ways li{font-size:14px;grid-template-columns:34px minmax(0,1fr);gap:12px}
.cp-phone .cp-ic{width:34px;height:34px}
.cp-phone .cp-actions{flex-direction:column;align-items:stretch;gap:8px}
.cp-phone .cp-actions .go{min-height:48px;padding:0 16px;font-size:15px}
.cp-phone .cp-actions .pill{flex:none;width:auto;min-height:46px;padding:0 18px;justify-content:center;font-size:15px}
@media (prefers-reduced-motion: reduce){.cp-bulle,.cp-fig{animation:none}}
`;
const VARIANTS = {
  // A : la grande bulle, liseré de laiton, le copilote en pied debout dessus.
  A: {
    css: `
.cp-bulle{border:2px solid var(--brass)}
.cp-fig{right:-26px;top:-206px;width:236px;height:236px;animation:cpFig .9s .05s cubic-bezier(.2,.8,.25,1) both}
.cp-phone .cp-fig{right:-14px;top:-150px;width:170px;height:170px}`,
    fig: true,
  },
  // B : la scène s'assombrit autour de la bulle ; un clic dans le noir la referme.
  B: {
    css: `
.cp-bulle{border:1px solid var(--brass)}
.cp-fig{right:-26px;top:-206px;width:236px;height:236px;animation:cpFig .9s .05s cubic-bezier(.2,.8,.25,1) both}
.cp-phone .cp-fig{right:-14px;top:-150px;width:170px;height:170px}`,
    fig: true,
    scrim: true,
  },
  // C : les couleurs inversées de l'escale ; une grosse pointe de bande dessinée vers la pastille.
  C: {
    css: `
.cp-bulle{border:3px solid var(--brass);background:var(--inv-card);color:var(--inv-ink);--card:var(--inv-card);--ink:var(--inv-ink);--muted:var(--inv-muted);--line:var(--inv-line);--brass-text:var(--inv-brass)}
.cp-bulle::before{width:30px;height:30px;bottom:-17px;left:303px;border-width:3px}
.cp-fig{right:22px;top:-120px;width:150px;height:150px;animation:cpFig .9s .05s cubic-bezier(.2,.8,.25,1) both}
.cp-phone .cp-bulle::before{left:73px}
.cp-phone .cp-fig{right:8px;top:-108px;width:130px;height:130px}`,
    fig: true,
  },
};

function make(file, base, k, { phone }) {
  const v = VARIANTS[k];
  let h = fs.readFileSync(path.join(src, base), "utf8");
  const sub = (a, b) => {
    if (!h.includes(a)) throw new Error(`${file} : introuvable « ${a.slice(0, 70)} »`);
    h = h.replace(a, b);
  };
  h = h.replace(/<title>[^<]*<\/title>/, `<title>INDEX — la bulle du copilote, proposition ${k}${phone ? ", sur téléphone" : ""}</title>`);
  sub("</helmet>", `<style>${COMMON}${v.css}</style>\n</helmet>`);
  const fig = v.fig ? `<div class="cp-fig" aria-hidden="true"><img src="{{tenue}}" alt=""></div>` : "";
  const bulle = `<sc-if value="{{helpOpen}}" hint-placeholder-val="{{ true }}"><aside class="cp-bulle" aria-labelledby="cp-titre" style="{{invVars}}">${fig}
${tuto(phone)}
</aside></sc-if>`;
  const dock = `<button type="button" class="cp-dock" onClick="{{toggleHelp}}" aria-label="Ton copilote : comment visiter ?" aria-expanded="{{helpOpen}}"><img src="{{tenue}}" alt=""></button>`;
  const scrim = v.scrim ? `<sc-if value="{{helpOpen}}" hint-placeholder-val="{{ true }}"><button type="button" class="cp-scrim" onClick="{{closeHelp}}" aria-label="Fermer"></button></sc-if>\n` : "";
  if (phone) {
    // Dans la barre du bas, entre le retour et l'escale suivante ; la bulle au-dessus, sur toute la largeur.
    const back = `<button type="button" class="pill" onClick="{{back}}" aria-label="{{backLabel}}">←</button>`;
    sub(back, `${back}\n<span class="cp-wrap" style="width:52px;height:52px">${dock.replace('class="cp-dock"', 'class="cp-dock" style="width:52px;height:52px;box-shadow:none"')}</span>`);
    sub('<nav class="ui m-nav"', `${scrim}<nav class="ui m-nav cp-phone" style="z-index:6"`);
    // La bulle se pose dans la barre, au-dessus d'elle.
    sub("</nav>\n</sc-if>\n<sc-if value=\"{{menuOpen}}\"", `${bulle}\n</nav>\n</sc-if>\n<sc-if value="{{menuOpen}}"`);
  } else {
    const back = `<button type="button" class="pill ui" onClick="{{back}}" style="position:absolute;right:40px;bottom:40px">← {{prevPlace}}</button>`;
    sub(back, `${scrim}<div class="ui cp-row"><span class="cp-wrap">${dock}
${bulle}</span><button type="button" class="pill" onClick="{{back}}">← {{prevPlace}}</button></div>`);
  }
  // La logique : la bulle ouverte d'emblée ; la tenue de l'escale ; les couleurs inversées de C.
  sub("menu: false };\n  }", "menu: false, help: true };\n  }");
  sub("  renderVals() {", "  baseVals() {");
  const logic = `
  renderVals() {
    const v = this.baseVals();
    const D = Component.DATA;
    const T = ${JSON.stringify(TENUES)};
    const s = D[this.state.i];
    const dark = /--card:#171A24/i.test(s.vars || "");
    const inv = dark
      ? "--inv-card:#FBF7F0;--inv-ink:#241E18;--inv-muted:#5A4F44;--inv-line:#E3D8C8;--inv-brass:#84652F"
      : "--inv-card:#241E18;--inv-ink:#F6F1E9;--inv-muted:#CBBFAE;--inv-line:#4A4036;--inv-brass:#D9B475";
    return Object.assign(v, {
      helpOpen: !s.intro && !!this.state.help,
      toggleHelp: () => this.setState({ help: !this.state.help }),
      closeHelp: () => this.setState({ help: false }),
      tenue: s.intro ? "" : T[this.state.i - 1],
      invVars: inv,
    });
  }`;
  sub("\n}\nComponent.DATA", `\n${logic}\n}\nComponent.DATA`);
  fs.writeFileSync(path.join(out, file), h);
}

for (const k of Object.keys(VARIANTS)) {
  make(`Bulle-${k}.dc.html`, "Cartel-C.dc.html", k, { phone: false });
  make(`Bulle-${k}-nuit.dc.html`, "Cartel-C-nuit.dc.html", k, { phone: false });
  make(`Bulle-${k}-mobile.dc.html`, "Cartel-C-mobile.dc.html", k, { phone: true });
}
console.log("ok · 9 planches de la bulle");
