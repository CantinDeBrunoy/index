// Le guide du voyage : un petit astronaute accueille le visiteur à la première escale et lui explique le principe.
// Trois propositions, chacune sur ordinateur (1440 × 900) et téléphone (390 × 844), tirées de l'escale 1 :
// A « La bulle » : un seul message de bienvenue, puis il s'en va.
// B « La visite » : il propose une visite en trois temps ; chaque étape éclaire un élément (la carte, l'anneau, les points).
// C « Le copilote » (retenu) : il accueille et donne les deux façons de visiter (le voyage, ou le détail des projets),
// puis se range dans un coin ; il change de tenue à chaque escale, et on le rappelle pour savoir où on en est.
// Lancer d'abord build-voyage-boards.cjs : les planches partent de project/Escale1(-mobile).dc.html.
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "project");
const IDS = JSON.parse(fs.readFileSync(path.join(__dirname, "guide.json"), "utf8"));
const ASTRO = `/_blob/${IDS.astronaute}`;

const CLOSE_ICON = `<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const RING = `<span class="mini-ring" aria-hidden="true"></span>`;
// Garde le mot et l'icône d'anneau ensemble (et le deux-points français), pour qu'aucune ligne ne commence par l'icône.
const nw = (s) => `<span style="white-space:nowrap">${s}</span>`;

// — Le style commun : l'astronaute qui arrive en flottant, la bulle, sa pointe, ses boutons —
const COMMON = `
.guide{position:absolute;inset:0;z-index:2;pointer-events:none}
.guide .bubble,.guide button,.guide a{pointer-events:auto}
.stage.leave .guide{opacity:0;transition:opacity .3s}
.astro{position:absolute;pointer-events:none;animation:astroIn 1.5s 1.1s cubic-bezier(.2,.8,.25,1) both}
.astro img,.peek img{display:block;width:100%;height:100%}
@keyframes astroIn{from{opacity:0;transform:translate(220px,160px) rotate(28deg) scale(.6)}to{opacity:1;transform:none}}
.bubble{position:absolute;box-sizing:border-box;padding:22px 24px 16px;border-radius:20px;background:var(--card);border:1px solid var(--line);box-shadow:0 24px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:10px;color:var(--ink);transform-origin:var(--origin,right center);animation:bubbleIn .55s 2s cubic-bezier(.2,.9,.3,1.15) both;transition:top .5s cubic-bezier(.3,.8,.3,1)}
@keyframes bubbleIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:none}}
.bubble::before{content:"";position:absolute;display:none;width:16px;height:16px;background:var(--card);border:1px solid var(--line)}
.tail-r::before{display:block;right:-9px;top:var(--tail);transform:rotate(45deg);border-left:0;border-bottom:0}
.tail-b::before{display:block;bottom:-9px;left:var(--tail);transform:rotate(45deg);border-top:0;border-left:0}
.tail-t::before{display:block;top:-9px;left:var(--tail);transform:rotate(45deg);border-bottom:0;border-right:0}
.b-eye{margin:0;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--brass-text)}
.b-title{margin:0;padding-right:36px;font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:34px;line-height:1}
.b-text{margin:0;font-size:15px;line-height:1.55}
.b-text.muted{font-size:14px;color:var(--muted)}
.b-actions{display:flex;flex-wrap:wrap;align-items:center;gap:4px 20px;padding-top:6px}
.go.sm{min-height:44px;padding:0 20px;font-size:14px;border:0}
.b-skip{min-height:44px;padding:0;border:0;background:none;font-size:14px;color:var(--muted);text-decoration:underline;text-underline-offset:4px}
.b-skip:hover{color:var(--ink)}
.x{position:absolute;top:8px;right:8px;display:flex;align-items:center;justify-content:center;width:44px;height:44px;padding:0;border:0;border-radius:999px;background:none;color:var(--muted)}
.x:hover{background:var(--line);color:var(--ink)}
.mini-ring{display:inline-block;position:relative;width:16px;height:16px;margin:0 2px;border-radius:999px;border:2px solid var(--brass);box-sizing:border-box;vertical-align:-3px}
.mini-ring::after{content:"";position:absolute;inset:3px;border-radius:999px;background:var(--brass)}
.guide.bye .astro{animation:astroOut .8s cubic-bezier(.5,0,.8,.3) forwards}
@keyframes astroOut{to{opacity:0;transform:translate(260px,-320px) rotate(-30deg) scale(.5)}}
.guide.bye .bubble{animation:bubbleOut .3s ease-in forwards}
@keyframes bubbleOut{to{opacity:0;transform:scale(.9)}}
.stage.nudge .ring::after{animation-duration:1.1s}
.stage.nudge .lab{background:var(--brass);border-color:var(--brass);color:var(--on-brass)}
.bubble.m{padding:18px 18px 14px;border-radius:18px;gap:8px;--origin:center bottom;animation-delay:1.3s}
.bubble.m .b-title{font-size:30px}
.bubble.m .b-text{font-size:14px;line-height:1.5}
.bubble.m .b-actions{gap:4px 16px}
.bubble.m .b-actions .go{flex:1;justify-content:center}
.peek{position:absolute;right:-16px;top:-110px;width:136px;height:136px;pointer-events:none;animation:astroIn 1.3s 1.5s cubic-bezier(.2,.8,.25,1) both}
.guide.bye .peek{animation:astroOut .8s cubic-bezier(.5,0,.8,.3) forwards}
@media (prefers-reduced-motion: reduce){.astro,.peek,.bubble{animation:fadeIn .3s both}.guide.bye .astro,.guide.bye .peek,.guide.bye .bubble{animation:fadeOut .25s forwards}.bubble{transition:none}}
`;

// La logique ajoutée à celle de l'escale : l'état du guide, et ce qui le ferme.
//   guide : "open" (il parle), "bye" (il s'en va), "done" (parti). Revenir au départ le remet à zéro.
//   nudge : quelques secondes après son départ, l'anneau bat plus vite et son étiquette se dore.
const LOGIC_COMMON = `
  guideGo(next) {
    clearTimeout(this.t3);
    clearTimeout(this.t4);
    // Revenir au départ le remet à zéro ; « Décoller » garde son accueil ; partir ailleurs le congédie.
    if (next === 0) this.setState({ guide: "open", step: 0, help: false, nudge: false });
    else if (!(next === 1 && this.state.i === 0)) this.setState({ guide: "done", help: false, nudge: false });
    if (this.onStop) this.onStop(next);
  }
  closeGuide() {
    clearTimeout(this.t3);
    clearTimeout(this.t4);
    this.setState({ guide: "bye", help: false });
    this.t3 = setTimeout(() => {
      this.setState({ guide: "done", nudge: true });
      this.t4 = setTimeout(() => this.setState({ nudge: false }), 4000);
    }, 750);
  }`;

function make(file, base, { title, css, markup, state, logic, subs = [], start = 1 }) {
  let h = fs.readFileSync(path.join(out, base), "utf8");
  const sub = (a, b) => {
    if (!h.includes(a)) throw new Error(`${file} : introuvable « ${a.slice(0, 60)} »`);
    h = h.replace(a, b);
  };
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  sub("</helmet>", `<style>${COMMON}${css}</style>\n</helmet>`);
  sub('<div class="veil"', `${markup}\n<div class="veil"`);
  sub("menu: false };\n  }", `menu: false, guide: "open", step: 0, help: false, nudge: false, tip: 0${state ? ", " + state : ""} };\n  }`);
  // La planche peut démarrer à une autre escale que la première.
  sub('this.state = { i: 1, phase: "idle", soft: false, veil: Component.DATA[1].bg,', `this.state = { i: ${start}, phase: "idle", soft: false, veil: Component.DATA[${start}].bg,`);
  sub("    clearTimeout(this.t2);\n  }\n  go(", "    clearTimeout(this.t2);\n    clearTimeout(this.t3);\n    clearTimeout(this.t4);\n    clearTimeout(this.t5);\n    clearTimeout(this.t6);\n  }\n  go(");
  const guard = '    if (this.state.phase !== "idle" || next === this.state.i || next < 0 || next >= D.length) return;\n';
  sub(guard, guard + "    this.guideGo(next);\n");
  sub("  renderVals() {", "  baseVals() {");
  sub("\n}\nComponent.DATA", `\n${LOGIC_COMMON}\n${logic}\n}\nComponent.DATA`);
  for (const [a, b] of subs) sub(a, b);
  fs.writeFileSync(path.join(out, file), h);
}

// ————————————————————————— A. La bulle —————————————————————————
const A_LOGIC = `
  renderVals() {
    const v = this.baseVals();
    const { i, guide, nudge } = this.state;
    return Object.assign(v, {
      stageClass: v.stageClass + (nudge ? " nudge" : ""),
      showGuide: i === 1 && guide !== "done",
      guideClass: "guide" + (guide === "bye" ? " bye" : ""),
      closeGuide: () => this.closeGuide(),
    });
  }`;

make("Guide-A.dc.html", "Escale1.dc.html", {
  title: "INDEX — le guide, proposition A : la bulle",
  css: "",
  logic: A_LOGIC,
  markup: `<sc-if value="{{showGuide}}" hint-placeholder-val="{{ true }}"><div class="{{guideClass}}">
<div class="astro" style="left:1124px;top:470px;width:320px;height:320px"><img src="${ASTRO}" alt=""></div>
<aside class="bubble tail-r" aria-labelledby="guide-a" style="left:836px;top:452px;width:330px;--tail:112px">
<button type="button" class="x" onClick="{{closeGuide}}" aria-label="Fermer le message">${CLOSE_ICON}</button>
<p class="b-eye">Message de bord</p>
<h2 id="guide-a" class="b-title">Bienvenue à bord !</h2>
<p class="b-text">Ce site est un voyage en dix escales. À chacune, un de mes projets t'attend : ici, Galaxy Escape.</p>
<p class="b-text">Pour avancer, clique sur ${nw(`l'anneau doré ${RING} :`)} l'objet qu'il entoure t'emmène à l'escale suivante.</p>
<div class="b-actions"><button type="button" class="go sm" onClick="{{closeGuide}}">Compris →</button><a class="link" href="Carnet.dc.html">Voir tous les projets</a></div>
</aside>
</div></sc-if>`,
});

make("Guide-A-mobile.dc.html", "Escale1-mobile.dc.html", {
  title: "INDEX — le guide, proposition A : la bulle, sur téléphone",
  css: "",
  logic: A_LOGIC,
  markup: `<sc-if value="{{showGuide}}" hint-placeholder-val="{{ true }}"><div class="{{guideClass}}">
<aside class="bubble m" aria-labelledby="guide-am" style="left:16px;right:16px;top:476px">
<div class="peek"><img src="${ASTRO}" alt=""></div>
<p class="b-eye">Message de bord</p>
<h2 id="guide-am" class="b-title">Bienvenue à bord !</h2>
<p class="b-text">Ce site est un voyage en dix escales, avec un de mes projets à chacune. Ici, Galaxy Escape.</p>
<p class="b-text">Pour avancer, touche ${nw(`l'anneau doré ${RING}`)} ou le bouton du bas.</p>
<div class="b-actions"><button type="button" class="go sm" onClick="{{closeGuide}}">Compris →</button><a class="link" href="Carnet.dc.html">Tous les projets</a></div>
</aside>
</div></sc-if>`,
});

// ————————————————————————— B. La visite —————————————————————————
// Chaque étape : le trou de lumière (x, y, l, h, rayon), le fil de laiton de la bulle à sa cible, et la position
// de la bulle sur téléphone (top, côté de la pointe, décalage de la pointe).
const TOUR_TEXT = {
  desk: [
    { title: "Bienvenue à bord !", text: "Ce site est un voyage en dix escales, avec un de mes projets à chacune. Je te montre comment on avance ?" },
    { title: "La carte de l'escale", text: "En bas à gauche : le projet, ce qu'il fait, sa fiche et son code. Quand l'app est en ligne, elle s'ouvre d'ici." },
    { title: "L'anneau doré", text: "Il entoure l'objet qui mène plus loin. Clique dessus : le voyage continue vers l'escale suivante." },
    { title: "Tes dix escales", text: "Là-haut, un point par escale : saute où tu veux. Pressé ? « Les projets » les montre tous, « Les apps » les ouvrent." },
  ],
  phone: [
    { title: "Bienvenue à bord !", text: "Ce site est un voyage en dix escales, avec un de mes projets à chacune. Je te montre comment on avance ?" },
    { title: "La carte de l'escale", text: "Le projet, ce qu'il fait, sa fiche et son code. Quand l'app est en ligne, elle s'ouvre d'ici." },
    { title: "Le bouton du bas", text: "Il t'emmène à l'escale suivante. L'anneau doré, dans la scène, fait pareil." },
    { title: "Tes dix escales", text: "Un point par escale : touche-en un pour y sauter. Le menu, en haut à droite, montre tous les projets." },
  ],
};
const TOUR_DESK = [
  null,
  { hole: [32, 614, 476, 255, 24], lead: "M 836 640 C 730 640, 620 712, 516 712", dot: [516, 712] },
  { hole: [979, 263, 303, 72, 36], lead: "M 1015 452 L 1015 343", dot: [1015, 343] },
  { hole: [567, 16, 302, 60, 30], lead: "M 900 452 C 890 300, 752 190, 718 84", dot: [718, 84] },
];
const TOUR_PHONE = [
  { top: 476, tail: "" },
  { top: 262, tail: "tail-b", at: 160, hole: [10, 490, 370, 216, 22] },
  { top: 548, tail: "tail-b", at: 196, hole: [72, 764, 308, 64, 32] },
  { top: 200, tail: "tail-t", at: 150, hole: [46, 52, 298, 50, 25] },
];
const B_CSS = `
.hole{position:absolute;pointer-events:none;box-shadow:0 0 0 2px var(--brass),0 0 0 4000px rgba(6,7,12,.62);transition:left .55s cubic-bezier(.3,.8,.3,1),top .55s cubic-bezier(.3,.8,.3,1),width .55s cubic-bezier(.3,.8,.3,1),height .55s cubic-bezier(.3,.8,.3,1),border-radius .55s;animation:fadeIn .4s both}
.lead{position:absolute;left:0;top:0;pointer-events:none;overflow:visible}
.lead path{fill:none;stroke:var(--brass);stroke-width:2;stroke-linecap:round;stroke-dasharray:1 8;animation:march 1.2s linear infinite}
@keyframes march{to{stroke-dashoffset:-18}}
.lead-dot{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:999px;background:var(--brass);box-shadow:0 0 0 4px var(--halo)}
.b-foot{display:flex;flex-wrap:wrap;align-items:center;gap:4px 20px;padding-top:6px}
.bubble.m .b-foot .go{flex:1;justify-content:center}
@media (prefers-reduced-motion: reduce){.hole{transition:none}.lead path{animation:none}}
`;
const bLogic = (phone) => `
  next() {
    if (this.state.step >= 3) this.closeGuide();
    else this.setState({ step: this.state.step + 1 });
  }
  renderVals() {
    const v = this.baseVals();
    const { i, guide, nudge, step } = this.state;
    const T = ${JSON.stringify(TOUR_TEXT[phone ? "phone" : "desk"])};
    const P = ${JSON.stringify(phone ? TOUR_PHONE : TOUR_DESK)};
    const p = P[step], hole = p && p.hole;
    return Object.assign(v, {
      stageClass: v.stageClass + (nudge ? " nudge" : ""),
      showGuide: i === 1 && guide !== "done",
      guideClass: "guide" + (guide === "bye" ? " bye" : ""),
      closeGuide: () => this.closeGuide(),
      next: () => this.next(),
      tour: {
        title: T[step].title,
        text: T[step].text,
        eye: step === 0 ? "Message de bord" : "Visite guidée · " + step + " sur 3",
        nextLabel: step === 0 ? "Montre-moi →" : step === 3 ? "Bon voyage !" : "Suivant →",
        skipLabel: step === 0 ? "Je me débrouille" : "Passer la visite",
        showSkip: step < 3,
        hasHole: !!hole,
        hx: hole ? hole[0] : 0,
        hy: hole ? hole[1] : 0,
        hw: hole ? hole[2] : 0,
        hh: hole ? hole[3] : 0,
        hr: hole ? hole[4] : 0,
        hasLead: !!(p && p.lead),
        lead: p && p.lead ? p.lead : "",
        dx: p && p.dot ? p.dot[0] : 0,
        dy: p && p.dot ? p.dot[1] : 0,
        bubbleClass: "bubble m" + (p && p.tail ? " " + p.tail : ""),
        top: p && p.top ? p.top : 0,
        at: p && p.at ? p.at : 0,
      },
    });
  }`;
const bFoot = `<div class="b-foot">
<button type="button" class="go sm" onClick="{{next}}">{{tour.nextLabel}}</button>
<sc-if value="{{tour.showSkip}}" hint-placeholder-val="{{ true }}"><button type="button" class="b-skip" onClick="{{closeGuide}}">{{tour.skipLabel}}</button></sc-if>
</div>`;

make("Guide-B.dc.html", "Escale1.dc.html", {
  title: "INDEX — le guide, proposition B : la visite guidée",
  css: B_CSS,
  logic: bLogic(false),
  markup: `<sc-if value="{{showGuide}}" hint-placeholder-val="{{ true }}"><div class="{{guideClass}}">
<sc-if value="{{tour.hasHole}}" hint-placeholder-val="{{ false }}"><div class="hole" style="left:{{tour.hx}}px;top:{{tour.hy}}px;width:{{tour.hw}}px;height:{{tour.hh}}px;border-radius:{{tour.hr}}px"></div></sc-if>
<sc-if value="{{tour.hasLead}}" hint-placeholder-val="{{ false }}"><svg class="lead" width="1440" height="900" aria-hidden="true"><path d="{{tour.lead}}"></path></svg><span class="lead-dot" style="left:{{tour.dx}}px;top:{{tour.dy}}px"></span></sc-if>
<div class="astro" style="left:1124px;top:470px;width:320px;height:320px"><img src="${ASTRO}" alt=""></div>
<aside class="bubble tail-r" aria-labelledby="guide-b" aria-live="polite" style="left:836px;top:452px;width:330px;--tail:112px">
<button type="button" class="x" onClick="{{closeGuide}}" aria-label="Fermer la visite">${CLOSE_ICON}</button>
<p class="b-eye">{{tour.eye}}</p>
<h2 id="guide-b" class="b-title">{{tour.title}}</h2>
<p class="b-text">{{tour.text}}</p>
${bFoot}
</aside>
</div></sc-if>`,
});

make("Guide-B-mobile.dc.html", "Escale1-mobile.dc.html", {
  title: "INDEX — le guide, proposition B : la visite guidée, sur téléphone",
  css: B_CSS,
  logic: bLogic(true),
  markup: `<sc-if value="{{showGuide}}" hint-placeholder-val="{{ true }}"><div class="{{guideClass}}">
<sc-if value="{{tour.hasHole}}" hint-placeholder-val="{{ false }}"><div class="hole" style="left:{{tour.hx}}px;top:{{tour.hy}}px;width:{{tour.hw}}px;height:{{tour.hh}}px;border-radius:{{tour.hr}}px"></div></sc-if>
<aside class="{{tour.bubbleClass}}" aria-labelledby="guide-bm" aria-live="polite" style="left:16px;right:16px;top:{{tour.top}}px;--tail:{{tour.at}}px">
<div class="peek"><img src="${ASTRO}" alt=""></div>
<button type="button" class="x" onClick="{{closeGuide}}" aria-label="Fermer la visite">${CLOSE_ICON}</button>
<p class="b-eye">{{tour.eye}}</p>
<h2 id="guide-bm" class="b-title">{{tour.title}}</h2>
<p class="b-text">{{tour.text}}</p>
${bFoot}
</aside>
</div></sc-if>`,
});

// ————————————————————————— C. Le copilote (retenu) —————————————————————————
// Ses tenues, une par escale dans l'ordre du voyage : la scène rendue (« tenue-<scène> » dans voyage-scenes.js),
// son nom, et la phrase qu'il dit en arrivant. Il ne porte la combinaison que dans l'espace : dès la Terre, c'est
// un bonhomme habillé pour l'escale. Les identifiants des rendus sur le canvas sont dans guide.json.
const TENUES = [
  { scene: "espace", name: "Combinaison spatiale", quip: "Combinaison spatiale : on démarre dans les étoiles." },
  { scene: "terre", name: "Tenue d'explorateur", quip: "Combinaison rangée, chapeau d'explorateur : cap sur le globe." },
  { scene: "avion", name: "Uniforme de pilote", quip: "Casquette de pilote : on guette les prix des vols." },
  { scene: "paris", name: "Béret et marinière", quip: "Béret, marinière, baguette : bienvenue à Paris." },
  { scene: "monuments", name: "Bob et appareil photo", quip: "Bob, appareil photo, sac à dos : mode touriste." },
  { scene: "route", name: "Tenue de sport", quip: "Bandeau et haltère : direction la salle." },
  { scene: "maison", name: "Sweat et chaussons", quip: "Sweat, chaussons et clé du coffre : on est à la maison." },
  { scene: "salon", name: "Casque audio", quip: "Casque sur les oreilles : place à la musique." },
  { scene: "calendrier", name: "Tablier de peintre", quip: "Tablier et palette : à toi de choisir la couleur du jour." },
  { scene: "dossiers", name: "Lunettes d'archiviste", quip: "Lunettes d'archiviste : tout est rangé ici." },
].map((t) => ({ ...t, img: `/_blob/${IDS.tenues[t.scene]}` }));
const ESPACE = TENUES[0].img;
const CARD_ICON = `<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6 8.5h8M6 11.5h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

const C_CSS = `
.dock{position:absolute;z-index:2;width:68px;height:68px;padding:0;border-radius:999px;border:1px solid var(--line);background:var(--card);overflow:hidden;box-shadow:0 0 0 4px var(--halo);transition:border-color .2s,box-shadow .2s}
.dock img{position:absolute;left:-24%;top:-12%;width:161%;height:161%;max-width:none;display:block}
.dock:hover{border-color:var(--brass)}
.dock[aria-expanded="true"]{border-color:var(--brass);box-shadow:0 0 0 2px var(--brass)}
.dock-in{animation:dockIn .6s cubic-bezier(.2,.9,.3,1.3) both}
@keyframes dockIn{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:none}}
.stage.enter .dock img{animation:outfit .5s .5s cubic-bezier(.2,.9,.3,1.3) both}
@keyframes outfit{from{opacity:0;transform:scale(.55) rotate(-14deg)}to{opacity:1;transform:none}}
.guide.dockbye .astro{animation:astroDock .75s cubic-bezier(.5,0,.6,1) forwards}
@keyframes astroDock{to{opacity:0;transform:translate(-54px,208px) scale(.2)}}
.guide.dockbye .peek{animation:peekDock .75s cubic-bezier(.5,0,.6,1) forwards}
@keyframes peekDock{to{opacity:0;transform:translate(-200px,330px) scale(.3)}}
.guide.dockbye .bubble{animation:bubbleOut .3s ease-in forwards}
.bubble.help{z-index:3;--origin:70% bottom;animation:bubbleIn .35s cubic-bezier(.2,.9,.3,1.15) both}
.bubble.help .peek{animation:astroIn .8s .05s cubic-bezier(.2,.8,.25,1) both}
.ways{display:flex;flex-direction:column;gap:10px;margin:2px 0 0;padding:0;list-style:none}
.ways li{display:grid;grid-template-columns:34px minmax(0,1fr);gap:12px;align-items:start;font-size:14px;line-height:1.5;color:var(--muted)}
.ways b{font-weight:600;color:var(--ink)}
.way-ic{display:flex;align-items:center;justify-content:center;width:34px;height:34px;box-sizing:border-box;border-radius:999px;border:1px solid var(--line);color:var(--brass-text)}
.way-ic .mini-ring{margin:0;vertical-align:0}
.tip{position:absolute;z-index:2;box-sizing:border-box;max-width:300px;margin:0;padding:10px 14px;border-radius:14px;background:var(--card);border:1px solid var(--line);box-shadow:0 14px 36px rgba(0,0,0,.25);font-size:14px;line-height:1.45;color:var(--ink);transform-origin:var(--origin,90% bottom);animation:tipIn .45s 1.1s cubic-bezier(.2,.9,.3,1.2) both,tipOut .35s 5.3s ease-in forwards}
.tip::before{content:"";position:absolute;bottom:-9px;width:16px;height:16px;background:var(--card);border:1px solid var(--line);border-top:0;border-left:0;transform:rotate(45deg)}
.tip.r::before{right:var(--tail)}
.tip.l::before{left:var(--tail)}
.tip .mono{margin-right:6px;font-size:12px;color:var(--brass-text)}
.tip.side{position:relative;display:flex;align-items:center;min-height:68px;--origin:right center}
.tip.side::before{top:calc(50% - 8px);bottom:auto;right:-9px;border:1px solid var(--line);border-left:0;border-bottom:0}
@keyframes tipIn{from{opacity:0;transform:translateY(8px) scale(.9)}to{opacity:1;transform:none}}
@keyframes tipOut{to{opacity:0;transform:translateY(4px)}}
.stage.leave .tip{opacity:0}
.h-rows{display:flex;flex-direction:column;margin-top:2px}
.h-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:46px;padding:0 2px;border:0;border-top:1px solid var(--line);background:none;color:var(--ink);font-size:15px;text-align:left;text-decoration:none}
.h-row:hover{color:var(--brass-text)}
.h-row span{font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--muted)}
.dock-wrap{position:relative;display:block;flex:none;width:68px;height:68px}
.dock-wrap .dock{position:relative;display:block}
.m-nav .dock{position:relative;flex:none;width:52px;height:52px;box-shadow:none}
@media (prefers-reduced-motion: reduce){.dock-in,.bubble.help,.bubble.help .peek,.tip{animation:fadeIn .3s both}.stage.enter .dock img{animation:none}.guide.dockbye .astro,.guide.dockbye .peek{animation:fadeOut .25s forwards}}
`;
const C_LOGIC = `
  // En arrivant à une escale, il annonce sa nouvelle tenue (pas en décollant : il accueille).
  onStop(next) {
    clearTimeout(this.t5);
    clearTimeout(this.t6);
    this.setState({ tip: 0 });
    if (next === 0 || (next === 1 && this.state.i === 0)) return;
    this.t5 = setTimeout(() => this.setState({ tip: next }), 900);
    this.t6 = setTimeout(() => this.setState({ tip: 0 }), 6800);
  }
  renderVals() {
    const v = this.baseVals();
    const D = Component.DATA;
    const W = ${JSON.stringify(TENUES.map(({ name, quip, img }) => ({ name, quip, img })))};
    const { i, guide, nudge, help, tip } = this.state;
    const s = D[i];
    return Object.assign(v, {
      stageClass: v.stageClass + (nudge ? " nudge" : ""),
      showWelcome: i === 1 && guide !== "done",
      showDock: !s.intro && guide === "done",
      guideClass: "guide" + (guide === "bye" ? " dockbye" : ""),
      closeGuide: () => this.closeGuide(),
      helpOpen: !s.intro && guide === "done" && !!help,
      toggleHelp: () => this.setState({ help: !this.state.help, tip: 0 }),
      closeHelp: () => this.setState({ help: false }),
      helpWhere: "Escale " + i + " sur 10 · " + s.name,
      nextPlace: i < D.length - 1 ? D[i + 1].place : "",
      tenue: W[Math.max(0, i - 1)],
      stopNum: "Escale " + i,
      showTip: !s.intro && guide === "done" && !help && tip === i,
    });
  }`;
const helpRows = `<div class="h-rows">
<sc-if value="{{notLast}}" hint-placeholder-val="{{ true }}"><button type="button" class="h-row" onClick="{{dive}}">Escale suivante <span>{{nextPlace}} →</span></button></sc-if>
<sc-if value="{{isLast}}" hint-placeholder-val="{{ false }}"><a class="h-row" href="Carnet.dc.html">Fin du voyage <span>le carnet →</span></a></sc-if>
<a class="h-row" href="Carnet.dc.html">Le détail des projets <span>Les projets →</span></a>
<a class="h-row" href="Apps.dc.html">Ouvrir une app <span>Les apps →</span></a>
<button type="button" class="h-row" onClick="{{home}}">Revenir au départ <span>←</span></button>
</div>`;

// L'accueil : les deux façons de visiter, le voyage ou le détail des projets.
const welcome = (phone) => `<sc-if value="{{showWelcome}}" hint-placeholder-val="{{ true }}"><div class="{{guideClass}}">
${phone ? "" : `<div class="astro" style="left:1124px;top:470px;width:320px;height:320px"><img src="${ESPACE}" alt=""></div>\n`}<aside class="${phone ? "bubble m" : "bubble tail-r"}" aria-labelledby="guide-c${phone ? "m" : ""}" style="${phone ? "left:16px;right:16px;bottom:88px" : "left:786px;top:380px;width:380px;--tail:186px"}">
${phone ? `<div class="peek"><img src="${ESPACE}" alt=""></div>\n` : ""}<button type="button" class="x" onClick="{{closeGuide}}" aria-label="Fermer le message">${CLOSE_ICON}</button>
<p class="b-eye">Ton copilote</p>
<h2 id="guide-c${phone ? "m" : ""}" class="b-title">Salut, voyageur !</h2>
<p class="b-text">Ici, chaque escale est l'un de mes projets. Deux façons de les visiter :</p>
<ul class="ways">
<li><span class="way-ic">${RING}</span><span><b>Le voyage.</b> ${phone ? "Touche l'anneau doré ou le bouton du bas : escale suivante. Je change de tenue à chaque fois." : "Clique sur l'objet entouré d'or : il t'emmène à l'escale suivante. Et je change de tenue à chaque fois."}</span></li>
<li><span class="way-ic">${CARD_ICON}</span><span><b>Le détail.</b> ${phone ? "Chaque projet a sa fiche, ouverte depuis sa carte. « Les projets » les montre tous." : "« La fiche du projet », sur la carte en bas à gauche, raconte chaque projet en détail. « Les projets » les montre tous."}</span></li>
</ul>
<div class="b-actions"><button type="button" class="go sm" onClick="{{closeGuide}}">Faire le voyage →</button><a class="pill" href="Carnet.dc.html">Voir les projets</a></div>
<p class="b-text muted">${phone ? "Perdu ? Je me range en bas : touche-moi." : "Perdu en route ? Je me range dans le coin : clique sur moi."}</p>
</aside>
</div></sc-if>`;

// Rangé : la pastille (sa tenue du moment), la phrase d'arrivée, et la bulle « où en suis-je ».
// Sur ordinateur, tout tient dans la rangée du bouton retour, dont la largeur suit le nom de l'escale précédente :
// [phrase] [pastille] [← escale précédente]. La bulle s'ancre sur la pastille, sa pointe au centre.
const C_DESK = welcome(false);
const DESK_ROW = [
  `<button type="button" class="pill ui" onClick="{{back}}" style="position:absolute;right:40px;bottom:40px">← {{prevPlace}}</button>`,
  `<div class="ui" style="position:absolute;right:40px;bottom:26px;display:flex;align-items:center;gap:12px">
<sc-if value="{{showTip}}" hint-placeholder-val="{{ false }}"><p class="tip side" role="status"><span><span class="mono">{{stopNum}}</span>{{tenue.quip}}</span></p></sc-if>
<sc-if value="{{showDock}}" hint-placeholder-val="{{ false }}"><span class="dock-wrap">
<button type="button" class="dock dock-in" onClick="{{toggleHelp}}" aria-label="Ton copilote : où en suis-je ?" aria-expanded="{{helpOpen}}"><img src="{{tenue.img}}" alt=""></button>
<sc-if value="{{helpOpen}}" hint-placeholder-val="{{ false }}"><aside class="bubble help tail-b" aria-labelledby="guide-ch" style="right:-146px;bottom:86px;width:380px;--tail:192px">
<div class="peek" style="right:-40px;top:-150px;width:176px;height:176px"><img src="{{tenue.img}}" alt=""></div>
<button type="button" class="x" onClick="{{closeHelp}}" aria-label="Fermer">${CLOSE_ICON}</button>
<p class="b-eye">Ton copilote · {{tenue.name}}</p>
<h2 id="guide-ch" class="b-title">{{s.place}}</h2>
<p class="b-text muted">{{helpWhere}}. Pour avancer, clique sur ${nw(`l'objet entouré d'or ${RING}`)}.</p>
${helpRows}
</aside></sc-if>
</span></sc-if>
<button type="button" class="pill" onClick="{{back}}">← {{prevPlace}}</button>
</div>`,
];
const C_PHONE = `${welcome(true)}
<sc-if value="{{showTip}}" hint-placeholder-val="{{ false }}"><p class="tip l" role="status" style="left:16px;bottom:88px;--tail:80px;--origin:20% bottom"><span class="mono">{{stopNum}}</span>{{tenue.quip}}</p></sc-if>
<sc-if value="{{helpOpen}}" hint-placeholder-val="{{ false }}"><aside class="bubble m help tail-b" aria-labelledby="guide-cmh" style="left:16px;right:16px;bottom:92px;--tail:80px">
<div class="peek"><img src="{{tenue.img}}" alt=""></div>
<button type="button" class="x" onClick="{{closeHelp}}" aria-label="Fermer">${CLOSE_ICON}</button>
<p class="b-eye">Ton copilote · {{tenue.name}}</p>
<h2 id="guide-cmh" class="b-title">{{s.place}}</h2>
<p class="b-text muted">{{helpWhere}}.</p>
${helpRows}
</aside></sc-if>`;
// Sur téléphone, il se range dans la barre du bas, entre le retour et le bouton de l'escale suivante.
const PHONE_DOCK = [
  `<button type="button" class="pill" onClick="{{back}}" aria-label="{{backLabel}}">←</button>`,
  `<button type="button" class="pill" onClick="{{back}}" aria-label="{{backLabel}}">←</button>
<sc-if value="{{showDock}}" hint-placeholder-val="{{ false }}"><button type="button" class="dock dock-in" onClick="{{toggleHelp}}" aria-label="Ton copilote : où en suis-je ?" aria-expanded="{{helpOpen}}"><img src="{{tenue.img}}" alt=""></button></sc-if>`,
];

make("Guide-C.dc.html", "Escale1.dc.html", {
  title: "INDEX — le guide, proposition C : le copilote",
  css: C_CSS,
  logic: C_LOGIC,
  subs: [DESK_ROW],
  markup: C_DESK,
});
make("Guide-C-mobile.dc.html", "Escale1-mobile.dc.html", {
  title: "INDEX — le guide, proposition C : le copilote, sur téléphone",
  css: C_CSS,
  logic: C_LOGIC,
  subs: [PHONE_DOCK],
  markup: C_PHONE,
});
// Le même copilote, déjà rangé, à l'escale de Paris : sa tenue, et sa bulle ouverte.
make("Guide-C-aide.dc.html", "Escale1.dc.html", {
  title: "INDEX — le guide C : le copilote à l'escale de Paris",
  css: C_CSS,
  logic: C_LOGIC,
  subs: [DESK_ROW],
  markup: C_DESK,
  start: 4,
  state: 'guide: "done", help: true',
});
make("Guide-C-aide-mobile.dc.html", "Escale1-mobile.dc.html", {
  title: "INDEX — le guide C : le copilote à l'escale de Paris, sur téléphone",
  css: C_CSS,
  logic: C_LOGIC,
  subs: [PHONE_DOCK],
  markup: C_PHONE,
  start: 4,
  state: 'guide: "done", help: true',
});

// ————————————————————————— La garde-robe du copilote —————————————————————————
// Les dix tenues côte à côte, chacune sur le fond de son escale, pour les juger d'un coup d'œil.
const DATA = JSON.parse(fs.readFileSync(path.join(out, "Escale1.dc.html"), "utf8").match(/Component\.DATA = (\[.*?\]);\n/s)[1]);
const cards = TENUES.map((t, k) => {
  const d = DATA[k + 1];
  return `<figure class="card">
<div class="pic" style="background:${d.bg}"><img src="${t.img}" alt="Le copilote : ${t.name.toLowerCase()}"></div>
<figcaption style="display:flex;flex-direction:column;gap:4px">
<span class="mono" style="font-size:12px;color:#D9B475">Escale ${k + 1} · ${d.place}</span>
<span class="serif" style="font-size:26px;line-height:1.05">${t.name}</span>
<span style="font-size:13px;color:#B3AA9C">${d.name}</span>
</figcaption>
</figure>`;
}).join("\n");
fs.writeFileSync(path.join(out, "Guide-C-tenues.dc.html"), `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>INDEX — la garde-robe du copilote</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&amp;family=Geist:wght@300..600&amp;family=Geist+Mono:wght@400..500&amp;display=swap">
<style>
body{margin:0}
.serif{font-family:'Instrument Serif',Georgia,serif;font-weight:400}
.mono{font-family:'Geist Mono',ui-monospace,monospace}
.card{display:flex;flex-direction:column;gap:12px;margin:0}
.pic{position:relative;aspect-ratio:1/1;border-radius:18px;border:1px solid #2B3040;overflow:hidden}
.pic img{position:absolute;inset:0;width:100%;height:100%;display:block}
</style>
</helmet>
<div style="width:1440px;box-sizing:border-box;padding:56px 64px 64px;background:#0B0C14;color:#F1E8DA;font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased">
<p class="mono" style="margin:0;font-size:13px;color:#D9B475">Le copilote · la garde-robe</p>
<h1 class="serif" style="margin:10px 0 0;font-size:64px;line-height:1">Une tenue par escale</h1>
<p style="margin:14px 0 0;max-width:900px;font-size:17px;line-height:1.6;color:#B3AA9C">Dans l'espace, il porte la combinaison. Dès la Terre, il la laisse au vestiaire, casque à la main, puis s'habille pour chaque escale : un vêtement ou un accessoire tiré du projet, dans la couleur de la scène. Pendant le voyage, il change de tenue dans son coin et l'annonce en une phrase.</p>
<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:40px 24px;margin-top:44px">
${cards}
</div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":1440,"height":1040}}'>
class Component extends DCLogic {
  renderVals() {
    return {};
  }
}
</script>
</body>
</html>
`);

console.log("ok · 9 planches du guide");
