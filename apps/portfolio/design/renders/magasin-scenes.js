// ——— Au travail : le magasin en coupe, pour la section « Au travail » d'« À propos » ———
// Un supermarché générique (aucune enseigne) vu de biais, sans plafond ni murs de devant. Quatre coins, un par projet
// pro : le rayon frais (la commande des produits frais), le bureau du directeur (les chiffres du magasin), le
// comptoir SAV (les apps du SAV et leur BFF) et le copilote en rayon, téléphone en main (l'app des magasins).
// userData.hotspots : les quatre points, projetés par window.hotspots().
const STORE = { W: 6.4, D: 4.2, H: 2.25 };
const FRESH = [0xd9765f, 0xe39a52, 0x9bb86f, 0xe8cd6a, 0x7e6a96, 0x8fb878];
const GOODS = [0xe9e4db, 0xf6f0e6, 0xd9b475, 0xc6ab9c, 0xa9b2ba, 0x8fb8d3, 0xd9765f, 0xc9473d, 0xb0aec8];
const SAGE = 0x7f9a78;
// Le rouge du magasin : les bandeaux, la corniche, les têtes de rayon, le comptoir, le panneau du frais.
const RED = 0xc9473d;
// Le copilote au magasin tient son téléphone devant lui, l'avant-bras levé.
REST_POSES.magasin = [[-0.2, 0, -0.32], [-1.35, 0, 0]];

const storeRnd = (seed) => {
  let x = seed;
  return () => ((x = (x * 9301 + 49297) % 233280) / 233280);
};

// Une enseigne de rayon : un mot, en capitales, sur une plaque crème.
const signTex = (word, fg = "#2B2B2F", bg = "#F6F1E9") =>
  canvasTex(512, 128, (c, w, h) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    c.fillStyle = fg;
    c.font = "600 64px 'Segoe UI', system-ui, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(word, w / 2, h / 2 + 4);
  });
function sign(word, w, h, { fg, bg } = {}) {
  const tex = signTex(word, fg, bg);
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(w + 0.04, h + 0.04, 0.04, 2, 0.015), new THREE.MeshStandardMaterial({ color: 0xc9a063, metalness: 0.6, roughness: 0.4 })));
  g.add(mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), 0, 0, 0.022));
  return g;
}

// Une caisse de bois pleine de fruits ou de légumes.
function crate(M, color, rnd) {
  const g = new THREE.Group();
  const W = 0.46, D = 0.34, H = 0.14;
  g.add(mesh(new THREE.BoxGeometry(W, 0.02, D), M.wood, 0, 0.01, 0));
  for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.02, H, D), M.wood, sx * (W / 2 - 0.01), H / 2, 0));
  for (const sz of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(W, H, 0.02), M.wood, 0, H / 2, sz * (D / 2 - 0.01)));
  const fruit = tinted(color, 0.55);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 3; j++) {
      const r = 0.05 + rnd() * 0.012;
      g.add(mesh(new THREE.SphereGeometry(r, 18, 14), fruit, -W / 2 + 0.07 + i * 0.105 + (rnd() - 0.5) * 0.02, H - 0.02 + rnd() * 0.02, -D / 2 + 0.07 + j * 0.1));
    }
  return g;
}

// Une gondole double face, dans l'axe de la profondeur : socle, dos, trois étagères de chaque côté, produits.
function gondola(M, len, seed) {
  const g = new THREE.Group();
  const rnd = storeRnd(seed);
  const Wd = 0.56, H = 1.3;
  g.add(mesh(new RoundedBoxGeometry(Wd, 0.12, len, 2, 0.02), M.clay2, 0, 0.06, 0));
  g.add(mesh(new RoundedBoxGeometry(0.06, H, len, 2, 0.02), M.clay, 0, H / 2, 0));
  for (const side of [-1, 1])
    for (const y of [0.12, 0.47, 0.82]) {
      g.add(mesh(new RoundedBoxGeometry(0.25, 0.025, len - 0.04, 1, 0.01), M.clay2, side * 0.155, y + 0.012, 0));
      let z = -len / 2 + 0.06;
      while (z < len / 2 - 0.12) {
        const bw = 0.1 + rnd() * 0.1, bh = 0.13 + rnd() * 0.13;
        const color = GOODS[Math.floor(rnd() * GOODS.length)];
        const box = rnd() < 0.3
          ? mesh(new THREE.CylinderGeometry(0.05, 0.05, bh, 16), tinted(color, 0.5), side * 0.16, y + 0.025 + bh / 2, z + 0.05)
          : mesh(new RoundedBoxGeometry(0.18, bh, bw, 1, 0.012), tinted(color, 0.6), side * 0.16, y + 0.025 + bh / 2, z + bw / 2);
        g.add(box);
        z += bw + 0.02;
      }
    }
  // La tête de gondole, côté allée : un bandeau sauge.
  g.add(mesh(new RoundedBoxGeometry(Wd, 0.16, 0.05, 2, 0.02), tinted(RED, 0.7), 0, H + 0.1, len / 2 - 0.03));
  g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), M.clay2, 0, H + 0.0, len / 2 - 0.03));
  return g;
}

// Un caddie : le panier en grillage (une texture à trous), le châssis, la poignée de laiton, quatre roues.
const GRID = canvasTex(128, 128, (c, w, h) => {
  c.clearRect(0, 0, w, h);
  c.strokeStyle = "#ffffff";
  c.lineWidth = 7;
  for (let k = 0; k <= 8; k++) {
    c.beginPath();
    c.moveTo((k * w) / 8, 0);
    c.lineTo((k * w) / 8, h);
    c.stroke();
    c.beginPath();
    c.moveTo(0, (k * h) / 8);
    c.lineTo(w, (k * h) / 8);
    c.stroke();
  }
});
function cart(M, rnd) {
  const g = new THREE.Group();
  const wire = new THREE.MeshStandardMaterial({ color: 0xc9c2b6, map: GRID, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.3 });
  const L = 0.62, W = 0.4, H = 0.3, Y = 0.42;
  const panel = (w, h, x, y, z, ry = 0) => {
    const p = mesh(new THREE.PlaneGeometry(w, h), wire, x, y, z);
    p.rotation.y = ry;
    g.add(p);
  };
  panel(L, H, 0, Y + H / 2, W / 2);
  panel(L, H, 0, Y + H / 2, -W / 2);
  panel(W, H, L / 2, Y + H / 2, 0, Math.PI / 2);
  panel(W, H, -L / 2, Y + H / 2, 0, Math.PI / 2);
  const bottom = mesh(new THREE.PlaneGeometry(L, W), wire, 0, Y, 0);
  bottom.rotation.x = -Math.PI / 2;
  g.add(bottom);
  const frame = M.clay2;
  for (const sz of [-1, 1]) {
    g.add(tube(curve([[0.28, 0.06, sz * 0.16], [0.2, 0.25, sz * 0.18], [-0.3, Y, sz * 0.2]]), 0.014, frame, 24));
    g.add(tube(curve([[-0.3, 0.06, sz * 0.16], [-0.32, 0.25, sz * 0.18], [-0.34, Y + H + 0.04, sz * 0.2]]), 0.014, frame, 24));
  }
  const handle = mesh(new THREE.CylinderGeometry(0.025, 0.025, W + 0.08, 16), M.accent, -0.38, Y + H + 0.06, 0);
  handle.rotation.x = Math.PI / 2;
  g.add(handle);
  for (const [x, z] of [[0.28, 0.16], [0.28, -0.16], [-0.3, 0.16], [-0.3, -0.16]]) {
    const w = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16), M.ink, x, 0.045, z);
    w.rotation.x = Math.PI / 2;
    g.add(w);
  }
  // Les courses : deux fruits, une boîte, une bouteille.
  g.add(mesh(new THREE.SphereGeometry(0.06, 16, 12), tinted(FRESH[0], 0.55), 0.12, Y + 0.06, 0.06));
  g.add(mesh(new THREE.SphereGeometry(0.06, 16, 12), tinted(FRESH[2], 0.55), 0.18, Y + 0.06, -0.08));
  g.add(mesh(new RoundedBoxGeometry(0.2, 0.16, 0.14, 1, 0.012), tinted(GOODS[5], 0.6), -0.1, Y + 0.08, 0.02));
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.26, 16), tinted(GOODS[7], 0.5), -0.18, Y + 0.13, -0.1));
  return g;
}

// Les chiffres du magasin, sur la tablette du bureau : des barres qui montent et descendent, une courbe de laiton.
function chartTexture() {
  const tex = canvasTex(400, 280, () => {});
  const draw = (phi) => {
    const c = tex.image.getContext("2d");
    const w = tex.image.width, h = tex.image.height;
    c.fillStyle = "#F6F1E9";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#2B2B2F";
    c.fillRect(24, 22, 120, 16);
    c.fillStyle = "#B3AA9C";
    c.fillRect(24, 46, 70, 10);
    const base = [0.45, 0.62, 0.5, 0.74, 0.66, 0.86];
    const pts = [];
    base.forEach((b, i) => {
      const v = b * (0.82 + 0.18 * Math.sin(phi + i * 0.9));
      const bh = v * 150, x = 34 + i * 58;
      c.fillStyle = i === base.length - 1 ? "#C9473D" : "#D6CFC3";
      c.fillRect(x, h - 30 - bh, 36, bh);
      pts.push([x + 18, h - 50 - bh * 1.05]);
    });
    c.strokeStyle = "#B08A4F";
    c.lineWidth = 5;
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
    tex.needsUpdate = true;
  };
  draw(0);
  return { tex, draw };
}

// L'écran du SAV : la file des dossiers, une pastille de couleur par statut ; la ligne en cours descend.
function savTexture() {
  const tex = canvasTex(400, 260, () => {});
  const STATUS = ["#F1E8DA", "#D9B475", "#D9765F", "#F1E8DA", "#D9B475", "#F1E8DA"];
  const draw = (phi) => {
    const c = tex.image.getContext("2d");
    const w = tex.image.width, h = tex.image.height;
    c.fillStyle = "#2B2B2F";
    c.fillRect(0, 0, w, h);
    const now = Math.floor(((phi / (Math.PI * 2)) * STATUS.length) % STATUS.length);
    STATUS.forEach((col, i) => {
      const y = 24 + i * 38;
      c.fillStyle = i === now ? "#3E3F45" : "#2B2B2F";
      c.fillRect(14, y - 6, w - 28, 32);
      c.fillStyle = col;
      c.beginPath();
      c.arc(36, y + 10, 8, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = i === now ? "#F1E8DA" : "#B9B2A6";
      c.fillRect(58, y + 4, 140 + ((i * 47) % 90), 12);
    });
    tex.needsUpdate = true;
  };
  draw(0);
  return { tex, draw };
}

// Le carrelage du sol : des carreaux crème aux joints à peine plus sombres.
const TILES = canvasTex(640, 420, (c, w, h) => {
  c.fillStyle = "#EEE8DD";
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "#DED5C6";
  c.lineWidth = 3;
  for (let k = 0; k <= 16; k++) {
    c.beginPath();
    c.moveTo((k * w) / 16, 0);
    c.lineTo((k * w) / 16, h);
    c.stroke();
  }
  for (let k = 0; k <= 10; k++) {
    c.beginPath();
    c.moveTo(0, (k * h) / 10);
    c.lineTo(w, (k * h) / 10);
    c.stroke();
  }
});

SCENES.magasin = (M) => {
  const g = new THREE.Group();
  const { W, D, H } = STORE;
  const rnd = storeRnd(11);
  const sage = tinted(SAGE, 0.7);
  const red = tinted(RED, 0.65);
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfe0e8, transparent: true, opacity: 0.35, roughness: 0.08, metalness: 0.1 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a063, metalness: 0.8, roughness: 0.35 });

  // — Le sol et les deux murs (le fond, la gauche) —
  const floor = mesh(new THREE.BoxGeometry(W, 0.12, D), [M.clay2, M.clay2, new THREE.MeshStandardMaterial({ map: TILES, roughness: 0.7 }), M.clay2, M.clay2, M.clay2], 0, -0.06, 0);
  g.add(floor);
  g.add(mesh(new RoundedBoxGeometry(W, H, 0.1, 2, 0.03), M.clay, 0, H / 2, -D / 2 - 0.05));
  g.add(mesh(new RoundedBoxGeometry(0.1, H, D, 2, 0.03), M.clay, -W / 2 - 0.05, H / 2, 0));
  // Le bandeau sauge en haut du mur du fond, et la plinthe.
  g.add(mesh(new RoundedBoxGeometry(W, 0.14, 0.04, 1, 0.01), red, 0, H - 0.2, -D / 2 + 0.02));
  g.add(mesh(new RoundedBoxGeometry(0.04, 0.14, D, 1, 0.01), red, -W / 2 + 0.02, H - 0.2, 0));

  // Deux affiches de saison sur le mur de gauche : un fruit, des bandes.
  [[0xd9765f, -0.2], [0x9bb86f, 1.05]].forEach(([col, z], k) => {
    const tex = canvasTex(200, 280, (c, w, h) => {
      c.fillStyle = "#F6F1E9";
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#" + col.toString(16).padStart(6, "0");
      c.beginPath();
      c.arc(w / 2, h * 0.42, 62, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#2B2B2F";
      c.fillRect(40, h * 0.74, w - 80, 14);
      c.fillStyle = "#B3AA9C";
      c.fillRect(60, h * 0.74 + 26, w - 120, 10);
    });
    const poster = new THREE.Group();
    poster.add(mesh(new RoundedBoxGeometry(0.03, 0.78, 0.58, 1, 0.01), M.clay2, 0, 0, 0));
    const face = mesh(new THREE.PlaneGeometry(0.52, 0.72), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), 0.017, 0, 0);
    face.rotation.y = Math.PI / 2;
    poster.add(face);
    poster.position.set(-W / 2 + 0.02, 1.3, z);
    g.add(poster);
  });

  // — 1. Le rayon frais : le meuble réfrigéré contre le mur, l'étal de fruits et légumes devant —
  const fresh = new THREE.Group();
  const CW = 2.1, CD = 0.72;
  fresh.add(mesh(new RoundedBoxGeometry(CW, 0.42, CD, 2, 0.03), M.clay2, 0, 0.21, 0));
  fresh.add(mesh(new RoundedBoxGeometry(CW, 1.72, 0.08, 2, 0.02), M.clay, 0, 0.86, -CD / 2 + 0.04));
  for (const sx of [-1, 1]) fresh.add(mesh(new RoundedBoxGeometry(0.06, 1.72, CD, 2, 0.02), M.clay2, sx * (CW / 2 - 0.03), 0.86, 0));
  fresh.add(mesh(new RoundedBoxGeometry(CW + 0.04, 0.14, CD + 0.06, 2, 0.03), red, 0, 1.78, 0.02));
  const led = mesh(new THREE.BoxGeometry(CW - 0.2, 0.02, 0.04), M.led, 0, 1.69, CD / 2 - 0.1);
  led.castShadow = false;
  fresh.add(led);
  for (const y of [0.78, 1.1, 1.42]) {
    fresh.add(mesh(new RoundedBoxGeometry(CW - 0.12, 0.025, CD - 0.18, 1, 0.01), M.clay2, 0, y, -0.06));
    let x = -CW / 2 + 0.12;
    while (x < CW / 2 - 0.12) {
      const color = [0xf6f0e6, 0xf1ece4, 0xe8cd6a, 0xb0aec8, 0x8fb8d3, 0xd9765f][Math.floor(rnd() * 6)];
      const pot = rnd() < 0.55;
      const hh = pot ? 0.12 : 0.18 + rnd() * 0.06;
      fresh.add(pot
        ? mesh(new THREE.CylinderGeometry(0.055, 0.045, hh, 16), tinted(color, 0.5), x + 0.05, y + 0.012 + hh / 2, 0.02)
        : mesh(new RoundedBoxGeometry(0.1, hh, 0.12, 1, 0.012), tinted(color, 0.55), x + 0.05, y + 0.012 + hh / 2, 0.0));
      x += 0.13;
    }
  }
  // Sur le socle réfrigéré : des barquettes.
  for (let i = 0; i < 6; i++) fresh.add(mesh(new RoundedBoxGeometry(0.28, 0.06, 0.22, 1, 0.012), tinted(FRESH[(i + 2) % 6], 0.6), -CW / 2 + 0.22 + i * 0.33, 0.45, 0.14));
  fresh.position.set(-W / 2 + 0.05 + CW / 2 + 0.05, 0, -D / 2 + CD / 2 + 0.02);
  g.add(fresh);
  const freshSign = sign("FRAIS", 0.9, 0.22, { fg: "#F6F1E9", bg: "#C9473D" });
  freshSign.position.set(fresh.position.x, 2.0, fresh.position.z + CD / 2 - 0.02);
  g.add(freshSign);

  // L'étal : un socle et deux gradins de caisses.
  const stall = new THREE.Group();
  stall.add(mesh(new RoundedBoxGeometry(1.56, 0.5, 0.86, 2, 0.03), M.wood, 0, 0.25, 0));
  stall.add(mesh(new RoundedBoxGeometry(1.56, 0.2, 0.42, 2, 0.03), M.wood, 0, 0.6, -0.22));
  FRESH.forEach((color, i) => {
    const c = crate(M, color, rnd);
    const row = i < 3 ? 0 : 1;
    c.position.set(-0.5 + (i % 3) * 0.5, row ? 0.7 : 0.5, row ? -0.22 : 0.22);
    c.rotation.x = row ? 0 : 0.12;
    stall.add(c);
  });
  stall.position.set(-1.95, 0, -0.2);
  g.add(stall);
  const freshSpot = new THREE.Object3D();
  freshSpot.position.set(-1.95, 1.05, -0.25);
  g.add(freshSpot);

  // — 2. Le bureau du directeur : cloison vitrée, bureau, tablette des chiffres, classeurs, une plante —
  const office = new THREE.Group();
  const OX0 = 1.7, OX1 = W / 2, OZ1 = -0.8;
  const ow = OX1 - OX0, od = OZ1 + D / 2;
  // La cloison de devant (avec la porte ouverte à gauche) et celle de gauche.
  const front = mesh(new THREE.BoxGeometry(ow - 0.55, 1.5, 0.03), glass, OX0 + 0.55 + (ow - 0.55) / 2, 0.75, OZ1);
  front.castShadow = false;
  office.add(front);
  const left = mesh(new THREE.BoxGeometry(0.03, 1.5, od), glass, OX0, 0.75, -D / 2 + od / 2);
  left.castShadow = false;
  office.add(left);
  office.add(mesh(new RoundedBoxGeometry(ow, 0.05, 0.06, 1, 0.015), M.clay2, OX0 + ow / 2, 1.52, OZ1));
  office.add(mesh(new RoundedBoxGeometry(0.06, 0.05, od, 1, 0.015), M.clay2, OX0, 1.52, -D / 2 + od / 2));
  for (const [x, z] of [[OX0, OZ1], [OX0 + 0.55, OZ1], [OX1 - 0.03, OZ1], [OX0, -D / 2]]) office.add(mesh(new RoundedBoxGeometry(0.06, 1.55, 0.06, 1, 0.015), M.clay2, x, 0.775, z));
  // Le bureau et sa chaise.
  const desk = new THREE.Group();
  desk.add(mesh(new RoundedBoxGeometry(1.0, 0.05, 0.52, 2, 0.015), M.wood, 0, 0.7, 0));
  for (const [x, z] of [[-0.45, -0.21], [0.45, -0.21], [-0.45, 0.21], [0.45, 0.21]]) desk.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.68, 10), M.clay2, x, 0.34, z));
  desk.position.set(OX0 + ow / 2 + 0.05, 0, -D / 2 + 0.55);
  office.add(desk);
  const chair = new THREE.Group();
  chair.add(mesh(new RoundedBoxGeometry(0.36, 0.06, 0.36, 2, 0.02), M.ink, 0, 0.44, 0));
  chair.add(mesh(new RoundedBoxGeometry(0.36, 0.4, 0.05, 2, 0.02), M.ink, 0, 0.66, -0.17));
  chair.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 10), M.clay2, 0, 0.22, 0));
  chair.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 20), M.clay2, 0, 0.02, 0));
  chair.position.set(desk.position.x + 0.1, 0, desk.position.z - 0.45);
  chair.rotation.y = 0.2;
  office.add(chair);
  // La tablette, sur son support, tournée vers nous.
  const chart = chartTexture();
  const tablet = new THREE.Group();
  tablet.add(mesh(new RoundedBoxGeometry(0.62, 0.44, 0.025, 2, 0.015), M.ink, 0, 0, 0));
  tablet.add(mesh(new THREE.PlaneGeometry(0.56, 0.38), new THREE.MeshStandardMaterial({ map: chart.tex, emissiveMap: chart.tex, emissive: 0xffffff, emissiveIntensity: 0.22, roughness: 0.4 }), 0, 0, 0.014));
  tablet.position.set(desk.position.x - 0.05, 0.98, desk.position.z + 0.1);
  tablet.rotation.set(-0.22, 0.35, 0);
  office.add(tablet);
  office.add(mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.26, 12), M.clay2, tablet.position.x, 0.84, tablet.position.z - 0.05));
  // Les classeurs sur une étagère du mur du fond.
  office.add(mesh(new RoundedBoxGeometry(0.9, 0.04, 0.24, 1, 0.01), M.clay2, OX0 + ow / 2, 1.55, -D / 2 + 0.12));
  [0xd8bf95, RED, 0xd8bf95, 0xb0aec8, 0xd8bf95, 0xc6ab9c].forEach((col, i) => {
    const b = mesh(new RoundedBoxGeometry(0.09, 0.3, 0.22, 1, 0.01), tinted(col, 0.75), OX0 + ow / 2 - 0.32 + i * 0.12, 1.72, -D / 2 + 0.13);
    b.rotation.z = i === 5 ? -0.2 : 0;
    office.add(b);
  });
  const pot = plant(M, sage, 0.8);
  pot.position.set(OX1 - 0.25, 0, -D / 2 + 0.3);
  office.add(pot);
  g.add(office);
  const officeSign = sign("BUREAU", 0.78, 0.19);
  officeSign.position.set(OX0 + 0.55 + (ow - 0.55) / 2, 1.7, OZ1 + 0.03);
  g.add(officeSign);
  const officeSpot = new THREE.Object3D();
  officeSpot.position.copy(tablet.position);
  g.add(officeSpot);

  // — 3. Le comptoir SAV, devant à droite : le comptoir, l'écran des dossiers, un colis retourné, son panneau —
  const sav = new THREE.Group();
  sav.add(mesh(new RoundedBoxGeometry(1.4, 0.86, 0.52, 2, 0.03), M.clay, 0, 0.43, 0));
  sav.add(mesh(new RoundedBoxGeometry(1.48, 0.05, 0.6, 2, 0.015), M.wood, 0, 0.885, 0));
  sav.add(mesh(new RoundedBoxGeometry(1.4, 0.12, 0.02, 1, 0.01), red, 0, 0.7, 0.265));
  const savScreen = savTexture();
  const monitor = new THREE.Group();
  monitor.add(mesh(new RoundedBoxGeometry(0.56, 0.38, 0.03, 2, 0.015), M.ink, 0, 0, 0));
  monitor.add(mesh(new THREE.PlaneGeometry(0.52, 0.34), new THREE.MeshStandardMaterial({ map: savScreen.tex, emissiveMap: savScreen.tex, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.4 }), 0, 0, 0.016));
  monitor.position.set(0.3, 1.2, -0.05);
  monitor.rotation.y = -0.55;
  sav.add(monitor);
  sav.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 10), M.clay2, 0.3, 0.99, -0.07));
  sav.add(mesh(new RoundedBoxGeometry(0.2, 0.02, 0.14, 1, 0.006), M.clay2, 0.3, 0.92, -0.07));
  // Le colis : kraft, scotch, étiquette.
  const box = new THREE.Group();
  box.add(mesh(new RoundedBoxGeometry(0.36, 0.24, 0.28, 1, 0.012), tinted(0xd8bf95, 0.8), 0, 0.12, 0));
  box.add(mesh(new THREE.BoxGeometry(0.37, 0.006, 0.07), tinted(0xc4a77c, 0.6), 0, 0.243, 0));
  box.add(mesh(new THREE.BoxGeometry(0.12, 0.08, 0.004), M.label, 0.06, 0.13, 0.142));
  box.position.set(-0.35, 0.91, 0.05);
  box.rotation.y = 0.3;
  sav.add(box);
  const savSign = sign("SAV", 0.5, 0.2, { fg: "#F6F1E9", bg: "#2B2B2F" });
  savSign.position.set(-0.3, 0.5, 0.27);
  sav.add(savSign);
  sav.position.set(2.35, 0, 1.15);
  sav.rotation.y = -0.12;
  g.add(sav);
  const savSpot = new THREE.Object3D();
  monitor.add(savSpot);

  // — Les gondoles, au milieu —
  const g1 = gondola(M, 2.1, 5);
  g1.position.set(-0.35, 0, -0.85);
  g.add(g1);
  const g2 = gondola(M, 2.1, 9);
  g2.position.set(0.95, 0, -0.85);
  g.add(g2);

  // — 4. Le copilote en rayon, téléphone en main —
  const adam = copilot(M, "magasin");
  adam.scale.setScalar(0.62);
  adam.position.set(0.3, 0.255, 0.75);
  adam.rotation.y = 0.55;
  g.add(adam);
  const adamSpot = new THREE.Object3D();
  adam.userData.phone.add(adamSpot);

  // — Le caddie, qui fait l'aller-retour dans l'allée de devant —
  const trolley = cart(M, rnd);
  g.add(trolley);

  g.userData.hotspots = [
    { id: "frais", o: freshSpot },
    { id: "bureau", o: officeSpot },
    { id: "sav", o: savSpot },
    { id: "rayon", o: adamSpot },
  ];
  g.userData.hotspot = freshSpot;
  g.userData.animate = (phi) => {
    adam.userData.animate(phi);
    chart.draw(phi);
    savScreen.draw(phi);
    const u = pingpong(phi);
    trolley.position.set(-2.6 + u * 1.6, 0, 1.35);
    trolley.rotation.y = Math.sin(phi) < 0 ? Math.PI : 0;
  };
  g.userData.camera = { pos: [3.3, 4.1, 6.5], target: [0.1, 0.62, -0.15], fov: 31 };
  return g;
};

// Les quatre points du magasin, en % de l'image.
window.hotspots = () => {
  const list = current?.obj.userData.hotspots;
  if (!list) return null;
  current.scene.updateMatrixWorld(true);
  return list.map(({ id, o }) => {
    const v = new THREE.Vector3();
    o.getWorldPosition(v);
    v.project(current.camera);
    return { id, x: +(((v.x + 1) / 2) * 100).toFixed(1), y: +(((1 - v.y) / 2) * 100).toFixed(1) };
  });
};
