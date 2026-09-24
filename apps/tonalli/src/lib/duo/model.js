/**
 * Les scènes à deux : un seul décor, une seule horloge, pour que les deux
 * personnages jouent ensemble (un ballon passe vraiment de l'un à l'autre).
 *
 * Écrit en JavaScript et non en TypeScript : c'est un grand livre de scènes,
 * repris tel quel du canevas de direction artistique où il a été mis au
 * point, et son type public vit dans `model.d.ts`. Les animations qu'il
 * nomme (`du-jj-hopA`…) sont dans `scenes/`, une feuille par scène, générées
 * par `npm run duo`.
 *
 * Les émotions y portent leurs noms du canevas (`joie`, `serenite`…) ;
 * `lib/duo/index.ts` fait la traduction depuis les clés de l'app.
 */
export function duoScene(props) {
  // Une seule scène, une seule horloge : les deux personnages partagent le décor,
  // si bien qu'un ballon peut vraiment passer de l'un à l'autre.
  const PALETTE = {
    joie:      { leger: "#FADF7A", franc: "#FFD93D", dense: "#8A7329" },
    serenite:  { leger: "#C6E0D9", franc: "#A8DADC", dense: "#637471" },
    amour:     { leger: "#FA9DB3", franc: "#FF6B9D", dense: "#8A4254" },
    gratitude: { leger: "#F3BE8F", franc: "#F4A261", dense: "#855A39" },
    fierte:    { leger: "#EB9F86", franc: "#E76F51", dense: "#7F4432" },
    excitation:{ leger: "#FA8B83", franc: "#FF4D4D", dense: "#8A3430" },
    nostalgie: { leger: "#CAB0C5", franc: "#B08BBB", dense: "#665062" },
    fatigue:   { leger: "#B5B9BE", franc: "#8D99AE", dense: "#57565C" },
    tristesse: { leger: "#8AA7B3", franc: "#457B9D", dense: "#364954" },
    anxiete:   { leger: "#A08AAD", franc: "#6A4C93", dense: "#473450" },
    colere:    { leger: "#BE716C", franc: "#9B2226", dense: "#5D211F" },
    neutre:    { leger: "#E2DED7", franc: "#D8D8D8", dense: "#78736F" }
  };
  // Poses validées sur la planche des 12 scènes : on les reprend telles quelles.
  const BASE = {
    joie:      { arm: "none",     feet: true,  eyes: "dot",  ry: 5,   mouth: 1,    body: "du-bounce",  origin: "100px 200px" },
    serenite:  { arm: "meditate", feet: false, eyes: "dot",  ry: 1,   mouth: 0.5,  body: "du-float",   origin: "100px 150px" },
    amour:     { arm: "hug",      feet: false, eyes: "dot",  ry: 1,   mouth: 0.5,  body: "du-sway",    origin: "100px 200px" },
    gratitude: { arm: "gift",     feet: true,  eyes: "soft", ry: 3,   mouth: 0.6,  body: "du-breathe", origin: "100px 200px" },
    fierte:    { arm: "akimbo",   feet: true,  eyes: "dot",  ry: 5,   mouth: 0.5,  body: "du-proud",   origin: "100px 200px" },
    excitation:{ arm: "hang",     feet: true,  eyes: "dot",  ry: 6.5, mouth: 0.8,  body: "du-hop",     origin: "100px 190px" },
    nostalgie: { arm: "hugUp",    feet: false, eyes: "soft", ry: 3,   mouth: 0.1,  body: "du-breathe", origin: "100px 200px" },
    fatigue:   { lying: true,                                                      body: "du-sleep",   origin: "100px 190px" },
    tristesse: { arm: "rubeyes",  feet: false, eyes: "dot",  ry: 3.5, mouth: -0.7, body: "du-curl",    origin: "100px 190px" },
    anxiete:   { arm: "watch",    feet: true,  eyes: "dot",  ry: 4,   mouth: -0.2, body: "du-check",   origin: "100px 195px" },
    colere:    { arm: "none",     feet: true,  eyes: "dot",  ry: 3,   mouth: -0.6, body: "du-huff",    origin: "100px 200px" },
    neutre:    { arm: "hang",     feet: true,  eyes: "dot",  ry: 4,   mouth: 0,    body: "du-walk",    origin: "100px 200px" }
  };

  // Le trait suit la couleur du texte (l'encre, ou le trait clair la nuit) et
  // le papier la surface de l'app : la scène change de thème sans recalcul.
  const ink = "currentColor";
  const valid = em => (PALETTE[em] ? em : "joie");
  let a = valid(props.a || "joie");
  let b = valid(props.b || "serenite");

  // Chaque planche est écrite avec son émotion « meneuse » à gauche : Joie d'abord, puis
  // Sérénité, puis Amour, Gratitude, Fierté, Excitation, Nostalgie et Fatigue. Si la meneuse est « Léa », on retourne toute la scène : chacun reste de son
  // côté, avec ses accessoires.
  // Ce que chacun apporte à la scène : sa teinte du jour et sa tenue.
  let accA = props.me || {};
  let accB = props.partner || {};
  const lead = ["joie", "serenite", "amour", "gratitude", "fierte", "excitation", "nostalgie", "fatigue", "tristesse", "anxiete", "colere"].find(l => a === l || b === l) || null;
  const mirror = lead !== null && a !== lead && b === lead;
  if (mirror) { [a, b] = [b, a]; [accA, accB] = [accB, accA]; }

  const shade = em => PALETTE[em] || PALETTE.neutre;
  const r2 = n => Math.round(n * 100) / 100;
  const S = 0.72;
  const XA = 110, XB = 250;
  const place = (x, dy) => `translate(${r2(x - 100 * S)},${r2(56 + (dy || 0))}) scale(${S})`;

  // ——— géométrie ———
  const E = (cx, cy, rx, ry) => `M${r2(cx - rx)},${r2(cy)} A${rx},${ry} 0 1,0 ${r2(cx + rx)},${r2(cy)} A${rx},${ry} 0 1,0 ${r2(cx - rx)},${r2(cy)} Z`;
  const C = (cx, cy, r) => E(cx, cy, r, r);
  const RR = (x, y, w, h, r) => `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
  // Un Z au trait. Scène retournée : on le dessine à l'envers pour qu'il se relise à l'endroit.
  const ZP = (x, y, k) => mirror
    ? `M${r2(x + k)},${y} H${x} L${r2(x + k)},${r2(y + k * 1.15)} H${x}`
    : `M${x},${y} H${r2(x + k)} L${x},${r2(y + k * 1.15)} H${r2(x + k)}`;
  const HEART = (cx, cy, s) => {
    const p = (x, y) => `${r2(cx + x * s)},${r2(cy + y * s)}`;
    return `M${p(0, 3.5)} C${p(-5, 0)} ${p(-5.5, -4.5)} ${p(-2.5, -5)} C${p(-1, -5.2)} ${p(0, -4.2)} ${p(0, -3)} C${p(0, -4.2)} ${p(1, -5.2)} ${p(2.5, -5)} C${p(5.5, -4.5)} ${p(5, 0)} ${p(0, 3.5)} Z`;
  };
  const BODY = "M100,48 C138,46 170,76 166,116 C171,160 136,190 98,188 C60,190 30,156 34,114 C29,76 62,50 100,48 Z";
  // La veine de colère des anime : quatre arcs pincés vers le centre, jamais remplis.
  const VEIN = "M75,84 Q82,84 82,77 M86,77 Q86,84 93,84 M93,88 Q86,88 86,95 M82,95 Q82,88 75,88";

  // ——— la bulle de pensée ———
  // Comme en bande dessinée : un seul contour festonné (bosses rondes, creux pointus) et une
  // traîne de bulles qui grossissent en s'éloignant de la tête. Des cercles qui se chevauchent,
  // chacun avec son trait, se lisaient comme une grappe — pas comme une pensée.
  const CLOUD = (cx, cy, rx, ry, n) => {
    const pts = [];
    for (let k = 0; k < n; k++) {
      const t = -Math.PI / 2 + 2 * Math.PI * (k + 0.1 * Math.sin(k * 2.3)) / n;
      pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
    }
    let d = `M${r2(pts[0][0])},${r2(pts[0][1])}`;
    for (let k = 0; k < n; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[(k + 1) % n];
      let nx = (ax + bx) / 2 - cx, ny = (ay + by) / 2 - cy;
      const len = Math.hypot(nx, ny) || 1;
      nx /= len; ny /= len;
      const h = 0.55 * Math.hypot(bx - ax, by - ay);
      d += ` C${r2(ax + nx * h)},${r2(ay + ny * h)} ${r2(bx + nx * h)},${r2(by + ny * h)} ${r2(bx)},${r2(by)}`;
    }
    return d + " Z";
  };
  // Blanche comme le papier, comme dans une bande dessinée : c'est ce qui la détache du décor
  // et de la couleur de Nostalgie, qui la faisait passer pour un morceau du personnage.
  const PAPER = "var(--surface)";
  // Géométrie reprise dans serene_css.py (trajet de la bulle qui dérive) : à garder identique.
  const THINK = { cx: 36, cy: 14, rx: 36, ry: 14, n: 9, trail: [[79, 46, 2.5], [70, 36.5, 4]] };
  // La bulle de Nostalgie, dans les unités du personnage. `trail` : avec ou sans la traîne.
  const thoughtParts = (c, o, trail) => {
    const g = { c, o };
    const out = [];
    if (trail !== false) for (const [x, y, r] of THINK.trail) out.push(P(C(x, y, r), Object.assign({ fill: PAPER, sw: 2.4 }, g)));
    out.push(P(CLOUD(THINK.cx, THINK.cy, THINK.rx, THINK.ry, THINK.n), Object.assign({ fill: PAPER, sw: 3 }, g)));
    return out;
  };

  // Une pièce d'accessoire (lib/character.ts) peinte aux couleurs de qui la porte.
  // Quand la scène est retournée, la fleur passerait de l'autre côté de la
  // tête, la visière aussi : on retourne l'accessoire dans son personnage, pour
  // qu'il reste tel que chacun l'a choisi.
  const piece = (p, tint, held) => P(p.d, {
    fill: p.fill === undefined || p.fill === "none" ? "none" : p.fill === "ink" ? ink : p.fill === "tint" ? tint
      : p.fill === "held" ? held : p.fill === "paper" ? PAPER : p.fill,
    stroke: p.stroke === false ? "none" : ink, sw: p.sw || 0, op: p.op,
    tf: mirror ? `translate(200,0) scale(-1,1)${p.tf ? " " + p.tf : ""}` : p.tf
  });
  const pieces = (list, tint, held) => (list || []).map(p => piece(p, tint, held));

  const P = (d, o) => {
    o = o || {};
    return {
      d, fill: o.fill || "none", stroke: o.stroke === undefined ? ink : o.stroke,
      sw: o.sw === undefined ? 0 : o.sw, op: o.op === undefined ? 1 : o.op,
      tf: o.tf || "translate(0,0)", c: o.c || "", o: o.o || "0px 0px", dl: o.dl || "0s"
    };
  };
  const A = o => ({
    c1: o.c1 || "", o1: o.o1 || "0px 0px", d1: o.d1 || "0s",
    c2: o.c2 || "", o2: o.o2 || "0px 0px", d2: o.d2 || "0s",
    tf: o.tf || "translate(0,0)",
    c3: o.c3 || "", o3: o.o3 || "0px 0px", d3: o.d3 || "0s",
    op: o.op === undefined ? 1 : o.op,
    parts: o.parts || []
  });

  // ——— le personnage, pièce par pièce ———
  const eyeParts = v => {
    const xs = v.side === "R" ? [120] : v.side === "L" ? [80] : [80, 120];
    return xs.map(x => v.kind === "soft"
      ? P(`M${x - 7},112 Q${x},117 ${x + 7},112`, { sw: 4, c: v.c, o: "100px 112px", op: v.op, tf: v.tf })
      : P(E(x, 112, 5.5, v.ry), { fill: ink, sw: 0, c: v.c, o: "100px 112px", op: v.op, tf: v.tf }));
  };
  const mouthParts = m => m.kind === "o"
    ? [P(E(100, m.cy || 140, m.rx, m.ry), { fill: ink, sw: 0, c: m.c, o: "100px 140px", op: m.op })]
    : m.kind === "kiss"
      ? [P(`M${100 - 3 * m.dir},128 Q${100 + 6 * m.dir},131.5 100,135 Q${100 + 6 * m.dir},138.5 ${100 - 3 * m.dir},142`, { sw: 3.6, c: m.c, o: "100px 140px", op: m.op })]
      : [P(`M86,138 Q100,${r2(138 + m.m * 16)} 114,138`, { sw: 4, c: m.c, o: "100px 140px", op: m.op })];

  const armParts = (cfg, tint, held) => {
    const L = [];
    const line = (d, extra) => L.push(P(d, Object.assign({ sw: 9 }, extra || {})));
    switch (cfg.arm) {
      case "hang": line("M55,128 Q45,150 50,168"); line("M145,128 Q155,150 150,168"); break;
      case "hug":
        line("M58,132 Q75,160 100,161"); line("M142,132 Q125,160 100,161");
        if (cfg.held !== "none") L.push(...LETTER());
        break;
      case "hugUp":
        line("M58,132 Q76,148 100,150"); line("M142,130 Q152,112 147,96");
        L.push(P(RR(118, 80, 36, 28, 4), { fill: held, sw: 4, tf: "rotate(-8 136 94)" }));
        break;
      case "hugUpL":
        line("M142,132 Q124,148 100,150"); line("M58,130 Q42,110 48,90");
        L.push(P(RR(34, 64, 36, 28, 4), { fill: held, sw: 4, tf: "rotate(8 52 78)" }));
        break;
      case "cradle": line("M58,134 Q72,170 100,172"); line("M142,134 Q128,170 100,172"); break;
      case "open": line("M56,130 Q34,124 26,104"); line("M144,130 Q166,124 174,104"); break;
      case "offer": line("M58,136 Q74,156 88,160"); line("M142,136 Q126,156 112,160"); break;
      case "akimbo":
        L.push(P("M56,124 Q30,128 34,150 Q46,154 60,138 Z", { fill: tint, sw: 6 }));
        L.push(P("M144,124 Q170,128 166,150 Q154,154 140,138 Z", { fill: tint, sw: 6 }));
        break;
      case "gift":
        line("M58,132 Q75,144 90,148"); line("M142,132 Q125,144 110,148");
        if (cfg.held !== "none") {
          L.push(P(RR(86, 139, 28, 24, 3), { fill: held, sw: 3.5 }));
          L.push(P("M100,139 L100,163 M86,151 L114,151", { sw: 2.5 }));
          L.push(P(C(95, 137, 4), { sw: 2 }));
          L.push(P(C(105, 137, 4), { sw: 2 }));
        }
        break;
      case "meditate":
        line("M58,132 Q52,150 70,158"); line("M142,132 Q148,150 130,158");
        L.push(P(C(70, 158, 6.5), { sw: 3 }));
        L.push(P(C(130, 158, 6.5), { sw: 3 }));
        break;
      case "watch": {
        line("M55,128 Q45,150 50,168");
        const g = { c: cfg.watchCls || "", o: "142px 128px" };
        line("M142,128 Q150,108 137,98", g);
        L.push(P(C(136, 96, 7), Object.assign({ fill: held, sw: 3 }, g)));
        L.push(P("M136,92 L136,96 L139,98", Object.assign({ sw: 1.8 }, g)));
        break;
      }
      case "tuck": line("M55,132 Q51,148 58,159"); line("M145,132 Q149,148 142,159"); break;
      case "rubeyes": line("M58,132 Q52,150 60,166", cfg.leftArmCls ? { c: cfg.leftArmCls, o: "100px 190px" } : undefined); break;
      case "read": {
        // un livre ouvert tenu à deux mains, sous la bouche ; une page peut se tourner
        const paper = "#FBF6EA";
        L.push(P("M100,148 Q88,142 74,145 L76,166 Q89,163 100,169 Z", { fill: paper, sw: 3 }));
        L.push(P("M100,148 Q112,142 126,145 L124,166 Q111,163 100,169 Z", { fill: paper, sw: 3 }));
        L.push(P("M81,151 L94,153 M81,156 L94,158 M106,153 L119,151 M106,158 L119,156", { sw: 1.4, op: 0.5 }));
        L.push(P("M100,148 Q112,142 126,145 L124,166 Q111,163 100,169 Z", { fill: paper, sw: 3, c: cfg.pageCls, o: "100px 157px", op: 0 }));
        line("M58,132 Q58,154 75,160"); line("M142,132 Q142,154 125,160");
        break;
      }
    }
    return L;
  };

  function LETTER(c, op) {
    return [
      P(RR(84, 143, 32, 22, 4), { fill: PALETTE.amour.leger, sw: 3.6, c, op }),
      P("M86.5,146 L100,155 L113.5,146", { sw: 2.2, c, op })
    ];
  }
  const ARM = (d, c, op) => P(d, { sw: 9, c, op });
  const BLUSH = (color, c, alpha) => [66, 134].map(x => P(E(x, 128, 10, 6.5), { fill: color, sw: 0, c, op: alpha === undefined ? 0 : alpha }));
  function crownParts(c, op, o) {
    return [
      P("M64,58 L68,36 L82,50 L100,22 L118,50 L132,36 L136,58 Z", { fill: PALETTE.fierte.franc, sw: 3.5, c, op, o }),
      P(C(100, 30, 4), { fill: PALETTE.fierte.leger, sw: 2, c, op, o })
    ];
  }

  const lyingParts = (tint, held, cfg) => {
    const L = [];
    // couché, il garde son drapeau planté derrière lui
    L.push(...pieces(cfg.acc && cfg.acc.layers && cfg.acc.layers.flag, tint, held));
    if (!cfg.noPillow) L.push(P(RR(14, 184, 54, 24, 12), { fill: held, sw: 3.5 }));
    L.push(P("M40,206 C28,158 56,128 104,130 C154,132 176,162 166,206 C166,214 40,214 40,206 Z", { fill: tint, sw: 5 }));
    // couché, on le reconnaît encore : la mèche sur le haut du crâne, les taches sur les joues
    if (cfg.acc && cfg.acc.head === "lock") L.push(P("M104,132 Q100,112 86,105 Q97,115 99,132", { sw: 4.5 }));
    if (cfg.acc && cfg.acc.face === "freckles") for (const [x, y] of [[62, 167], [69, 170], [107, 170], [114, 167]]) L.push(P(C(x, y, 2), { fill: ink, sw: 0, op: 0.6 }));
    L.push(P("M68,158 Q76,163 84,158", { sw: 3.5 }));
    L.push(P("M92,158 Q100,163 108,158", { sw: 3.5, c: cfg.eyeRCls }));
    if (cfg.eyeOpenCls) L.push(P(E(100, 158, 4.5, 5.5), { fill: ink, sw: 0, c: cfg.eyeOpenCls, op: 0 }));
    L.push(P("M78,176 Q88,181 98,176", { sw: 3.5, c: cfg.mouthCls }));
    if (cfg.mouth2Cls) L.push(P("M75,174 Q88,188 101,174", { sw: 3.5, c: cfg.mouth2Cls, op: 0 }));
    if (cfg.noZ) return L;
    const zz = [[114, 112, 11, 2.6, "du-zzz", "0s"], [130, 99, 8.5, 2.2, "du-zzz", "-1.9s"], [143, 88, 6.5, 1.8, "du-zzz", "-1.4s"]];
    zz.forEach(([x, y, k, sw, c, dl], i) => {
      const o = `${r2(x + k / 2)}px ${r2(y + k * 0.6)}px`;
      const own = i === 0 && cfg.z0Cls;
      L.push(P(ZP(x, y, k), { sw, c: own ? cfg.z0Cls : c, dl: own ? "0s" : dl, o }));
      if (own && cfg.zHeartCls) L.push(P(HEART(x + k / 2, y + k * 0.6, 1.3), { fill: PALETTE.amour.franc, sw: 1.8, c: cfg.zHeartCls, o, op: 0 }));
    });
    return L;
  };

  const charParts = cfg => {
    const em = cfg.em, sh = shade(em), tint = (cfg.acc && cfg.acc.tint) || sh.franc, held = sh.leger;
    const layers = (cfg.acc && cfg.acc.layers) || {};
    if (cfg.lying) return lyingParts(tint, held, cfg);
    const parts = [];
    if (cfg.feet) parts.push(P(E(70, 194, 15, 9), { fill: tint, sw: 4, c: cfg.feetCls }), P(E(130, 194, 15, 9), { fill: tint, sw: 4, c: cfg.feetCls }));
    parts.push(...pieces(layers.flag, tint, held));
    parts.push(...pieces(layers.behind, tint, held));
    parts.push(P(BODY, { fill: tint, sw: 5 }));
    // Le motif remplit le corps lui-même : la forme du corps sert de découpe.
    if (cfg.acc && cfg.acc.motif) parts.push(P(BODY, { fill: `motif:${cfg.acc.motif}`, stroke: "none" }));
    parts.push(...armParts(cfg, tint, held));
    parts.push(...pieces(layers.body, tint, held));
    const eyes = Array.isArray(cfg.eyes) ? cfg.eyes : [{ kind: cfg.eyes, ry: cfg.ry, c: cfg.eyeCls, tf: cfg.eyeTf }];
    for (const v of eyes) parts.push(...eyeParts(v));
    parts.push(...pieces(layers.face, tint, held));
    const mouths = cfg.mouths || [{ m: cfg.mouth }];
    for (const m of mouths) parts.push(...mouthParts(m));
    if (cfg.arm === "rubeyes") {
      const g = { c: cfg.rubCls || "du-rub", o: "142px 130px" };
      parts.push(P("M142,130 Q150,114 128,104", Object.assign({ sw: 9 }, g)));
      parts.push(P(E(126, 104, 11, 9), Object.assign({ fill: tint, sw: 4 }, g)));
    }
    if (em === "colere") parts.push(P(VEIN, { sw: 3, c: cfg.veinCls || "du-vein", o: "84px 86px" }));
    if (em === "serenite" && cfg.orbit !== false) {
      // Ses trois points tournent en anneau au-dessus de la tête, jamais devant le visage.
      for (let k = 0; k < 3; k++) parts.push(P(C(0, 0, 3.6), { fill: tint, sw: 1.8, c: `du-halo${k}` }));
    }
    if (em === "amour" && cfg.hearts !== false) {
      parts.push(P(HEART(56, 120, 1), { fill: tint, sw: 1.8, c: "du-heart", o: "56px 120px" }));
      parts.push(P(HEART(144, 124, 1), { fill: tint, sw: 1.8, c: "du-heart", o: "144px 124px", dl: "-1.3s" }));
    }
    if (em === "nostalgie" && cfg.cloud !== false) parts.push(...thoughtParts("du-cloud", "36px 14px"));
    parts.push(...pieces(layers.head, tint, held));
    if (em === "fierte") {
      parts.push(...crownParts(cfg.crownCls, 1));
    }
    if (em === "excitation") {
      parts.push(P("M76,56 Q66,42 74,30 Q80,44 82,58 Z", { fill: tint, sw: 3.5 }));
      parts.push(P("M124,56 Q134,42 126,30 Q120,44 118,58 Z", { fill: tint, sw: 3.5 }));
    }
    if (cfg.extra) parts.push(...cfg.extra);
    return parts;
  };

  // Les bras à part, dessinés après le ballon : c'est ce qui permet de le tenir contre soi.
  // Même classe et même origine que le corps, donc ils bougent exactement avec lui.
  const armsActor = (x, dy, cfg, variants) => {
    const sh = shade(cfg.em), parts = [];
    for (const v of variants) {
      for (const p of armParts(Object.assign({}, cfg, v), (cfg.acc && cfg.acc.tint) || sh.franc, sh.leger)) {
        p.c = v.c || ""; p.op = v.op === undefined ? 1 : v.op; parts.push(p);
      }
    }
    return A({ tf: place(x, dy), c3: cfg.body, o3: cfg.origin, d3: cfg.bodyDelay || "0s", parts });
  };

  // Un calque qui suit exactement le corps (même classe, même origine) : bras, objet tenu, bouche.
  const overlay = (x, dy, cfg, parts) => A({ tf: place(x, dy), c3: cfg.body, o3: cfg.origin, d3: cfg.bodyDelay || "0s", parts });
  const restingLetter = x => A({ tf: `translate(${x},196) rotate(-10) scale(0.6) translate(-100,-154)`, parts: LETTER() });

  // Quand une scène ne dit pas à qui appartient une pose, l'émotion le dit :
  // bras, objets tenus et corps prennent alors la teinte de la bonne personne.
  const pose = (em, over) => Object.assign({ em, acc: em === a ? accA : accB }, BASE[em], over || {});
  const charActor = (x, dy, cfg) => A({ tf: place(x, dy), c3: cfg.body, o3: cfg.origin, d3: cfg.bodyDelay || "0s", parts: charParts(cfg) });
  const shadow = (em, x, c3, d3, rx) => A({ tf: `translate(${x},203)`, c3, d3, parts: [P(E(0, 0, rx || 33, 5.8), { fill: shade(em).franc, sw: 0, op: 0.3 })] });
  const ball = (x, y, o) => A({
    c1: o.cx, c2: o.cy, tf: `translate(${x},${y})`, c3: o.c3 === undefined ? "du-spin" : o.c3, o3: o.o3 || "0px 0px",
    parts: [P(C(0, 0, 9.5), { fill: PALETTE.joie.franc, sw: 2.4 }), P("M-8.2,-3.5 Q0,3 8.2,-3.5", { sw: 1.6 })]
  });
  const resting = (x) => ball(x, 191, { c3: "" });

  // Chacun dans son émotion de base, côte à côte : la règle quand aucune scène n'est écrite.
  const baseActors = (em, x, acc) => {
    if (em === "fatigue") {
      return [shadow(em, x + 12, "", "0s", 56), charActor(x + 12, 0, pose(em, { acc }))];
    }
    const out = [];
    if (em === "fierte") out.push(A({ tf: place(x, 0), parts: [P("M46,206 Q42,182 70,178 Q100,172 130,180 Q158,186 154,206 Z", { fill: PALETTE.fierte.dense, sw: 4 })] }));
    else out.push(shadow(em, x));
    out.push(charActor(x, 0, pose(em, { acc })));
    if (em === "joie") out.push(ball(r2(x - 72 + 158 * S), r2(56 + 184 * S), { c3: "du-ballBounce", o3: "0px 9.5px" }));
    return out;
  };

  // ——— les scènes : Joie + chacune des douze émotions ———
  const NOTE = [P(E(0, 5, 3.2, 2.4), { fill: ink, sw: 0 }), P("M2.8,5 L2.8,-6 Q6.5,-5 7.5,-1", { sw: 1.6 })];
  const DOT = (r) => [P(C(0, 0, r || 3.4), { fill: PALETTE.serenite.franc, sw: 1.5 })];
  const giftParts = () => [
    P(RR(86, 139, 28, 24, 3), { fill: PALETTE.gratitude.leger, sw: 3.5 }),
    P("M100,139 L100,163 M86,151 L114,151", { sw: 2.5 }),
    P(C(95, 137, 4), { sw: 2 }), P(C(105, 137, 4), { sw: 2 })
  ];
  const watchParts = () => [P(C(136, 96, 7), { fill: PALETTE.anxiete.leger, sw: 3 }), P("M136,92 L136,96 L139,98", { sw: 1.8 })];
  const cloudParts = () => thoughtParts("", "0px 0px", false);
  const trailStage = x0 => THINK.trail.map(([x, y, r]) => P(C(r2(x0 - 72 + x * S), r2(56 + y * S), r2(r * S)), { fill: PAPER, sw: 1.8 }));
  const serene = (x, over) => charActor(x, 0, pose("serenite", Object.assign({ acc: accA }, over || {})));

  // ——— Sérénité + chacune : elle ne bouge presque pas, c'est son calme qui déborde ———
  const SERENE = {
    // Deux Sérénité : elles flottent en balance, et leurs points dessinent un 8 d'une tête à l'autre.
    serenite: () => {
      const out = [
        shadow("serenite", XA, "du-ss-sh"), shadow("serenite", XB, "du-ss-sh", "-3s"),
        serene(XA, { body: "du-ss-float", origin: "100px 190px", orbit: false }),
        charActor(XB, 0, pose("serenite", { acc: accB, body: "du-ss-float", bodyDelay: "-3s", origin: "100px 190px", orbit: false }))
      ];
      for (let k = 0; k < 4; k++) out.push(A({ c1: "du-ss-8 du-motion-only", d1: `${-1.5 * k}s`, parts: DOT() }));
      return out;
    },
    // Les petits cœurs d'Amour montent et entrent dans son orbite.
    amour: () => {
      const out = [
        shadow("serenite", XA), shadow("amour", XB),
        serene(XA, { body: "du-breathe" }),
        charActor(XB, 0, pose("amour", { acc: accB, body: "du-sa-B", hearts: false }))
      ];
      for (let k = 0; k < 3; k++) out.push(A({ c1: "du-sa-h du-motion-only", d1: `${-2 * k}s`, parts: [P(HEART(0, 0, 1.3), { fill: PALETTE.amour.franc, sw: 1.4 })] }));
      return out;
    },
    // Gratitude pose son cadeau en offrande ; salut, contre-salut, et un point vient s'y poser.
    gratitude: () => [
      shadow("serenite", XA), shadow("gratitude", XB),
      serene(XA, { body: "du-sg-A", origin: "100px 190px" }),
      charActor(XB, 0, pose("gratitude", { acc: accB, body: "du-sg-B", arm: "none" })),
      A({ c1: "du-sg-gift", tf: "scale(0.72) translate(-100,-151)", parts: giftParts() }),
      armsActor(XB, 0, pose("gratitude", { body: "du-sg-B" }), [
        { arm: "gift", held: "none", c: "du-sg-armGift" },
        { arm: "hang", c: "du-sg-armHang", op: 0 }
      ]),
      A({ c1: "du-sg-dot", c3: "du-sg-glow", parts: DOT(3.6) })
    ],
    // Elle lévite jusqu'à dépasser Fierté ; Fierté se hisse, puis lâche prise et s'assoit.
    fierte: () => [
      shadow("serenite", XA, "du-sf-shA"),
      A({ tf: place(XB, 0), parts: [P("M46,206 Q42,182 70,178 Q100,172 130,180 Q158,186 154,206 Z", { fill: PALETTE.fierte.dense, sw: 4 })] }),
      serene(XA, { body: "du-sf-A", origin: "100px 190px" }),
      charActor(XB, 0, pose("fierte", {
        acc: accB, body: "du-sf-B", feetCls: "du-sf-feet",
        eyes: [{ kind: "dot", ry: 5, c: "du-sf-eOpen" }, { kind: "soft", c: "du-sf-eShut", op: 0 }]
      }))
    ],
    // Elle tend son calme vers Excitation : les sauts rapetissent, jusqu'à flotter avec elle.
    excitation: () => {
      const out = [
        shadow("serenite", XA), shadow("excitation", XB, "du-se-shB"),
        serene(XA, { body: "du-se-A", origin: "100px 190px" }),
        charActor(XB, 0, pose("excitation", {
          acc: accB, body: "du-se-B", origin: "100px 190px",
          eyes: [{ kind: "dot", ry: 6.5, c: "du-se-eOpen", tf: "translate(-4,-1)" }, { kind: "soft", c: "du-se-eShut", op: 0 }],
          mouths: [{ m: 0.8, c: "du-se-mOpen" }, { m: 0.35, c: "du-se-mCalm", op: 0 }]
        }))
      ];
      for (let k = 0; k < 3; k++) out.push(A({ c1: "du-se-wave du-motion-only", d1: `${-0.2 * k}s`, parts: [P("M0,-9 Q6,0 0,9", { sw: 2.4 })] }));
      return out;
    },
    // Le nuage de pensées de Nostalgie dérive jusqu'à elle, passe, et se dissout.
    nostalgie: () => [
      shadow("serenite", XA), shadow("nostalgie", XB),
      serene(XA, { body: "du-breathe", mouths: [{ m: 0.5, c: "du-sn-mSmile" }, { kind: "o", rx: 4, ry: 4, cy: 142, c: "du-sn-mBlow", op: 0 }] }),
      charActor(XB, 0, pose("nostalgie", { acc: accB, cloud: false, mouths: [{ m: 0.1, c: "du-sn-mWist" }, { m: 0.6, c: "du-sn-mSmile2", op: 0 }] })),
      A({ c1: "du-sn-bub", parts: trailStage(XB) }),
      A({ c1: "du-sn-cloud", tf: `scale(${S}) translate(${-THINK.cx},${-THINK.cy})`, parts: cloudParts() })
    ],
    // Une berceuse : elle lit à voix basse en se balançant, les notes glissent jusqu'au dormeur.
    fatigue: () => {
      const out = [
        shadow("serenite", XA), shadow("fatigue", 262, "", "0s", 56),
        charActor(262, 0, pose("fatigue", { acc: accB })),
        serene(XA, {
          body: "du-sz-A", origin: "100px 190px", arm: "read", pageCls: "du-sz-page",
          eyes: [{ kind: "dot", ry: 2.6, c: "du-sz-eRead", tf: "translate(1,5)" }, { kind: "dot", ry: 3.2, c: "du-sz-eLook", tf: "translate(6,1)", op: 0 }],
          mouths: [{ m: 0.35, c: "du-sz-mRest" }, { kind: "o", rx: 4.5, ry: 4, cy: 139, c: "du-sz-mSing", op: 0 }]
        })
      ];
      for (let k = 0; k < 3; k++) out.push(A({ c1: "du-sz-note du-motion-only", d1: `${r2(-8 / 3 * k)}s`, parts: NOTE }));
      return out;
    },
    // Son orbite s'élargit jusqu'à entourer Tristesse, qui arrête de se frotter l'œil.
    tristesse: () => {
      const out = [
        shadow("serenite", 125), shadow("tristesse", 245),
        serene(125, { body: "du-breathe", orbit: false }),
        charActor(245, 0, pose("tristesse", {
          acc: accB, rubCls: "du-st-rub",
          eyes: [{ kind: "dot", ry: 3.5, c: "du-st-eOpen" }, { kind: "soft", c: "du-st-eShut", op: 0 }],
          mouths: [{ m: -0.7, c: "du-st-mSad" }, { m: -0.15, c: "du-st-mSoft", op: 0 }]
        }))
      ];
      // un fil très pâle trace l'anneau pendant qu'il s'élargit
      out.push(A({ c1: "du-st-ring", parts: [P(C(0, 0, 1), { sw: 1.4, op: 0.28 })] }));
      for (let k = 0; k < 3; k++) out.push(A({ c1: `du-st-o${k}`, parts: DOT() }));
      return out;
    },
    // La montre s'envole et fait un tour d'orbite ; mains libres, Anxiété s'assoit en tailleur.
    anxiete: () => [
      shadow("serenite", XA), shadow("anxiete", XB),
      serene(XA, { body: "du-breathe" }),
      charActor(XB, 0, pose("anxiete", {
        acc: accB, body: "du-sx-B", arm: "none", feetCls: "du-sx-feet",
        eyes: [{ kind: "dot", ry: 4, c: "du-sx-eye", tf: "translate(6,-7)" }, { kind: "soft", c: "du-sx-eShut", op: 0 }],
        mouths: [{ m: -0.25, c: "du-sx-mTense" }, { m: 0.2, c: "du-sx-mCalm", op: 0 }]
      })),
      armsActor(XB, 0, pose("anxiete", { body: "du-sx-B" }), [
        { arm: "watch", c: "du-sx-armWatch" },
        { arm: "hang", c: "du-sx-armHang", op: 0 },
        { arm: "meditate", c: "du-sx-armMed", op: 0 }
      ]),
      A({ c1: "du-sx-watch", tf: "scale(0.72) translate(-136,-96)", parts: watchParts() })
    ],
    // Un point quitte son orbite et se pose sur la veine, qui se dégonfle.
    colere: () => [
      shadow("serenite", XA), shadow("colere", XB),
      serene(XA, { body: "du-breathe" }),
      charActor(XB, 0, pose("colere", {
        acc: accB, body: "du-sc-B", veinCls: "du-sc-vein",
        eyes: [{ kind: "dot", ry: 3, c: "du-sc-eOpen" }, { kind: "soft", c: "du-sc-eShut", op: 0 }],
        mouths: [{ m: -0.6, c: "du-sc-mFrown" }, { m: 0.1, c: "du-sc-mCalm", op: 0 }]
      })),
      A({ c1: "du-sc-dot", parts: DOT(3.6) })
    ]
    // Joie : c'est la scène de Joie qui s'applique. Neutre : pas d'interaction, par choix.
  };

  const JOIE = {
    // Deux Joie : une vraie partie de têtes, le même ballon passe de l'un à l'autre.
    joie: () => [
      shadow("joie", XA, "du-jj-sh"),
      shadow("joie", XB, "du-jj-sh", "-0.9s"),
      charActor(XA, 0, pose("joie", { acc: accA, body: "du-jj-hopA", eyeCls: "du-jj-eyeA" })),
      charActor(XB, 0, pose("joie", { acc: accB, body: "du-jj-hopB", bodyDelay: "-0.9s", eyeCls: "du-jj-eyeB" })),
      ball(180, 20, { cx: "du-jj-bx", cy: "du-jj-by" })
    ],
    // Joie s'assoit méditer à côté d'elle… et ouvre un œil pour vérifier qu'il fait bien.
    serenite: () => {
      const out = [
        shadow("joie", XA, "du-js-sh"),
        shadow("serenite", XB, "du-js-sh"),
        resting(56),
        charActor(XA, 6, pose("joie", {
          acc: accA, feet: false, body: "du-js-floatA", origin: "100px 190px",
          eyes: [{ kind: "soft", side: "L" }, { kind: "soft", side: "R", c: "du-js-peekClosed" }, { kind: "dot", ry: 5, side: "R", c: "du-js-peekOpen", op: 0, tf: "translate(3,0)" }],
          mouths: [{ m: 0.5 }]
        })),
        charActor(XB, 0, pose("serenite", { acc: accB, body: "du-js-floatB", origin: "100px 190px", orbit: false }))
      ];
      // Les points qui tournaient autour de Sérénité tournent maintenant autour des deux.
      for (let k = 0; k < 3; k++) {
        out.push(A({ c1: "du-js-ox du-motion-only", d1: `${-2 * k}s`, c2: "du-js-oy", d2: `${-(4.5 + 2 * k)}s`, tf: "translate(180,62)", parts: [P(C(0, 0, 3.6), { fill: PALETTE.serenite.franc, sw: 1.5 })] }));
      }
      return out;
    },
    // Le ballon atterrit dans le câlin d'Amour, qui le serre ; des cœurs filent vers Joie.
    amour: () => {
      const out = [
        shadow("joie", XA, "du-ja-sh"),
        shadow("amour", XB),
        charActor(XA, 0, pose("joie", { acc: accA, body: "du-ja-hop", eyeCls: "du-ja-eye" })),
        charActor(XB, 0, pose("amour", { acc: accB, body: "du-ja-B", arm: "none", hearts: false })),
        ball(250, 170, { cx: "du-ja-bx", cy: "du-ja-by" }),
        armsActor(XB, 0, pose("amour", { body: "du-ja-B" }), [
          { arm: "cradle", c: "du-ja-armHug" },
          { arm: "open", c: "du-ja-armOpen", op: 0 }
        ])
      ];
      for (const [c, dl] of [["du-ja-h1", "0s"], ["du-ja-h2", "-3.6s"], ["du-ja-h3", "-3.2s"]]) {
        out.push(A({ c1: c, o1: "216px 112px", d1: dl, tf: "translate(216,112)", parts: [P(HEART(0, 0, 1.5), { fill: PALETTE.amour.franc, sw: 1.4 })] }));
      }
      return out;
    },
    // Gratitude offre le ballon au lieu du cadeau, s'incline, et Joie joue avec.
    gratitude: () => [
      shadow("joie", XA, "du-jg-sh"),
      shadow("gratitude", XB),
      charActor(XA, 0, pose("joie", { acc: accA, body: "du-jg-A", eyeCls: "du-jg-eyeA" })),
      charActor(XB, 0, pose("gratitude", { acc: accB, body: "du-jg-B", arm: "none" })),
      ball(250, 171, { cx: "du-jg-bx", cy: "du-jg-by" }),
      armsActor(XB, 0, pose("gratitude", { body: "du-jg-B" }), [
        { arm: "offer", c: "du-jg-armOffer" },
        { arm: "hang", c: "du-jg-armHang", op: 0 }
      ])
    ],
    // Fierté partage son rocher : regard, puis torse bombé et saut de victoire ensemble.
    fierte: () => [
      resting(34),
      A({ parts: [P("M46,216 Q42,194 76,189 Q128,181 180,185 Q232,181 284,189 Q318,194 314,216 Z", { fill: PALETTE.fierte.dense, sw: 3 })] }),
      charActor(XA, -17, pose("joie", { acc: accA, body: "du-jf-A", eyeCls: "du-jf-eyeA", extra: crownParts("du-jf-crownA", 0) })),
      charActor(XB, -17, pose("fierte", { acc: accB, body: "du-jf-B", eyeCls: "du-jf-eyeB", crownCls: "du-jf-crownB" })),
      A({
        c1: "du-jf-cx", c2: "du-jf-cy", tf: `translate(250,${r2(56 - 17 + 42 * S)}) scale(${S}) translate(-100,-42)`,
        c3: "du-jf-crot", o3: "100px 42px", parts: crownParts("du-jf-crownFly", 0)
      })
    ],
    // Ils s'élancent l'un vers l'autre et se cognent ventre contre ventre en plein saut.
    excitation: () => {
      const burst = [];
      for (const t of [-90, -55, -125, -22, -158]) {
        const c = Math.cos(t * Math.PI / 180), s = Math.sin(t * Math.PI / 180);
        burst.push(`M${r2(9 * c)},${r2(9 * s)} L${r2(19 * c)},${r2(19 * s)}`);
      }
      const squint = (x, ry) => [{ kind: "dot", ry, c: "du-je-eOpen", tf: `translate(${x},-2)` }, { kind: "soft", c: "du-je-eShut", op: 0 }];
      return [
        shadow("joie", XA, "du-je-shA"),
        shadow("excitation", XB, "du-je-shB"),
        charActor(XA, 0, pose("joie", { acc: accA, body: "du-je-A", eyes: squint(5, 5) })),
        charActor(XB, 0, pose("excitation", { acc: accB, body: "du-je-B", origin: "100px 190px", eyes: squint(-5, 6.5) })),
        A({ c1: "du-je-burst", o1: "180px 92px", tf: "translate(180,92)", parts: [P(burst.join(" "), { sw: 3 })] })
      ];
    },
    // Joie s'assoit contre elle ; leurs pensées montent vers le même nuage, où rebondit un petit ballon.
    nostalgie: () => {
      const out = [
        shadow("joie", 125),
        shadow("nostalgie", 252),
        charActor(125, 6, pose("joie", { acc: accA, feet: false, body: "du-jn-A", origin: "100px 195px", eyeCls: "du-jn-eyeA", mouths: [{ m: 0.4 }] })),
        charActor(252, 0, pose("nostalgie", { acc: accB, arm: "hugUpL", body: "du-jn-B", origin: "100px 195px", cloud: false }))
      ];
      const dot = (x, y, r, dl) => A({ c3: "du-jn-dot", d3: dl, tf: `translate(${x},${y})`, parts: [P(C(0, 0, r), { fill: PAPER, sw: 1.8 })] });
      out.push(dot(141, 81, 2.2, "0s"), dot(152, 68, 3.2, "-1.4s"), dot(237, 79, 2.2, "-0.5s"), dot(225, 66, 3.2, "-1.9s"));
      const cloud = [P(CLOUD(0, 0, 32, 13, 9), { fill: PAPER, sw: 2.2 })];
      cloud.push(P("M-13,11 Q2,13 17,11", { sw: 1.4, op: 0.55 }));
      cloud.push(P(C(2, 5, 5), { fill: PALETTE.joie.franc, sw: 1.5, c: "du-jn-mini", o: "2px 10px" }));
      out.push(A({ c1: "du-jn-cloud", tf: "translate(188,36)", parts: cloud }));
      return out;
    },
    // Fatigue dort ; Joie marche sur la pointe des pieds… bâille, pique du nez, sursaute.
    fatigue: () => [
      resting(62),
      shadow("joie", XA),
      shadow("fatigue", 262, "", "0s", 56),
      charActor(262, 0, pose("fatigue", { acc: accB })),
      charActor(XA, 0, pose("joie", {
        acc: accA, body: "du-jz-A",
        eyes: [
          { kind: "dot", ry: 5, c: "du-jz-eOpen", tf: "translate(6,3)" },
          { kind: "soft", c: "du-jz-eClosed", op: 0 },
          { kind: "dot", ry: 1.8, c: "du-jz-eHalf", op: 0, tf: "translate(3,2)" },
          { kind: "dot", ry: 7.5, c: "du-jz-eWide", op: 0 }
        ],
        mouths: [
          { m: 0.6, c: "du-jz-mSmile" },
          { kind: "o", rx: 8, ry: 11, cy: 141, c: "du-jz-mYawn", op: 0 },
          { m: 0, c: "du-jz-mFlat", op: 0 },
          { kind: "o", rx: 4.5, ry: 5, c: "du-jz-mO", op: 0 }
        ],
        extra: [P(ZP(112, 24, 10), { sw: 2.4, c: "du-jz-z", o: "117px 30px", op: 0 })]
      }))
    ],
    // Pas de larme, pas de jeu : Joie s'assoit contre elle, et elle se laisse aller contre lui.
    tristesse: () => [
      shadow("joie", 138),
      shadow("tristesse", 248),
      resting(78),
      charActor(248, 0, pose("tristesse", {
        acc: accB, body: "du-jr-B", rubCls: "du-jr-rub",
        mouths: [{ m: -0.7, c: "du-jr-mSad" }, { m: -0.2, c: "du-jr-mSoft", op: 0 }]
      })),
      charActor(138, 6, pose("joie", { acc: accA, feet: false, body: "du-jr-A", origin: "100px 195px", eyes: [{ kind: "soft" }], mouths: [{ m: 0.25 }] }))
    ],
    // « Respire avec moi » : Joie gonfle et dégonfle lentement ; Anxiété baisse sa montre et suit.
    anxiete: () => [
      resting(62),
      shadow("joie", XA),
      shadow("anxiete", XB),
      charActor(XA, 0, pose("joie", {
        acc: accA, body: "du-jx-A", origin: "100px 195px",
        eyes: [{ kind: "dot", ry: 5, c: "du-jx-aOpen", tf: "translate(6,0)" }, { kind: "soft", c: "du-jx-aClosed" }],
        mouths: [{ m: 0.35 }]
      })),
      charActor(XB, 0, pose("anxiete", {
        acc: accB, body: "du-jx-B", origin: "100px 195px", watchCls: "du-jx-arm",
        mouths: [{ m: -0.25, c: "du-jx-mTense" }, { m: 0.15, c: "du-jx-mCalm", op: 0 }],
        eyes: [
          { kind: "dot", ry: 4, c: "du-jx-bWatch", tf: "translate(6,-7)" },
          { kind: "dot", ry: 4, c: "du-jx-bLook", op: 0, tf: "translate(-5,0)" },
          { kind: "soft", c: "du-jx-bClosed" }
        ]
      }))
    ],
    // Le ballon atterrit sur sa tête : la veine gonfle… il le fait tenir, se radoucit et le renvoie.
    colere: () => [
      shadow("joie", XA, "du-jc-sh"),
      shadow("colere", XB),
      charActor(XA, 0, pose("joie", { acc: accA, body: "du-jc-A", eyeCls: "du-jc-eyeA" })),
      charActor(XB, 0, pose("colere", {
        acc: accB, body: "du-jc-B", eyeCls: "du-jc-eyeB", veinCls: "du-jc-vein",
        mouths: [{ m: -0.6, c: "du-jc-mFrown" }, { m: 0.3, c: "du-jc-mSmile", op: 0 }]
      })),
      ball(250, 81, { cx: "du-jc-bx", cy: "du-jc-by" })
    ]
    // Neutre : pas de scène, par choix. Chacun garde son émotion de base.
  };

  // ——— Amour + chacune : Amour donne — sa lettre, ses cœurs, ses bras ———
  const HEARTP = (s, c, op) => [P(HEART(0, 0, s), { fill: PALETTE.amour.franc, sw: 1.8, c, op })];
  const flyer = (cls, s) => A({ c1: cls, parts: HEARTP(s || 1.3) });
  const AMOUR = {
    // Deux Amour : ils échangent leurs lettres en même temps, puis se font un bisou.
    amour: () => {
      const eyesFor = (dir, pre) => [{ kind: "dot", ry: 4, c: `du-aa-eOpen${pre}`, tf: `translate(${5 * dir},0)`, op: 0 }, { kind: "dot", ry: 1, c: `du-aa-eShut${pre}` }];
      const pA = pose("amour", { acc: accA, body: "du-aa-A", arm: "none", hearts: false, mouths: [], eyes: eyesFor(1, "A") });
      const pB = pose("amour", { acc: accB, body: "du-aa-B", arm: "none", hearts: false, mouths: [], eyes: eyesFor(-1, "B") });
      const over = (x, p, dir, pre) => overlay(x, 0, p, [
        ARM("M58,132 Q75,160 100,161", `du-aa-hold${pre}`), ARM("M142,132 Q125,160 100,161", `du-aa-hold${pre}`),
        ...LETTER(`du-aa-hold${pre}`),
        ARM("M56,130 Q34,124 26,104", `du-aa-open${pre}`, 0), ARM("M144,130 Q166,124 174,104", `du-aa-open${pre}`, 0),
        ...mouthParts({ m: 0.5, c: `du-aa-mSmile${pre}` }), ...mouthParts({ kind: "kiss", dir, c: `du-aa-mKiss${pre}`, op: 0 }),
        ...BLUSH(PALETTE.amour.dense, `du-aa-blush${pre}`)
      ]);
      const fly = (cls, spin) => A({ c1: cls, c3: spin, o3: "100px 154px", tf: "scale(0.72) translate(-100,-154)", parts: LETTER() });
      return [
        shadow("amour", XA, "du-aa-shA"), shadow("amour", XB, "du-aa-shB"),
        charActor(XA, 0, pA), charActor(XB, 0, pB),
        over(XA, pA, 1, "A"), over(XB, pB, -1, "B"),
        fly("du-aa-fAB", "du-aa-sAB"), fly("du-aa-fBA", "du-aa-sBA"),
        flyer("du-aa-heart du-motion-only", 3)
      ];
    },
    // Gratitude offre son cadeau ; Amour l'ouvre, il en sort un cœur qui file vers elle.
    gratitude: () => {
      const pA = pose("amour", {
        acc: accA, body: "du-ag-A", arm: "none", hearts: false,
        eyes: [{ kind: "dot", ry: 1, c: "du-ag-eShut" }, { kind: "dot", ry: 4.5, c: "du-ag-eWow", op: 0 }],
        mouths: [{ m: 0.5, c: "du-ag-mSmile" }, { kind: "o", rx: 4.5, ry: 5, c: "du-ag-mWow", op: 0 }]
      });
      const pB = pose("gratitude", { acc: accB, body: "du-ag-B", arm: "none", extra: BLUSH(PALETTE.amour.franc, "du-ag-blush") });
      const gift = [
        P(RR(86, 141, 28, 22, 3), { fill: PALETTE.gratitude.leger, sw: 3.5 }),
        P("M100,141 L100,163 M86,152 L114,152", { sw: 2.5 }),
        P(RR(84, 134, 32, 8, 2.5), { fill: PALETTE.gratitude.leger, sw: 3, c: "du-ag-lid", o: "116px 138px" }),
        P(C(95, 131, 4), { sw: 2, c: "du-ag-lid", o: "116px 138px" }), P(C(105, 131, 4), { sw: 2, c: "du-ag-lid", o: "116px 138px" })
      ];
      return [
        restingLetter(60),
        shadow("amour", XA), shadow("gratitude", XB),
        charActor(XA, 0, pA), charActor(XB, 0, pB),
        A({ c1: "du-ag-heart", parts: HEARTP(1.5) }),
        A({ c1: "du-ag-gift", tf: "scale(0.82) translate(-100,-152)", parts: gift }),
        overlay(XA, 0, pA, [ARM("M56,130 Q34,124 26,104", "du-ag-openA"), ARM("M144,130 Q166,124 174,104", "du-ag-openA"),
                            ARM("M58,136 Q70,176 100,179", "du-ag-holdA", 0), ARM("M142,136 Q130,176 100,179", "du-ag-holdA", 0)]),
        overlay(XB, 0, pB, [ARM("M58,132 Q75,144 90,148", "du-ag-giftB"), ARM("M142,132 Q125,144 110,148", "du-ag-giftB"),
                            ARM("M55,128 Q45,150 50,168", "du-ag-hangB", 0), ARM("M145,128 Q155,150 150,168", "du-ag-hangB", 0)])
      ];
    },
    // Un petit cœur se pose au sommet de la couronne ; Fierté rougit et se tient encore plus droit.
    fierte: () => [
      shadow("amour", XA),
      A({ tf: place(XB, 0), parts: [P("M46,206 Q42,182 70,178 Q100,172 130,180 Q158,186 154,206 Z", { fill: PALETTE.fierte.dense, sw: 4 })] }),
      charActor(XA, 0, pose("amour", {
        acc: accA, body: "du-af-A", hearts: false,
        eyes: [{ kind: "dot", ry: 1, c: "du-af-eShut" }, { kind: "dot", ry: 3.5, c: "du-af-eLook", tf: "translate(5,-4)", op: 0 }]
      })),
      charActor(XB, 0, pose("fierte", {
        acc: accB, body: "du-af-B", eyeCls: "du-af-eB",
        extra: [...BLUSH(PALETTE.amour.franc, "du-af-blush"), ...[P(HEART(100, 15, 1.35), { fill: PALETTE.amour.franc, sw: 2, c: "du-af-hc", o: "100px 15px", op: 0 })]]
      })),
      flyer("du-af-h", 1.3)
    ],
    // Amour ouvre les bras ; Excitation bondit partout… puis saute dedans, et rebondit ailleurs.
    excitation: () => {
      const pA = pose("amour", { acc: accA, body: "du-ae-A", arm: "none", hearts: false });
      return [
        restingLetter(60),
        shadow("amour", XA), shadow("excitation", XB, "du-ae-shB"),
        charActor(XA, 0, pA),
        charActor(XB, 0, pose("excitation", {
          acc: accB, body: "du-ae-B", origin: "100px 190px",
          eyes: [{ kind: "dot", ry: 6.5, c: "du-ae-eOpen", tf: "translate(-4,-1)" }, { kind: "soft", c: "du-ae-eShut", op: 0 }]
        })),
        overlay(XA, 0, pA, [ARM("M56,130 Q34,124 26,104", "du-ae-open"), ARM("M144,130 Q166,124 174,104", "du-ae-open"),
                            ARM("M58,132 Q58,152 76,158", "du-ae-hug", 0), ARM("M142,140 Q176,176 208,164", "du-ae-hug", 0)]),
        flyer("du-ae-heart du-motion-only", 2)
      ];
    },
    // Devant la photo, les cœurs d'Amour montent dans le nuage de pensées, qui rosit.
    nostalgie: () => {
      const shape = CLOUD(0, 0, 32, 13, 9);
      const cloud = [P(shape, { fill: PAPER, sw: 2.2 }), P(shape, { fill: PALETTE.amour.leger, sw: 2.2, c: "du-an-pink" })];
      cloud.push(P(HEART(2, 2, 1.5), { fill: PALETTE.amour.franc, sw: 1.6, c: "du-an-inner", o: "2px 2px", op: 0 }));
      const dot = (x, y, r, dl) => A({ c3: "du-jn-dot", d3: dl, tf: `translate(${x},${y})`, parts: [P(C(0, 0, r), { fill: PAPER, sw: 1.8 })] });
      return [
        shadow("amour", 125), shadow("nostalgie", 252),
        charActor(125, 0, pose("amour", { acc: accA, body: "du-an-A", hearts: false, eyeCls: "du-an-eA", eyes: "dot", ry: 3.2 })),
        charActor(252, 0, pose("nostalgie", { acc: accB, arm: "hugUpL", cloud: false, mouths: [{ m: 0.1, c: "du-an-mW" }, { m: 0.6, c: "du-an-mS", op: 0 }] })),
        dot(238, 80, 2.4, "-0.5s"), dot(226, 67, 3.4, "-1.9s"),
        A({ c1: "du-jn-cloud", tf: "translate(196,38)", parts: cloud }),
        flyer("du-an-h1", 1.2), flyer("du-an-h2", 1.2), flyer("du-an-h3", 1.2)
      ];
    },
    // Il se penche et lui fait un bisou sur le front ; Fatigue sourit, un de ses Z devient cœur.
    fatigue: () => [
      shadow("amour", 150, "du-az-sh"), shadow("fatigue", 262, "", "0s", 56),
      charActor(262, 0, pose("fatigue", { acc: accB, mouthCls: "du-az-m1", mouth2Cls: "du-az-m2", z0Cls: "du-az-z", zHeartCls: "du-az-zh" })),
      charActor(150, 0, pose("amour", {
        acc: accA, body: "du-az-A", hearts: false,
        eyes: [{ kind: "dot", ry: 3.2, c: "du-az-eLook", tf: "translate(5,3)" }, { kind: "dot", ry: 1, c: "du-az-eShut", op: 0 }],
        mouths: [{ m: 0.5, c: "du-az-mSmile" }, { kind: "kiss", dir: 1, c: "du-az-mKiss", op: 0 }]
      })),
      flyer("du-az-heart du-motion-only", 1.4)
    ],
    // Un vrai câlin, lettre comprise : Tristesse s'y blottit et cesse de se frotter l'œil.
    tristesse: () => {
      const pA = pose("amour", { acc: accA, body: "du-at-A", arm: "none", hearts: false });
      return [
        shadow("amour", 128), shadow("tristesse", 238),
        charActor(128, 0, pA),
        charActor(238, 0, pose("tristesse", {
          acc: accB, body: "du-at-B", rubCls: "du-at-rub",
          eyes: [{ kind: "dot", ry: 3.5, c: "du-at-eOpen" }, { kind: "soft", c: "du-at-eShut", op: 0 }],
          mouths: [{ m: -0.7, c: "du-at-mSad" }, { m: -0.1, c: "du-at-mSoft", op: 0 }]
        })),
        overlay(128, 0, pA, [
          ARM("M58,132 Q75,160 100,161"), ...LETTER(),
          ARM("M142,132 Q125,160 100,161", "du-at-hold"), ARM("M142,146 Q174,192 204,186", "du-at-around", 0),
          ...mouthParts({ m: 0.5 })
        ]),
        flyer("du-at-heart du-motion-only", 1.3)
      ];
    },
    // Il lui prend la main : le tic s'arrête et la montre redescend.
    anxiete: () => {
      const pA = pose("amour", {
        acc: accA, body: "du-ax-A", arm: "none", hearts: false, mouths: [],
        eyes: [{ kind: "dot", ry: 3, c: "du-ax-eLookA", tf: "translate(5,0)" }, { kind: "dot", ry: 1, c: "du-ax-eShutA", op: 0 }]
      });
      const pB = pose("anxiete", {
        acc: accB, body: "du-ax-B", arm: "none",
        eyes: [{ kind: "dot", ry: 4, c: "du-ax-eWatch", tf: "translate(6,-7)" }, { kind: "soft", c: "du-ax-eShut", op: 0 }],
        mouths: [{ m: -0.25, c: "du-ax-mTense" }, { m: 0.2, c: "du-ax-mCalm", op: 0 }]
      });
      const w = { c: "du-ax-armW", o: "142px 128px" };
      return [
        shadow("amour", 132), shadow("anxiete", XB),
        charActor(132, 0, pA), charActor(XB, 0, pB),
        overlay(XB, 0, pB, [
          P("M142,128 Q150,108 137,98", Object.assign({ sw: 9 }, w)),
          P(C(136, 96, 7), Object.assign({ fill: PALETTE.anxiete.leger, sw: 3 }, w)),
          P("M136,92 L136,96 L139,98", Object.assign({ sw: 1.8 }, w)),
          ARM("M55,128 Q45,150 50,168", "du-ax-hangL"), ARM("M55,128 Q34,150 22,158", "du-ax-reachL", 0)
        ]),
        overlay(132, 0, pA, [
          ARM("M58,132 Q75,160 100,161"), ...LETTER(),
          ARM("M142,132 Q125,160 100,161", "du-ax-holdR"), ARM("M142,130 Q166,150 186,158", "du-ax-reachR", 0),
          ...mouthParts({ m: 0.5 })
        ]),
        flyer("du-ax-heart du-motion-only", 1.2)
      ];
    },
    // Un bisou soufflé : le cœur touche la veine, qui devient un petit cœur ; Colère rougit, désarmé.
    colere: () => {
      const pA = pose("amour", {
        acc: accA, body: "du-ac-A", arm: "none", hearts: false, mouths: [],
        eyes: [{ kind: "dot", ry: 1, c: "du-ac-eShutA" }, { kind: "dot", ry: 3.2, c: "du-ac-eLookA", tf: "translate(5,-2)", op: 0 }]
      });
      return [
        shadow("amour", XA), shadow("colere", XB),
        charActor(XA, 0, pA),
        charActor(XB, 0, pose("colere", {
          acc: accB, body: "du-ac-B", veinCls: "du-ac-vein",
          eyes: [{ kind: "dot", ry: 3, c: "du-ac-eAngry" }, { kind: "dot", ry: 5.5, c: "du-ac-eWow", op: 0 }, { kind: "soft", c: "du-ac-eShy", op: 0, tf: "translate(-2,2)" }],
          mouths: [{ m: -0.6, c: "du-ac-mFrown" }, { kind: "o", rx: 3.5, ry: 4.5, c: "du-ac-mO", op: 0 }, { m: 0.25, c: "du-ac-mShy", op: 0 }],
          extra: [...BLUSH(PALETTE.amour.franc, "du-ac-blush"), P(HEART(84, 86, 1.35), { fill: PALETTE.amour.franc, sw: 2, c: "du-ac-hv", o: "84px 86px", op: 0 })]
        })),
        overlay(XA, 0, pA, [
          ARM("M58,132 Q75,160 100,161"), ...LETTER(),
          ARM("M142,132 Q125,160 100,161", "du-ac-armHug"), ARM("M142,132 Q130,146 112,142", "du-ac-armMouth", 0),
          ARM("M142,130 Q170,124 190,108", "du-ac-armThrow", 0),
          ...mouthParts({ m: 0.5, c: "du-ac-mSmile" }), ...mouthParts({ kind: "kiss", dir: 1, c: "du-ac-mKiss", op: 0 })
        ]),
        flyer("du-ac-h", 1.3)
      ];
    }
    // Joie, Sérénité : leurs scènes s'appliquent. Neutre : pas d'interaction, par choix.
  };

  // ——— Gratitude + chacune : Gratitude remercie — elle offre, s'incline, attend sans insister ———
  const OFFER = (c, op) => [ARM("M58,136 Q74,156 88,160", c, op), ARM("M142,136 Q126,156 112,160", c, op)];
  const HANG = (c, op) => [ARM("M55,128 Q45,150 50,168", c, op), ARM("M145,128 Q155,150 150,168", c, op)];
  const OPEN = (c, op) => [ARM("M56,130 Q34,124 26,104", c, op), ARM("M144,130 Q166,124 174,104", c, op)];
  // Le cadeau tenu à deux mains, centré en (100,160) ; le couvercle peut s'ouvrir à part.
  const GIFTL = (c, op, lidCls) => {
    const l = lidCls || c;
    return [
      P(RR(86, 150, 28, 22, 3), { fill: PALETTE.gratitude.leger, sw: 3.5, c, op }),
      P("M100,150 L100,172 M86,161 L114,161", { sw: 2.5, c, op }),
      P(RR(84, 143, 32, 8, 2.5), { fill: PALETTE.gratitude.leger, sw: 3, c: l, op, o: "116px 147px" }),
      P(C(95, 139.5, 4), { sw: 2, c: l, op, o: "116px 147px" }), P(C(105, 139.5, 4), { sw: 2, c: l, op, o: "116px 147px" })
    ];
  };
  const BOXOPEN = (c, op) => [
    P(RR(86, 152, 28, 20, 3), { fill: PALETTE.gratitude.leger, sw: 3.4, c, op }),
    P("M86,152 L78,142 M114,152 L122,142", { sw: 3.2, c, op })
  ];
  const giftFlyer = (cls, spin, lidCls) => A({ c1: cls, c3: spin || "", o3: "100px 160px", tf: "scale(0.72) translate(-100,-160)", parts: GIFTL(undefined, undefined, lidCls) });
  const ROCK = () => A({ tf: place(XB, 0), parts: [P("M46,206 Q42,182 70,178 Q100,172 130,180 Q158,186 154,206 Z", { fill: PALETTE.fierte.dense, sw: 4 })] });
  const gpose = (body, over) => pose("gratitude", Object.assign({ acc: accA, body, arm: "none", mouths: [] }, over || {}));

  const GRAT = {
    // Deux Gratitude : « après vous » — les saluts s'enchaînent, front contre front, rires, échange.
    gratitude: () => {
      const mk = (pre, acc, body) => pose("gratitude", {
        acc, body, arm: "none", mouths: [],
        eyes: [{ kind: "soft", c: `du-gg-eSoft${pre}` }, { kind: "dot", ry: 5, c: `du-gg-eWow${pre}`, op: 0 }]
      });
      const pA = mk("A", accA, "du-gg-A"), pB = mk("B", accB, "du-gg-B");
      const over = (x, p, pre) => overlay(x, 0, p, [
        ...OFFER(`du-gg-hold${pre}`), ...GIFTL(`du-gg-hold${pre}`), ...OPEN(`du-gg-open${pre}`, 0),
        ...mouthParts({ m: 0.6, c: `du-gg-mSmile${pre}` }), ...mouthParts({ kind: "o", rx: 6, ry: 5, cy: 142, c: `du-gg-mLaugh${pre}`, op: 0 })
      ]);
      const burst = [];
      for (const t of [-90, -55, -125, -22, -158]) {
        const c = Math.cos(t * Math.PI / 180), s = Math.sin(t * Math.PI / 180);
        burst.push(`M${r2(8 * c)},${r2(8 * s)} L${r2(17 * c)},${r2(17 * s)}`);
      }
      return [
        shadow("gratitude", XA), shadow("gratitude", XB),
        charActor(XA, 0, pA), charActor(XB, 0, pB),
        over(XA, pA, "A"), over(XB, pB, "B"),
        giftFlyer("du-gg-fAB", "du-gg-sAB"), giftFlyer("du-gg-fBA", "du-gg-sBA"),
        A({ c1: "du-gg-burst", o1: "180px 110px", tf: "translate(180,110)", parts: [P(burst.join(" "), { sw: 3 })] })
      ];
    },
    // Elle s'incline, Fierté rend le salut : la couronne glisse, Gratitude la rattrape et la lui repose.
    fierte: () => {
      const pA = gpose("du-gf-A", { eyes: [{ kind: "soft", c: "du-gf-eSoft" }, { kind: "dot", ry: 3.5, c: "du-gf-eLook", tf: "translate(0,4)", op: 0 }] });
      return [
        shadow("gratitude", XA), ROCK(),
        charActor(XA, 0, pA),
        overlay(XA, 0, pA, [...OFFER(), ...GIFTL(), ...mouthParts({ m: 0.6 })]),
        charActor(XB, 0, pose("fierte", {
          acc: accB, body: "du-gf-B", crownCls: "du-gf-crownB", eyeCls: "du-gf-eB",
          mouths: [{ m: 0.5, c: "du-gf-mOk" }, { kind: "o", rx: 4, ry: 4.5, c: "du-gf-mOops", op: 0 }]
        })),
        A({ c1: "du-gf-crown", c3: "du-gf-crot", o3: "100px 42px", tf: "scale(0.72) translate(-100,-42)", parts: crownParts("", 1) })
      ];
    },
    // Excitation arrache l'emballage : les papiers volent, il saute de joie avec la boîte.
    excitation: () => {
      const pA = gpose("du-ge-A");
      const pB = pose("excitation", {
        acc: accB, body: "du-ge-B", origin: "100px 190px", arm: "none",
        eyes: [{ kind: "dot", ry: 6.5, c: "du-ge-eOpen", tf: "translate(-3,0)" }, { kind: "soft", c: "du-ge-eShut", op: 0 }]
      });
      const out = [
        shadow("gratitude", XA), shadow("excitation", XB, "du-ge-shB"),
        charActor(XA, 0, pA), charActor(XB, 0, pB),
        overlay(XA, 0, pA, [...OFFER("du-ge-holdA"), ...GIFTL("du-ge-holdA"), ...HANG("du-ge-hangA", 0),
          ...mouthParts({ m: 0.6, c: "du-ge-mSmile" }), ...mouthParts({ kind: "o", rx: 5.5, ry: 5, cy: 142, c: "du-ge-mLaugh", op: 0 })]),
        overlay(XB, 0, pB, [...HANG("du-ge-hangB"), ...OFFER("du-ge-holdB", 0), ...GIFTL("du-ge-wrap", 0), ...BOXOPEN("du-ge-box", 0)]),
        giftFlyer("du-ge-gift", "du-ge-gspin")
      ];
      for (let k = 0; k < 8; k++) {
        out.push(A({ c1: `du-ge-p${k} du-motion-only`, c3: "du-spin", parts: [P(k % 2 ? "M-4,-3 L4,-4 L3,3 L-3,4 Z" : "M-3,-4 L5,-2 L2,4 L-4,2 Z",
          { fill: k % 2 ? PALETTE.gratitude.franc : PALETTE.gratitude.leger, sw: 1.4 })] }));
      }
      return out;
    },
    // Elle lui offre une nouvelle photo — la leur ; Nostalgie la lève à côté de l'ancienne.
    nostalgie: () => {
      const pA = gpose("du-gn-A");
      const pB = pose("nostalgie", { acc: accB, body: "du-gn-B", origin: "100px 195px", arm: "none",
        mouths: [{ m: 0.1, c: "du-gn-mW" }, { m: 0.6, c: "du-gn-mS", op: 0 }] });
      const NEWPHOTO = (c, op, tf) => [
        P(RR(34, 64, 36, 28, 4), { fill: "#FBF6EA", sw: 3.4, c, op, tf }),
        P(C(46, 79, 5.5), { fill: PALETTE.gratitude.franc, sw: 2, c, op, tf }),
        P(C(59, 79, 5.5), { fill: PALETTE.nostalgie.franc, sw: 2, c, op, tf }),
        P("M39,86.5 L66,86.5", { sw: 1.8, c, op, tf })
      ];
      return [
        shadow("gratitude", XA), shadow("nostalgie", XB),
        charActor(XA, 0, pA), charActor(XB, 0, pB),
        overlay(XA, 0, pA, [...OFFER(), ...GIFTL(undefined, undefined, "du-gn-lid"), ...mouthParts({ m: 0.6 })]),
        overlay(XB, 0, pB, [
          ARM("M58,132 Q76,148 100,150", "du-gn-one"),
          ARM("M58,130 Q42,110 48,90", "du-gn-two", 0), ...NEWPHOTO("du-gn-two", 0, "rotate(8 52 78)"),
          ARM("M142,130 Q152,112 147,96"), P(RR(118, 80, 36, 28, 4), { fill: PALETTE.nostalgie.leger, sw: 4, tf: "rotate(-8 136 94)" })
        ]),
        A({ c1: "du-gn-photo", c3: "du-gn-prot", o3: "52px 78px", tf: "scale(0.72) translate(-52,-78)", parts: NEWPHOTO() })
      ];
    },
    // Un cadeau pour le réveil, déposé près de l'oreiller ; elle recule sur la pointe des pieds.
    fatigue: () => {
      const pA = gpose("du-gz-A");
      return [
        shadow("gratitude", 135, "du-gz-sh"), shadow("fatigue", 262, "", "0s", 56),
        charActor(262, 0, pose("fatigue", { acc: accB, mouthCls: "du-gz-m1", mouth2Cls: "du-gz-m2" })),
        charActor(135, 0, pA),
        giftFlyer("du-gz-gift"),
        overlay(135, 0, pA, [...OFFER("du-gz-hold"), ...GIFTL("du-gz-hold"), ...HANG("du-gz-hang", 0),
          ...mouthParts({ m: 0.6, c: "du-gz-mSmile" }), ...mouthParts({ kind: "o", rx: 3, ry: 3.5, c: "du-gz-mShh", op: 0 })])
      ];
    },
    // Tristesse n'ose pas : Gratitude pose le cadeau et l'ouvre pour elle ; une fleur en sort et pousse.
    tristesse: () => {
      const pA = gpose("du-gt-A");
      const petals = [];
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * 2 * Math.PI - Math.PI / 2;
        petals.push(P(C(r2(6.5 * Math.cos(a)), r2(-34 + 6.5 * Math.sin(a)), 5), { fill: PALETTE.joie.franc, sw: 1.6, c: "du-gt-head", o: "0px -34px" }));
      }
      return [
        shadow("gratitude", 115), shadow("tristesse", 257),
        charActor(257, 0, pose("tristesse", {
          acc: accB, rubCls: "du-gt-rub", eyeCls: "du-gt-eT",
          mouths: [{ m: -0.7, c: "du-gt-mSad" }, { m: -0.1, c: "du-gt-mSoft", op: 0 }]
        })),
        charActor(115, 0, pA),
        giftFlyer("du-gt-gift", "", "du-gt-lid"),
        A({ c1: "du-gt-flower", o1: "185px 186px", tf: "translate(185,186)", c3: "du-gt-fade", parts: [
          P("M0,0 C-3,-12 3,-22 0,-34", { sw: 3, c: "du-gt-stem", o: "0px 0px" }),
          P("M0,-12 Q9,-19 14,-12 Q7,-7 0,-12 Z", { fill: PALETTE.serenite.leger, sw: 1.6, c: "du-gt-leaf", o: "0px -12px" }),
          P("M0,-20 Q-9,-27 -14,-20 Q-7,-15 0,-20 Z", { fill: PALETTE.serenite.leger, sw: 1.6, c: "du-gt-leaf", o: "0px -20px" }),
          ...petals,
          P(C(0, -34, 3.6), { fill: PALETTE.gratitude.franc, sw: 1.6, c: "du-gt-head", o: "0px -34px" })
        ] }),
        overlay(115, 0, pA, [...OFFER("du-gt-hold"), ...GIFTL("du-gt-hold"), ...HANG("du-gt-hang", 0), ...mouthParts({ m: 0.6 })])
      ];
    },
    // Elle lui confie son cadeau : les deux mains prises, Anxiété ne regarde plus sa montre.
    anxiete: () => {
      const pA = gpose("du-gx-A");
      const pB = pose("anxiete", {
        acc: accB, body: "du-gx-B", origin: "100px 195px", arm: "none",
        eyes: [{ kind: "dot", ry: 4, c: "du-gx-eOpen" }, { kind: "soft", c: "du-gx-eShut", op: 0 }],
        mouths: [{ m: -0.25, c: "du-gx-mTense" }, { m: 0.2, c: "du-gx-mCalm", op: 0 }]
      });
      return [
        shadow("gratitude", XA), shadow("anxiete", XB),
        charActor(XA, 0, pA), charActor(XB, 0, pB),
        overlay(XB, 0, pB, [
          ARM("M55,128 Q45,150 50,168", "du-gx-armW"), ARM("M142,128 Q150,108 137,98", "du-gx-armW"),
          P(C(136, 96, 7), { fill: PALETTE.anxiete.leger, sw: 3, c: "du-gx-armW" }), P("M136,92 L136,96 L139,98", { sw: 1.8, c: "du-gx-armW" }),
          ...OFFER("du-gx-holdB", 0), ...GIFTL("du-gx-holdB", 0),
          P(C(115, 157, 5.5), { fill: PALETTE.anxiete.leger, sw: 2.4, c: "du-gx-holdB", op: 0 })
        ]),
        overlay(XA, 0, pA, [...OFFER("du-gx-holdA"), ...GIFTL("du-gx-holdA"), ...HANG("du-gx-hangA", 0), ...mouthParts({ m: 0.6 })]),
        giftFlyer("du-gx-gift", "du-gx-gspin")
      ];
    },
    // Colère repousse le cadeau ; Gratitude s'incline, patiemment. À la troisième fois, il l'accepte.
    colere: () => {
      const pA = gpose("du-gc-A");
      return [
        shadow("gratitude", XA), shadow("colere", XB),
        charActor(XA, 0, pA),
        charActor(XB, 0, pose("colere", {
          acc: accB, body: "du-gc-B", veinCls: "du-gc-vein",
          eyes: [{ kind: "dot", ry: 3, c: "du-gc-eAngry" }, { kind: "soft", c: "du-gc-eCalm", op: 0, tf: "translate(-2,3)" }],
          mouths: [{ m: -0.6, c: "du-gc-mFrown" }, { m: 0.2, c: "du-gc-mCalm", op: 0 }]
        })),
        giftFlyer("du-gc-gift"),
        overlay(XA, 0, pA, [...OFFER("du-gc-hold"), ...GIFTL("du-gc-hold"), ...HANG("du-gc-hang", 0), ...mouthParts({ m: 0.6 })])
      ];
    }
    // Joie, Sérénité, Amour : leurs scènes s'appliquent. Neutre : pas d'interaction, par choix.
  };

  // ——— Fierté + chacune : la couronne, le rocher, le torse bombé… et la lumière qu'on partage ———
  const ROCKP = "M46,206 Q42,182 70,178 Q100,172 130,180 Q158,186 154,206 Z";
  const rockAt = x => A({ tf: place(x, 0), parts: [P(ROCKP, { fill: PALETTE.fierte.dense, sw: 4 })] });
  const crownFly = (cls, spin) => A({ c1: cls, c3: spin || "", o3: "100px 42px", tf: `scale(${S}) translate(-100,-42)`, parts: crownParts("", 1) });
  const AKIMBO = (tint, c, op) => [
    P("M56,124 Q30,128 34,150 Q46,154 60,138 Z", { fill: tint, sw: 6, c, op }),
    P("M144,124 Q170,128 166,150 Q154,154 140,138 Z", { fill: tint, sw: 6, c, op })
  ];
  const FIER = {
    // Deux Fierté : qui bombe le torse le plus fort ? Puis un salut d'égal à égal, et on échange les couronnes.
    fierte: () => {
      const mk = (pre, acc) => pose("fierte", {
        acc, body: `du-ff-${pre}`, crownCls: `du-ff-crown${pre}`,
        eyes: [{ kind: "dot", ry: 5, c: `du-ff-eye${pre}` }, { kind: "soft", c: `du-ff-eSoft${pre}`, op: 0 }],
        mouths: [{ m: 0.5, c: `du-ff-mSmile${pre}` }, { kind: "o", rx: 6, ry: 5, cy: 142, c: `du-ff-mLaugh${pre}`, op: 0 }]
      });
      return [
        rockAt(XA), rockAt(XB),
        charActor(XA, 0, mk("A", accA)), charActor(XB, 0, mk("B", accB)),
        crownFly("du-ff-cAB", "du-ff-rAB"), crownFly("du-ff-cBA", "du-ff-rBA")
      ];
    },
    // Photo de champions : Excitation monte sur le rocher, ne tient pas la pose… et Fierté finit par sauter aussi.
    excitation: () => [
      A({ parts: [P("M46,216 Q42,194 76,189 Q128,181 180,185 Q232,181 284,189 Q318,194 314,216 Z", { fill: PALETTE.fierte.dense, sw: 3 })] }),
      shadow("excitation", XB, "du-fe-shB"),
      charActor(XA, -17, pose("fierte", { acc: accA, body: "du-fe-A", eyeCls: "du-fe-eA" })),
      charActor(XB, -17, pose("excitation", {
        acc: accB, body: "du-fe-B", origin: "100px 190px",
        eyes: [{ kind: "dot", ry: 6.5, c: "du-fe-eOpen" }, { kind: "soft", c: "du-fe-eShut", op: 0 }],
        mouths: [{ m: 0.8, c: "du-fe-mGrin" }, { kind: "o", rx: 6, ry: 6, cy: 142, c: "du-fe-mWow", op: 0 }]
      })),
      A({ c1: "du-fe-flash", parts: [P("M-20,-20 H380 V245 H-20 Z", { fill: "#FFFFFF", stroke: "none", sw: 0 })] })
    ],
    // La vieille photo : Fierté s'y reconnaît, tout petit, avec une couronne trop grande. Il rougit… puis bombe le torse.
    nostalgie: () => {
      const pB = pose("nostalgie", { acc: accB, body: "du-fn-B", origin: "100px 195px", arm: "none", cloud: false,
        mouths: [{ m: 0.1, c: "du-fn-mW" }, { m: 0.6, c: "du-fn-mS", op: 0 }] });
      const tilt = "rotate(-6 43 70)";
      const photo = [
        P(RR(16, 48, 54, 44, 4), { fill: "#FBF6EA", sw: 3.4, tf: tilt }),
        P("M22,86 L64,86", { sw: 1.6, op: 0.6, tf: tilt }),
        P(C(43, 77, 8), { fill: PALETTE.fierte.franc, sw: 1.8, tf: tilt }),
        P("M30,72 L32.5,57 L37.5,64 L43,53 L48.5,64 L53.5,57 L56,72 Z", { fill: PALETTE.fierte.franc, sw: 1.7, tf: tilt })
      ];
      return [
        rockAt(XA), shadow("nostalgie", XB),
        charActor(XA, 0, pose("fierte", {
          acc: accA, body: "du-fn-A",
          eyes: [{ kind: "dot", ry: 5, c: "du-fn-eLook" }, { kind: "dot", ry: 7.5, c: "du-fn-eWow", op: 0 }, { kind: "soft", c: "du-fn-eShy", op: 0 }],
          mouths: [{ m: 0.5, c: "du-fn-mSmile" }, { kind: "o", rx: 4, ry: 5, c: "du-fn-mO", op: 0 }],
          extra: BLUSH(PALETTE.amour.franc, "du-fn-blush")
        })),
        charActor(XB, 0, pB),
        overlay(XB, 0, pB, [ARM("M142,132 Q124,148 100,150"), ARM("M58,130 Q40,112 36,92"), ...photo])
      ];
    },
    // Le roi de la sieste : il pose sa couronne sur le dormeur et monte la garde… jusqu'à bâiller à son tour.
    fatigue: () => [
      shadow("fierte", 150, "du-fz-sh"), shadow("fatigue", 262, "", "0s", 56),
      charActor(262, 0, pose("fatigue", { acc: accB, mouthCls: "du-fz-m1", mouth2Cls: "du-fz-m2" })),
      charActor(150, 0, pose("fierte", {
        acc: accA, body: "du-fz-A", crownCls: "du-fz-crownA",
        eyes: [{ kind: "dot", ry: 5, c: "du-fz-eOpen" }, { kind: "soft", c: "du-fz-eShut", op: 0 }, { kind: "dot", ry: 1.8, c: "du-fz-eHalf", op: 0 }],
        mouths: [{ m: 0.5, c: "du-fz-mSmile" }, { kind: "o", rx: 7, ry: 9, cy: 142, c: "du-fz-mYawn", op: 0 }]
      })),
      crownFly("du-fz-crown", "du-fz-crot")
    ],
    // Il descend de son rocher, y fait monter Tristesse et lui pose sa couronne : elle se redresse.
    tristesse: () => [
      rockAt(180),
      shadow("fierte", 180, "du-ft-shA"), shadow("tristesse", 290, "du-ft-shB"),
      charActor(180, 0, pose("fierte", { acc: accA, body: "du-ft-A", crownCls: "du-ft-crownA", eyeCls: "du-ft-eA" })),
      charActor(290, 0, pose("tristesse", {
        acc: accB, body: "du-ft-B", rubCls: "du-ft-rub",
        eyes: [{ kind: "dot", ry: 3.5, c: "du-ft-eSad" }, { kind: "soft", c: "du-ft-eSoft", op: 0 }],
        mouths: [{ m: -0.7, c: "du-ft-mSad" }, { m: 0.15, c: "du-ft-mSoft", op: 0 }],
        extra: crownParts("du-ft-crownT", 0, "100px 56px")
      })),
      crownFly("du-ft-crown", "du-ft-crot")
    ],
    // La pose du héros : Anxiété l'imite — et doit lâcher sa montre pour mettre les mains sur les hanches.
    anxiete: () => {
      const pB = pose("anxiete", {
        acc: accB, body: "du-fx-B", origin: "100px 195px", arm: "none",
        eyes: [{ kind: "dot", ry: 4, c: "du-fx-eye" }, { kind: "soft", c: "du-fx-eShut", op: 0 }],
        mouths: [{ m: -0.25, c: "du-fx-mTense" }, { m: 0.35, c: "du-fx-mProud", op: 0 }]
      });
      return [
        rockAt(XA), shadow("anxiete", XB),
        charActor(XA, 0, pose("fierte", { acc: accA, body: "du-fx-A", eyeCls: "du-fx-eA" })),
        charActor(XB, 0, pB),
        overlay(XB, 0, pB, [
          ARM("M55,128 Q45,150 50,168", "du-fx-armW"), ARM("M142,128 Q150,108 137,98", "du-fx-armW"),
          P(C(136, 96, 7), { fill: PALETTE.anxiete.leger, sw: 3, c: "du-fx-watchOn" }),
          P("M136,92 L136,96 L139,98", { sw: 1.8, c: "du-fx-watchOn" }),
          ...AKIMBO(PALETTE.anxiete.franc, "du-fx-akimbo", 0)
        ]),
        A({ c1: "du-fx-watch", c3: "du-fx-wspin", o3: "136px 96px", tf: `scale(${S}) translate(-136,-96)`,
            parts: [P(C(136, 96, 7), { fill: PALETTE.anxiete.leger, sw: 3 }), P("M136,92 L136,96 L139,98", { sw: 1.8 })] })
      ];
    },
    // Il pose sa couronne sur la tête de Colère : pour qu'elle tienne, il faut rester droit et calme.
    colere: () => [
      rockAt(XA), shadow("colere", XB),
      charActor(XA, 0, pose("fierte", { acc: accA, body: "du-fc-A", crownCls: "du-fc-crownA", eyeCls: "du-fc-eA" })),
      charActor(XB, 0, pose("colere", {
        acc: accB, body: "du-fc-B", veinCls: "du-fc-vein",
        eyes: [{ kind: "dot", ry: 3, c: "du-fc-eAngry" }, { kind: "dot", ry: 5.5, c: "du-fc-eWow", op: 0 }, { kind: "soft", c: "du-fc-eCalm", op: 0 }],
        mouths: [{ m: -0.6, c: "du-fc-mFrown" }, { m: 0.1, c: "du-fc-mCalm", op: 0 }, { kind: "o", rx: 3.5, ry: 4.5, c: "du-fc-mOops", op: 0 }],
        extra: crownParts("du-fc-crownC", 0, "100px 56px")
      })),
      crownFly("du-fc-crown", "du-fc-crot")
    ]
    // Joie, Sérénité, Amour, Gratitude : leurs scènes s'appliquent. Neutre : pas d'interaction, par choix.
  };

  // ——— Excitation + chacune : Excitation entraîne — parfois un peu trop ———
  // Menant à gauche, il se penche vers l'autre (vers la droite) : c'est la même pose, retournée.
  const exc = over => pose("excitation", Object.assign({ acc: accA, origin: "100px 190px" }, over || {}));
  const EXCI = {
    // Deux Excitation : chacun saute plus haut que l'autre… jusqu'à sortir du cadre. Retombée en tas.
    excitation: () => {
      const mk = (pre, acc) => exc({
        acc, body: `du-ee-${pre}`,
        eyes: [{ kind: "dot", ry: 6.5, c: `du-ee-eye${pre}` }, { kind: "soft", c: `du-ee-eShut${pre}`, op: 0 }],
        mouths: [{ m: 0.8, c: `du-ee-mGrin${pre}` }, { kind: "o", rx: 7, ry: 7, cy: 142, c: `du-ee-mLaugh${pre}`, op: 0 }]
      });
      return [
        shadow("excitation", XA, "du-ee-shA"), shadow("excitation", XB, "du-ee-shB"),
        charActor(XA, 0, mk("A", accA)), charActor(XB, 0, mk("B", accB))
      ];
    },
    // Il saute pour voir la photo ; elle la lève plus haut… puis la lui montre, et il se pose enfin.
    nostalgie: () => {
      const pB = pose("nostalgie", { acc: accB, body: "du-xn-B", origin: "100px 195px", arm: "none", cloud: false,
        mouths: [{ m: 0.1, c: "du-xn-mW" }, { m: 0.6, c: "du-xn-mS", op: 0 }] });
      const OLD = (c, tf) => P(RR(118, 80, 36, 28, 4), { fill: PALETTE.nostalgie.leger, sw: 4, tf, c, o: "142px 130px" });
      return [
        shadow("excitation", XA, "du-xn-shA"), shadow("nostalgie", XB),
        charActor(XA, 0, exc({ body: "du-xn-A", eyeCls: "du-xn-eA",
          mouths: [{ m: 0.8, c: "du-xn-mGrin" }, { m: 0.4, c: "du-xn-mCalm", op: 0 }] })),
        charActor(XB, 0, pB),
        overlay(XB, 0, pB, [
          ARM("M58,132 Q76,148 100,150", "du-xn-R"),
          P("M142,130 Q152,112 147,96", { sw: 9, c: "du-xn-R" }), OLD("du-xn-R", "rotate(-8 136 94)"),
          ARM("M142,132 Q124,148 100,150", "du-xn-L", 0), ARM("M58,132 Q34,122 24,102", "du-xn-L", 0),
          P(RR(-2, 70, 38, 29, 4), { fill: PALETTE.nostalgie.leger, sw: 4, tf: "rotate(-10 17 84)", c: "du-xn-L", op: 0 })
        ])
      ];
    },
    // Il bondit autour du dormeur, atterrit lourdement à côté : Fatigue se réveille en sursaut, bâille,
    // sautille un peu avec lui… puis se rendort. Et Excitation recommence.
    fatigue: () => {
      const boom = [];
      for (const [x1, y1, x2, y2] of [[-17, -3, -26, -7], [17, -3, 26, -7], [-11, -9, -16, -17], [11, -9, 16, -17]]) boom.push(`M${x1},${y1} L${x2},${y2}`);
      return [
        shadow("fatigue", 262, "du-xz-shL", "0s", 56), shadow("fatigue", 262, "du-xz-shF"), shadow("excitation", XA, "du-xz-shA"),
        charActor(262, 0, pose("fatigue", { acc: accB, body: "du-xz-lie", origin: "103px 206px", eyeRCls: "du-xz-eyeR", eyeOpenCls: "du-xz-eyeO" })),
        charActor(262, 0, pose("fatigue", {
          acc: accB, lying: false, body: "du-xz-F", origin: "100px 200px", arm: "tuck", feet: true,
          eyes: [{ kind: "dot", ry: 6.5, c: "du-xz-fWide", op: 0 }, { kind: "dot", ry: 2.2, c: "du-xz-fHalf" }, { kind: "soft", c: "du-xz-fShut", op: 0 }],
          mouths: [{ m: 0, c: "du-xz-fFlat" }, { kind: "o", rx: 7, ry: 9, cy: 142, c: "du-xz-fYawn", op: 0 }, { m: 0.4, c: "du-xz-fSmile", op: 0 }]
        })),
        charActor(XA, 0, exc({ body: "du-xz-A", eyeCls: "du-xz-eA",
          mouths: [{ m: 0.8, c: "du-xz-mGrin" }, { kind: "o", rx: 4.5, ry: 5, c: "du-xz-mOh", op: 0 }] })),
        A({ c1: "du-xz-boom", o1: "150px 203px", tf: "translate(150,203)", parts: [P(boom.join(" "), { sw: 2.6 })] })
      ];
    },
    // Elle ne bouge pas : il s'assoit contre elle et fait de tout petits bonds… jusqu'à ce qu'elle rebondisse aussi.
    tristesse: () => [
      shadow("excitation", XA, "du-xt-shA"), shadow("tristesse", XB),
      charActor(XB, 0, pose("tristesse", { acc: accB, body: "du-xt-B", rubCls: "du-xt-rub",
        eyes: [{ kind: "dot", ry: 3.5, c: "du-xt-eSad" }, { kind: "soft", c: "du-xt-eSoft", op: 0 }],
        mouths: [{ m: -0.7, c: "du-xt-mSad" }, { m: 0.1, c: "du-xt-mSoft", op: 0 }] })),
      charActor(XA, 0, exc({ body: "du-xt-A", eyeCls: "du-xt-eA",
        mouths: [{ m: 0.8, c: "du-xt-mGrin" }, { m: 0.45, c: "du-xt-mSoft2", op: 0 }] }))
    ],
    // Un bond à chaque tic de la montre : l'attente devient un jeu, et Anxiété finit par sauter en rythme.
    anxiete: () => {
      const pB = pose("anxiete", { acc: accB, body: "du-xx-B", origin: "100px 195px", arm: "none",
        eyes: [{ kind: "dot", ry: 4, c: "du-xx-eye" }, { kind: "soft", c: "du-xx-eShut", op: 0 }],
        mouths: [{ m: -0.25, c: "du-xx-mTense" }, { m: 0.5, c: "du-xx-mSmile", op: 0 }] });
      return [
        shadow("excitation", XA, "du-xx-shA"), shadow("anxiete", XB, "du-xx-shB"),
        charActor(XA, 0, exc({ body: "du-xx-A", eyeCls: "du-xx-eA" })),
        charActor(XB, 0, pB),
        overlay(XB, 0, pB, [
          ARM("M55,128 Q45,150 50,168"), ARM("M142,128 Q150,108 137,98"),
          P(C(136, 96, 7.5), { fill: PALETTE.anxiete.leger, sw: 3 }),
          P("M136,96 L136,90.5", { sw: 1.9, c: "du-xx-hand", o: "136px 96px" }), P("M136,96 L139.5,97.5", { sw: 1.9 }),
          P("M150,84 L154,80 M152,92 L158,91", { sw: 2, c: "du-xx-tic", o: "150px 88px" })
        ])
      ];
    },
    // Il saute autour de lui pour le provoquer ; Colère saute de rage… et la veine s'éteint en plein saut.
    colere: () => [
      shadow("excitation", XA, "du-xc-shA"), shadow("colere", XB, "du-xc-shB"),
      charActor(XA, 0, exc({ body: "du-xc-A", eyeCls: "du-xc-eA" })),
      charActor(XB, 0, pose("colere", { acc: accB, body: "du-xc-B", veinCls: "du-xc-vein",
        eyes: [{ kind: "dot", ry: 3, c: "du-xc-eAngry" }, { kind: "soft", c: "du-xc-eJoy", op: 0 }],
        mouths: [{ m: -0.6, c: "du-xc-mFrown" }, { kind: "o", rx: 5, ry: 4, cy: 141, c: "du-xc-mShout", op: 0 }, { m: 0.7, c: "du-xc-mJoy", op: 0 }] }))
    ]
    // Joie, Sérénité, Amour, Gratitude, Fierté : leurs scènes s'appliquent. Neutre : pas d'interaction, par choix.
  };

  // ——— Nostalgie + chacune : Nostalgie se souvient — et partage ses souvenirs ———
  const PHOTO_BG = "#FBF6EA";
  const withC = (parts, c, op) => parts.map(p => Object.assign(p, { c, op: op === undefined ? 1 : op }));
  const MINI = (cx, cy, s) => BODY.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${r2(cx + (x - 100) * s)},${r2(cy + (y - 118) * s)}`);
  // Ce que montrent les photos, dans un cadre de 36 × 28 posé en (x, y).
  const houseIn = (x, y) => [
    P(RR(x + 11, y + 13, 14, 10, 1.5), { fill: PALETTE.nostalgie.franc, sw: 1.4 }),
    P(`M${x + 8},${y + 13} L${x + 18},${y + 5} L${x + 28},${y + 13} Z`, { fill: PALETTE.nostalgie.dense, sw: 1.4 }),
    P(`M${x + 3},${y + 23} L${x + 33},${y + 23}`, { sw: 1.2 })
  ];
  const sunnyIn = (x, y) => [
    P(`M${x + 1.5},${y + 21} Q${x + 14},${y + 12} ${x + 34.5},${y + 19} L${x + 34.5},${y + 26.5} L${x + 1.5},${y + 26.5} Z`, { fill: PALETTE.serenite.franc, stroke: "none", sw: 0 }),
    P(C(x + 25, y + 9, 4.2), { fill: PALETTE.joie.franc, sw: 1.2 })
  ];
  const pairIn = (x, y, other) => [
    P(`M${x + 3},${y + 24} L${x + 33},${y + 24}`, { sw: 1.2 }),
    P(MINI(x + 12, y + 17, 0.085), { fill: PALETTE.nostalgie.franc, sw: 1.2 }),
    P(MINI(x + 24, y + 17, 0.085), { fill: PALETTE[other].franc, sw: 1.2 })
  ];
  const photo = (x, y, content, tf) => {
    const out = [P(RR(x, y, 36, 28, 3), { fill: PHOTO_BG, sw: 3.2 })].concat(content(x, y));
    if (tf) out.forEach(p => { p.tf = tf; });
    return out;
  };
  // Bras de Nostalgie (à gauche, tournée vers la droite) : photo levée, ou tendue vers l'autre.
  const HOLD = (content, c, op) => withC([ARM("M58,132 Q76,148 100,150"), ARM("M142,130 Q152,112 147,96"),
    ...photo(118, 80, content, "rotate(-8 136 94)")], c, op);
  const REACH = (content, c, op) => withC([ARM("M58,132 Q76,148 100,150"), ARM("M142,130 Q166,120 170,100"),
    ...photo(158, 82, content)], c, op);
  const nos = over => pose("nostalgie", Object.assign({ acc: accA, arm: "none" }, over || {}));
  const bubbleActor = (cls, rx, ry, extra, grow) => A({ c1: cls, c3: grow || "", parts: [P(CLOUD(0, 0, rx, ry, 9), { fill: PAPER, sw: 2.2 })].concat(extra || []) });
  const trailDots = (cls, pts) => A({ c1: cls, parts: pts.map(([x, y, r]) => P(C(x, y, r), { fill: PAPER, sw: 1.8 })) });
  // la maison du souvenir, recentrée dans la bulle (k : échelle) — sinon elle dépasse par le bas
  const houseBubble = (k, dy) => [
    P(RR(-7, 0, 14, 10, 1.5), { fill: PALETTE.nostalgie.franc, sw: 1.4 }),
    P("M-10,0 L0,-8 L10,0 Z", { fill: PALETTE.nostalgie.dense, sw: 1.4 }),
    P("M-15,10 L15,10", { sw: 1.2 })
  ].map(p => Object.assign(p, { tf: `translate(0,${dy || 0}) scale(${k || 1})` }));

  const NOST = {
    // Deux Nostalgie : leurs photos s'emboîtent — deux moitiés du même souvenir — et leurs bulles n'en font qu'une.
    nostalgie: () => {
      const mk = (pre, acc) => nos({
        acc, body: `du-nn-${pre}`, cloud: false,
        eyes: [{ kind: "soft", c: `du-nn-eSoft${pre}` }, { kind: "dot", ry: 3.5, c: `du-nn-eLook${pre}`, op: 0 }],
        mouths: [{ m: 0.1, c: `du-nn-mW${pre}` }, { m: 0.6, c: `du-nn-mS${pre}`, op: 0 }]
      });
      const pA = mk("A", accA), pB = mk("B", accB);
      const franc = PALETTE.nostalgie.franc, dense = PALETTE.nostalgie.dense;
      // la moitié gauche de la maison au bord droit de la photo de A, la moitié droite au bord gauche de celle de B
      const halfA = (x, y) => [P(RR(x + 27, y + 13, 9, 10, 1), { fill: franc, sw: 1.4 }), P(`M${x + 23},${y + 13} L${x + 36},${y + 5} L${x + 36},${y + 13} Z`, { fill: dense, sw: 1.4 }),
        P(`M${x + 4},${y + 23} L${x + 36},${y + 23}`, { sw: 1.2 })];
      const halfB = (x, y) => [P(RR(x, y + 13, 9, 10, 1), { fill: franc, sw: 1.4 }), P(`M${x},${y + 5} L${x + 13},${y + 13} L${x},${y + 13} Z`, { fill: dense, sw: 1.4 }),
        P(`M${x},${y + 23} L${x + 32},${y + 23}`, { sw: 1.2 })];
      const holdB = withC([ARM("M142,132 Q124,148 100,150"), ARM("M58,130 Q48,112 53,96"), ...photo(46, 80, halfB, "rotate(8 64 94)")], "du-nn-holdB");
      const reachB = withC([ARM("M142,132 Q124,148 100,150"), ARM("M58,130 Q34,120 30,100"), ...photo(6, 82, halfB)], "du-nn-reachB", 0);
      return [
        shadow("nostalgie", XA), shadow("nostalgie", XB),
        charActor(XA, 0, pA), charActor(XB, 0, pB),
        overlay(XA, 0, pA, [...HOLD(halfA, "du-nn-holdA"), ...REACH(halfA, "du-nn-reachA", 0)]),
        overlay(XB, 0, pB, [...holdB, ...reachB]),
        // l'étincelle au point où les deux moitiés se rejoignent
        A({ c1: "du-nn-spark", o1: "180px 108px", parts: [P("M180,106 L180,99 M173,108 L168,103 M187,108 L192,103", { sw: 2 })] }),
        bubbleActor("du-nn-bA", 17, 8), bubbleActor("du-nn-bB", 17, 8),
        // la bulle commune garde une traîne vers chacune des deux têtes : c'est la même pensée
        trailDots("du-nn-tA", [[133, 83, 2.2], [144, 72, 3.3]]), trailDots("du-nn-tB", [[227, 83, 2.2], [216, 72, 3.3]]),
        bubbleActor("du-nn-big", 36, 15, houseBubble(0.95, -1.5), "du-nn-grow")
      ];
    },
    // Sa bulle de pensée s'envole au-dessus du dormeur et devient son rêve : il sourit en dormant.
    fatigue: () => [
      shadow("nostalgie", XA), shadow("fatigue", 262, "", "0s", 56),
      charActor(262, 0, pose("fatigue", { acc: accB, mouthCls: "du-nz-m1", mouth2Cls: "du-nz-m2" })),
      charActor(XA, 0, nos({ arm: "hugUp", body: "du-nz-A", cloud: false,
        eyes: [{ kind: "soft", c: "du-nz-eSoft" }, { kind: "dot", ry: 3.2, c: "du-nz-eLook", op: 0, tf: "translate(5,1)" }],
        mouths: [{ m: 0.1, c: "du-nz-mW" }, { m: 0.6, c: "du-nz-mS", op: 0 }] })),
      trailDots("du-nz-tA", [[128, 80, 2.2], [136, 70, 3.3]]),
      trailDots("du-nz-tB", [[248, 136, 2.2], [240, 126, 3.3]]),
      bubbleActor("du-nz-cloud", 30, 13.5, houseBubble(0.8, -1.2), "du-nz-grow")
    ],
    // La photo d'un jour heureux : Tristesse s'approche, regarde… et un petit sourire lui revient.
    tristesse: () => {
      const pA = nos({ body: "du-nt-A", eyes: [{ kind: "soft", c: "du-nt-eSoft" }, { kind: "dot", ry: 3.2, c: "du-nt-eLook", op: 0, tf: "translate(5,0)" }],
        mouths: [{ m: 0.1, c: "du-nt-mW" }, { m: 0.55, c: "du-nt-mS", op: 0 }] });
      return [
        shadow("nostalgie", XA), shadow("tristesse", XB, "du-nt-shB"),
        charActor(XA, 0, pA),
        overlay(XA, 0, pA, [...HOLD(sunnyIn, "du-nt-hold"), ...REACH(sunnyIn, "du-nt-reach", 0)]),
        charActor(XB, 0, pose("tristesse", { acc: accB, body: "du-nt-B", rubCls: "du-nt-rub", eyeCls: "du-nt-eT",
          mouths: [{ m: -0.7, c: "du-nt-mSad" }, { m: 0.25, c: "du-nt-mSmile", op: 0 }] }))
      ];
    },
    // Anxiété regarde sa montre (le futur qui presse) ; la photo (le passé qui rassure) : elle la baisse, l'aiguille ralentit.
    anxiete: () => {
      const pA = nos({ body: "du-nx-A" });
      const pB = pose("anxiete", { acc: accB, body: "du-nx-B", origin: "100px 195px", arm: "none",
        eyes: [{ kind: "dot", ry: 4, c: "du-nx-eye" }, { kind: "soft", c: "du-nx-eSoft", op: 0 }],
        mouths: [{ m: -0.25, c: "du-nx-mTense" }, { m: 0.25, c: "du-nx-mCalm", op: 0 }] });
      const watch = (cx, cy, c, hc) => [P(C(cx, cy, 7.5), { fill: PALETTE.anxiete.leger, sw: 3, c }),
        P(`M${cx},${cy} L${cx},${cy - 5.5}`, { sw: 1.9, c: hc, o: `${cx}px ${cy}px` }), P(`M${cx},${cy} L${cx + 3},${cy + 1.5}`, { sw: 1.9, c })];
      return [
        shadow("nostalgie", XA), shadow("anxiete", XB),
        charActor(XA, 0, pA),
        overlay(XA, 0, pA, [...HOLD(houseIn, "du-nx-hold"), ...REACH(houseIn, "du-nx-reach", 0)]),
        charActor(XB, 0, pB),
        overlay(XB, 0, pB, [
          ARM("M55,128 Q45,150 50,168"),
          ARM("M142,128 Q150,108 137,98", "du-nx-up"), ...watch(136, 96, "du-nx-up", "du-nx-handUp"),
          ARM("M145,128 Q158,150 152,168", "du-nx-down", 0), ...withC(watch(152, 172, "", "").slice(0, 1), "du-nx-down", 0),
          P("M152,172 L152,166.5", { sw: 1.9, c: "du-nx-handDown", o: "152px 172px" }),
          ...withC([P("M152,172 L155,173.5", { sw: 1.9 })], "du-nx-down", 0)
        ])
      ];
    },
    // Il souffle si fort que la photo s'envole ; il l'écrase du pied… puis la déplie, la regarde, sourit, et la lui rend.
    colere: () => {
      const pA = nos({ body: "du-nc-A",
        eyes: [{ kind: "soft", c: "du-nc-eSoftA" }, { kind: "dot", ry: 3.2, c: "du-nc-eLookA", op: 0 }],
        mouths: [{ m: 0.1, c: "du-nc-mWA" }, { kind: "o", rx: 4, ry: 4.5, cy: 141, c: "du-nc-mOA", op: 0 }, { m: 0.6, c: "du-nc-mSA", op: 0 }] });
      const crumple = [P("M-9,-2 L-6,-9 L1,-8 L7,-10 L10,-3 L8,4 L2,9 L-5,8 L-10,3 Z", { fill: PHOTO_BG, sw: 2.6 }),
        P("M-5,-5 L0,-1 L5,-6 M-6,3 L0,-1 L4,5", { sw: 1.3, op: 0.7 })];
      return [
        shadow("nostalgie", XA), shadow("colere", XB, "du-nc-shB"),
        charActor(XA, 0, pA),
        overlay(XA, 0, pA, [...REACH((x, y) => pairIn(x, y, "colere"), "du-nc-reach"),
          ...withC([ARM("M55,128 Q45,150 50,168"), ARM("M145,128 Q155,150 150,168")], "du-nc-empty", 0)]),
        charActor(XB, 0, pose("colere", { acc: accB, body: "du-nc-B", veinCls: "du-nc-vein",
          eyes: [{ kind: "dot", ry: 3, c: "du-nc-eAngry" }, { kind: "soft", c: "du-nc-eSoft", op: 0 }],
          mouths: [{ m: -0.6, c: "du-nc-mFrown" }, { m: 0.4, c: "du-nc-mSmile", op: 0 }] })),
        A({ c1: "du-nc-photo", c3: "du-nc-prot", o3: "18px 14px", tf: `scale(${S}) translate(-18,-14)`,
            parts: photo(0, 0, (x, y) => pairIn(x, y, "colere")) }),
        A({ c1: "du-nc-ball", c3: "du-nc-bRot", parts: crumple }),
        // le souffle rageur : trois traits de vent, de sa bouche vers la photo
        A({ c1: "du-nc-gust", parts: [P("M0,-6 Q-7,-9 -14,-6 M3,0 Q-6,-3 -17,0 M0,6 Q-7,3 -14,6", { sw: 2.2 })] })
      ];
    }
    // Joie, Sérénité, Amour, Gratitude, Fierté, Excitation : leurs scènes s'appliquent. Neutre : pas d'interaction.
  };

  // ——— Fatigue + chacune : il dort — c'est son sommeil qui déborde sur l'autre ———
  // Un Z isolé, centré sur son origine : c'est la feuille d'animation qui le promène.
  const zActor = (cls, k, sw) => A({ c1: cls, parts: [P(ZP(r2(-k / 2), r2(-k * 0.575), k), { sw: sw || 2 })] });
  // Un dormeur, éventuellement retourné pour faire face à l'autre.
  const lieActor = (x, cfg, flip) => A({ tf: place(x, 0) + (flip ? " translate(200,0) scale(-1,1)" : ""), c3: cfg.body, o3: cfg.origin, parts: charParts(cfg) });
  const sleeper = over => pose("fatigue", Object.assign({ acc: accA }, over || {}));
  const FATI = {
    // Deux dormeurs face à face : leurs Z montent, s'accrochent en guirlande, et ils se blottissent.
    fatigue: () => [
      shadow("fatigue", 95, "du-zf-shA", "0s", 56), shadow("fatigue", 265, "du-zf-shB", "0s", 56),
      lieActor(95, sleeper({ body: "du-zf-A", noZ: true, mouthCls: "du-zf-m1A", mouth2Cls: "du-zf-m2A" }), true),
      lieActor(265, sleeper({ acc: accB, body: "du-zf-B", noZ: true, mouthCls: "du-zf-m1B", mouth2Cls: "du-zf-m2B" }), false),
      A({ c1: "du-zf-str", parts: [P("M128,70 Q180,96 232,70", { sw: 1.6 })] }),
      ...[0, 1, 2].map(i => zActor(`du-zf-a${i}`, 8, 2.2)), ...[0, 1, 2].map(i => zActor(`du-zf-b${i}`, 8, 2.2))
    ],
    // Tristesse s'approche, s'allonge contre lui ; un de ses Z passe au-dessus d'elle, et elle s'endort.
    tristesse: () => [
      shadow("fatigue", 100, "", "0s", 56), shadow("tristesse", XB, "du-zt-shB"), shadow("tristesse", 186, "du-zt-shL", "0s", 50),
      lieActor(100, sleeper({ noZ: true, mouthCls: "du-zt-m1", mouth2Cls: "du-zt-m2" }), true),
      charActor(XB, 0, pose("tristesse", { acc: accB, body: "du-zt-B", rubCls: "du-zt-rub", eyeCls: "du-zt-eT" })),
      lieActor(185, pose("tristesse", { acc: accB, lying: true, noZ: true, noPillow: true, body: "du-zt-L", origin: "100px 210px" }), false),
      zActor("du-zt-z0", 7, 2), zActor("du-zt-z1", 6, 1.8), zActor("du-zt-z2", 5, 1.6),
      zActor("du-zt-zOver", 8, 2.2), zActor("du-zt-zT", 6, 1.8)
    ],
    // Ses Z se posent un à un sur la montre : l'aiguille ralentit, Anxiété bâille, s'assoit… et pique du nez.
    anxiete: () => {
      const pB = pose("anxiete", { acc: accB, body: "du-za-B", origin: "100px 195px", arm: "none", feetCls: "du-za-feet",
        eyes: [{ kind: "dot", ry: 4, c: "du-za-eye" }, { kind: "soft", c: "du-za-eShut", op: 0 }],
        mouths: [{ m: -0.25, c: "du-za-mTense" }, { kind: "o", rx: 5, ry: 6, cy: 141, c: "du-za-mYawn", op: 0 }, { m: 0.15, c: "du-za-mCalm", op: 0 }] });
      const watch = (cx, cy, c, hc) => [P(C(cx, cy, 7.5), { fill: PALETTE.anxiete.leger, sw: 3, c }),
        P(`M${cx},${cy} L${cx},${cy - 5.5}`, { sw: 1.9, c: hc, o: `${cx}px ${cy}px` }), P(`M${cx},${cy} L${cx + 3},${cy + 1.5}`, { sw: 1.9, c })];
      return [
        shadow("fatigue", 118, "", "0s", 56), charActor(118, 0, sleeper({})),
        shadow("anxiete", XB, "du-za-sh"), charActor(XB, 0, pB),
        overlay(XB, 0, pB, [
          ARM("M55,128 Q45,150 50,168"),
          ARM("M142,128 Q150,108 137,98", "du-za-up"), ...watch(136, 96, "du-za-up", "du-za-handUp"),
          ARM("M145,128 Q158,150 152,168", "du-za-down", 0), ...withC(watch(152, 172, "", "").slice(0, 1), "du-za-down", 0),
          P("M152,172 L152,166.5", { sw: 1.9, c: "du-za-handDown", o: "152px 172px" }),
          ...withC([P("M152,172 L155,173.5", { sw: 1.9 })], "du-za-down", 0)
        ]),
        zActor("du-za-f0", 8, 2.2), zActor("du-za-f1", 8, 2.2), zActor("du-za-f2", 8, 2.2), zActor("du-za-zB", 6, 1.8)
      ];
    },
    // Colère tape du pied ; le dormeur se retourne sans se réveiller, et ses Z éteignent la veine.
    colere: () => [
      shadow("fatigue", 118, "", "0s", 56),
      lieActor(118, sleeper({ body: "du-zc-A", origin: "102px 210px", noZ: true }), false),
      shadow("colere", XB, "du-zc-sh"),
      charActor(XB, 0, pose("colere", { acc: accB, body: "du-zc-B", veinCls: "du-zc-vein",
        eyes: [{ kind: "dot", ry: 3, c: "du-zc-eAngry" }, { kind: "soft", c: "du-zc-eShut", op: 0 }],
        mouths: [{ m: -0.6, c: "du-zc-mFrown" }, { kind: "o", rx: 5, ry: 6, cy: 141, c: "du-zc-mYawn", op: 0 }, { m: 0.1, c: "du-zc-mCalm", op: 0 }] })),
      A({ c1: "du-zc-thud", o1: "250px 199px", parts: [P("M218,198 L208,193 M216,204 L205,204 M282,198 L292,193 M284,204 L295,204", { sw: 2 })] }),
      zActor("du-zc-z0", 7, 2), zActor("du-zc-z1", 6, 1.8),
      zActor("du-zc-f0", 8, 2.2), zActor("du-zc-f1", 8, 2.2), zActor("du-zc-f2", 8, 2.2), zActor("du-zc-zB", 6, 1.8)
    ]
    // Les six premières émotions et Nostalgie : leurs scènes s'appliquent. Neutre : pas d'interaction.
  };

  // ——— Tristesse + chacune : pas de larme — la main qui se pose, l'épaule qui s'appuie ———
  const sad = (pre, acc, over) => pose("tristesse", Object.assign({ acc, body: `du-${pre}`, rubCls: `du-${pre}-rub`,
    eyes: [{ kind: "dot", ry: 3.5, c: `du-${pre}-e` }, { kind: "soft", c: `du-${pre}-s`, op: 0 }],
    mouths: [{ m: -0.7, c: `du-${pre}-mSad` }, { m: 0.3, c: `du-${pre}-mSmile`, op: 0 }] }, over || {}));
  const HANDR = (c, x2, y2) => [ARM(`M142,132 Q${r2((142 + x2) / 2 + 6)},${y2} ${x2 - 2},${y2}`, c, 0),
    P(E(x2, y2, 8, 7), { fill: PALETTE.tristesse.franc, sw: 3.5, c, op: 0 })];
  const TRIS = {
    // Elles se rapprochent, se prennent la main entre elles, et cessent de se frotter l'œil.
    tristesse: () => {
      const pA = sad("tt-A", accA), pB = sad("tt-B", accB, { leftArmCls: "du-tt-armB" });
      return [
        shadow("tristesse", XA, "du-tt-shA"), shadow("tristesse", XB, "du-tt-shB"),
        charActor(XA, 0, pA), overlay(XA, 0, pA, HANDR("du-tt-handA", 178, 160)),
        charActor(XB, 0, pB),
        overlay(XB, 0, pB, [ARM("M58,132 Q42,160 36,160", "du-tt-handB", 0), P(E(34, 160, 8, 7), { fill: PALETTE.tristesse.franc, sw: 3.5, c: "du-tt-handB", op: 0 })])
      ];
    },
    // Elle suit l'aiguille avec elle, la tête qui se balance à chaque tic : le tic devient une berceuse.
    anxiete: () => {
      const pA = sad("ta-A", accA);
      const pB = pose("anxiete", { acc: accB, body: "du-ta-B", origin: "100px 195px", arm: "none",
        eyes: [{ kind: "dot", ry: 4, c: "du-ta-eye" }, { kind: "soft", c: "du-ta-eSoft", op: 0 }],
        mouths: [{ m: -0.25, c: "du-ta-mTense" }, { m: 0.3, c: "du-ta-mCalm", op: 0 }] });
      const watch = (cx, cy, c, hc) => [P(C(cx, cy, 7.5), { fill: PALETTE.anxiete.leger, sw: 3, c }),
        P(`M${cx},${cy} L${cx},${cy - 5.5}`, { sw: 1.9, c: hc, o: `${cx}px ${cy}px` }), P(`M${cx},${cy} L${cx + 3},${cy + 1.5}`, { sw: 1.9, c })];
      // le « tic », deux petits traits qui éclatent à côté du cadran
      const tic = (cx, cy, c) => P(`M${cx + 10},${cy - 9} L${cx + 17},${cy - 15} M${cx + 12},${cy} L${cx + 21},${cy} M${cx + 10},${cy + 9} L${cx + 17},${cy + 15}`, { sw: 2.6, c, op: 0 });
      return [
        shadow("tristesse", XA, "du-ta-shA"), shadow("anxiete", XB),
        charActor(XA, 0, pA),
        charActor(XB, 0, pB),
        overlay(XB, 0, pB, [
          ARM("M55,128 Q45,150 50,168"),
          ARM("M142,128 Q150,108 137,98", "du-ta-up"), ...watch(136, 96, "du-ta-up", "du-ta-handUp"), tic(136, 96, "du-ta-ticUp"),
          ARM("M145,128 Q158,150 152,168", "du-ta-down", 0), ...withC(watch(152, 172, "", "").slice(0, 1), "du-ta-down", 0),
          P("M152,172 L152,166.5", { sw: 1.9, c: "du-ta-handDown", o: "152px 172px" }),
          ...withC([P("M152,172 L155,173.5", { sw: 1.9 })], "du-ta-down", 0), tic(152, 172, "du-ta-ticDown")
        ])
      ];
    },
    // Il tape du pied ; elle le regarde sans rien dire. Il vient s'asseoir près d'elle, et la veine s'éteint.
    colere: () => [
      shadow("tristesse", XA), shadow("colere", XB, "du-tc-shB"),
      charActor(XA, 0, sad("tc-A", accA)),
      charActor(XB, 0, pose("colere", { acc: accB, body: "du-tc-B", veinCls: "du-tc-vein", feetCls: "du-tc-feet",
        eyes: [{ kind: "dot", ry: 3, c: "du-tc-eAngry" }, { kind: "soft", c: "du-tc-eShut", op: 0 }],
        mouths: [{ m: -0.6, c: "du-tc-mFrown" }, { m: 0.05, c: "du-tc-mCalm", op: 0 }] })),
      A({ c1: "du-tc-thud", o1: "250px 199px", parts: [P("M218,198 L208,193 M216,204 L205,204 M282,198 L292,193 M284,204 L295,204", { sw: 2 })] })
    ]
    // Les huit premières émotions : leurs scènes s'appliquent. Neutre : pas d'interaction.
  };

  // ——— Anxiété + chacune : le temps qui presse… et qui finit par ralentir ———
  const anxWatch = (cx, cy, c, hc) => [P(C(cx, cy, 7.5), { fill: PALETTE.anxiete.leger, sw: 3, c }),
    P(`M${cx},${cy} L${cx},${cy - 5.5}`, { sw: 1.9, c: hc, o: `${cx}px ${cy}px` }), P(`M${cx},${cy} L${cx + 3},${cy + 1.5}`, { sw: 1.9, c })];
  const anxTic = (cx, cy, c) => P(`M${cx + 10},${cy - 9} L${cx + 17},${cy - 15} M${cx + 12},${cy} L${cx + 21},${cy} M${cx + 10},${cy + 9} L${cx + 17},${cy + 15}`, { sw: 2.6, c, op: 0 });
  // Les bras d'Anxiété : montre levée devant l'œil, ou baissée le long du corps ; chacune avec son aiguille et son « tic ».
  const anxArms = pre => [
    ARM("M55,128 Q45,150 50,168"),
    ARM("M142,128 Q150,108 137,98", `du-${pre}-up`), ...anxWatch(136, 96, `du-${pre}-up`, `du-${pre}-handUp`), anxTic(136, 96, `du-${pre}-ticUp`),
    ARM("M145,128 Q158,150 152,168", `du-${pre}-down`, 0), ...withC(anxWatch(152, 172, "", "").slice(0, 1), `du-${pre}-down`, 0),
    P("M152,172 L152,166.5", { sw: 1.9, c: `du-${pre}-handDown`, o: "152px 172px" }),
    ...withC([P("M152,172 L155,173.5", { sw: 1.9 })], `du-${pre}-down`, 0), anxTic(152, 172, `du-${pre}-ticDown`)
  ];
  const anx = (pre, acc) => pose("anxiete", { acc, body: `du-${pre}`, origin: "100px 195px", arm: "none",
    eyes: [{ kind: "dot", ry: 4, c: `du-${pre}-eye` }, { kind: "soft", c: `du-${pre}-eSoft`, op: 0 }],
    mouths: [{ m: -0.25, c: `du-${pre}-mTense` }, { m: 0.3, c: `du-${pre}-mCalm`, op: 0 }] });
  const ANX = {
    // Deux montres à contretemps : on les compare, on les remet à la même heure, et les deux tic-tac ralentissent ensemble.
    anxiete: () => {
      const pA = anx("qq-A", accA), pB = anx("qq-B", accB);
      return [
        shadow("anxiete", XA, "du-qq-shA"), shadow("anxiete", XB, "du-qq-shB"),
        charActor(XA, 0, pA), overlay(XA, 0, pA, anxArms("qq-A")),
        charActor(XB, 0, pB), overlay(XB, 0, pB, anxArms("qq-B")),
        // l'éclair de la remise à l'heure, sur les deux cadrans à la fois
        ...["A", "B"].map(k => A({ c1: `du-qq-sync${k}`, parts: [P("M0,-13 L0,-19 M11,-7 L16,-11 M-11,-7 L-16,-11", { sw: 2.2 })] }))
      ];
    },
    // Chaque tic fait battre sa veine et taper son pied ; elle arrête la montre, et dans le silence, les deux soufflent.
    colere: () => {
      const pA = anx("qc-A", accA);
      return [
        shadow("anxiete", XA), shadow("colere", XB, "du-qc-shB"),
        charActor(XA, 0, pA), overlay(XA, 0, pA, anxArms("qc-A")),
        charActor(XB, 0, pose("colere", { acc: accB, body: "du-qc-B", veinCls: "du-qc-vein",
          eyes: [{ kind: "dot", ry: 3, c: "du-qc-eAngry" }, { kind: "soft", c: "du-qc-eShut", op: 0 }],
          mouths: [{ m: -0.6, c: "du-qc-mFrown" }, { m: 0.1, c: "du-qc-mCalm", op: 0 }] })),
        A({ c1: "du-qc-thud", o1: "250px 199px", parts: [P("M218,198 L208,193 M216,204 L205,204 M282,198 L292,193 M284,204 L295,204", { sw: 2 })] }),
        // le souffle, quand tout s'arrête : trois petites volutes
        A({ c1: "du-qc-puffA", parts: [P("M0,0 q-4,-4 0,-8 q4,-4 0,-8", { sw: 2 })] }),
        A({ c1: "du-qc-puffB", parts: [P("M0,0 q4,-4 0,-8 q-4,-4 0,-8", { sw: 2 })] })
      ];
    }
    // Les neuf premières émotions : leurs scènes s'appliquent. Neutre : pas d'interaction.
  };

  // ——— Colère + Colère : à qui le plus fâché… jusqu'au fou rire ———
  const angry = (pre, acc) => pose("colere", { acc, body: `du-${pre}`, veinCls: `du-${pre}-vein`,
    eyes: [{ kind: "dot", ry: 3, c: `du-${pre}-e` }, { kind: "soft", c: `du-${pre}-s`, op: 0 }],
    mouths: [{ m: -0.6, c: `du-${pre}-mFrown` }, { m: 0.95, c: `du-${pre}-mLaugh`, op: 0 }] });
  const COL = {
    colere: () => [
      shadow("colere", XA, "du-cc-shA"), shadow("colere", XB, "du-cc-shB"),
      charActor(XA, 0, angry("cc-A", accA)), charActor(XB, 0, angry("cc-B", accB)),
      // le choc, ventre contre ventre
      A({ c1: "du-cc-bang", o1: "180px 136px", parts: [P("M180,110 L180,98 M172,112 L164,103 M188,112 L196,103 M172,164 L164,172 M188,164 L196,172", { sw: 2.6 })] })
    ]
    // Toutes les autres émotions : leurs scènes s'appliquent. Neutre : pas d'interaction.
  };

  const BOOK = { joie: JOIE, serenite: SERENE, amour: AMOUR, gratitude: GRAT, fierte: FIER, excitation: EXCI, nostalgie: NOST, fatigue: FATI, tristesse: TRIS, anxiete: ANX, colere: COL };
  const scene = lead && BOOK[lead][b] ? BOOK[lead][b] : null;
  const actors = scene ? scene() : baseActors(a, XA, accA).concat(baseActors(b, XB, accB));
  return {
    actors,
    stageTf: mirror ? "translate(360,0) scale(-1,1)" : "translate(0,0)",
    mirror,
    scripted: Boolean(scene)
  };
}
