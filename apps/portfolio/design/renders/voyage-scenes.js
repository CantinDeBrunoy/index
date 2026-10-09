// Scènes du « voyage » : une grande scène continue où chaque projet mène au suivant.
// Ce code est inséré dans le module de anim.html (accès à THREE, BUILD, mesh, tube, curve, roundRect, pingpong, mats, THEMES, renderer).
// Chaque scène garde la matière claire et le laiton, plus UNE couleur discrète qui lui est propre (TINT).

const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
const { STLLoader } = await import("three/addons/loaders/STLLoader.js");
const { toCreasedNormals } = await import("three/addons/utils/BufferGeometryUtils.js");
const ASSET = (p) => new URL(`assets/${p}`, location.href).href;
// Avion de ligne « very cute airplane » d'Akash Rudra (CC-BY 3.0, via Poly Pizza), repeint dans notre matière.
// Pays : Natural Earth 1:110m (domaine public), le jeu de données qu'affiche Magellan.
// Tour Eiffel : « Eiffel Tower LOW POLY » d'ingoenius (CC0) ; arc de triomphe : Microsoft (CC BY 4.0), via Wikimedia Commons.
// Voitures : « Car », « Car », « SUV » de Quaternius (CC0) ; coffre-fort : « Safe » de CreativeTrio (CC0), via Poly Pizza.
const stl = new STLLoader();
const gltf = new GLTFLoader();
const [AIRLINER, COUNTRIES, EIFFEL_STL, ARC_STL, ...MODELS] = await Promise.all([
  gltf.loadAsync(ASSET("airliner.glb")),
  fetch(ASSET("countries-110m.geojson")).then((r) => r.json()),
  stl.loadAsync(ASSET("eiffel.stl")),
  stl.loadAsync(ASSET("arc-de-triomphe.stl")),
  gltf.loadAsync(ASSET("car-sedan.glb")),
  gltf.loadAsync(ASSET("car-hatch.glb")),
  gltf.loadAsync(ASSET("car-suv.glb")),
  gltf.loadAsync(ASSET("safe.glb")),
]);
const CARS = MODELS.slice(0, 3);
const SAFE = MODELS[3];
// Les deux monuments, ramenés à une hauteur de 1, posés à y = 0 et centrés.
// Normales lissées sous 30° : les courbes s'adoucissent, les arêtes vives restent nettes.
const monument = (geo, upright) => {
  if (upright) geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  const b = geo.boundingBox;
  geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  const h = b.max.y - b.min.y;
  geo.scale(1 / h, 1 / h, 1 / h);
  const out = toCreasedNormals(geo, Math.PI / 6);
  out.computeBoundingBox();
  return out;
};
const EIFFEL = monument(EIFFEL_STL, false);
const ARC = monument(ARC_STL, true);
renderer.localClippingEnabled = true;

// Saturation tenue basse (de l'ordre de la sauge) : la couleur se remarque sans prendre le pas sur le laiton.
const TINT = {
  espace: 0xb0aec8, // lavande : les bandes de la planète
  terre: 0x8fb1c4, // l'océan
  avion: 0x8fb8d3, // le ciel
  paris: 0xa9b2ba, // le zinc des toits
  monuments: 0xa9ba9d, // la sauge des arbres
  monument: 0xeab9b2, // le rouge très clair des monuments (tour Eiffel, arc de triomphe) et de la porte du coffre de Mithril, qui les détache du décor
  route: 0xc6ab9c, // la tuile
  maison: 0xa3b79d, // la plante, le tapis
  salon: 0xcdb3a4, // la terre cuite du tapis
  bagage: 0xc98f72, // la valise oubliée de la 404
};
const tinted = (color, rough = 0.62) => new THREE.MeshStandardMaterial({ color, roughness: rough });
const D2R = Math.PI / 180;
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const WATER = () => new THREE.MeshStandardMaterial({ color: 0x86b1c8, roughness: 0.3 });
const flatTube = (c, r, mat, y) => {
  const o = mesh(new THREE.TubeGeometry(c, 140, r, 10, false), mat);
  o.scale.y = 0.18;
  o.position.y = y;
  o.castShadow = false;
  return o;
};
// pick(v) choisit la matière d'un bloc ; elle consomme le même tirage qu'avant, donc la ville ne bouge pas.
const cityBlocks = (g, M, count, area, seed, avoid = () => false, pick = (v) => (v > 0.85 ? M.clay2 : M.clay)) => {
  let x = seed;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < count; i++) {
    const px = (rnd() - 0.5) * area[0], pz = (rnd() - 0.5) * area[1];
    if (avoid(px, pz)) continue;
    const h = 0.08 + rnd() * 0.32;
    g.add(mesh(new RoundedBoxGeometry(0.16 + rnd() * 0.14, h, 0.16 + rnd() * 0.14, 2, 0.02), pick(rnd()), px, 0.08 + h / 2, pz));
  }
};
const starField = (n, seed) => {
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(n * 3);
  let x = seed;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) arr.set([(rnd() - 0.5) * 30, (rnd() - 0.5) * 18, -6 - rnd() * 10], i * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xf3efe6, size: 0.05 }));
};
const canvasTex = (w, h, draw, srgb = true) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

// Une tache ronde au bord fondu : l'encre qui se diffuse dans l'eau.
const SOFT = canvasTex(128, 128, (c, w) => {
  const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.45, "rgba(255,255,255,0.55)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = gr;
  c.fillRect(0, 0, w, w);
});

// ——— La Terre : vraie carte, pays de la démo Magellan en laiton ———
const VISITED = new Set(["FRA", "JPN", "ISL", "PER", "GBR", "ESP", "NLD", "MAR", "ZAF", "AUS", "ITA", "CZE", "NOR"]);
const GLOBE = (() => {
  const W = 4096, H = 2048;
  const X = (lon) => ((lon + 180) / 360) * W, Y = (lat) => ((90 - lat) / 180) * H;
  const trace = (ctx, rings) => {
    ctx.beginPath();
    for (const ring of rings) ring.forEach(([lon, lat], i) => (i ? ctx.lineTo(X(lon), Y(lat)) : ctx.moveTo(X(lon), Y(lat))));
  };
  const polygons = (f) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates);
  const relief = document.createElement("canvas");
  relief.width = W;
  relief.height = H;
  const r = relief.getContext("2d");
  r.fillStyle = "#000";
  r.fillRect(0, 0, W, H);
  const map = canvasTex(W, H, (c) => {
    c.fillStyle = "#7F9DAE";
    c.fillRect(0, 0, W, H);
    for (const f of COUNTRIES.features) {
      const code = f.properties.ADM0_A3 || f.properties.ISO_A3;
      for (const rings of polygons(f)) {
        trace(c, rings);
        c.fillStyle = VISITED.has(code) ? "#C9A467" : "#EFE8DB";
        c.fill("evenodd");
        c.strokeStyle = "rgba(120, 104, 84, 0.28)";
        c.lineWidth = 2;
        c.stroke();
        trace(r, rings);
        r.fillStyle = "#fff";
        r.fill("evenodd");
      }
    }
  });
  map.anisotropy = 8;
  // Relief adouci : les côtes montent en pente douce au lieu d'une marche.
  const bump = canvasTex(W / 2, H / 2, (c, w, h) => {
    c.filter = "blur(3px)";
    c.drawImage(relief, 0, 0, w, h);
  }, false);
  return { map, bump };
})();
const earthMaterial = () => new THREE.MeshStandardMaterial({ map: GLOBE.map, bumpMap: GLOBE.bump, bumpScale: 4, roughness: 0.8 });
// lat/lon → point de la sphère, dans le repère des UV de SphereGeometry (lon 0 vers +x).
const onGlobe = (lat, lon, r) => {
  const th = (90 - lat) * D2R, a = (lon + 180) * D2R;
  return new THREE.Vector3(-r * Math.cos(a) * Math.sin(th), r * Math.cos(th), r * Math.sin(a) * Math.sin(th));
};
const halo = (radius, rgb) => {
  const inner = 0.76;
  const tex = canvasTex(512, 512, (c, w) => {
    const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, `rgba(${rgb},0)`);
    gr.addColorStop(inner - 0.03, `rgba(${rgb},0)`);
    gr.addColorStop(inner, `rgba(${rgb},0.42)`);
    gr.addColorStop(inner + 0.07, `rgba(${rgb},0.12)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = gr;
    c.fillRect(0, 0, w, w);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.setScalar((radius * 2) / inner);
  return s;
};

// ——— L'avion de ligne ———
const GEAR = /^Group_(005|004|029|018|017|028|030|019)$/; // train d'atterrissage : on vole
const FIN = /^Group_(006|016002$|027002$)/; // la dérive et les winglets, en laiton
const DARK = /^Group_001(009|010)$/; // bandeau des hublots, vitres du cockpit
const ENGINE = /^Group_(009|020)$/;
const keyOf = (o, root) => (o.parent && o.parent !== root ? o.parent.name : o.name);
const AIR = (() => {
  const root = AIRLINER.scene;
  let fus = null;
  root.traverse((o) => {
    if (o.isMesh && keyOf(o, root) === "Group_001002") fus = o;
  });
  // Le fichier est légèrement en lacet : on mesure l'axe du fuselage sur ses sommets.
  const pos = fus.geometry.attributes.position;
  let mx = 0, mz = 0;
  for (let i = 0; i < pos.count; i++) {
    mx += pos.getX(i);
    mz += pos.getZ(i);
  }
  mx /= pos.count;
  mz /= pos.count;
  let sxx = 0, szz = 0, sxz = 0;
  for (let i = 0; i < pos.count; i++) {
    const dx = pos.getX(i) - mx, dz = pos.getZ(i) - mz;
    sxx += dx * dx;
    szz += dz * dz;
    sxz += dx * dz;
  }
  const yaw = 0.5 * Math.atan2(2 * sxz, szz - sxx);
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    box.expandByPoint(new THREE.Vector3(v.x * Math.cos(yaw) - v.z * Math.sin(yaw), v.y, v.x * Math.sin(yaw) + v.z * Math.cos(yaw)));
  }
  return { yaw, center: box.getCenter(new THREE.Vector3()), length: box.max.z - box.min.z, radius: (box.max.y - box.min.y) / 2 };
})();
// Nez vers +z, dessus vers +y, centré sur le fuselage.
function airliner(M, { length = 1, engine = M.clay2 } = {}) {
  const g = new THREE.Group();
  const model = AIRLINER.scene.clone(true);
  model.rotation.y = -AIR.yaw;
  model.position.copy(AIR.center).multiplyScalar(-1);
  g.add(model);
  g.scale.setScalar(length / AIR.length);
  const mat = { clay: M.clay, fin: M.accent, dark: M.ink, engine };
  model.traverse((o) => {
    if (!o.isMesh) return;
    const k = keyOf(o, model);
    if (GEAR.test(k)) {
      o.visible = false;
      return;
    }
    o.material = FIN.test(k) ? mat.fin : DARK.test(k) ? mat.dark : ENGINE.test(k) ? mat.engine : mat.clay;
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return g;
}

// L'aile droite d'un A320 vue du hublot : flèche, dièdre, réacteur sous l'aile, winglet en laiton.
// Repère local : bord d'attaque à l'emplanture en (0, 0, 0), envergure vers -z, corde vers +x.
function wing(M, { span = 11, rootChord = 3.2, tipChord = 1.0, sweep = 0.63, dihedral = 0.05, thick = 0.14 } = {}) {
  const g = new THREE.Group();
  const plan = new THREE.Shape();
  plan.moveTo(0, 0);
  plan.lineTo(span * sweep, span);
  plan.lineTo(span * sweep + tipChord, span);
  plan.lineTo(rootChord, 0);
  plan.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(plan, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.5, bevelSize: 0.09, bevelSegments: 6, curveSegments: 4 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -thick / 2, 0);
  g.add(mesh(geo, M.clay));
  // Winglet : un petit aileron relevé au bout de l'aile.
  const fin = new THREE.Shape();
  fin.moveTo(0, 0);
  fin.lineTo(tipChord * 0.55, 0.95);
  fin.lineTo(tipChord * 0.95, 0.95);
  fin.lineTo(tipChord * 0.98, 0);
  fin.lineTo(0, 0);
  const finGeo = new THREE.ExtrudeGeometry(fin, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.03, bevelSegments: 3 });
  finGeo.translate(0, 0, -0.025);
  const winglet = mesh(finGeo, M.accent, span * sweep + 0.02, 0.02, -span);
  winglet.rotation.x = -0.12;
  g.add(winglet);
  // Le réacteur : une nacelle au tiers de l'envergure, en avant du bord d'attaque.
  const v = span * 0.3;
  const nacelle = new THREE.Group();
  const prof = [[0.42, 0], [0.55, 0.12], [0.6, 0.55], [0.57, 1.6], [0.44, 2.35], [0.3, 2.65]].map(([r, y]) => new THREE.Vector2(r, y));
  const shell = mesh(new THREE.LatheGeometry(prof, 64), M.clay);
  shell.material = M.clay.clone();
  shell.material.side = THREE.DoubleSide;
  nacelle.add(shell);
  const lip = mesh(new THREE.TorusGeometry(0.47, 0.06, 16, 64), M.clay2, 0, 0.04, 0);
  lip.rotation.x = Math.PI / 2;
  nacelle.add(lip);
  const fan = mesh(new THREE.CircleGeometry(0.45, 48), M.ink, 0, 0.3, 0);
  fan.rotation.x = Math.PI / 2;
  nacelle.add(fan);
  nacelle.rotation.z = -Math.PI / 2; // axe de la nacelle le long de x, entrée d'air vers l'avant (-x)
  nacelle.position.set(v * sweep - 1.05, -0.95, -v);
  g.add(nacelle);
  g.add(mesh(new RoundedBoxGeometry(1.5, 0.5, 0.12, 2, 0.04), M.clay2, v * sweep + 0.25, -0.5, -v));
  // Les carénages des rails de volets, sous le bord de fuite.
  for (const k of [0.48, 0.66, 0.84]) {
    const s = span * k;
    const te = rootChord + (s / span) * (span * sweep + tipChord - rootChord);
    const pod = mesh(new THREE.CapsuleGeometry(0.07, 0.7, 6, 16), M.clay2, te - 0.1, -0.1, -s);
    pod.rotation.z = Math.PI / 2;
    g.add(pod);
  }
  g.rotation.x = dihedral;
  return g;
}

// Un modèle .glb ramené à une taille donnée sur son plus grand côté horizontal, posé à y = 0, centré.
function fitModel(src, size) {
  const root = src.scene.clone(true);
  const box = new THREE.Box3().setFromObject(root);
  const c = box.getCenter(new THREE.Vector3());
  const s = size / Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  root.position.set(-c.x, -box.min.y, -c.z);
  const g = new THREE.Group();
  g.add(root);
  g.scale.setScalar(s);
  return g;
}

// Une vraie voiture (modèle libre, nez vers +z), repeinte : carrosserie au choix, vitres et pneus à l'encre.
function car(M, k, body) {
  const g = fitModel(CARS[k % CARS.length], 0.3);
  g.traverse((o) => {
    if (!o.isMesh) return;
    const name = o.material.name;
    o.material = name === "Windows" || name === "Black" ? M.ink : name === "Grey" ? M.clay2 : name === "Headlights" ? M.label : name === "TailLights" ? tinted(TINT.route, 0.6) : body;
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return g;
}

// Le vrai coffre-fort de Mithril (modèle libre). Sa texture est une palette : on y repeint les zones
// sombres (molette, poignée) et le reste. Le caisson reste en craie ; la porte et le fond prennent le
// rouge clair des monuments, qui détache le coffre du bureau, et la molette et la poignée le laiton.
const rgbOf = (hex) => [hex >> 16, (hex >> 8) & 255, hex & 255];
const SAFE_LOOK = { body: [233, 228, 219], door: rgbOf(TINT.monument), knobs: [176, 138, 79], inside: 0x9b6d67 };
const SAFE_TEX = (() => {
  let tex = null;
  SAFE.scene.traverse((o) => {
    if (o.isMesh && o.material.map) tex = o.material.map;
  });
  return tex;
})();
const safeMat = (base, knobs) => {
  const img = SAFE_TEX.image;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const l = (0.2126 * d.data[i] + 0.7152 * d.data[i + 1] + 0.0722 * d.data[i + 2]) / 255;
    const rgb = l < 0.3 ? knobs : base.map((v) => v * (0.88 + 0.12 * l));
    d.data[i] = rgb[0];
    d.data[i + 1] = rgb[1];
    d.data[i + 2] = rgb[2];
  }
  ctx.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.flipY = SAFE_TEX.flipY;
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0.05 });
};
const SAFE_BODY_MAT = safeMat(SAFE_LOOK.body, SAFE_LOOK.knobs);
const SAFE_DOOR_MAT = safeMat(SAFE_LOOK.door, SAFE_LOOK.knobs);
// La couleur de la porte sans texture (le gris de la palette, l = 0,545), pour son épaisseur.
const SAFE_PLAIN = new THREE.MeshStandardMaterial({
  color: new THREE.Color().setRGB(...SAFE_LOOK.door.map((v) => (v * 0.945) / 255), THREE.SRGBColorSpace),
  roughness: 0.55,
  metalness: 0.05,
});
const SAFE_INSIDE = new THREE.MeshStandardMaterial({ color: SAFE_LOOK.inside, roughness: 0.8, side: THREE.BackSide });
// Le modèle est d'un seul tenant : on en détache la porte (la plaque en relief et la poignée) et la molette.
// Coordonnées du modèle, en millièmes : la porte couvre x −0,89 → 1,32, y 0,31 → 2,31, devant z = 0,68,
// et derrière elle le caisson est ouvert. userData.door pivote sur la charnière, au bord droit du caisson
// (rotation.y > 0 : la porte s'ouvre) ; userData.dial tourne sur son axe (rotation.z).
function safe(h = 1) {
  const g = fitModel(SAFE, h);
  let box;
  g.traverse((o) => {
    if (o.isMesh) box = o;
  });
  const K = 1e-3;
  const geo = box.geometry, P = geo.attributes.position, idx = geo.index.array;
  const at = (i) => [P.getX(i) / K, P.getY(i) / K, P.getZ(i) / K];
  const inDoor = (i) => {
    const [x, y, z] = at(i);
    return x > -0.9 && x < 1.33 && y > 0.3 && y < 2.32 && z > 0.679;
  };
  const inDial = (i) => {
    const [x, y, z] = at(i);
    return x > -0.6 && x < -0.2 && y > 1.15 && y < 1.55 && z > 0.695;
  };
  const parts = { body: [], door: [], dial: [] };
  for (let t = 0; t < idx.length; t += 3) {
    const v = [idx[t], idx[t + 1], idx[t + 2]];
    parts[v.every(inDial) ? "dial" : v.every(inDoor) ? "door" : "body"].push(...v);
  }
  const part = (list) => {
    const p = geo.clone();
    p.setIndex(list);
    return p;
  };
  box.geometry = part(parts.body);
  box.material = SAFE_BODY_MAT;
  box.castShadow = true;
  box.receiveShadow = true;
  // Le fond du caisson, vu par l'ouverture.
  const inside = mesh(new THREE.BoxGeometry(2.21 * K, 2.0 * K, 2.38 * K), SAFE_INSIDE, 0.215 * K, 1.31 * K, -0.51 * K);
  inside.castShadow = false;
  box.add(inside);
  // La porte : la charnière au coin avant droit, la plaque décalée d'autant pour rester à sa place, fermée.
  const HX = 1.42 * K, HZ = 0.7 * K;
  const door = new THREE.Group();
  door.position.set(HX, 0, HZ);
  box.add(door);
  const plate = mesh(part(parts.door), SAFE_DOOR_MAT, -HX, 0, -HZ);
  door.add(plate);
  // Son épaisseur, cachée dans l'ouverture quand elle est fermée.
  plate.add(mesh(new THREE.BoxGeometry(2.17 * K, 1.96 * K, 0.12 * K), SAFE_PLAIN, 0.215 * K, 1.31 * K, 0.62 * K));
  // La molette tourne autour de son centre.
  const ring = parts.dial.map(at);
  const [DX, DY] = [0, 1].map((a) => (Math.min(...ring.map((p) => p[a])) + Math.max(...ring.map((p) => p[a]))) / 2 * K);
  const dial = new THREE.Group();
  dial.position.set(DX, DY, 0);
  plate.add(dial);
  dial.add(mesh(part(parts.dial), SAFE_DOOR_MAT, -DX, -DY, 0));
  g.userData.door = door;
  g.userData.dial = dial;
  return g;
}

// La vraie tour Eiffel (modèle libre), repeinte en craie, la pointe en laiton.
function eiffel(M, h = 1.6, mat = M.clay) {
  const g = new THREE.Group();
  const tower = mesh(EIFFEL, mat);
  tower.scale.setScalar(h);
  g.add(tower);
  g.add(mesh(new THREE.CylinderGeometry(0.004 * h, 0.009 * h, 0.06 * h, 8), M.accent, 0, h * 1.02, 0));
  return g;
}

// Le vrai arc de triomphe (modèle libre), haut de h. userData.spot : son pilier droit, côté face.
function arc(M, h = 1, mat = M.clay) {
  const g = new THREE.Group();
  const a = mesh(ARC, mat);
  a.scale.setScalar(h);
  g.add(a);
  const b = ARC.boundingBox;
  const spot = new THREE.Object3D();
  spot.position.set(b.max.x * 0.62 * h, 0.45 * h, b.max.z * h);
  g.add(spot);
  g.userData.spot = spot;
  return g;
}

function house(M) {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(0.34, 0.24, 0.3, 2, 0.02), M.clay, 0, 0.12, 0));
  const roof = mesh(new THREE.ConeGeometry(0.28, 0.18, 4), M.accent, 0, 0.33, 0);
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  return g;
}

// Une plante en pot : des feuilles en fuseau, couleur de la scène.
function plant(M, leafMat, h = 0.7) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.32, 32), M.clay2, 0, 0.16, 0));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + (i % 2) * 0.3;
    const leaf = mesh(new THREE.SphereGeometry(1, 20, 14), leafMat);
    leaf.scale.set(0.055, h * (0.32 + (i % 3) * 0.06), 0.11);
    leaf.position.set(Math.cos(a) * 0.1, 0.32 + h * 0.28, Math.sin(a) * 0.1);
    leaf.rotation.set(Math.sin(a) * 0.5, -a, -Math.cos(a) * 0.5);
    g.add(leaf);
  }
  return g;
}

// ——— Le calendrier de Tonalli ———
// Chaque jour d'octobre a sa couleur d'émotion (les douze de l'app, au cran léger), un jour manqué est hachuré,
// la case d'aujourd'hui se remplit une couleur après l'autre ; la photo du jour est glissée dans le coin.
const EMO = { joy: 0xffd93d, serenity: 0xa8dadc, love: 0xff6b9d, gratitude: 0xf4a261, pride: 0xe76f51, excitement: 0xff4d4d, nostalgia: 0xb08bbb, tiredness: 0x8d99ae, sadness: 0x457b9d, anxiety: 0x6a4c93, anger: 0x9b2226, neutral: 0xd8d8d8 };
// Le cran « léger » de l'app : la couleur mêlée à 40 % de crème.
const lightEmo = (k) => new THREE.Color(EMO[k]).lerp(new THREE.Color(0xfff7eb), 0.4);
const CAL = (() => {
  const DAYS = ["serenity", "joy", "gratitude", "joy", "love", "serenity", "tiredness", "neutral", null, "gratitude", "joy", "pride", "serenity", "nostalgia", "joy", "love", "excitement", "tiredness", "serenity", "gratitude", "joy", "sadness"];
  const TODAY = 23, FIRST = 3; // octobre 2026 commence un jeudi (semaine du lundi)
  const CW = 1024, CH = 1100, cell = 112, gap = 14, x0 = 78, y0 = 300;
  const at = (day) => {
    const i = FIRST + day - 1;
    return [x0 + (i % 7) * (cell + gap), y0 + Math.floor(i / 7) * (cell + gap)];
  };
  const face = canvasTex(CW, CH, (c) => {
    c.fillStyle = "#F6F0E6";
    c.fillRect(0, 0, CW, CH);
    c.fillStyle = "#2A2019";
    c.font = "italic 112px Georgia, serif";
    c.fillText("Octobre", x0, 190);
    c.fillStyle = "#B08A4F";
    c.fillRect(x0, 222, 120, 6);
    c.fillStyle = "#6A5F52";
    c.font = "40px Georgia, serif";
    c.textAlign = "center";
    "LMMJVSD".split("").forEach((d, k) => c.fillText(d, x0 + k * (cell + gap) + cell / 2, 282));
    c.textAlign = "left";
    for (let day = 1; day <= 31; day++) {
      const [x, y] = at(day);
      c.beginPath();
      c.roundRect(x, y + 14, cell, cell, 18);
      const emo = DAYS[day - 1];
      if (day < TODAY && emo) {
        c.fillStyle = `#${lightEmo(emo).getHexString()}`;
        c.fill();
      } else if (day < TODAY) {
        // Un jour manqué : hachuré, comme dans l'app.
        c.save();
        c.clip();
        c.strokeStyle = "#CFC4B6";
        c.lineWidth = 5;
        for (let k = -cell; k < cell * 2; k += 18) {
          c.beginPath();
          c.moveTo(x + k, y + 14 + cell);
          c.lineTo(x + k + cell, y + 14);
          c.stroke();
        }
        c.restore();
      } else if (day === TODAY) {
        c.strokeStyle = "#2A2019";
        c.lineWidth = 6;
        c.stroke();
      } else {
        c.strokeStyle = "#E3D8C8";
        c.lineWidth = 3;
        c.stroke();
      }
    }
    // La bascule de l'app : mon calendrier, le sien.
    const pill = (x, w, label, filled) => {
      c.beginPath();
      c.roundRect(x, 1000, w, 58, 29);
      c.fillStyle = filled ? "#2A2019" : "#F6F0E6";
      c.fill();
      c.strokeStyle = "#2A2019";
      c.lineWidth = 3;
      c.stroke();
      c.fillStyle = filled ? "#F6F0E6" : "#2A2019";
      c.font = "30px Georgia, serif";
      c.fillText(label, x + 30, 1039);
    };
    pill(x0, 270, "Mon calendrier", true);
    pill(x0 + 286, 270, "Son calendrier", false);
  });
  // La photo du jour : la scène, et le visage en vignette.
  const photo = canvasTex(256, 256, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#F3D9C2");
    gr.addColorStop(1, "#E8B994");
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#C98F6E";
    c.beginPath();
    c.ellipse(w * 0.62, h * 1.02, w * 0.62, h * 0.36, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#FBEFE4";
    c.strokeStyle = "#ffffff";
    c.lineWidth = 6;
    c.beginPath();
    c.roundRect(18, 18, 70, 92, 12);
    c.fill();
    c.stroke();
    c.fillStyle = "#D9A586";
    c.beginPath();
    c.arc(53, 58, 17, 0, Math.PI * 2);
    c.fill();
  });
  return { face, photo, at, TODAY, CW, CH, cell };
})();
// La feuille du calendrier, large de W : gondolée en bas, punaisée, la photo dans le coin.
// userData.today : la case d'aujourd'hui (le point à cliquer) ; userData.animate(phi).
function calendarSheet(M, W = 2.0) {
  const { face, photo, at, TODAY, CW, CH, cell } = CAL;
  const H = (W * CH) / CW;
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(W, H, 24, 24);
  const flat = geo.attributes.position.array.slice();
  g.add(mesh(geo, new THREE.MeshStandardMaterial({ map: face, roughness: 0.85, side: THREE.DoubleSide })));
  g.add(mesh(new THREE.SphereGeometry(0.0275 * W, 24, 16), M.accent, 0, H / 2 - 0.045 * W, 0.025 * W));
  const polaroid = new THREE.Group();
  polaroid.add(mesh(new RoundedBoxGeometry(0.26 * W, 0.31 * W, 0.006 * W, 2, 0.0025 * W), M.label));
  polaroid.add(mesh(new THREE.PlaneGeometry(0.22 * W, 0.22 * W), new THREE.MeshStandardMaterial({ map: photo, roughness: 0.7 }), 0, 0.025 * W, 0.00375 * W));
  polaroid.position.set(W / 2 - 0.025 * W, H / 2 - 0.16 * W, 0.015 * W);
  polaroid.rotation.z = -0.14;
  g.add(polaroid);
  // La case d'aujourd'hui : chaque couleur s'épanouit par-dessus la précédente.
  const [tx, ty] = at(TODAY);
  const size = (cell / CW) * W;
  const cellGeo = new THREE.ShapeGeometry(roundRect(size, size, (18 / CW) * W), 12);
  const pos = new THREE.Vector3(((tx + cell / 2) / CW - 0.5) * W, (0.5 - (ty + 14 + cell / 2) / CH) * H, 0.002 * W);
  const CYCLE = ["joy", "serenity", "love", "gratitude"].map(lightEmo);
  const under = new THREE.Mesh(cellGeo, new THREE.MeshStandardMaterial({ roughness: 0.85 }));
  const over = new THREE.Mesh(cellGeo, new THREE.MeshStandardMaterial({ roughness: 0.85 }));
  under.position.copy(pos);
  over.position.copy(pos).setZ(0.003 * W);
  g.add(under, over);
  const curl = (amp) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = flat[i * 3], y = flat[i * 3 + 1];
      const v = Math.max(0, -y / (H / 2) - 0.35);
      p.setZ(i, amp * v * v * (1 + 0.6 * Math.abs(x / (W / 2))));
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
  };
  g.userData.today = under;
  g.userData.animate = (phi) => {
    curl((0.08 + 0.015 * Math.sin(phi)) * W);
    const t = (phi / (Math.PI * 2)) * CYCLE.length;
    const k = Math.floor(t) % CYCLE.length, f = t - Math.floor(t);
    under.material.color.copy(CYCLE[(k + CYCLE.length - 1) % CYCLE.length]);
    over.material.color.copy(CYCLE[k]);
    over.scale.setScalar(Math.max(0.001, 1 - Math.pow(1 - smooth(0, 0.55, f), 2)));
  };
  return g;
}

// Une photo affichée au mur : polaroïd ou simple tirage à bord blanc, punaisé ou scotché.
// L'image reste abstraite (les photos de l'app sont privées) : un paysage, un portrait, deux silhouettes,
// ou la scène avec le visage en vignette, dans les couleurs d'émotion.
function photoPrint(M, { x, y, r, w, h, polaroid = false, tape = false, style, colors }) {
  const g = new THREE.Group();
  const hex = (k) => `#${lightEmo(k).getHexString()}`;
  const deep = (k) => `#${lightEmo(k).lerp(new THREE.Color(0x2a2019), 0.35).getHexString()}`;
  const [a, b] = colors;
  const tex = canvasTex(256, 256, (c, s) => {
    const gr = c.createLinearGradient(0, 0, 0, s);
    gr.addColorStop(0, hex(a));
    gr.addColorStop(1, hex(b));
    c.fillStyle = gr;
    c.fillRect(0, 0, s, s);
    c.fillStyle = deep(b);
    if (style === "landscape") {
      c.beginPath();
      c.ellipse(s * 0.3, s * 1.05, s * 0.7, s * 0.33, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = deep(a);
      c.beginPath();
      c.ellipse(s * 0.95, s * 1.1, s * 0.6, s * 0.4, 0, 0, Math.PI * 2);
      c.fill();
    } else if (style === "portrait" || style === "duo") {
      for (const cx of style === "duo" ? [0.36, 0.64] : [0.5]) {
        c.beginPath();
        c.arc(s * cx, s * 0.44, s * 0.13, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.ellipse(s * cx, s * 0.98, s * 0.22, s * 0.3, 0, 0, Math.PI * 2);
        c.fill();
      }
    } else {
      c.beginPath();
      c.ellipse(s * 0.6, s * 1.02, s * 0.62, s * 0.36, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#FBEFE4";
      c.strokeStyle = "#ffffff";
      c.lineWidth = 6;
      c.beginPath();
      c.roundRect(18, 18, 70, 92, 12);
      c.fill();
      c.stroke();
      c.fillStyle = deep(a);
      c.beginPath();
      c.arc(53, 58, 17, 0, Math.PI * 2);
      c.fill();
    }
  });
  const border = polaroid ? { side: 0.04, top: 0.04, bottom: 0.12 } : { side: 0.03, top: 0.03, bottom: 0.03 };
  g.add(mesh(new RoundedBoxGeometry(w, h, 0.008, 2, 0.003), M.label));
  const iw = w - 2 * border.side, ih = h - border.top - border.bottom;
  const img = mesh(new THREE.PlaneGeometry(iw, ih), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }), 0, (border.bottom - border.top) / 2, 0.0045);
  // L'image carrée, recadrée au format du tirage (sans déformation), centrée.
  const A = iw / ih;
  if (A > 1) {
    tex.repeat.set(1, 1 / A);
    tex.offset.set(0, (1 - 1 / A) / 2);
  } else {
    tex.repeat.set(A, 1);
    tex.offset.set((1 - A) / 2, 0);
  }
  g.add(img);
  if (tape) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.06), new THREE.MeshStandardMaterial({ color: lightEmo(a), roughness: 0.9, transparent: true, opacity: 0.75 }));
    strip.position.set(0, h / 2 - 0.01, 0.006);
    strip.rotation.z = -0.12;
    g.add(strip);
  } else {
    g.add(mesh(new THREE.SphereGeometry(0.03, 20, 14), M.accent, 0, h / 2 - 0.045, 0.02));
  }
  g.position.set(x, y, 0.012);
  g.rotation.z = r;
  return g;
}

// ——— À propos : le passeport ———
// Ouvert sur la table : à gauche la page d'identité (un monogramme, pas de photo), à droite les visas, un par
// escale, chacun à l'encre de sa scène. Le tampon de laiton passe par l'encreur et en pose un nouveau : INDEX.
const PAPER = "#F7F1E6";
function drawStamp(c, { x, y, size, rot, color, shape, label, year, seed = 7 }) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.globalAlpha = 0.9;
  c.strokeStyle = c.fillStyle = color;
  const ring = (inset, width) => {
    c.lineWidth = width;
    c.beginPath();
    if (shape === "round") c.arc(0, 0, size - inset, 0, Math.PI * 2);
    else if (shape === "oval") c.ellipse(0, 0, size * 1.4 - inset, size * 0.86 - inset, 0, 0, Math.PI * 2);
    else c.roundRect(-size * 1.3 + inset, -size * 0.8 + inset, (size * 1.3 - inset) * 2, (size * 0.8 - inset) * 2, 12);
    c.stroke();
  };
  ring(0, 9);
  ring(16, 3.5);
  c.textAlign = "center";
  c.textBaseline = "middle";
  const fit = (text, max, px, weight) => {
    let s = px;
    do c.font = `${weight} ${s}px 'Courier New', monospace`;
    while (c.measureText(text).width > max && --s > 10);
  };
  const inner = shape === "round" ? size * 1.42 : size * 2.05;
  fit(label, inner, Math.round(size * 0.42), "bold");
  c.fillText(label, 0, -size * 0.1);
  fit(year, inner, Math.round(size * 0.3), "bold");
  c.fillText(year, 0, size * 0.32);
  // Deux étoiles de part et d'autre de l'année, comme sur les vrais tampons.
  for (const s of [-1, 1]) {
    c.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k * Math.PI) / 5 - Math.PI / 2, r = k % 2 ? size * 0.035 : size * 0.085;
      c.lineTo(s * size * 0.52 + r * Math.cos(a), size * 0.32 + r * Math.sin(a));
    }
    c.fill();
  }
  // L'encre accroche mal par endroits : quelques points de papier par-dessus.
  let t = seed;
  const rnd = () => ((t = (t * 9301 + 49297) % 233280) / 233280);
  c.globalAlpha = 0.8;
  c.fillStyle = PAPER;
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() * size * 1.3;
    c.beginPath();
    c.arc(Math.cos(a) * d, Math.sin(a) * d * 0.7, 0.8 + rnd() * 2.4, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}
const PASS = (() => {
  const W = 720, H = 1000;
  // Le fond de sécurité : des ondes lilas très fines, une rosace de laiton pâle.
  const paper = (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, W, H);
    c.lineWidth = 1.4;
    c.strokeStyle = "rgba(150, 128, 186, 0.2)";
    for (let k = 0; k < 48; k++) {
      c.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const y = 12 + k * 21 + 7 * Math.sin(x / 38 + k * 0.7);
        if (x) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.stroke();
    }
    c.strokeStyle = "rgba(176, 138, 79, 0.14)";
    for (let k = 0; k < 24; k++) {
      c.beginPath();
      c.ellipse(W / 2, H * 0.55, 240, 128, (k / 24) * Math.PI, 0, Math.PI * 2);
      c.stroke();
    }
  };
  const mono = (px, weight = "") => `${weight} ${px}px 'Courier New', monospace`;
  // Les intitulés en deux langues, comme sur un vrai passeport français : le même rendu sert aux deux sites.
  const left = canvasTex(W, H, (c) => {
    paper(c);
    c.fillStyle = "#8A6A35";
    c.font = mono(24, "bold");
    c.letterSpacing = "5px";
    c.fillText("INDEX · PASSEPORT / PASSPORT", 56, 92);
    c.letterSpacing = "0px";
    c.fillStyle = "#E4DCEB";
    c.strokeStyle = "#C9BDD6";
    c.lineWidth = 3;
    c.beginPath();
    c.roundRect(56, 140, 250, 320, 20);
    c.fill();
    c.stroke();
    c.fillStyle = "#8A6A35";
    c.font = "italic 150px Georgia, serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("CR", 181, 304);
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
    const field = (label, value, x, y, px = 40) => {
      c.fillStyle = "#9A8F84";
      c.font = mono(17, "bold");
      c.fillText(label.toUpperCase(), x, y);
      c.fillStyle = "#2B241D";
      c.font = `${px}px Georgia, serif`;
      c.fillText(value, x, y + px + 8);
    };
    field("Nom / Surname", "Roquier", 340, 182);
    field("Prénom / Given name", "Cantin", 340, 282);
    field("Profession / Occupation", "Ingénieur · Engineer", 340, 382, 30);
    field("Spécialité / Specialty", "Fullstack & mobile", 56, 548, 34);
    field("Langues / Languages", "FR · EN · ES", 380, 548, 34);
    field("Port d'attache / Home port", "Brunoy", 56, 668, 34);
    field("Projets / Projects", "11", 380, 668, 34);
    // La signature : une boucle d'encre, sur sa ligne.
    c.strokeStyle = "#D8CFC2";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(56, 900);
    c.lineTo(664, 900);
    c.stroke();
    c.strokeStyle = "#2B3550";
    c.lineWidth = 4;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(80, 880);
    c.bezierCurveTo(120, 780, 170, 790, 150, 870);
    c.bezierCurveTo(140, 920, 230, 820, 260, 850);
    c.bezierCurveTo(290, 880, 320, 800, 360, 840);
    c.bezierCurveTo(390, 870, 430, 860, 470, 830);
    c.stroke();
    c.fillStyle = "#9A8F84";
    c.font = mono(18, "bold");
    c.fillText("SIGNATURE", 56, 940);
  });
  // Un visa par projet, dans l'ordre des escales, à l'encre de sa scène (en plus soutenu, pour se lire sur le papier).
  // Les noms de projet se lisent dans les deux langues.
  const STAMPS = [
    { label: "GALAXY", year: "2024", ink: "#6F63A6", shape: "round", x: 165, y: 230, rot: -0.2 },
    { label: "MAGELLAN", year: "2026", ink: "#3E7696", shape: "oval", x: 390, y: 215, rot: 0.12 },
    { label: "HUBLOT", year: "2026", ink: "#4B8DB8", shape: "rect", x: 590, y: 250, rot: -0.08 },
    { label: "MÉTRO", year: "2022", ink: "#5E6C7B", shape: "round", x: 150, y: 470, rot: 0.18 },
    { label: "VISIT MATCH", year: "2023", ink: "#C25B55", shape: "rect", x: 385, y: 455, rot: -0.14 },
    { label: "GYM-PICKER", year: "2026", ink: "#A8654A", shape: "oval", x: 590, y: 480, rot: 0.1 },
    { label: "MITHRIL", year: "2026", ink: "#5C8453", shape: "round", x: 170, y: 700, rot: -0.1 },
    { label: "CANCIONERO", year: "2026", ink: "#B8693F", shape: "rect", x: 395, y: 690, rot: 0.16 },
    { label: "TONALLI", year: "2026", ink: "#A0557C", shape: "oval", x: 585, y: 710, rot: -0.18 },
  ];
  const right = canvasTex(W, H, (c) => {
    paper(c);
    c.fillStyle = "#9A8F84";
    c.font = mono(22, "bold");
    c.letterSpacing = "5px";
    c.fillText("VISAS", 56, 92);
    c.letterSpacing = "0px";
    STAMPS.forEach((s, i) => drawStamp(c, { ...s, size: 80, color: s.ink, seed: 11 + i * 7 }));
  });
  // Le nouveau tampon, sur fond transparent : il apparaît quand le tampon de laiton touche la page.
  const FRESH = { x: 380, y: 880, size: 96 };
  const fresh = canvasTex(256, 256, (c) => drawStamp(c, { x: 128, y: 128, size: 100, rot: -0.12, color: "#A57F45", shape: "round", label: "INDEX", year: "2026", seed: 5 }));
  return { left, right, fresh, W, H, FRESH };
})();

// ——— 011 INDEX : la pile de dossiers ———
// Des dossiers cartonnés, chacun avec l'onglet de la couleur d'une escale ; celui du dessus est ouvert.
// Ouvert, il montre la page de titre et le sommaire des onze projets : les noms se lisent dans les deux langues.
const KRAFT = 0xd8bf95;
const INDEX_LIST = [
  ["001", "Métro Pathfinder", "2022"], ["002", "API REST .NET", "2023"], ["003", "Visit Match", "2023"],
  ["004", "Galaxy Escape", "2024"], ["005", "Magellan", "2026"], ["006", "Cancionero", "2026"],
  ["007", "Mithril", "2026"], ["008", "Tonalli", "2026"], ["009", "gym-picker", "2026"],
  ["010", "Hublot", "2026"], ["011", "INDEX", "2026"],
];
const DOSSIER = (() => {
  const W = 800, H = 1100;
  const paper = (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, W, H);
  };
  const title = canvasTex(W, H, (c) => {
    paper(c);
    c.textAlign = "center";
    c.fillStyle = "#2B241D";
    c.font = "italic 170px Georgia, serif";
    c.fillText("Index", W / 2, 470);
    c.fillStyle = "#B08A4F";
    c.fillRect(W / 2 - 90, 530, 180, 5);
    // Pas de nom suivi de deux années : on lirait une épitaphe. Le titre porte les numéros des projets.
    c.fillStyle = "#9A8F84";
    c.font = "bold 26px 'Courier New', monospace";
    c.letterSpacing = "5px";
    c.fillText("PROJETS / PROJECTS", W / 2, 625);
    c.fillStyle = "#8A6A35";
    c.font = "bold 34px 'Courier New', monospace";
    c.letterSpacing = "6px";
    c.fillText("001 → 011", W / 2, 690);
    c.letterSpacing = "0px";
    // L'anneau de laiton du voyage, en emblème.
    c.strokeStyle = "#B08A4F";
    c.lineWidth = 6;
    c.beginPath();
    c.arc(W / 2, 880, 54, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "#B08A4F";
    c.beginPath();
    c.arc(W / 2, 880, 14, 0, Math.PI * 2);
    c.fill();
  });
  // Le sommaire : un projet par ligne, numéro, nom, points de conduite, année ; INDEX en laiton.
  const ROW = 76, TOP = 230;
  const list = canvasTex(W, H, (c) => {
    paper(c);
    c.fillStyle = "#8A6A35";
    c.font = "bold 30px 'Courier New', monospace";
    c.letterSpacing = "8px";
    c.fillText("INDEX", 70, 120);
    c.letterSpacing = "0px";
    c.fillStyle = "#9A8F84";
    c.font = "bold 22px 'Courier New', monospace";
    c.fillText("001 → 011", 70, 160);
    INDEX_LIST.forEach(([num, name, year], i) => {
      const y = TOP + i * ROW;
      const last = i === INDEX_LIST.length - 1;
      c.fillStyle = last ? "#8A6A35" : "#9A8F84";
      c.font = "bold 26px 'Courier New', monospace";
      c.fillText(num, 70, y);
      c.fillStyle = last ? "#8A6A35" : "#2B241D";
      c.font = `${last ? "italic " : ""}40px Georgia, serif`;
      c.fillText(name, 150, y);
      const end = 150 + c.measureText(name).width + 14;
      c.font = "bold 26px 'Courier New', monospace";
      c.fillStyle = last ? "#8A6A35" : "#9A8F84";
      c.textAlign = "right";
      c.fillText(year, W - 70, y);
      c.textAlign = "left";
      c.fillStyle = "#CDBFAE";
      for (let x = end; x < W - 160; x += 16) c.fillRect(x, y - 6, 4, 4);
    });
  });
  return { title, list, W, H, ROW, TOP };
})();
// Une pile de dossiers : n dossiers fermés, puis celui du dessus, ouvert (sa couverture pivote sur le bord gauche).
// `pages` : la page de titre et le sommaire, posés dans le dossier ouvert (pour l'escale d'INDEX).
function folderPile(M, { n = 5, w = 0.9, d = 0.66, pages = false } = {}) {
  const g = new THREE.Group();
  const kraft = tinted(KRAFT, 0.82);
  const TABS = [TINT.espace, TINT.terre, TINT.avion, TINT.paris, TINT.monuments, TINT.route, TINT.maison, TINT.salon];
  let y = 0;
  for (let i = 0; i < n; i++) {
    const f = new THREE.Group();
    f.add(mesh(new RoundedBoxGeometry(w, 0.03, d, 1, 0.008), kraft, 0, 0.015, 0));
    f.add(mesh(new THREE.BoxGeometry(w - 0.07, 0.012, d - 0.06), M.label, 0.012, 0.034, 0.01));
    // L'onglet dépasse sur le bord avant, côté regard, dans la couleur d'une escale.
    f.add(mesh(new RoundedBoxGeometry(0.2 * w, 0.028, 0.1 * d, 1, 0.01), tinted(TABS[i % TABS.length], 0.7), (-0.3 + (i % 3) * 0.3) * w, 0.014, d / 2 + 0.035 * d));
    f.position.y = y;
    f.rotation.y = (i % 2 ? 1 : -1) * 0.04 * (1 + (i % 3));
    g.add(f);
    y += 0.05;
  }
  const top = new THREE.Group();
  top.position.y = y;
  top.rotation.y = 0.03;
  g.add(top);
  top.add(mesh(new RoundedBoxGeometry(w, 0.02, d, 1, 0.006), kraft, 0, 0.01, 0));
  top.add(mesh(new RoundedBoxGeometry(0.2 * w, 0.02, 0.1 * d, 1, 0.008), M.accent, 0.3 * w, 0.01, d / 2 + 0.035 * d));
  const sheetW = w - 0.06, sheetD = d - 0.05;
  const sheet = pages
    ? mesh(new THREE.PlaneGeometry(sheetW, sheetD).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: DOSSIER.list, roughness: 0.85 }), 0, 0.026, 0)
    : mesh(new THREE.BoxGeometry(sheetW, 0.008, sheetD), M.label, 0, 0.024, 0);
  top.add(sheet);
  // La couverture, ouverte sur la gauche ; à l'intérieur, la page de titre.
  const hinge = new THREE.Group();
  hinge.position.set(-w / 2, 0.021, 0);
  top.add(hinge);
  hinge.add(mesh(new RoundedBoxGeometry(w, 0.012, d, 1, 0.004), kraft, w / 2, 0.006, 0));
  if (pages) {
    const inside = mesh(new THREE.PlaneGeometry(sheetW, sheetD).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ map: DOSSIER.title, roughness: 0.85 }), w / 2, -0.001, 0);
    inside.rotation.y = Math.PI;
    hinge.add(inside);
  }
  g.userData.hinge = hinge;
  g.userData.sheet = sheet;
  g.userData.height = y + 0.03;
  return g;
}

// ——— Le copilote du voyage ———
// Un petit bonhomme d'argile qui accompagne le visiteur, rendu sur fond transparent et posé par-dessus les escales.
// Dans l'espace (escale 1), il porte la combinaison : son visage se devine derrière la visière de verre doré.
// Ensuite il la laisse : c'est un bonhomme normal, habillé pour chaque escale (la couleur de la scène, un accessoire
// tiré du projet). À l'escale 2, il tient encore son casque à la main. Il regarde vers la gauche, là où s'ouvre sa bulle.
const TENUES = ["espace", "terre", "avion", "paris", "monuments", "route", "maison", "salon", "calendrier", "dossiers"];
const SKIN = 0xe9c3a1, HAIR = 0x4a3426;
const VISOR = { a: 0.33, b: 0.21, y: -0.03 };
// Le bord de la visière : un superellipse (coins arrondis), |x/a|⁴ + |y/b|⁴ = 1.
const visorEdge = (t, a, b) => {
  const c = Math.cos(t), s = Math.sin(t);
  return [a * Math.sign(c) * Math.pow(Math.abs(c), 0.5), b * Math.sign(s) * Math.pow(Math.abs(s), 0.5)];
};
const onSphere = (x, y, r) => new THREE.Vector3(x, y, Math.sqrt(Math.max(0, r * r - x * x - y * y)));
// Oriente un objet plat (son axe z) selon la normale de la sphère au point où il est posé.
const faceOut = (o) => {
  o.lookAt(o.position.clone().multiplyScalar(2));
  return o;
};

// Le casque de la combinaison : coque d'argile, visière bombée de laiton, liseré, oreillettes.
// `open` : la coque est percée sous la visière, qui devient un verre doré : on voit le visage derrière.
function spaceHelmet(M, { open = false } = {}) {
  const g = new THREE.Group();
  const HR = 0.45, RINGS = 18, SEGS = 96;
  const { a: VA, b: VB, y: VY } = VISOR;
  const shellGeo = new THREE.SphereGeometry(HR, 96, 64);
  if (open) {
    const p = shellGeo.attributes.position, idx = shellGeo.index.array, keep = [];
    const inside = (x, y) => Math.pow(Math.abs(x / (VA - 0.004)), 4) + Math.pow(Math.abs((y - VY) / (VB - 0.004)), 4) < 1;
    for (let k = 0; k < idx.length; k += 3) {
      let cx = 0, cy = 0, cz = 0;
      for (let j = 0; j < 3; j++) {
        cx += p.getX(idx[k + j]);
        cy += p.getY(idx[k + j]);
        cz += p.getZ(idx[k + j]);
      }
      if (!(cz > 0 && inside(cx / 3, cy / 3))) keep.push(idx[k], idx[k + 1], idx[k + 2]);
    }
    shellGeo.setIndex(keep);
  }
  const shell = mesh(shellGeo, new THREE.MeshStandardMaterial({ color: 0xf1ece4, roughness: 0.58, side: open ? THREE.DoubleSide : THREE.FrontSide }));
  // Percée, la coque n'ombre pas le visage : il reste lisible derrière le verre.
  if (open) shell.castShadow = false;
  g.add(shell);
  const pos = [], ids = [];
  pos.push(...onSphere(0, VY, HR + 0.012).toArray());
  for (let k = 1; k <= RINGS; k++) {
    for (let j = 0; j < SEGS; j++) {
      const [x, y] = visorEdge((j / SEGS) * Math.PI * 2, VA, VB);
      pos.push(...onSphere((x * k) / RINGS, VY + (y * k) / RINGS, HR + 0.012).toArray());
    }
  }
  for (let j = 0; j < SEGS; j++) ids.push(0, 1 + j, 1 + ((j + 1) % SEGS));
  for (let k = 1; k < RINGS; k++) {
    const a0 = 1 + (k - 1) * SEGS, a1 = 1 + k * SEGS;
    for (let j = 0; j < SEGS; j++) {
      const j1 = (j + 1) % SEGS;
      ids.push(a0 + j, a1 + j, a1 + j1, a0 + j, a1 + j1, a0 + j1);
    }
  }
  const visorGeo = new THREE.BufferGeometry();
  visorGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  visorGeo.setIndex(ids);
  visorGeo.computeVertexNormals();
  const visor = mesh(visorGeo, open
    ? new THREE.MeshStandardMaterial({ color: 0xe6c27e, metalness: 0.5, roughness: 0.06, transparent: true, opacity: 0.4, depthWrite: false })
    : new THREE.MeshStandardMaterial({ color: 0xd9b475, metalness: 1, roughness: 0.16 }));
  if (open) visor.castShadow = false;
  g.add(visor);
  const rimPts = [];
  for (let j = 0; j < SEGS; j++) {
    const [x, y] = visorEdge((j / SEGS) * Math.PI * 2, VA, VB);
    rimPts.push(onSphere(x, VY + y, HR + 0.012));
  }
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, true), 192, 0.032, 12, true), M.clay2));
  for (const x of [-0.45, 0.45]) {
    const ear = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.09, 32), M.clay2, x, 0, 0);
    ear.rotation.z = Math.PI / 2;
    g.add(ear);
  }
  return g;
}

// La tête du bonhomme : yeux, sourcils, joues, nez, sourire, oreilles, cheveux bruns (calotte, nuque, frange).
const HEAD_R = 0.37;
function copilotHead(M) {
  const g = new THREE.Group();
  const R = HEAD_R;
  const skin = tinted(SKIN, 0.62), hair = tinted(HAIR, 0.75);
  g.add(mesh(new THREE.SphereGeometry(R, 64, 48), skin));
  for (const sx of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.075, 24, 16), skin, sx * 0.36, -0.02, -0.01);
    ear.scale.set(0.55, 1, 0.8);
    g.add(ear);
    const ep = onSphere(sx * 0.125, 0.0, R - 0.012);
    const eye = faceOut(mesh(new THREE.SphereGeometry(0.037, 20, 16), M.ink, ep.x, ep.y, ep.z));
    eye.scale.set(0.85, 1.15, 0.6);
    g.add(eye);
    const hp = onSphere(sx * 0.125 + 0.012, 0.02, R + 0.006);
    g.add(mesh(new THREE.SphereGeometry(0.011, 10, 8), M.label, hp.x, hp.y, hp.z));
    const bp = onSphere(sx * 0.13, 0.1, R - 0.002);
    const brow = faceOut(mesh(new RoundedBoxGeometry(0.075, 0.02, 0.026, 1, 0.009), hair, bp.x, bp.y, bp.z));
    brow.rotateZ(sx * -0.12);
    g.add(brow);
    const cp = onSphere(sx * 0.205, -0.08, R + 0.002);
    g.add(faceOut(mesh(new THREE.CircleGeometry(0.046, 24), tinted(0xeaa092, 0.85), cp.x, cp.y, cp.z)));
  }
  const np = onSphere(0, -0.045, R - 0.012);
  g.add(mesh(new THREE.SphereGeometry(0.032, 16, 12), skin, np.x, np.y, np.z));
  const sp = onSphere(0, -0.105, R - 0.004);
  const smile = faceOut(mesh(new THREE.TorusGeometry(0.058, 0.012, 8, 24, Math.PI), M.ink, sp.x, sp.y, sp.z));
  smile.rotateZ(Math.PI);
  g.add(smile);
  // Les cheveux : la calotte jusqu'au front, la nuque derrière les oreilles, quatre mèches de frange.
  g.add(mesh(new THREE.SphereGeometry(R + 0.016, 64, 32, 0, Math.PI * 2, 0, 1.12), hair));
  g.add(mesh(new THREE.SphereGeometry(R + 0.012, 48, 24, Math.PI + 0.35, Math.PI - 0.7, 0.9, 1.05), hair));
  [[-0.17, 0.165, 0.45], [-0.055, 0.19, -0.2], [0.07, 0.185, 0.3], [0.185, 0.155, -0.45]].forEach(([x, y, r]) => {
    const p = onSphere(x, y, R + 0.008);
    const tuft = faceOut(mesh(new THREE.SphereGeometry(0.075, 20, 14), hair, p.x, p.y, p.z));
    tuft.scale.set(1.25, 0.75, 0.55);
    tuft.rotateZ(r);
    g.add(tuft);
  });
  return g;
}

// Ses habits, escale par escale : haut, manches (longues, courtes, retroussées), bas, chaussures.
const WARDROBE = {
  terre: { top: 0xcdb48a, sleeves: "long", bottom: 0x8f7d5c, shoes: 0x6b4a33 },
  avion: { top: 0x2f3a4f, sleeves: "long", bottom: 0x2f3a4f, shoes: 0x2b2b2f },
  paris: { top: "stripes", sleeves: "long", bottom: 0x34405a, shoes: 0x2b2b2f },
  monuments: { top: 0xa9ba9d, sleeves: "short", bottom: 0xd9c9a6, shorts: true, shoes: 0xf1ece4 },
  route: { top: 0xc4664f, sleeves: "short", bottom: 0x2b2b2f, shorts: true, shoes: 0xf1ece4 },
  maison: { top: 0x8fa889, sleeves: "long", bottom: 0xb5b0a8, shoes: 0xf1ece4, slippers: true },
  salon: { top: 0xd8b39a, sleeves: "long", bottom: 0x6e5444, shoes: 0x2b2b2f },
  calendrier: { top: 0xf1ece4, sleeves: "rolled", bottom: 0x7d6f6a, shoes: 0x6b4a33 },
  dossiers: { top: 0xb08a62, sleeves: "long", bottom: 0x4b4540, shoes: 0x2b2b2f },
};
// Le bras au repos, par défaut : pendant, légèrement en avant. L'escale 2 porte le casque, le bras plus plié.
const REST_POSES = { default: [[-0.25, 0, -0.38], [-0.7, 0, 0]], terre: [[-0.15, 0, -0.42], [-1.15, 0, 0]] };

function copilot(M, outfit = "espace") {
  const g = new THREE.Group();
  const fig = new THREE.Group();
  g.add(fig);
  const space = outfit === "espace";
  const W = WARDROBE[outfit];
  const skin = tinted(SKIN, 0.62);
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a063, metalness: 0.9, roughness: 0.32 });
  const soft = (color, rough = 0.85) => new THREE.MeshStandardMaterial({ color, roughness: rough, side: THREE.DoubleSide });
  const clay = tinted(0xf1ece4, 0.58);
  const band = tinted(TINT.espace, 0.6);
  const extra = [];
  // Le haut : une couleur, ou la marinière (rayures marine en texture sur le torse et les manches).
  const topMat = !W
    ? clay
    : W.top === "stripes"
      ? new THREE.MeshStandardMaterial({
          roughness: 0.65,
          map: canvasTex(16, 256, (c, w, h) => {
            c.fillStyle = "#F1ECE4";
            c.fillRect(0, 0, w, h);
            c.fillStyle = "#34405A";
            for (let k = 0; k < 7; k++) c.fillRect(0, (k + 0.3) * (h / 7), w, h / 15);
          }),
        })
      : tinted(W.top, 0.72);
  const bottomMat = W ? tinted(W.bottom, 0.75) : clay;
  const shoeMat = W ? tinted(W.shoes, 0.6) : M.clay2;

  // — Le corps —
  let head, handY;
  if (space) {
    fig.add(mesh(new RoundedBoxGeometry(0.66, 0.6, 0.48, 4, 0.19), clay, 0, 0, 0));
    fig.add(mesh(new RoundedBoxGeometry(0.68, 0.08, 0.5, 2, 0.04), band, 0, -0.2, 0));
    fig.add(mesh(new RoundedBoxGeometry(0.54, 0.58, 0.24, 3, 0.09), M.clay2, 0, 0.06, -0.31));
    fig.add(mesh(new RoundedBoxGeometry(0.3, 0.17, 0.06, 2, 0.025), M.clay2, 0, 0.04, 0.235));
    [[-0.08, M.accent], [0, band], [0.08, tinted(TINT.bagage, 0.5)]].forEach(([x, mat]) => {
      const b = mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.03, 20), mat, x, 0.04, 0.27);
      b.rotation.x = Math.PI / 2;
      fig.add(b);
    });
    head = new THREE.Group();
    head.position.set(0, 0.62, 0);
    fig.add(head);
    head.add(spaceHelmet(M, { open: true }));
    const inner = copilotHead(M);
    inner.position.set(0, -0.035, 0.025);
    head.add(inner);
    handY = -0.29;
  } else {
    fig.add(mesh(new RoundedBoxGeometry(0.58, 0.54, 0.4, 4, 0.16), topMat, 0, 0, 0));
    fig.add(mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.12, 24), skin, 0, 0.31, 0));
    head = new THREE.Group();
    head.position.set(0, 0.66, 0);
    fig.add(head);
    head.add(copilotHead(M));
    handY = -0.245;
  }
  // Ce qui se pose sur la tête : les chapeaux ont été dessinés pour le casque, réduits à la taille des cheveux.
  const hat = new THREE.Group();
  hat.scale.setScalar(0.86);
  head.add(hat);

  // — Les bras : l'épaule pivote, le coude aussi —
  const arm = (side) => {
    const a = new THREE.Group();
    const elbow = new THREE.Group();
    if (space) {
      a.position.set(side * 0.33, 0.14, 0);
      a.add(mesh(new THREE.CapsuleGeometry(0.1, 0.16, 8, 20), clay, 0, -0.12, 0));
      elbow.position.set(0, -0.24, 0);
      elbow.add(mesh(new THREE.CapsuleGeometry(0.095, 0.14, 8, 20), clay, 0, -0.1, 0));
      const cuff = mesh(new THREE.TorusGeometry(0.095, 0.028, 12, 32), band, 0, -0.19, 0);
      cuff.rotation.x = Math.PI / 2;
      elbow.add(cuff);
      elbow.add(mesh(new THREE.SphereGeometry(0.115, 32, 24), M.clay2, 0, -0.29, 0));
    } else {
      a.position.set(side * 0.3, 0.15, 0);
      a.add(mesh(new THREE.CapsuleGeometry(0.085, 0.13, 8, 20), topMat, 0, -0.1, 0));
      elbow.position.set(0, -0.2, 0);
      const bare = W.sleeves !== "long";
      elbow.add(mesh(new THREE.CapsuleGeometry(0.076, 0.11, 8, 20), bare ? skin : topMat, 0, -0.085, 0));
      if (W.sleeves === "rolled") {
        const roll = mesh(new THREE.TorusGeometry(0.083, 0.03, 12, 32), topMat, 0, -0.01, 0);
        roll.rotation.x = Math.PI / 2;
        elbow.add(roll);
      }
      elbow.add(mesh(new THREE.SphereGeometry(0.09, 28, 20), skin, 0, handY, 0));
    }
    a.add(elbow);
    fig.add(a);
    return { a, elbow };
  };
  const wave = arm(1), rest = arm(-1);

  // — Les jambes —
  const leg = (side) => {
    const l = new THREE.Group();
    if (space) {
      l.position.set(side * 0.16, -0.26, 0);
      l.add(mesh(new THREE.CapsuleGeometry(0.115, 0.16, 8, 20), clay, 0, -0.14, 0));
      l.add(mesh(new RoundedBoxGeometry(0.25, 0.14, 0.3, 2, 0.06), M.clay2, 0, -0.3, 0.03));
    } else {
      l.position.set(side * 0.135, -0.24, 0);
      if (W.shorts) {
        l.add(mesh(new THREE.CapsuleGeometry(0.105, 0.04, 8, 20), bottomMat, 0, -0.05, 0));
        l.add(mesh(new THREE.CapsuleGeometry(0.08, 0.1, 8, 20), skin, 0, -0.16, 0));
        l.add(mesh(new THREE.CylinderGeometry(0.083, 0.083, 0.07, 20), M.label, 0, -0.235, 0));
      } else {
        l.add(mesh(new THREE.CapsuleGeometry(0.1, 0.14, 8, 20), bottomMat, 0, -0.12, 0));
      }
      if (W.slippers) {
        l.add(mesh(new RoundedBoxGeometry(0.22, 0.09, 0.3, 2, 0.04), shoeMat, 0, -0.3, 0.04));
        l.add(mesh(new THREE.SphereGeometry(0.045, 16, 12), tinted(0x8fa889, 0.9), 0, -0.25, 0.16));
      } else {
        l.add(mesh(new RoundedBoxGeometry(0.21, 0.11, 0.29, 2, 0.05), shoeMat, 0, -0.3, 0.035));
      }
    }
    fig.add(l);
    return l;
  };
  const legL = leg(-1), legR = leg(1);

  // Un accessoire tenu dans la main au repos : son point de prise est son origine ; « euler » l'oriente par rapport
  // au corps, dans la pose moyenne du bras (il suit ensuite le balancement).
  const [RA, RE] = REST_POSES[outfit] ?? REST_POSES.default;
  const REST_A = new THREE.Euler(...RA), REST_E = new THREE.Euler(...RE);
  const hold = (obj, euler) => {
    const q = new THREE.Quaternion().setFromEuler(REST_A).multiply(new THREE.Quaternion().setFromEuler(REST_E)).invert();
    obj.quaternion.copy(q.multiply(new THREE.Quaternion().setFromEuler(euler)));
    obj.position.set(0, handY, 0);
    rest.elbow.add(obj);
  };
  // Sur le torse du bonhomme : la face avant est à z = 0,2.
  const FRONT = 0.2;

  if (space) {
    // L'antenne, et le cordon de laiton qui le relie au vaisseau, hors champ à droite : il sort par le bord de
    // l'image, que la page fait déborder de l'écran.
    const antenna = new THREE.Group();
    antenna.position.set(-0.47, 0.06, 0);
    antenna.rotation.z = 0.35;
    antenna.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 10), M.ink, 0, 0.16, 0));
    antenna.add(mesh(new THREE.SphereGeometry(0.04, 20, 16), M.accent, 0, 0.33, 0));
    head.add(antenna);
    fig.add(tube(curve([[0.1, -0.05, -0.43], [0.5, -0.42, -0.62], [0.95, -0.62, -0.3], [1.5, -0.4, -0.2], [2.4, -0.55, -0.3]]), 0.018, M.accent));
    extra.push((phi) => (antenna.rotation.z = 0.35 + 0.12 * Math.sin(2 * phi + 0.4)));
  }
  if (outfit === "terre") {
    // Magellan : il a laissé la combinaison et garde le casque sous la main. Chapeau d'explorateur, chemise
    // saharienne, foulard océan.
    const felt = tinted(0xc29f6e, 0.78);
    hat.add(mesh(new THREE.CylinderGeometry(0.6, 0.62, 0.03, 64), felt, 0, 0.3, 0));
    hat.add(mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.28, 48), felt, 0, 0.45, 0));
    hat.add(mesh(new THREE.CylinderGeometry(0.352, 0.357, 0.07, 48), M.ink, 0, 0.35, 0));
    hat.rotation.set(-0.08, 0, 0.12);
    const scarf = mesh(new THREE.TorusGeometry(0.15, 0.05, 16, 40), tinted(TINT.terre, 0.6), 0, 0.29, 0.01);
    scarf.rotation.x = Math.PI / 2;
    fig.add(scarf);
    const knot = mesh(new RoundedBoxGeometry(0.09, 0.16, 0.04, 2, 0.018), tinted(TINT.terre, 0.6), -0.05, 0.19, FRONT + 0.01);
    knot.rotation.z = 0.25;
    fig.add(knot);
    for (const sx of [-1, 1]) fig.add(mesh(new RoundedBoxGeometry(0.12, 0.1, 0.025, 1, 0.01), tinted(0xbfa57a, 0.75), sx * 0.15, 0.06, FRONT + 0.005));
    fig.add(mesh(new RoundedBoxGeometry(0.6, 0.06, 0.42, 2, 0.03), tinted(0x6b4a33, 0.6), 0, -0.2, 0));
    const helm = spaceHelmet(M);
    helm.scale.setScalar(0.5);
    const carry = new THREE.Group();
    helm.position.set(0, 0.2, 0.06);
    helm.rotation.y = -0.6;
    carry.add(helm);
    hold(carry, new THREE.Euler(0, 0.32, 0));
  }
  if (outfit === "avion") {
    // Hublot : le pilote. Casquette, veste marine à boutons de laiton, ailes sur la poitrine, galons aux poignets.
    const navy = tinted(0x2f3a4f, 0.5);
    hat.add(mesh(new THREE.CylinderGeometry(0.4, 0.345, 0.16, 48), navy, 0, 0.4, 0));
    hat.add(mesh(new THREE.CylinderGeometry(0.352, 0.352, 0.065, 48), M.ink, 0, 0.345, 0));
    const peak = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.025, 48, 1, false, -Math.PI / 2, Math.PI), M.ink, 0, 0.315, 0.1);
    peak.scale.z = 0.85;
    peak.rotation.x = 0.22;
    hat.add(peak);
    const wings = (parent, x, y, z, s) => {
      const w = new THREE.Group();
      w.position.set(x, y, z);
      w.scale.setScalar(s);
      const disc = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 24), brass);
      disc.rotation.x = Math.PI / 2;
      w.add(disc);
      for (const sx of [-1, 1]) {
        const wing = mesh(new RoundedBoxGeometry(0.11, 0.032, 0.016, 1, 0.006), brass, sx * 0.09, 0.012, 0);
        wing.rotation.z = sx * 0.28;
        w.add(wing);
      }
      parent.add(w);
    };
    wings(hat, 0, 0.41, 0.385, 1);
    wings(fig, -0.14, 0.15, FRONT + 0.01, 0.7);
    hat.rotation.set(0.04, 0, -0.08);
    // Le col de chemise et la cravate, les boutons de la veste.
    fig.add(mesh(new RoundedBoxGeometry(0.17, 0.08, 0.04, 1, 0.015), M.label, 0, 0.24, 0.15));
    fig.add(mesh(new RoundedBoxGeometry(0.05, 0.2, 0.02, 1, 0.008), M.ink, 0, 0.12, FRONT + 0.005));
    for (const [x, y] of [[-0.09, 0.02], [0.09, 0.02], [-0.09, -0.11], [0.09, -0.11]]) fig.add(mesh(new THREE.SphereGeometry(0.02, 12, 10), brass, x, y, FRONT + 0.005));
    for (const arm of [wave, rest]) {
      const stripe = mesh(new THREE.TorusGeometry(0.079, 0.012, 8, 32), brass, 0, -0.14, 0);
      stripe.rotation.x = Math.PI / 2;
      arm.elbow.add(stripe);
    }
  }
  if (outfit === "paris") {
    // Métro Pathfinder : le Parisien. Béret, marinière, foulard rouge et baguette.
    const beret = mesh(new THREE.SphereGeometry(0.43, 48, 24), M.ink, 0.04, 0.36, -0.03);
    beret.scale.set(1, 0.32, 1);
    hat.add(beret);
    hat.add(mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.06, 12), M.ink, 0.04, 0.5, -0.03));
    hat.rotation.z = -0.2;
    const red = tinted(0xb5483f, 0.7);
    const scarf = mesh(new THREE.TorusGeometry(0.13, 0.035, 12, 32), red, 0, 0.29, 0.01);
    scarf.rotation.x = Math.PI / 2;
    fig.add(scarf);
    const tip = mesh(new THREE.ConeGeometry(0.06, 0.12, 4), red, 0.05, 0.2, FRONT + 0.01);
    tip.rotation.set(0, Math.PI / 4, Math.PI);
    fig.add(tip);
    const crust = tinted(0xd09a58, 0.7), cut = tinted(0xe9c88f, 0.8);
    const bread = new THREE.Group();
    bread.add(mesh(new THREE.CapsuleGeometry(0.052, 0.6, 8, 20), crust, 0, 0.2, 0));
    for (let k = 0; k < 4; k++) {
      const c = mesh(new THREE.SphereGeometry(0.03, 12, 8), cut, 0, -0.02 + k * 0.14, 0.045);
      c.scale.set(0.9, 2.2, 0.5);
      c.rotation.z = 0.5;
      bread.add(c);
    }
    hold(bread, new THREE.Euler(0.1, 0.32, 0.35));
  }
  if (outfit === "monuments") {
    // Visit Match : le touriste. Bob de toile, appareil photo, sac à dos, short et chaussettes.
    const sage = soft(0xe8dcc0);
    hat.add(mesh(new THREE.CylinderGeometry(0.27, 0.335, 0.2, 48), sage, 0, 0.43, 0));
    hat.add(mesh(new THREE.CylinderGeometry(0.335, 0.5, 0.11, 48, 1, true), sage, 0, 0.275, 0));
    const hband = mesh(new THREE.CylinderGeometry(0.315, 0.33, 0.05, 48, 1, true), soft(0x93a886), 0, 0.36, 0);
    hat.add(hband);
    hat.rotation.set(-0.06, 0, 0.1);
    const cam = new THREE.Group();
    cam.position.set(0, -0.02, FRONT + 0.05);
    fig.add(cam);
    cam.add(mesh(new RoundedBoxGeometry(0.24, 0.15, 0.09, 2, 0.025), M.ink, 0, 0, 0));
    cam.add(mesh(new RoundedBoxGeometry(0.07, 0.045, 0.05, 1, 0.01), M.ink, -0.07, 0.085, -0.01));
    const lens = mesh(new THREE.CylinderGeometry(0.052, 0.056, 0.07, 32), brass, 0.025, -0.005, 0.065);
    lens.rotation.x = Math.PI / 2;
    cam.add(lens);
    const glass = mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.01, 32), new THREE.MeshStandardMaterial({ color: 0x1b2228, roughness: 0.08, metalness: 0.2 }), 0.025, -0.005, 0.102);
    glass.rotation.x = Math.PI / 2;
    cam.add(glass);
    const strap = mesh(new THREE.TorusGeometry(0.2, 0.012, 10, 48), M.ink, 0, 0.16, 0.08);
    strap.rotation.x = 1.25;
    fig.add(strap);
    const kraft = tinted(KRAFT, 0.8);
    fig.add(mesh(new RoundedBoxGeometry(0.44, 0.46, 0.18, 3, 0.07), kraft, 0, 0.02, -0.27));
    for (const sx of [-1, 1]) fig.add(mesh(new RoundedBoxGeometry(0.06, 0.4, 0.03, 1, 0.012), kraft, sx * 0.17, 0.06, FRONT - 0.005));
  }
  if (outfit === "route") {
    // gym-picker : le sportif. Bandeau et poignets éponge, short, baskets, haltère.
    const terry = tinted(0xf1ece4, 0.9);
    const hb = mesh(new THREE.TorusGeometry(0.385, 0.05, 16, 64), terry, 0, 0.235, 0);
    hb.rotation.x = Math.PI / 2;
    hat.add(hb);
    const line = mesh(new THREE.TorusGeometry(0.4, 0.014, 8, 64), tinted(0xc4664f, 0.8), 0, 0.235, 0);
    line.rotation.x = Math.PI / 2;
    hat.add(line);
    hat.rotation.z = 0.1;
    for (const arm of [wave, rest]) {
      const wb = mesh(new THREE.TorusGeometry(0.078, 0.03, 12, 32), terry, 0, -0.15, 0);
      wb.rotation.x = Math.PI / 2;
      arm.elbow.add(wb);
    }
    const db = new THREE.Group();
    const bar = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 16), brass);
    bar.rotation.z = Math.PI / 2;
    db.add(bar);
    for (const sx of [-1, 1]) {
      const pl = mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.07, 32), M.ink, sx * 0.165, 0, 0);
      pl.rotation.z = Math.PI / 2;
      db.add(pl);
    }
    hold(db, new THREE.Euler(0, 0.32, 0.15));
  }
  if (outfit === "maison") {
    // Mithril : à la maison. Sweat à capuche, pantalon de jogging, chaussons, et la clé de laiton du coffre.
    const hoodie = tinted(0x8fa889, 0.8);
    const hood = mesh(new THREE.TorusGeometry(0.2, 0.075, 14, 32, Math.PI), hoodie, 0, 0.27, -0.03);
    hood.rotation.set(Math.PI / 2, 0, Math.PI);
    fig.add(hood);
    for (const sx of [-1, 1]) fig.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), M.label, sx * 0.06, 0.17, FRONT + 0.01));
    fig.add(mesh(new RoundedBoxGeometry(0.32, 0.13, 0.03, 1, 0.02), tinted(0x82a07b, 0.85), 0, -0.13, FRONT + 0.005));
    const key = new THREE.Group();
    key.add(mesh(new THREE.TorusGeometry(0.075, 0.024, 12, 32), brass, 0, 0.14, 0));
    key.add(mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.27, 16), brass, 0, 0.37, 0));
    key.add(mesh(new RoundedBoxGeometry(0.075, 0.05, 0.022, 1, 0.006), brass, 0.042, 0.47, 0));
    key.add(mesh(new RoundedBoxGeometry(0.055, 0.03, 0.022, 1, 0.006), brass, 0.035, 0.41, 0));
    hold(key, new THREE.Euler(0, 0.32, 0.3));
  }
  if (outfit === "salon") {
    // Cancionero : le mélomane. Casque audio terre cuite, pull, un vinyle, une note de laiton qui flotte.
    const cupMat = tinted(0xc98f72, 0.55);
    head.add(mesh(new THREE.TorusGeometry(0.43, 0.032, 12, 64, Math.PI), M.ink, 0, 0.02, 0));
    for (const sx of [-1, 1]) {
      const cup = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 32), cupMat, sx * 0.43, 0.0, 0);
      cup.rotation.z = Math.PI / 2;
      head.add(cup);
      const cap = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 32), M.ink, sx * 0.49, 0.0, 0);
      cap.rotation.z = Math.PI / 2;
      head.add(cap);
    }
    const collar = mesh(new THREE.TorusGeometry(0.12, 0.035, 12, 32), tinted(0xc9a086, 0.8), 0, 0.28, 0.01);
    collar.rotation.x = Math.PI / 2;
    fig.add(collar);
    const rec = new THREE.Group();
    const disc = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 48), new THREE.MeshStandardMaterial({ color: 0x1d1d22, roughness: 0.25 }), 0, 0.2, 0);
    disc.rotation.x = Math.PI / 2;
    rec.add(disc);
    const lab = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.016, 32), cupMat, 0, 0.2, 0);
    lab.rotation.x = Math.PI / 2;
    rec.add(lab);
    hold(rec, new THREE.Euler(0, 0.32, 0.2));
    const note = new THREE.Group();
    fig.add(note);
    const nh = mesh(new THREE.SphereGeometry(0.055, 20, 14), brass);
    nh.scale.set(1.25, 0.9, 0.7);
    nh.rotation.z = 0.4;
    note.add(nh);
    note.add(mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.22, 10), brass, 0.06, 0.11, 0));
    const flag = mesh(new RoundedBoxGeometry(0.08, 0.03, 0.012, 1, 0.005), brass, 0.1, 0.2, 0);
    flag.rotation.z = -0.6;
    note.add(flag);
    extra.push((phi) => {
      note.position.set(-0.72, 1.0 + 0.06 * Math.sin(2 * phi), 0.1);
      note.rotation.z = 0.18 * Math.sin(phi);
    });
  }
  if (outfit === "calendrier") {
    // Tonalli : le peintre de la couleur du jour. Chemise aux manches retroussées, tablier, palette, pinceau,
    // et une touche de peinture sur la joue.
    const apron = tinted(0xd9b2bb, 0.75);
    fig.add(mesh(new RoundedBoxGeometry(0.46, 0.5, 0.03, 2, 0.06), apron, 0, -0.06, FRONT + 0.012));
    for (const sx of [-1, 1]) {
      const st = mesh(new RoundedBoxGeometry(0.045, 0.2, 0.022, 1, 0.01), apron, sx * 0.17, 0.24, 0.16);
      st.rotation.x = -0.55;
      fig.add(st);
    }
    fig.add(mesh(new RoundedBoxGeometry(0.17, 0.09, 0.02, 1, 0.01), tinted(0xc99ea8, 0.75), 0.09, -0.19, FRONT + 0.03));
    [["love", -0.12, 0.08], ["joy", 0.13, 0.03], ["serenity", -0.05, -0.17]].forEach(([k, x, y]) => {
      const d = mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.006, 20), tinted(EMO[k], 0.5), x, y, FRONT + 0.03);
      d.rotation.x = Math.PI / 2;
      fig.add(d);
    });
    const smudge = onSphere(-0.24, 0.02, HEAD_R + 0.003);
    head.add(faceOut(mesh(new THREE.CircleGeometry(0.03, 16), tinted(EMO.serenity, 0.6), smudge.x, smudge.y, smudge.z)));
    const sh = new THREE.Shape();
    sh.absellipse(0, 0, 0.25, 0.18, 0, Math.PI * 2, false, 0);
    const hole = new THREE.Path();
    hole.absellipse(0.12, -0.02, 0.034, 0.028, 0, Math.PI * 2, true, 0);
    sh.holes.push(hole);
    const pg = new THREE.ExtrudeGeometry(sh, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 40 });
    pg.translate(-0.12, 0.02, -0.009);
    const pal = new THREE.Group();
    pal.add(mesh(pg, tinted(0xcdb08a, 0.6)));
    [["joy", -0.22, 0.12], ["love", -0.33, 0.05], ["serenity", -0.32, -0.07], ["gratitude", -0.2, -0.11], ["nostalgia", -0.09, 0.14]].forEach(([k, x, y]) => {
      const b = mesh(new THREE.SphereGeometry(0.036, 16, 12), tinted(EMO[k], 0.5), x, y, 0.016);
      b.scale.z = 0.45;
      pal.add(b);
    });
    hold(pal, new THREE.Euler(0.35, 0.32, 0.25));
    const brush = new THREE.Group();
    brush.add(mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.3, 12), tinted(0xcdb08a, 0.6), 0, -0.15, 0));
    brush.add(mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.05, 12), brass, 0, -0.32, 0));
    const tipB = mesh(new THREE.ConeGeometry(0.022, 0.08, 12), tinted(EMO.love, 0.5), 0, -0.38, 0);
    tipB.rotation.x = Math.PI;
    brush.add(tipB);
    brush.position.set(0, handY, 0);
    wave.elbow.add(brush);
  }
  if (outfit === "dossiers") {
    // INDEX : l'archiviste. Gilet kraft sur chemise et cravate, lunettes rondes de laiton, crayon sur l'oreille,
    // un dossier sous la main.
    fig.add(mesh(new RoundedBoxGeometry(0.13, 0.5, 0.02, 1, 0.008), M.label, 0, 0.0, FRONT + 0.003));
    fig.add(mesh(new RoundedBoxGeometry(0.045, 0.24, 0.02, 1, 0.008), M.ink, 0, 0.1, FRONT + 0.012));
    for (const y of [0.0, -0.1, -0.2]) fig.add(mesh(new THREE.SphereGeometry(0.018, 12, 10), brass, 0.085, y, FRONT + 0.006));
    for (const sx of [-1, 1]) {
      const ep = onSphere(sx * 0.125, 0.0, HEAD_R + 0.03);
      const ring = faceOut(mesh(new THREE.TorusGeometry(0.075, 0.012, 12, 40), brass, ep.x, ep.y, ep.z));
      head.add(ring);
      head.add(tube(curve([[sx * 0.2, 0.01, 0.34], [sx * 0.32, 0.03, 0.2], [sx * 0.36, 0.03, 0.04]]), 0.009, brass, 24));
    }
    head.add(tube(curve([[-0.05, 0.005, 0.385], [0, 0.025, 0.392], [0.05, 0.005, 0.385]]), 0.009, brass, 16));
    const pen = new THREE.Group();
    pen.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 12), tinted(0xd8a24a, 0.6), 0, 0, 0));
    const nib = mesh(new THREE.ConeGeometry(0.016, 0.045, 12), M.ink, 0, -0.142, 0);
    nib.rotation.x = Math.PI;
    pen.add(nib);
    pen.position.set(0.36, 0.1, 0.02);
    pen.rotation.set(0.3, 0, -1.0);
    head.add(pen);
    const fold = new THREE.Group();
    fold.add(mesh(new RoundedBoxGeometry(0.36, 0.46, 0.03, 1, 0.012), tinted(KRAFT, 0.82), 0.12, 0.17, 0));
    fold.add(mesh(new THREE.BoxGeometry(0.32, 0.06, 0.02), M.label, 0.12, 0.415, -0.003));
    fold.add(mesh(new RoundedBoxGeometry(0.1, 0.045, 0.032, 1, 0.01), tinted(TINT.espace, 0.7), 0.22, 0.42, 0));
    hold(fold, new THREE.Euler(0.15, 0.32, -0.12));
  }

  fig.rotation.y = -0.32;
  g.userData.animate = (phi) => {
    if (space) {
      // En apesanteur : il flotte et dérive doucement.
      fig.position.y = 0.07 * Math.sin(phi);
      fig.rotation.z = 0.07 * Math.sin(phi + 0.6);
      fig.rotation.x = 0.05 * Math.sin(phi + 1.4);
      legL.rotation.x = 0.16 * Math.sin(phi);
      legR.rotation.x = -0.12 * Math.sin(phi + 0.5);
    } else {
      // Sur terre : il sautille sur place, la tête penchée au rythme du salut.
      fig.position.y = 0.035 * (1 - Math.cos(2 * phi)) / 2;
      fig.rotation.z = 0.035 * Math.sin(phi);
      fig.rotation.x = 0;
      head.rotation.z = 0.07 * Math.sin(phi + 0.5);
      legL.rotation.x = 0.05 * Math.sin(2 * phi);
      legR.rotation.x = -0.05 * Math.sin(2 * phi);
    }
    // Le salut : le bras tendu sur le côté, l'avant-bras levé qui balance trois fois par boucle.
    wave.a.rotation.set(0.1, 0, 1.25 + 0.06 * Math.sin(3 * phi));
    wave.elbow.rotation.set(0, 0, 1.2 + 0.5 * Math.sin(3 * phi));
    rest.a.rotation.set(REST_A.x, 0, REST_A.z + 0.05 * Math.sin(phi));
    rest.elbow.rotation.copy(REST_E);
    for (const f of extra) f(phi);
  };
  g.userData.camera = { pos: [0, 0.35, 6.2], target: [0.12, 0.22, 0], fov: 26 };
  return g;
}

const SCENES = {
  // 004 Galaxy Escape : l'espace, la planète à anneau ; la Terre au loin
  espace(M) {
    const g = new THREE.Group();
    const lav = tinted(TINT.espace, 0.6);
    const gal = BUILD["galaxy-escape"](M);
    // Les bandes de la planète et une lune, en lavande.
    for (const [t0, dt] of [[1.18, 0.16], [1.72, 0.1], [2.05, 0.07]]) gal.add(mesh(new THREE.SphereGeometry(0.724, 64, 16, 0, Math.PI * 2, t0, dt), lav, 0, 1.0, 0));
    gal.children[2].material = lav;
    gal.scale.setScalar(1.25);
    gal.position.set(-1.6, -1.25, 0);
    g.add(gal);
    const earth = mesh(new THREE.SphereGeometry(0.42, 64, 48), earthMaterial());
    earth.position.set(2.3, 0.9, -2.5);
    earth.rotation.z = -0.35;
    g.add(earth);
    g.add(starField(500, 7));
    g.userData.hotspot = earth;
    g.userData.animate = (phi) => {
      gal.userData.animate(phi);
      gal.rotation.y = 0.2 * Math.sin(phi);
      earth.rotation.y = -1.75 + phi;
    };
    // Recul et visée basse (2026-10-09, « dézoomer la planète ») : rognée en 16:10 sur le site, la
    // planète passait derrière le cartel ; elle tient maintenant entière au-dessus de lui.
    g.userData.camera = { pos: [0, 0.5, 10], target: [0.2, -0.8, 0], fov: 32 };
    return g;
  },
  // 005 Magellan : la Terre et ses voyages ; l'avion attend à côté (à cliquer)
  terre(M) {
    const g = new THREE.Group();
    const R = 1.5;
    const tilt = new THREE.Group();
    tilt.rotation.z = -0.35;
    g.add(tilt);
    const spin = new THREE.Group();
    tilt.add(spin);
    spin.add(mesh(new THREE.SphereGeometry(R, 160, 96), earthMaterial()));
    // Les voyages de la démo de Magellan, depuis Paris.
    const PARIS = [48.86, 2.35];
    const from = onGlobe(...PARIS, 1);
    for (const to of [[64.14, -21.9], [31.63, -8.0], [-12.04, -77.03], [35.69, 139.69], [-33.93, 18.42], [-33.87, 151.21], [59.91, 10.75], [41.39, 2.16]]) {
      const b = onGlobe(...to, 1);
      const lift = 0.03 + (0.1 * from.angleTo(b)) / Math.PI;
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        const t = i / 48;
        pts.push(from.clone().lerp(b, t).normalize().multiplyScalar(R * (1.006 + Math.sin(Math.PI * t) * lift)));
      }
      spin.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.011, 8), M.accent));
      spin.add(mesh(new THREE.SphereGeometry(0.03, 16, 16), M.accent, ...onGlobe(...to, R * 1.004).toArray()));
    }
    spin.add(mesh(new THREE.SphereGeometry(0.04, 16, 16), M.accent, ...onGlobe(...PARIS, R * 1.004).toArray()));
    g.add(halo(R, "170, 200, 220"));
    g.add(starField(260, 11));
    // L'avion attend à droite du globe (il faut pouvoir cliquer dessus), incliné vers la Terre.
    const jet = airliner(M, { length: 1.15 });
    g.add(jet);
    g.userData.hotspot = jet;
    const heading = new THREE.Vector3(-0.85, 0, 0.53).normalize();
    g.userData.animate = (phi) => {
      spin.rotation.y = -1.75 + phi;
      const p = new THREE.Vector3(2.35, 0.3 + 0.05 * Math.sin(2 * phi), 0.4);
      jet.position.copy(p);
      jet.lookAt(p.clone().add(heading));
      jet.rotateZ(-0.42 + 0.06 * Math.sin(2 * phi + 0.8));
    };
    g.userData.camera = { pos: [0.6, 0.9, 7.4], target: [0, 0, 0], fov: 32 };
    return g;
  },
  // 010 Hublot : dans l'avion, le hublot, le volet ; dehors, la vraie aile et la mer de nuages
  avion(M) {
    const g = new THREE.Group();
    const wall = new THREE.Shape();
    wall.moveTo(-3, -2); wall.lineTo(3, -2); wall.lineTo(3, 2.4); wall.lineTo(-3, 2.4); wall.lineTo(-3, -2);
    wall.holes.push(roundRect(1.02, 1.5, 0.46));
    g.add(mesh(new THREE.ExtrudeGeometry(wall, { depth: 0.08, bevelEnabled: false, curveSegments: 48 }), M.clay2, 0, 0, -0.04));
    const outer = roundRect(1.3, 1.8, 0.6);
    outer.holes.push(roundRect(0.9, 1.4, 0.42));
    const frameGeo = new THREE.ExtrudeGeometry(outer, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 6, curveSegments: 48 });
    frameGeo.translate(0, 0, 0.02);
    g.add(mesh(frameGeo, M.clay));
    const shade = mesh(new RoundedBoxGeometry(0.88, 0.5, 0.02, 2, 0.01), M.accent, 0, 0.6, 0.06);
    g.add(shade);
    const spot = new THREE.Object3D();
    spot.position.set(0, -0.12, 0);
    g.add(spot);
    g.userData.hotspot = spot;
    // Le ciel : un dégradé, du bleu de la scène vers la brume de l'horizon.
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(400, 220), new THREE.MeshBasicMaterial({
      map: canvasTex(8, 256, (c, w, h) => {
        const gr = c.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, "#7FAFCD");
        gr.addColorStop(0.55, "#B9D3E3");
        gr.addColorStop(1, "#EDF2F2");
        c.fillStyle = gr;
        c.fillRect(0, 0, w, h);
      }),
    }));
    sky.position.set(20, -20, -120);
    g.add(sky);
    // L'aile : son bord d'attaque traverse le hublot en diagonale, du coin bas vers le bord droit,
    // le réacteur dépasse en bas, le winglet de laiton pointe au bord.
    const w = wing(M, { span: 13 });
    w.position.set(-2.4, -2.0, -1.5);
    w.traverse((o) => (o.castShadow = o.receiveShadow = false));
    g.add(w);
    // La mer de nuages, sous l'aile, qui file vers l'arrière.
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xf8f6f2, roughness: 0.95 });
    const clouds = [];
    let s = 5;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 34; i++) {
      const c = new THREE.Group();
      const n = 3 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const r = 1.1 + rnd() * 1.6;
        c.add(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), cloudMat));
        c.children[k].position.set((k - n / 2) * 1.6 + rnd(), rnd() * 0.7, rnd() * 1.4);
      }
      c.scale.y = 0.5;
      const x0 = -60 + rnd() * 120;
      c.position.set(x0, -9 - rnd() * 5, -14 - rnd() * 70);
      g.add(c);
      clouds.push({ c, x0 });
    }
    g.userData.animate = (phi) => {
      shade.position.y = 0.6 + 0.04 * Math.sin(phi);
      const u = phi / (Math.PI * 2);
      for (const { c, x0 } of clouds) c.position.x = ((((x0 + 60 + u * 120) % 120) + 120) % 120) - 60;
    };
    g.userData.camera = { pos: [-0.75, 0.3, 2.5], target: [0, -0.05, -0.4], fov: 40 };
    return g;
  },
  // 001 Métro Pathfinder : Paris vu du ciel, la Seine, le métro, le plus court chemin ; les toits de zinc
  paris(M) {
    const g = new THREE.Group();
    const zinc = tinted(TINT.paris, 0.55);
    g.add(mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.16, 96), M.clay2, 0, 0, 0));
    const seine = curve([[-3.0, 0, -0.6], [-1.6, 0, 0.2], [-0.4, 0, -0.3], [0.8, 0, 0.35], [2.0, 0, -0.1], [3.0, 0, 0.5]]);
    g.add(flatTube(seine, 0.16, WATER(), 0.085));
    const nearRiver = (x, z) => Math.abs(z - (0.25 * Math.sin(x * 1.3) - 0.05)) < 0.42;
    cityBlocks(g, M, 150, [5.4, 5.0], 11, (x, z) => nearRiver(x, z) || x * x + z * z > 8.2, (v) => (v > 0.85 ? M.clay2 : v < 0.3 ? zinc : M.clay));
    const S = { A: [-2.2, -1.2], B: [-1.0, -1.5], C: [0.3, -1.0], D: [1.6, -1.4], E: [-1.8, 1.2], F: [-0.4, 1.4], G: [1.2, 1.1], H: [0.0, 0.0], I: [2.2, 0.6] };
    const y = 0.42;
    const P = (k) => [S[k][0], y, S[k][1]];
    for (const l of [["A", "B", "C", "D"], ["E", "F", "G", "I"], ["B", "H", "F"], ["C", "H", "G"]]) g.add(tube(curve(l.map(P)), 0.022, M.ink));
    const path = curve(["A", "B", "H", "G", "I"].map((k) => [S[k][0], y + 0.03, S[k][1]]));
    g.add(tube(path, 0.042, M.accent));
    const stations = {};
    for (const k of Object.keys(S)) {
      stations[k] = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 24), ["A", "I"].includes(k) ? M.accent : M.clay, S[k][0], y, S[k][1]);
      g.add(stations[k]);
    }
    g.userData.hotspot = stations.I;
    const train = mesh(new THREE.CapsuleGeometry(0.05, 0.14, 6, 16), M.mark);
    g.add(train);
    const tower = eiffel(M, 1.2, tinted(TINT.monument, 0.6));
    tower.position.set(-1.25, 0.08, 0.55);
    g.add(tower);
    g.userData.animate = (phi) => {
      const u = pingpong(phi);
      const p = path.getPointAt(u);
      train.position.set(p.x, p.y + 0.06, p.z);
      train.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), path.getTangentAt(u));
    };
    g.userData.camera = { pos: [0.6, 5.6, 5.0], target: [0, 0, 0.2], fov: 34 };
    return g;
  },
  // 003 Visit Match : la tour Eiffel et l'arc de triomphe reliés par un arc de laiton ; deux voyageurs
  // partent chacun d'un monument et se rejoignent au sommet du lien. La pelouse et les arbres.
  monuments(M) {
    const g = new THREE.Group();
    const sage = tinted(TINT.monuments, 0.7);
    g.add(mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.14, 96), M.clay2, 0, 0, 0));
    g.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.02, 64), tinted(0xd3dbc9, 0.85), 0, 0.08, 0));
    const red = tinted(TINT.monument, 0.6);
    const tower = eiffel(M, 2.25, red);
    tower.position.set(-1.0, 0.07, -0.7);
    g.add(tower);
    const triumph = arc(M, 1.06, red);
    triumph.position.set(1.15, 0.07, -0.65);
    triumph.rotation.y = -0.4;
    g.add(triumph);
    // Le point à cliquer : le pilier droit de l'arc.
    g.userData.hotspot = triumph.userData.spot;
    // Le lien : de la tour (au-dessus du premier étage) au sommet de l'arc, en arc de laiton.
    const a = new THREE.Vector3(-0.9, 0.07 + 0.62, -0.62), b = new THREE.Vector3(1.1, 0.07 + 1.1, -0.6);
    const top = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 1.0, 0.15));
    const link = new THREE.QuadraticBezierCurve3(a, top, b);
    g.add(mesh(new THREE.TubeGeometry(link, 96, 0.02, 12, false), M.accent));
    for (const p of [a, b]) g.add(mesh(new THREE.SphereGeometry(0.05, 24, 24), M.accent, p.x, p.y, p.z));
    // Deux voyageurs : chacun part d'un monument, ils se rejoignent au sommet, puis s'effacent.
    const travelers = [0, 1].map(() => {
      const t = mesh(new THREE.SphereGeometry(0.065, 24, 24), M.mark);
      g.add(t);
      return t;
    });
    for (const [x, z] of [[-2.0, 0.6], [1.9, 0.9], [-1.6, 1.4], [2.1, -1.2], [-2.2, -0.6]]) {
      const tree = new THREE.Group();
      tree.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.22, 10), M.clay2, 0, 0.18, 0));
      tree.add(mesh(new THREE.SphereGeometry(0.17, 20, 20), sage, 0, 0.38, 0));
      tree.position.set(x, 0.07, z);
      g.add(tree);
    }
    g.userData.animate = (phi) => {
      const t = phi / (Math.PI * 2);
      const go = smooth(0, 0.6, t);
      const s = smooth(0, 0.08, t) * (1 + 0.5 * Math.sin(Math.PI * smooth(0.6, 0.8, t))) * (1 - smooth(0.82, 1, t));
      travelers[0].position.copy(link.getPoint(0.5 * go));
      travelers[1].position.copy(link.getPoint(1 - 0.5 * go));
      for (const tr of travelers) tr.scale.setScalar(Math.max(0.001, s));
    };
    g.userData.camera = { pos: [0.2, 2.4, 6.2], target: [0, 0.88, 0], fov: 35 };
    return g;
  },
  // 009 gym-picker : la route, les bouchons, les quatre salles, le meilleur trajet ; quelques toits de tuile
  route(M) {
    const g = new THREE.Group();
    const tile = tinted(TINT.route, 0.7);
    g.add(mesh(new THREE.CylinderGeometry(3.0, 3.0, 0.14, 96), M.clay2, 0, 0, 0));
    const roads = [
      curve([[-2.6, 0, 0.2], [-1.2, 0, 0.0], [0, 0, 0.3], [1.3, 0, -0.1], [2.6, 0, 0.1]]),
      curve([[-0.2, 0, -2.6], [0.0, 0, -1.0], [0, 0, 0.3], [0.3, 0, 1.4], [0.1, 0, 2.6]]),
      curve([[-2.0, 0, -1.7], [-1.0, 0, -0.9], [0, 0, 0.3]]),
    ];
    for (const r of roads) g.add(flatTube(r, 0.15, M.ink, 0.08));
    const best = curve([[0.3, 0.13, 1.4], [0, 0.13, 0.3], [-1.2, 0.13, 0.0], [-2.2, 0.13, 0.15]]);
    g.add(tube(best, 0.035, M.accent));
    const home = house(M);
    home.position.set(0.55, 0.07, 1.65);
    g.add(home);
    const roofTop = new THREE.Object3D();
    roofTop.position.set(0, 0.3, 0);
    home.add(roofTop);
    g.userData.hotspot = roofTop;
    for (const [x, z, best] of [[-2.25, 0.55, true], [2.2, 0.55, false], [0.55, -2.2, false], [-1.95, -2.0, false]]) {
      const gym = BUILD["gym-picker"](M);
      gym.scale.setScalar(0.22);
      gym.position.set(x, 0.07, z);
      g.add(gym);
      g.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 32), best ? M.accent : M.clay, x, 0.085, z));
    }
    // Les bâtiments se tiennent à distance des routes (mesurée sur les courbes elles-mêmes),
    // de la maison et des salles.
    const roadPts = roads.flatMap((r) => r.getSpacedPoints(180));
    const spots = [[0.55, 1.65], [-2.25, 0.55], [2.2, 0.55], [0.55, -2.2], [-1.95, -2.0]];
    const taken = (x, z) =>
      x * x + z * z > 7.5 ||
      roadPts.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 0.42 ** 2) ||
      spots.some(([sx, sz]) => (sx - x) ** 2 + (sz - z) ** 2 < 0.5 ** 2);
    cityBlocks(g, M, 120, [5.2, 5.2], 23, taken, (v) => (v > 0.85 ? M.clay2 : v < 0.18 ? tile : M.clay));
    // De vraies voitures, sur leur voie de droite, dans les deux sens ; la voiture de laiton,
    // la mienne, fait l'aller-retour sur le meilleur trajet.
    // Quatre voitures plutôt que six : la route reste lisible, et l'oeil suit la mienne.
    const traffic = [];
    for (let i = 0; i < 4; i++) {
      const c = car(M, i, M.clay);
      g.add(c);
      traffic.push({ c, road: roads[i % 2], offset: i / 4, dir: i % 3 === 2 ? -1 : 1 });
    }
    const mine = car(M, 1, M.accent);
    g.add(mine);
    const place = (c, p, tg) => {
      c.position.set(p.x - tg.z * 0.065, 0.105, p.z + tg.x * 0.065);
      c.rotation.y = Math.atan2(tg.x, tg.z);
    };
    g.userData.animate = (phi) => {
      const t = phi / (Math.PI * 2);
      for (const { c, road, offset, dir } of traffic) {
        const u = (((offset + dir * t) % 1) + 1) % 1;
        place(c, road.getPointAt(u), road.getTangentAt(u).multiplyScalar(dir));
      }
      const u = pingpong(phi);
      const p = best.getPointAt(u);
      mine.position.set(p.x, 0.105, p.z);
      const tg = best.getTangentAt(u).multiplyScalar(Math.sin(phi) < 0 ? -1 : 1);
      mine.rotation.y = Math.atan2(tg.x, tg.z);
    };
    g.userData.camera = { pos: [1.2, 5.0, 5.6], target: [0, 0, 0.2], fov: 34 };
    return g;
  },
  // 007 Mithril + 002 API REST .NET : la maison, le bureau, le coffre et le serveur ; le tapis et la plante
  maison(M) {
    const g = new THREE.Group();
    const sage = tinted(TINT.maison, 0.7);
    g.add(mesh(new RoundedBoxGeometry(5, 0.1, 3, 2, 0.03), M.clay2, 0, -0.05, 0));
    g.add(mesh(new RoundedBoxGeometry(5, 3, 0.1, 2, 0.03), M.clay, 0, 1.45, -1.5));
    g.add(mesh(new RoundedBoxGeometry(2.7, 0.02, 1.6, 2, 0.01), tinted(0xc9d2bf, 0.9), -0.35, 0.01, 0.2));
    const pot = plant(M, sage, 0.9);
    pot.position.set(-2.05, 0, -0.95);
    g.add(pot);
    const desk = new THREE.Group();
    desk.add(mesh(new RoundedBoxGeometry(2.0, 0.08, 0.9, 2, 0.02), M.clay, 0, 0.82, 0));
    for (const [x, z] of [[-0.92, -0.38], [0.92, -0.38], [-0.92, 0.38], [0.92, 0.38]]) desk.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 12), M.clay2, x, 0.41, z));
    desk.position.set(-0.4, 0, -0.6);
    g.add(desk);
    const laptop = new THREE.Group();
    laptop.add(mesh(new RoundedBoxGeometry(0.7, 0.03, 0.46, 2, 0.01), M.clay2, 0, 0.88, 0));
    const screen = mesh(new RoundedBoxGeometry(0.7, 0.46, 0.025, 2, 0.01), M.clay2, 0, 1.11, -0.22);
    screen.rotation.x = -0.18;
    laptop.add(screen);
    const display = mesh(new THREE.PlaneGeometry(0.62, 0.38), M.ink, 0, 1.12, -0.205);
    display.rotation.x = -0.18;
    laptop.add(display);
    laptop.position.set(-0.55, 0, -0.55);
    g.add(laptop);
    // Le coffre-fort de Mithril, posé sur le bureau, la porte tournée vers nous.
    const vault = safe(0.52);
    vault.position.set(0.28, 0.86, -0.52);
    vault.rotation.y = -0.35;
    g.add(vault);
    const lamp = new THREE.Group();
    lamp.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.03, 24), M.clay2, 0, 0.88, 0));
    lamp.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 10), M.clay2, 0, 1.12, 0));
    const shadeLamp = mesh(new THREE.ConeGeometry(0.16, 0.18, 32, 1, true), M.accent, 0.06, 1.4, 0);
    shadeLamp.rotation.z = 0.5;
    lamp.add(shadeLamp);
    lamp.position.set(-1.25, 0, -0.85);
    g.add(lamp);
    const rack = BUILD["api-rest-dotnet"](M);
    rack.scale.setScalar(0.42);
    rack.position.set(1.6, 0, -1.0);
    g.add(rack);
    const deck = BUILD.cancionero(M);
    deck.scale.setScalar(0.3);
    deck.position.set(1.75, 0.0, 0.7);
    g.add(deck);
    g.userData.hotspot = deck;
    // La boucle dure 8 s : on arrive, le coffre est ouvert ; sa porte se ferme, la molette fait un tour
    // pour verrouiller, puis il se rouvre à la fin de la boucle. Le serveur et la platine gardent leur
    // rythme de 4 s (deux tours par boucle).
    const OPEN = 1.85;
    g.userData.animate = (phi) => {
      const u = phi / (Math.PI * 2);
      vault.userData.door.rotation.y = OPEN * (1 - smooth(0.03, 0.17, u) + smooth(0.84, 0.97, u));
      vault.userData.dial.rotation.z = -Math.PI * 2 * smooth(0.2, 0.36, u);
      rack.userData.animate(2 * phi);
      deck.userData.animate(2 * phi);
    };
    g.userData.camera = { pos: [0.9, 2.3, 4.6], target: [0.1, 0.8, -0.4], fov: 38 };
    return g;
  },
  // 006 Cancionero : le tourne-disque en gros plan ; des notes de laiton s'envolent, et les paroles à trous
  // vont se poser sur le calendrier du mur — le lien vers Tonalli, l'escale suivante.
  salon(M) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(3.0, 3.0, 0.12, 96), M.clay2, 0, -0.06, 0));
    g.add(mesh(new RoundedBoxGeometry(4.4, 2.8, 0.12, 2, 0.03), M.clay, 0, 1.4, -2.0));
    // Le tourne-disque à droite : le cartel du projet occupe le coin bas gauche de l'écran.
    const deck = BUILD.cancionero(M);
    deck.position.set(0.55, 0, 0.1);
    g.add(deck);
    // Le calendrier de Tonalli, punaisé au mur : c'est lui qu'on clique pour passer à l'escale suivante.
    const cal = calendarSheet(M, 1.15);
    cal.position.set(-1.05, 1.5, -1.92);
    g.add(cal);
    g.userData.hotspot = cal.userData.today;
    // La pochette, adossée derrière : terre cuite, le rond du disque, une pastille de laiton, deux lignes de titre.
    const cover = canvasTex(512, 512, (c, w) => {
      c.fillStyle = "#CDB3A4";
      c.fillRect(0, 0, w, w);
      c.fillStyle = "#EFE8DB";
      c.beginPath();
      c.arc(w * 0.56, w * 0.58, w * 0.3, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#B08A4F";
      c.beginPath();
      c.arc(w * 0.56, w * 0.58, w * 0.075, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#3A302A";
      c.beginPath();
      c.roundRect(w * 0.1, w * 0.1, w * 0.4, w * 0.035, w * 0.018);
      c.roundRect(w * 0.1, w * 0.17, w * 0.26, w * 0.035, w * 0.018);
      c.fill();
    });
    const sleeve = new THREE.Group();
    sleeve.add(mesh(new RoundedBoxGeometry(1.5, 1.5, 0.04, 2, 0.012), tinted(TINT.salon, 0.8)));
    sleeve.add(mesh(new THREE.PlaneGeometry(1.46, 1.46), new THREE.MeshStandardMaterial({ map: cover, roughness: 0.8 }), 0, 0, 0.0215));
    sleeve.position.set(1.35, 0.75, -1.78);
    sleeve.rotation.set(-0.13, -0.12, 0);
    g.add(sleeve);
    // Les notes de laiton.
    const head = new THREE.SphereGeometry(0.075, 20, 16);
    const stem = new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8);
    const flagGeo = new RoundedBoxGeometry(0.14, 0.03, 0.025, 2, 0.01);
    const notes = [];
    for (let i = 0; i < 4; i++) {
      const n = new THREE.Group();
      const h = mesh(head, M.accent);
      h.scale.set(1.25, 0.9, 0.9);
      h.rotation.z = 0.35;
      n.add(h);
      n.add(mesh(stem, M.accent, 0.075, 0.16, 0));
      if (i % 2 === 0) {
        const flag = mesh(flagGeo, M.accent, 0.13, 0.27, 0);
        flag.rotation.z = -0.7;
        n.add(flag);
      }
      n.rotation.y = 0.25;
      g.add(n);
      // Quatre notes (six au départ, c'était trop) ; deux partent vers le calendrier du mur : le lien vers
      // l'escale suivante, sans rien ajouter.
      notes.push({ n, k: i / 4, drift: (i % 3) - 1, toCalendar: i % 3 === 0 });
    }
    const from = new THREE.Vector3(0.1, 0.45, 0.05), to = cal.position.clone().add(new THREE.Vector3(0.1, -0.05, 0.14));
    g.userData.animate = (phi) => {
      deck.userData.animate(phi);
      cal.userData.animate(phi);
      const t = phi / (Math.PI * 2);
      for (const { n, k, drift, toCalendar } of notes) {
        const u = (k + t) % 1;
        if (toCalendar) {
          n.position.lerpVectors(from, to, smooth(0, 1, u));
          n.position.y += 0.6 * Math.sin(Math.PI * u);
          n.scale.setScalar(Math.max(0.001, Math.sin(Math.PI * u) * (1 - 0.3 * u)));
        } else {
          n.position.set(0.3 + drift * 0.55 * u + 0.16 * Math.sin(u * 6 + k * 9), 0.4 + u * 2.2, 0.05 + 0.15 * Math.sin(u * 4 + k * 5));
          n.scale.setScalar(Math.sin(u * Math.PI));
        }
        n.rotation.z = 0.25 * Math.sin(u * 5 + k * 7);
      }
    };
    g.userData.camera = { pos: [0.45, 2.7, 5.1], target: [0.1, 0.95, -0.5], fov: 38 };
    return g;
  },
  // 008 Tonalli : le calendrier collé au mur, en grand (le même qu'au mur du tourne-disque).
  calendrier(M) {
    const g = new THREE.Group();
    g.add(mesh(new RoundedBoxGeometry(4.3, 3.3, 0.14, 2, 0.03), M.clay, 0, 1.65, -0.07));
    g.add(mesh(new RoundedBoxGeometry(4.3, 0.1, 1.6, 2, 0.03), M.clay2, 0, -0.05, 0.73));
    const cal = calendarSheet(M, 2.0);
    cal.position.set(0.55, 1.72, 0.03);
    g.add(cal);
    // Sous le côté droit du calendrier, sur un banc bas : la pile de dossiers d'INDEX, celui du dessus ouvert.
    // C'est elle qu'on clique. À droite, elle laisse la place au cartel, posé en bas à gauche de l'écran.
    // Le même dossier que celui de l'escale suivante, en petit : on plonge dedans.
    const BENCH = 1.42;
    g.add(mesh(new RoundedBoxGeometry(1.2, 0.34, 0.95, 2, 0.03), M.clay2, BENCH, 0.17, 0.52));
    const pw = 0.6, pd = (pw - 0.06) * (DOSSIER.H / DOSSIER.W) + 0.05;
    const pile = folderPile(M, { n: 4, w: pw, d: pd, pages: true });
    pile.position.set(BENCH + pw / 2, 0.34, 0.52);
    pile.rotation.y = 0.08;
    g.add(pile);
    const spot = new THREE.Object3D();
    spot.position.set(BENCH + pw / 2, 0.34 + pile.userData.height, 0.52);
    g.add(spot);
    g.userData.hotspot = spot;
    // À gauche du calendrier, les photos des journées affichées au mur.
    const prints = [
      { x: -1.55, y: 2.38, r: 0.08, w: 0.5, h: 0.6, polaroid: true, tape: true, style: "duo", colors: ["serenity", "joy"] },
      { x: -0.92, y: 2.5, r: -0.06, w: 0.6, h: 0.44, style: "landscape", colors: ["gratitude", "love"] },
      { x: -1.78, y: 1.62, r: -0.1, w: 0.5, h: 0.6, polaroid: true, style: "inset", colors: ["joy", "pride"] },
      { x: -1.1, y: 1.7, r: 0.07, w: 0.44, h: 0.56, tape: true, style: "portrait", colors: ["nostalgia", "serenity"] },
      { x: -1.45, y: 1.0, r: 0.05, w: 0.42, h: 0.5, polaroid: true, style: "landscape", colors: ["serenity", "gratitude"] },
    ];
    for (const p of prints) g.add(photoPrint(M, p));
    g.userData.animate = (phi) => {
      cal.userData.animate(phi);
      // La couverture du dossier ouvert respire un peu.
      pile.userData.hinge.rotation.z = 2.92 + 0.08 * Math.sin(phi);
    };
    g.userData.camera = { pos: [-1.1, 2.0, 6.8], target: [0.2, 1.5, 0], fov: 34 };
    return g;
  },
  // 011 INDEX : le dossier ouvert en grand, la page de titre et le sommaire des onze projets ;
  // sous lui, les dossiers fermés et leurs onglets aux couleurs des escales ; un stylo de laiton parcourt la liste.
  dossiers(M) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.14, 96), M.clay2, 0, -0.07, 0));
    const w = 1.45, d = (w - 0.06) * (DOSSIER.H / DOSSIER.W) + 0.05;
    const pile = folderPile(M, { n: 6, w, d, pages: true });
    pile.position.set(w / 2, 0, 0);
    pile.userData.hinge.rotation.z = 3.08;
    g.add(pile);
    // Le stylo : il glisse le long des lignes du sommaire, de 001 à 011, et remonte.
    const pen = new THREE.Group();
    pen.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 24), M.ink, 0, 0.36, 0));
    pen.add(mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.22, 24), M.accent, 0, 0.62, 0));
    pen.add(mesh(new THREE.SphereGeometry(0.032, 20, 12), M.accent, 0, 0.73, 0));
    pen.add(mesh(new THREE.ConeGeometry(0.03, 0.1, 24).rotateX(Math.PI), M.accent, 0, -0.05, 0));
    g.add(pen);
    const sheetW = w - 0.06, sheetD = d - 0.05;
    const top = pile.userData.height + 0.03;
    const rowZ = (k) => ((DOSSIER.TOP + k * DOSSIER.ROW - 12) / DOSSIER.H - 0.5) * sheetD;
    const rowX = w / 2 + (130 / DOSSIER.W - 0.5) * sheetW;
    const spot = new THREE.Object3D();
    spot.position.set(w / 2 + 0.15, top, rowZ(5));
    g.add(spot);
    g.userData.hotspot = spot;
    g.userData.animate = (phi) => {
      const k = 10 * pingpong(phi);
      pen.position.set(rowX + 0.04, top + 0.02, rowZ(k));
      pen.rotation.set(0.5, 0, -0.55);
      pile.userData.hinge.rotation.z = 3.08 - 0.04 * Math.sin(phi);
    };
    g.userData.camera = { pos: [0.35, 3.7, 2.9], target: [0.05, 0.1, 0.2], fov: 38 };
    return g;
  },
  // 008 Tonalli, piste A : deux verres d'eau, deux gouttes d'encre — la couleur du jour de chacun
  tonalliA(M) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.12, 96), M.clay2, 0, -0.06, 0));
    const glass = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.06, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false });
    const water = new THREE.MeshStandardMaterial({ color: 0xcfe3ea, roughness: 0.08, transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide });
    const H = 1.05, R1 = 0.36, R0 = 0.3, WL = 0.74;
    const cups = [];
    // Gratitude et Sérénité : deux des douze couleurs de Tonalli.
    for (const [x, color, offset, seed] of [[-0.6, 0xf4a261, 0, 7], [0.6, 0xa8dadc, 0.5, 3]]) {
      const cup = new THREE.Group();
      cup.position.x = x;
      g.add(cup);
      const side = new THREE.Mesh(new THREE.CylinderGeometry(R1, R0, H, 64, 1, true), glass);
      side.position.y = H / 2;
      cup.add(side);
      cup.add(mesh(new THREE.CylinderGeometry(R0, R0, 0.07, 64), rimMat, 0, 0.035, 0));
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R1, 0.01, 8, 64), rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = H;
      cup.add(rim);
      const rWL = R0 + ((R1 - R0) * WL) / H;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(rWL - 0.012, R0 - 0.012, WL - 0.07, 64), water);
      body.position.y = 0.07 + (WL - 0.07) / 2;
      cup.add(body);
      const drop = mesh(new THREE.SphereGeometry(0.045, 24, 24), new THREE.MeshStandardMaterial({ color, roughness: 0.35 }));
      drop.scale.y = 1.25;
      cup.add(drop);
      // L'encre : des volutes floues (sprites à bord fondu), qui s'étirent en filaments vers le fond.
      let sd = seed;
      const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
      const puffs = [];
      for (let i = 0; i < 22; i++) {
        const m = new THREE.SpriteMaterial({ map: SOFT, color, transparent: true, opacity: 0, depthWrite: false, rotation: rnd() * Math.PI });
        const p = new THREE.Sprite(m);
        const a = rnd() * Math.PI * 2, out = 0.02 + rnd() * 0.12, tendril = i % 3 === 0;
        puffs.push({ p, m, dx: Math.cos(a) * out, dz: Math.sin(a) * out, down: 0.1 + rnd() * 0.5, size: 0.09 + rnd() * 0.1, stretch: tendril ? 1.8 + rnd() : 1, lag: rnd() * 0.14 });
        cup.add(p);
      }
      const ripple = new THREE.Mesh(new THREE.TorusGeometry(1, 0.006, 6, 64), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      ripple.rotation.x = Math.PI / 2;
      ripple.position.y = WL;
      cup.add(ripple);
      cups.push({ drop, puffs, ripple, offset });
    }
    const spot = new THREE.Object3D();
    spot.position.set(0.6, 0.5, 0.2);
    g.add(spot);
    g.userData.hotspot = spot;
    g.userData.animate = (phi) => {
      for (const c of cups) {
        const t = (phi / (Math.PI * 2) + c.offset) % 1;
        // La goutte tombe, touche l'eau, fait un rond ; l'encre se diffuse puis s'efface.
        const fall = Math.min(1, t / 0.14);
        c.drop.visible = t < 0.14;
        c.drop.position.y = 1.75 - (1.75 - WL) * fall * fall;
        const rp = (t - 0.14) / 0.36;
        c.ripple.visible = rp > 0 && rp < 1;
        c.ripple.scale.setScalar(0.03 + 0.27 * smooth(0, 1, rp));
        c.ripple.material.opacity = 0.7 * (1 - rp);
        for (const q of c.puffs) {
          const u = Math.max(0, (t - 0.14 - q.lag) / (0.86 - q.lag));
          const grow = 1 - Math.pow(1 - Math.min(1, u * 1.3), 3);
          q.p.visible = u > 0;
          q.p.position.set(q.dx * grow * 1.5, WL - 0.03 - q.down * grow, q.dz * grow * 1.5);
          const s = q.size * (0.25 + grow * 1.1);
          q.p.scale.set(s, s * (1 + (q.stretch - 1) * grow), 1);
          q.m.opacity = 0.42 * smooth(0, 0.1, u) * (1 - smooth(0.55, 1, u));
        }
      }
    };
    g.userData.camera = { pos: [0, 1.75, 3.9], target: [0, 0.62, 0], fov: 32 };
    return g;
  },
  // 008 Tonalli, piste B : nos deux personnages-gouttes, chacun dans sa couleur, et nos deux photos du jour
  tonalliB(M) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.12, 96), M.clay2, 0, -0.06, 0));
    const profile = new THREE.SplineCurve([[0, 0], [0.3, 0.035], [0.5, 0.2], [0.56, 0.45], [0.5, 0.72], [0.36, 0.98], [0.18, 1.2], [0, 1.38]].map(([x, y]) => new THREE.Vector2(x, y)));
    const dropGeo = new THREE.LatheGeometry(profile.getPoints(64), 72);
    const chars = [];
    for (const [x, color, mode] of [[-0.55, 0xf4a261, "hop"], [0.55, 0xa8dadc, "sway"]]) {
      const c = new THREE.Group();
      c.position.x = x;
      c.scale.setScalar(0.78);
      g.add(c);
      const body = mesh(dropGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
      c.add(body);
      for (const s of [-1, 1]) {
        const eye = mesh(new THREE.SphereGeometry(1, 16, 12), M.ink, s * 0.14, 0.62, 0.505);
        eye.scale.set(0.045, 0.07, 0.03);
        body.add(eye);
      }
      chars.push({ c, body, mode });
    }
    // La corde à linge et nos deux photos du jour (la scène, et le visage en vignette).
    for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.95, 16), M.clay2, s * 1.55, 0.97, -0.75));
    const line = curve([[-1.55, 1.86, -0.75], [-0.8, 1.74, -0.75], [0, 1.7, -0.75], [0.8, 1.74, -0.75], [1.55, 1.86, -0.75]]);
    g.add(tube(line, 0.008, M.ink, 64));
    const mix = (a, b, k) => {
      const ca = new THREE.Color(a), cb = new THREE.Color(b);
      return `#${ca.lerp(cb, k).getHexString()}`;
    };
    const photos = [];
    for (const [x, color, k] of [[-0.55, 0xf4a261, 0], [0.55, 0xa8dadc, 1.3]]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 1.72, -0.75);
      g.add(pivot);
      pivot.add(mesh(new RoundedBoxGeometry(0.5, 0.62, 0.014, 2, 0.006), M.label, 0, -0.36, 0));
      const tex = canvasTex(256, 256, (c, w, h) => {
        const gr = c.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, mix(color, 0xffffff, 0.6));
        gr.addColorStop(1, mix(color, 0xffffff, 0.2));
        c.fillStyle = gr;
        c.fillRect(0, 0, w, h);
        c.fillStyle = mix(color, 0x2a2019, 0.22);
        c.beginPath();
        c.ellipse(w * 0.62, h * 1.02, w * 0.62, h * 0.36, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = mix(color, 0xffffff, 0.78);
        c.strokeStyle = "#ffffff";
        c.lineWidth = 6;
        c.beginPath();
        c.roundRect(18, 18, 70, 92, 12);
        c.fill();
        c.stroke();
        c.fillStyle = mix(color, 0x2a2019, 0.12);
        c.beginPath();
        c.arc(53, 58, 17, 0, Math.PI * 2);
        c.fill();
      });
      pivot.add(mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), 0, -0.31, 0.009));
      pivot.add(mesh(new RoundedBoxGeometry(0.06, 0.11, 0.03, 2, 0.008), M.accent, 0, -0.03, 0.012));
      photos.push({ pivot, k });
    }
    const spot = new THREE.Object3D();
    spot.position.set(0.55, 0.45, 0.35);
    g.add(spot);
    g.userData.hotspot = spot;
    g.userData.animate = (phi) => {
      for (const { pivot, k } of photos) pivot.rotation.z = 0.05 * Math.sin(phi + k);
      for (const { c, body, mode } of chars) {
        if (mode === "hop") {
          // La Gratitude sautille : deux petits bonds par boucle, écrasée à l'atterrissage.
          const s = Math.sin(2 * phi), lift = Math.max(0, s), squash = Math.max(0, -s);
          c.position.y = 0.16 * lift;
          body.scale.set(1 + 0.07 * squash, 1 - 0.09 * squash + 0.04 * lift, 1 + 0.07 * squash);
        } else {
          // La Sérénité se balance doucement et respire.
          c.rotation.z = 0.07 * Math.sin(phi);
          body.scale.set(1, 1 + 0.025 * Math.sin(2 * phi), 1);
        }
      }
    };
    g.userData.camera = { pos: [0, 1.45, 4.5], target: [0, 0.85, 0], fov: 34 };
    return g;
  },
  // À propos : le passeport ouvert, ses visas ; le tampon de laiton passe par l'encreur et en pose un nouveau
  passeport(M) {
    const g = new THREE.Group();
    // Le bureau : un plateau qui flotte dans la nuit, comme les autres escales sur leur socle.
    g.add(mesh(new RoundedBoxGeometry(3.5, 0.12, 2.3, 2, 0.04), M.clay2, 0.3, -0.06, 0.05));
    const PW = 0.88, PH = (PW * PASS.H) / PASS.W;
    const book = new THREE.Group();
    book.position.set(-0.05, 0.008, 0);
    book.rotation.y = -0.1;
    g.add(book);
    // La couverture, ouverte à plat sous les pages : aubergine, le liseré de laiton.
    book.add(mesh(new RoundedBoxGeometry(PW * 2 + 0.1, 0.02, PH + 0.08, 2, 0.008), tinted(0x4b3f5a, 0.5), 0, 0.01, 0));
    book.add(mesh(new RoundedBoxGeometry(0.03, 0.022, PH + 0.08, 1, 0.006), M.accent, 0, 0.012, 0));
    // Chaque page se bombe vers la reliure, posée sur la tranche du cahier.
    const lift = (x) => 0.045 + 0.03 * Math.pow(1 - Math.abs(x) / PW, 2);
    for (const [side, tex] of [[-1, PASS.left], [1, PASS.right]]) {
      const geo = new THREE.PlaneGeometry(PW, PH, 32, 1);
      geo.rotateX(-Math.PI / 2);
      geo.translate(side * (PW / 2 + 0.006), 0, 0);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, lift(p.getX(i)));
      geo.computeVertexNormals();
      book.add(mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 })));
      // Le cahier sous la page : son dessus suit le bombé de la page, sans jour entre les deux.
      const slab = new THREE.BoxGeometry(PW - 0.012, 1, PH - 0.012, 32, 1, 1);
      slab.translate(side * (PW / 2 + 0.006), 0.5, 0);
      const s = slab.attributes.position;
      for (let i = 0; i < s.count; i++) s.setY(i, s.getY(i) > 0.5 ? lift(s.getX(i)) - 0.002 : 0.02);
      slab.computeVertexNormals();
      book.add(mesh(slab, M.label));
    }
    // Le nouveau visa : à sa place sur la page de droite, invisible jusqu'au coup de tampon.
    const { FRESH } = PASS;
    const fx = PW / 2 + 0.006 + (FRESH.x / PASS.W - 0.5) * PW, fz = (FRESH.y / PASS.H - 0.5) * PH;
    const freshSize = ((FRESH.size * 2) / PASS.W) * PW * (256 / 200);
    const freshMat = new THREE.MeshStandardMaterial({ map: PASS.fresh, roughness: 0.8, transparent: true, opacity: 0, depthWrite: false });
    const fresh = mesh(new THREE.PlaneGeometry(freshSize, freshSize), freshMat, fx, lift(fx) + 0.003, fz);
    fresh.rotation.x = -Math.PI / 2;
    fresh.castShadow = false;
    book.add(fresh);
    // La carte d'embarquement, glissée sous la couverture.
    const pass = canvasTex(640, 240, (c, w, h) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#B08A4F";
      c.fillRect(470, 0, w - 470, h);
      c.strokeStyle = "#CDBFAE";
      c.setLineDash([10, 8]);
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(462, 12);
      c.lineTo(462, h - 12);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = "#8A6A35";
      c.font = "bold 19px 'Courier New', monospace";
      c.fillText("CARTE D'EMBARQUEMENT / BOARDING PASS", 34, 52);
      // Pas d'initiales suivies de deux années : la carte porte la destination, pas des dates.
      c.fillStyle = "#2B241D";
      c.font = "italic 64px Georgia, serif";
      c.fillText("Index", 34, 134);
      c.fillStyle = "#9A8F84";
      c.font = "bold 19px 'Courier New', monospace";
      c.fillText("10 ESCALES / STOPS · 11 PROJETS", 34, 190);
      c.fillStyle = "#F7F1E6";
      c.font = "italic 64px Georgia, serif";
      c.fillText("CR", 506, 146);
    });
    const ticket = new THREE.Group();
    ticket.add(mesh(new RoundedBoxGeometry(1.0, 0.008, 0.375, 1, 0.003), M.label, 0, 0.004, 0));
    ticket.add(mesh(new THREE.PlaneGeometry(1.0, 0.375).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: pass, roughness: 0.85 }), 0, 0.0085, 0));
    ticket.position.set(-0.75, 0, 0.82);
    ticket.rotation.y = 0.32;
    g.add(ticket);
    // L'encreur : une boîte de laiton, son tampon d'encre.
    const pad = new THREE.Group();
    pad.add(mesh(new RoundedBoxGeometry(0.52, 0.07, 0.38, 2, 0.02), M.accent, 0, 0.035, 0));
    pad.add(mesh(new RoundedBoxGeometry(0.44, 0.012, 0.3, 2, 0.006), tinted(0x3a3242, 0.8), 0, 0.071, 0));
    pad.position.set(1.42, 0, -0.32);
    pad.rotation.y = -0.25;
    g.add(pad);
    // Le stylo, couché sur le bureau : corps d'encre, capuchon et agrafe de laiton.
    const pen = new THREE.Group();
    pen.add(mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.62, 24), M.ink, 0, 0, 0));
    pen.add(mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.2, 24), M.accent, 0, 0.36, 0));
    pen.add(mesh(new THREE.SphereGeometry(0.028, 20, 12), M.accent, 0, 0.46, 0));
    pen.add(mesh(new THREE.ConeGeometry(0.026, 0.09, 24).rotateX(Math.PI), M.accent, 0, -0.355, 0));
    pen.add(mesh(new RoundedBoxGeometry(0.012, 0.16, 0.02, 1, 0.005), M.accent, 0, 0.35, 0.03));
    pen.rotation.set(0, 0.55, Math.PI / 2);
    pen.position.set(1.3, 0.028, 0.58);
    g.add(pen);
    // Le tampon : manche et pommeau de bois, bague de laiton, semelle d'encre.
    const stamp = new THREE.Group();
    const r = (freshSize * 200) / 256 / 2 + 0.006;
    stamp.add(mesh(new THREE.CylinderGeometry(r, r, 0.012, 48), tinted(0x3a3242, 0.8), 0, 0.006, 0));
    stamp.add(mesh(new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.075, 48), M.wood, 0, 0.05, 0));
    stamp.add(mesh(new THREE.TorusGeometry(0.052, 0.014, 12, 32).rotateX(Math.PI / 2), M.accent, 0, 0.1, 0));
    stamp.add(mesh(new THREE.CylinderGeometry(0.036, 0.05, 0.2, 24), M.wood, 0, 0.19, 0));
    stamp.add(mesh(new THREE.SphereGeometry(0.08, 24, 16), M.wood, 0, 0.33, 0));
    g.add(stamp);
    // Où il se pose : sur l'encreur, puis sur la page (dans le repère de la scène).
    g.updateMatrixWorld(true);
    const onPage = new THREE.Vector3(fx, lift(fx), fz).applyMatrix4(book.matrixWorld);
    const onPad = new THREE.Vector3(0, 0.077, 0).applyMatrix4(pad.matrixWorld);
    const spot = new THREE.Object3D();
    spot.position.copy(onPage);
    g.add(spot);
    g.userData.hotspot = spot;
    const HOVER = 0.5;
    g.userData.animate = (phi) => {
      const u = phi / (Math.PI * 2);
      // 0–0.16 il s'encre, 0.2–0.36 il passe au-dessus de la page, 0.38–0.5 il tamponne,
      // 0.62–0.84 il revient au-dessus de l'encreur.
      const go = smooth(0.18, 0.36, u) * (1 - smooth(0.62, 0.84, u));
      const at = onPad.clone().lerp(onPage, go);
      const dipPad = smooth(0.04, 0.1, u) * (1 - smooth(0.11, 0.17, u));
      const dipPage = smooth(0.38, 0.44, u) * (1 - smooth(0.48, 0.58, u));
      const dip = Math.max(dipPad, dipPage);
      const travel = Math.sin(Math.PI * go);
      stamp.position.set(at.x, at.y + HOVER * (1 - dip) + 0.12 * travel + 0.015 * Math.sin(2 * phi) * (1 - dip), at.z);
      stamp.rotation.z = 0.1 * travel;
      stamp.rotation.x = -0.06 * travel;
      const press = smooth(0.42, 0.45, u) * (1 - smooth(0.46, 0.5, u)) + smooth(0.08, 0.1, u) * (1 - smooth(0.11, 0.13, u));
      stamp.scale.set(1 + 0.03 * press, 1 - 0.07 * press, 1 + 0.03 * press);
      freshMat.opacity = smooth(0.43, 0.47, u) * (1 - smooth(0.9, 0.99, u));
    };
    g.userData.camera = { pos: [0.45, 2.9, 3.2], target: [0.3, 0, 0.12], fov: 33 };
    return g;
  },
  // 404 : l'escale introuvable. De nuit, dans un terminal vide, le tapis à bagages tourne pour personne ;
  // au-dessus, le panneau du tapis n° 404 ; à côté, une valise seule attend qu'on vienne la chercher,
  // l'étiquette « 404 » pendue à sa poignée. C'est la valise qu'on clique.
  bagage(M) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.14, 96), M.clay2, 0, -0.07, 0));
    // Le sol du terminal : de grandes dalles, à peine marquées.
    const TILES = canvasTex(1024, 1024, (c, w, h) => {
      c.fillStyle = "#D6CFC3";
      c.fillRect(0, 0, w, h);
      c.strokeStyle = "#CBC3B6";
      c.lineWidth = 3;
      for (let k = 0; k <= 8; k++) {
        c.beginPath();
        c.moveTo((k * w) / 8, 0);
        c.lineTo((k * w) / 8, h);
        c.moveTo(0, (k * h) / 8);
        c.lineTo(w, (k * h) / 8);
        c.stroke();
      }
    });
    const floor = mesh(new THREE.CircleGeometry(2.5, 96).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: TILES, roughness: 0.7 }), 0, 0.001, 0);
    floor.castShadow = false;
    g.add(floor);
    // Le tapis : un stade (deux lignes droites, deux demi-cercles). Le socle, le rebord, l'îlot du milieu,
    // et les lattes qui glissent tout autour.
    const S = 0.75, RO = 0.92, BW = 0.4, RI = RO - BW, RM = RO - BW / 2;
    const stadium = (r, p = new THREE.Shape()) => {
      p.moveTo(-S, -r);
      p.lineTo(S, -r);
      p.absarc(S, 0, r, -Math.PI / 2, Math.PI / 2, false);
      p.lineTo(-S, r);
      p.absarc(-S, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);
      return p;
    };
    const slab = (shape, h, bevel = 0.02) =>
      new THREE.ExtrudeGeometry(shape, { depth: h, curveSegments: 40, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3 }).rotateX(-Math.PI / 2);
    const belt = new THREE.Group();
    belt.position.set(-0.3, 0, -0.45);
    g.add(belt);
    // Au sol, la ligne à ne pas franchir autour du tapis, en laiton.
    const line = stadium(RO + 0.36);
    line.holes.push(stadium(RO + 0.31, new THREE.Path()));
    const floorLine = mesh(new THREE.ExtrudeGeometry(line, { depth: 0.004, bevelEnabled: false, curveSegments: 40 }).rotateX(-Math.PI / 2), M.accent, 0, 0.002, 0);
    floorLine.castShadow = false;
    belt.add(floorLine);
    belt.add(mesh(slab(stadium(RO + 0.08), 0.16), M.clay2, 0, 0.02, 0));
    const rim = stadium(RO + 0.08);
    rim.holes.push(stadium(RO, new THREE.Path()));
    belt.add(mesh(slab(rim, 0.25, 0.015), M.clay, 0, 0.02, 0));
    belt.add(mesh(slab(stadium(RI - 0.02), 0.36), M.clay, 0, 0.02, 0));
    // Les lattes, posées sur la ligne du milieu de la piste. Dans les virages elles se chevauchent,
    // comme les plaques d'un vrai tapis : une sur deux un rien plus haute, pour ne pas se confondre.
    const L1 = 2 * S, L2 = Math.PI * RM, L = 2 * L1 + 2 * L2;
    const at = (u) => {
      let d = (((u % 1) + 1) % 1) * L;
      if (d < L1) return [-S + d, RM, 0];
      d -= L1;
      if (d < L2) return [S + RM * Math.sin(d / RM), RM * Math.cos(d / RM), d / RM];
      d -= L2;
      if (d < L1) return [S - d, -RM, Math.PI];
      d -= L1;
      return [-S - RM * Math.sin(d / RM), -RM * Math.cos(d / RM), Math.PI + d / RM];
    };
    const N = 44, pitch = L / N;
    const slatGeo = new RoundedBoxGeometry(pitch * 0.92, 0.03, BW - 0.05, 2, 0.01);
    // Des lattes gris anthracite, comme le caoutchouc d'un vrai tapis : la piste se détache du rebord clair.
    const slatMat = tinted(0x7d7770, 0.55);
    const slats = Array.from({ length: N }, () => {
      const s = mesh(slatGeo, slatMat);
      belt.add(s);
      return s;
    });
    // Le gyrophare du tapis, sur l'îlot : il clignote, le tapis tourne, mais personne ne vient.
    const beaconMat = new THREE.MeshStandardMaterial({ color: 0xf2c27a, emissive: 0xf0a640, emissiveIntensity: 0.4, roughness: 0.35 });
    const beacon = new THREE.Group();
    beacon.add(mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.26, 16), M.ink, 0, 0.13, 0));
    beacon.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 24), M.ink, 0, 0.27, 0));
    beacon.add(mesh(new THREE.SphereGeometry(0.058, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), beaconMat, 0, 0.285, 0));
    beacon.position.set(S + 0.18, 0.4, 0);
    belt.add(beacon);
    // Son halo, qui s'allume avec lui.
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color: 0xf3b25c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(0.42);
    glow.position.set(S + 0.18, 0.4 + 0.3, 0);
    belt.add(glow);
    // Le panneau du tapis, sur son mât, à l'entrée : le pictogramme des bagages et « 404 » en grand,
    // comme un numéro de tapis.
    const SIGN = canvasTex(620, 300, (c, w, h) => {
      c.fillStyle = "#1E1D22";
      c.fillRect(0, 0, w, h);
      // Le pictogramme : une valise, sa poignée, ses deux sangles.
      c.fillStyle = "#E9C27E";
      c.strokeStyle = "#E9C27E";
      c.lineWidth = 14;
      c.beginPath();
      c.roundRect(70, 80, 120, 150, 18);
      c.fill();
      c.beginPath();
      c.roundRect(104, 46, 52, 44, 12);
      c.stroke();
      c.fillStyle = "#1E1D22";
      c.fillRect(98, 92, 12, 126);
      c.fillRect(150, 92, 12, 126);
      c.fillStyle = "#E9C27E";
      c.font = "bold 190px 'Courier New', monospace";
      c.textAlign = "center";
      c.fillText("404", 400, 222);
    });
    const sign = new THREE.Group();
    sign.add(mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.3, 16), M.ink, 0, 0.65, 0));
    sign.add(mesh(new RoundedBoxGeometry(0.66, 0.34, 0.05, 2, 0.02), M.ink, 0, 1.42, 0));
    const face = mesh(new THREE.PlaneGeometry(0.62, 0.3), new THREE.MeshStandardMaterial({ map: SIGN, emissiveMap: SIGN, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.5 }), 0, 1.42, 0.026);
    face.castShadow = false;
    sign.add(face);
    sign.position.set(-S - 0.2, 0, -RO - 0.35);
    sign.rotation.y = 0.3;
    belt.add(sign);
    // La valise : coque de terre cuite à nervures, ligne de fermeture en laiton, roulettes, poignée sortie.
    const bag = new THREE.Group();
    bag.position.set(1.4, 0, 1.0);
    bag.rotation.y = -0.5;
    g.add(bag);
    const W = 0.62, H = 0.84, D = 0.3, Y0 = 0.075, TOP = Y0 + H;
    const shell = tinted(TINT.bagage, 0.5);
    const rib = tinted(new THREE.Color(TINT.bagage).multiplyScalar(0.88).getHex(), 0.5);
    bag.add(mesh(new RoundedBoxGeometry(W, H, D, 4, 0.08), shell, 0, Y0 + H / 2, 0));
    // La ligne de fermeture suit le contour arrondi de la coque.
    const seam = new THREE.ExtrudeGeometry(roundRect(W + 0.014, H + 0.014, 0.087), { depth: 0.016, bevelEnabled: false, curveSegments: 12 });
    bag.add(mesh(seam, M.accent, 0, Y0 + H / 2, -D / 2 + 0.092));
    for (const x of [-0.17, 0, 0.17]) bag.add(mesh(new RoundedBoxGeometry(0.05, H - 0.2, 0.014, 2, 0.007), rib, x, Y0 + H / 2, D / 2));
    for (const [x, z] of [[-0.24, -0.1], [0.24, -0.1], [-0.24, 0.1], [0.24, 0.1]]) {
      bag.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 20).rotateZ(Math.PI / 2), M.ink, x, 0.035, z));
      bag.add(mesh(new RoundedBoxGeometry(0.05, 0.04, 0.05, 1, 0.01), M.ink, x, 0.07, z));
    }
    const HZ = -D / 2 + 0.06, GRIP = TOP + 0.5;
    for (const x of [-0.17, 0.17]) bag.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 12), M.ink, x, TOP + 0.25, HZ));
    bag.add(mesh(new RoundedBoxGeometry(0.4, 0.05, 0.06, 2, 0.02), M.ink, 0, GRIP, HZ));
    // L'autocollant « Index » sur la coque.
    const STICKER = canvasTex(300, 190, (c, w, h) => {
      c.fillStyle = "#F6F0E6";
      c.strokeStyle = "#B08A4F";
      c.lineWidth = 10;
      c.beginPath();
      c.ellipse(w / 2, h / 2, w / 2 - 8, h / 2 - 8, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = "#2B241D";
      c.font = "italic 96px Georgia, serif";
      c.textAlign = "center";
      c.fillText("Index", w / 2, h / 2 + 30);
    });
    const sticker = mesh(new THREE.PlaneGeometry(0.24, 0.152), new THREE.MeshStandardMaterial({ map: STICKER, alphaTest: 0.5, roughness: 0.7 }), 0.08, Y0 + 0.26, D / 2 + 0.009);
    sticker.rotation.z = 0.14;
    sticker.castShadow = false;
    bag.add(sticker);
    // L'étiquette, pendue à la poignée sortie : elle se balance doucement.
    const TAG = canvasTex(260, 340, (c, w, h) => {
      c.fillStyle = "#F6F0E6";
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#B08A4F";
      c.fillRect(0, 0, w, 58);
      c.fillStyle = "#F6F0E6";
      c.beginPath();
      c.arc(w / 2, 29, 12, 0, Math.PI * 2);
      c.fill();
      c.textAlign = "center";
      c.fillStyle = "#2B241D";
      c.font = "bold 112px 'Courier New', monospace";
      c.fillText("404", w / 2, 178);
      c.fillStyle = "#8A6A35";
      c.font = "bold 22px 'Courier New', monospace";
      c.fillText("IDX · INDEX", w / 2, 228);
      c.fillStyle = "#9A8F84";
      c.font = "bold 20px 'Courier New', monospace";
      c.fillText("INTROUVABLE", w / 2, 276);
      c.fillText("NOT FOUND", w / 2, 304);
    });
    const tag = new THREE.Group();
    tag.position.set(0, GRIP - 0.02, HZ + 0.035);
    tag.add(mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 24), M.ink, 0, -0.02, 0));
    tag.add(mesh(new RoundedBoxGeometry(0.27, 0.35, 0.008, 1, 0.003), M.accent, 0, -0.23, 0));
    const print = mesh(new THREE.PlaneGeometry(0.26, 0.34), new THREE.MeshStandardMaterial({ map: TAG, roughness: 0.8 }), 0, -0.23, 0.0045);
    print.castShadow = false;
    tag.add(print);
    bag.add(tag);
    const spot = new THREE.Object3D();
    // L'anneau se pose sur le haut de la coque : l'autocollant, dessous, reste visible.
    spot.position.set(0, Y0 + H * 0.7, D / 2);
    bag.add(spot);
    g.userData.hotspot = spot;
    g.userData.animate = (phi) => {
      // Trois lattes par boucle : la piste avance sans saut d'une boucle à l'autre.
      slats.forEach((s, k) => {
        const [x, z, a] = at((k + (3 * phi) / (Math.PI * 2)) / N);
        s.position.set(x, 0.215 + (k % 2) * 0.004, z);
        s.rotation.set(0, a, 0);
      });
      const flash = Math.pow(Math.max(0, Math.sin(2 * phi)), 4);
      beaconMat.emissiveIntensity = 0.25 + 1.6 * flash;
      glow.material.opacity = 0.85 * flash;
      tag.rotation.x = 0.16 * Math.sin(phi) + 0.04 * Math.sin(2 * phi);
      tag.rotation.z = 0.05 * Math.sin(phi + 0.8);
    };
    g.userData.camera = { pos: [0.8, 2.9, 7.0], target: [0.1, 0.45, 0.1], fov: 34 };
    return g;
  },
  // Le guide : le copilote en combinaison spatiale (sa tenue à l'escale 1), sur fond transparent.
  astronaute(M) {
    return copilot(M, "espace");
  },
};
// Une scène par tenue du copilote : « tenue-<escale> ».
for (const k of TENUES) SCENES["tenue-" + k] = (M) => copilot(M, k);


// `box` : cadrage mobile. [x0, y0, x1, y1], en fractions de l'image d'ordinateur (16:9), est la zone qui doit
// rester visible (l'objet du projet et celui qu'on touche). La caméra vise son centre et recule, même direction
// et même focale, jusqu'à ce que la zone tienne dans l'image mobile, plus haute que large.
window.setupScene = (name, themeName, accent, w = 1280, h = 720, box = null) => {
  if (current) current.scene.traverse((o) => o.isMesh && o.geometry.dispose());
  renderer.setSize(w, h, false);
  const t = accent ? { ...THEMES[themeName], accent } : THEMES[themeName];
  const M = mats(t);
  const scene = new THREE.Scene();
  scene.environment = envTex;
  scene.environmentIntensity = t.env;
  const key = new THREE.DirectionalLight(0xffffff, t.key);
  key.position.set(-4, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0005;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 30 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.45);
  rim.position.set(5, 3, -5);
  scene.add(rim);
  const obj = SCENES[name](M);
  obj.userData.animate?.(0);
  scene.add(obj);
  const c = obj.userData.camera;
  const camera = new THREE.PerspectiveCamera(c.fov, w / h, 0.1, 400);
  camera.position.set(...c.pos);
  camera.lookAt(new THREE.Vector3(...c.target));
  if (box) {
    const [x0, y0, x1, y1] = box;
    const T = new THREE.Vector3(...c.target), P = new THREE.Vector3(...c.pos);
    const D = P.distanceTo(T);
    const f = T.clone().sub(P).normalize();
    const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
    const u = new THREE.Vector3().crossVectors(r, f);
    const tan = Math.tan(THREE.MathUtils.degToRad(c.fov / 2));
    const hd = D * tan, wd = hd * (16 / 9);
    const aim = T.clone().addScaledVector(r, ((x0 + x1) / 2 - 0.5) * 2 * wd).addScaledVector(u, (0.5 - (y0 + y1) / 2) * 2 * hd);
    const dist = Math.max(((x1 - x0) * wd) / (tan * (w / h)), ((y1 - y0) * hd) / tan) * 1.03;
    camera.position.copy(aim).addScaledVector(f, -dist);
    camera.lookAt(aim);
  }
  current = { scene, camera, obj, base: obj.rotation.y, sway: 0 };
  window.__current = current;
  return true;
};

// Vidéo : une image de la boucle dessinée sur le canvas, que l'encodeur lit directement (sans PNG),
// sur un fond opaque de la couleur de l'escale (la vidéo n'a pas de transparence).
window.drawFrame = (i, n) => {
  const phi = (Math.PI * 2 * i) / n;
  const { scene, camera, obj, base, sway } = current;
  obj.rotation.y = base + sway * Math.sin(phi);
  obj.userData.animate?.(phi);
  renderer.render(scene, camera);
};
window.setBackground = (hex) => renderer.setClearColor(new THREE.Color(hex), 1);

// Encode la boucle en MP4 (WebCodecs, logiciel) : `quantizer` fixe la qualité, image par image.
window.encodeVideo = async ({ frames, fps, codec, quantizer, bitrate, rate }) => {
  const { Muxer, ArrayBufferTarget } = await import(new URL("vendor/mp4-muxer.mjs", location.href).href);
  const { width, height } = canvas;
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: codec.startsWith("av01") ? "av1" : "avc", width, height, frameRate: fps },
    fastStart: "in-memory",
  });
  let failure = null;
  const encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => (failure = e) });
  encoder.configure({
    codec,
    width,
    height,
    framerate: fps,
    // H.264 (OpenH264) n'a pas de qualité constante : débit variable autour de `bitrate`. L'AV1 peut faire
    // de même (rate = "variable") pour une scène très détaillée, comme la Terre qui tourne.
    ...(codec.startsWith("avc") || rate === "variable" ? { bitrateMode: "variable", bitrate } : { bitrateMode: "quantizer" }),
    latencyMode: "quality",
    hardwareAcceleration: "prefer-software",
    ...(codec.startsWith("avc") ? { avc: { format: "avc" } } : {}),
  });
  const perFrame = rate === "variable" ? {} : codec.startsWith("av01") ? { av1: { quantizer } } : codec.startsWith("vp09") ? { vp9: { quantizer } } : {};
  for (let i = 0; i < frames; i++) {
    window.drawFrame(i, frames);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
    encoder.encode(frame, { keyFrame: i === 0, ...perFrame });
    frame.close();
    while (encoder.encodeQueueSize > 2) await new Promise((r) => encoder.addEventListener("dequeue", r, { once: true }));
    if (failure) throw failure;
  }
  await encoder.flush();
  muxer.finalize();
  const bytes = new Uint8Array(muxer.target.buffer);
  let binary = "";
  for (let k = 0; k < bytes.length; k += 0x8000) binary += String.fromCharCode(...bytes.subarray(k, k + 0x8000));
  return btoa(binary);
};

// Mise au point : bornes, dans le monde, des maillages dont le nom commence par `prefix`.
window.bounds = (prefix) => {
  current.scene.updateMatrixWorld(true);
  const out = {};
  current.scene.traverse((o) => {
    if (o.isMesh && o.visible && (o.name.startsWith(prefix) || o.parent?.name?.startsWith(prefix))) {
      const k = o.parent?.name?.startsWith(prefix) ? o.parent.name : o.name;
      const b = (out[k] ??= new THREE.Box3()).expandByObject(o);
    }
  });
  return Object.fromEntries(Object.entries(out).map(([k, b]) => [k, [b.min.toArray().map((v) => +v.toFixed(2)), b.max.toArray().map((v) => +v.toFixed(2))]]));
};

// Où tombe l'objet à cliquer sur l'image (en % de la largeur et de la hauteur du rendu).
window.hotspot = () => {
  const o = current?.obj.userData.hotspot;
  if (!o) return null;
  current.scene.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  o.getWorldPosition(v);
  v.project(current.camera);
  return { x: ((v.x + 1) / 2) * 100, y: ((1 - v.y) / 2) * 100 };
};
