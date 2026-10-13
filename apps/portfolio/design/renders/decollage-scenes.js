// ——— Le décollage : la fusée du copilote, sur la planète de l'escale 1 ———
// Au clic sur « Décoller », le site montre le copilote au pied de sa fusée : il explique le voyage, grimpe à bord,
// et la fusée décolle. Quatre plans, que le site enchaîne (components/voyage/Decollage.astro) :
//   decollage-pied     boucle d'1 s : au pied de l'échelle, il salue (première bulle) ;
//   decollage-echelle  2,5 s        : il grimpe jusqu'à la trappe ;
//   decollage-trappe   boucle d'1 s : à la trappe, tourné vers nous, il salue (deuxième bulle) ;
//   decollage-envol    13,5 s       : il entre, la trappe se ferme, l'échelle se couche, compte à rebours, la fusée
//                                     décolle ; la caméra la suit, puis recule jusqu'au cadre de l'escale 1, où la
//                                     fusée fait le tour de la planète avant de prendre sa place de croisière.
// Chaque plan commence là où finit le précédent : sa première image est la suite de la dernière de l'autre.
// Le monde est celui de la scène « espace » (même planète, même anneau, mêmes lunes, même Terre, mêmes étoiles), plus
// finement maillé : la dernière image de l'envol précède la première de la boucle de l'espace, et le site passe de
// l'une à l'autre sans saut. Le pas de tir est posé sur la planète, à l'échelle du bonhomme (« unités locales » : il
// mesure 1,7) ; la planète y fait 80 unités de rayon : son horizon est tout proche, et la Terre se lève derrière.
// Ce fichier suit voyage-scenes.js dans voyage.html (build-voyage.cjs) et en reprend les outils.

const LAUNCH = (() => {
  const C = new THREE.Vector3(-1.6, 0, 0); // le centre de la planète, comme dans la scène « espace »
  const RP = 0.9; // son rayon (0,72 × 1,25)
  const KL = RP / 80; // une unité locale, dans le monde de l'espace
  // Le pas de tir : sur la face éclairée, en haut à droite du disque vu de l'escale 1, la Terre à l'horizon.
  const U = new THREE.Vector3(0.45, 0.7, 0.55).normalize();
  const P = C.clone().addScaledVector(U, RP);
  const EARTH = new THREE.Vector3(2.3, 0.9, -2.5);
  const toE = EARTH.clone().sub(P);
  const ahead = toE.clone().addScaledVector(U, -toE.dot(U)).normalize();
  // Repère du pas de tir : y vers le ciel, z vers la caméra (dos à la Terre), x à droite.
  const Z = ahead.clone().negate();
  const X = new THREE.Vector3().crossVectors(U, Z).normalize();
  const Q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, U, Z));
  return { C, RP, KL, U, P, X, Z, Q, EARTH, R_LOCAL: 80 };
})();
// Repère local → monde.
const L2W = (v) => v.clone().multiplyScalar(LAUNCH.KL).applyQuaternion(LAUNCH.Q).add(LAUNCH.P);
const L2Wdir = (v) => v.clone().applyQuaternion(LAUNCH.Q);
// Le sol courbe : à d unités du pas de tir, il descend de d²/2R.
const groundY = (x, z) => -(x * x + z * z) / (2 * LAUNCH.R_LOCAL);

const ease = {
  inOut: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t * (t * (t * 6 - 15) + 10)),
  out: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3)),
  in: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t),
  // Une chute (comme sous la pesanteur) et un rebond, pour l'échelle qui se couche.
  drop: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.72 ? (t / 0.72) ** 2 : 1 - 0.07 * Math.sin((Math.PI * (t - 0.72)) / 0.28)),
  // Un petit dépassement à l'arrivée, comme une porte qui claque.
  back: (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const c = 1.9;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
};
const span = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const mix = (a, b, t) => a + (b - a) * t;
const mixV = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
// Tirage pseudo-aléatoire répétable.
const rng = (seed) => {
  let x = seed;
  return () => ((x = (x * 9301 + 49297) % 233280) / 233280);
};

// Retire d'une géométrie de révolution (LatheGeometry) les faces dont le centre tombe dans `inside(φ, y)`.
function cutLathe(geo, inside) {
  const p = geo.attributes.position, idx = geo.index.array, keep = [];
  for (let k = 0; k < idx.length; k += 3) {
    let cx = 0, cy = 0, cz = 0;
    for (let j = 0; j < 3; j++) {
      cx += p.getX(idx[k + j]);
      cy += p.getY(idx[k + j]);
      cz += p.getZ(idx[k + j]);
    }
    if (!inside(Math.atan2(cx, cz), cy / 3)) keep.push(idx[k], idx[k + 1], idx[k + 2]);
  }
  geo.setIndex(keep);
  return geo;
}
const angleTo = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ——— La fusée ———
// Argile crème, nez et liserés de laiton, ailerons et bande lavande (la teinte de l'escale), un hublot, une trappe.
// Son origine est au sol, sous son axe ; le corps commence à LIFT, posé sur ses trois ailerons.
const ROCKET = (() => {
  const LIFT = 0.55;
  const radius = (y) => (y < 1.3 ? 0.62 + 0.23 * Math.sin((Math.PI / 2) * (y / 1.3)) : 0.85 * Math.sqrt(Math.max(0, 1 - ((y - 1.3) / 3.3) ** 2)));
  const NOSE = 3.55; // le nez de laiton commence là
  // La trappe face à la caméra (un peu à gauche), entre deux ailerons ; le hublot au-dessus. Elle est à la taille du
  // copilote (1,7 de haut, 0,9 de casque) : il y passe en baissant à peine la tête.
  const HATCH = { phi: -0.12, y: 1.64, hw: 0.5, hh: 0.86 }; // direction, centre, demi-largeur (arc), demi-hauteur
  const PORT = { phi: 0.02, y: 2.95, r: 0.23 };
  const inHatch = (phi, y, grow = 0) => {
    const u = (angleTo(phi, HATCH.phi) * radius(y)) / (HATCH.hw + grow), v = (y - HATCH.y) / (HATCH.hh + grow);
    return u ** 4 + v ** 4 < 1;
  };
  const inPort = (phi, y) => (angleTo(phi, PORT.phi) * radius(y)) ** 2 + (y - PORT.y) ** 2 < PORT.r ** 2;
  const dirOf = (phi) => new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi));
  const onBody = (phi, y, out = 0) => dirOf(phi).multiplyScalar(radius(y) + out).setY(y);
  // Le marchepied sous la trappe : son dessus au ras du seuil ; `r` son centre, `outer` son bord, depuis l'axe.
  const sill = HATCH.y - HATCH.hh;
  const STEP = { w: 0.9, d: 0.52, h: 0.05, y: sill - 0.03 };
  STEP.top = STEP.y + STEP.h / 2;
  STEP.r = radius(sill) + STEP.d / 2 - 0.02;
  STEP.outer = STEP.r + STEP.d / 2;
  // La porte ouverte : rabattue contre la coque, loin du passage.
  const DOOR_OPEN = 2.25;
  return { LIFT, radius, NOSE, HATCH, PORT, STEP, DOOR_OPEN, inHatch, inPort, dirOf, onBody };
})();

function rocket(M) {
  const R = ROCKET;
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = R.LIFT;
  g.add(body);
  const cream = tinted(0xf1ece4, 0.55);
  const lav = tinted(TINT.espace, 0.6);
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a063, metalness: 0.9, roughness: 0.32 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2521, roughness: 0.9, side: THREE.BackSide });
  const profile = (y0, y1, n, out = 0) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const y = y0 + ((y1 - y0) * i) / n;
      pts.push(new THREE.Vector2(Math.max(0.0005, R.radius(y) + out), y));
    }
    return pts;
  };
  // Le corps, percé de la trappe et du hublot ; le nez ; la pointe.
  const bodyGeo = cutLathe(new THREE.LatheGeometry(profile(0, R.NOSE, 140), 192), (phi, y) => R.inHatch(phi, y) || R.inPort(phi, y));
  const hull = mesh(bodyGeo, cream);
  hull.material = cream.clone();
  hull.material.side = THREE.DoubleSide;
  body.add(hull);
  body.add(mesh(new THREE.LatheGeometry(profile(R.NOSE, 4.6, 60), 192), brass));
  body.add(mesh(new THREE.SphereGeometry(0.07, 24, 16), brass, 0, 4.6, 0));
  const seam = mesh(new THREE.TorusGeometry(R.radius(R.NOSE) + 0.006, 0.024, 12, 160), brass, 0, R.NOSE, 0);
  seam.rotation.x = Math.PI / 2;
  body.add(seam);
  // La bande lavande, sous la trappe, et le fond.
  body.add(mesh(new THREE.LatheGeometry(profile(0.28, 0.52, 12, 0.014), 192), lav));
  const floor = mesh(new THREE.CircleGeometry(0.62, 48), M.clay2, 0, 0.001, 0);
  floor.rotation.x = Math.PI / 2;
  body.add(floor);
  // L'intérieur, sombre : on le voit par la trappe ouverte et par le hublot.
  const inside = mesh(new THREE.CylinderGeometry(0.74, 0.74, 3.0, 48, 1, false), dark, 0, 1.75, 0);
  inside.castShadow = false;
  inside.receiveShadow = false;
  body.add(inside);

  // Le cadre de la trappe, en laiton, et la porte, galbée comme la coque, pendue à son bord gauche.
  const H = R.HATCH;
  const edge = (out, grow = 0) => {
    const pts = [];
    for (let k = 0; k < 96; k++) {
      const t = (k / 96) * Math.PI * 2;
      const c = Math.cos(t), s = Math.sin(t);
      const u = (H.hw + grow) * Math.sign(c) * Math.pow(Math.abs(c), 0.5);
      const v = (H.hh + grow) * Math.sign(s) * Math.pow(Math.abs(s), 0.5);
      const y = H.y + v;
      pts.push(R.onBody(H.phi + u / R.radius(y), y, out));
    }
    return new THREE.CatmullRomCurve3(pts, true);
  };
  body.add(mesh(new THREE.TubeGeometry(edge(0.012, 0.01), 192, 0.03, 10, true), brass));
  // La porte : la forme de la trappe, tracée à plat puis enroulée sur un cylindre à peine plus large que la coque.
  const doorR = R.radius(H.y) + 0.035;
  const shape = new THREE.Shape();
  for (let k = 0; k <= 96; k++) {
    const t = (k / 96) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const x = (H.hw + 0.02) * Math.sign(c) * Math.pow(Math.abs(c), 0.5), y = (H.hh + 0.02) * Math.sign(s) * Math.pow(Math.abs(s), 0.5);
    if (k === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const doorGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 4, steps: 1 });
  // Enroulée : x devient un angle autour de l'axe ; la charnière (x = -hw) se place à l'origine du pivot.
  const dp = doorGeo.attributes.position;
  const hingeA = -(H.hw + 0.02) / doorR;
  const hinge = R.dirOf(H.phi + hingeA).multiplyScalar(doorR);
  for (let i = 0; i < dp.count; i++) {
    const a = H.phi + dp.getX(i) / doorR, r = doorR + dp.getZ(i) - 0.02;
    dp.setXYZ(i, Math.sin(a) * r - hinge.x, dp.getY(i), Math.cos(a) * r - hinge.z);
  }
  doorGeo.computeVertexNormals();
  const door = new THREE.Group();
  door.position.set(hinge.x, H.y, hinge.z);
  door.add(mesh(doorGeo, cream));
  // Sa poignée de laiton, près du bord libre.
  const knobAt = R.dirOf(H.phi + (H.hw - 0.08) / doorR).multiplyScalar(doorR + 0.07);
  door.add(mesh(new THREE.SphereGeometry(0.045, 16, 12), brass, knobAt.x - hinge.x, 0, knobAt.z - hinge.z));
  body.add(door);

  // Le hublot : un anneau de laiton, une vitre à peine teintée ; derrière, le copilote une fois à bord.
  const P = R.PORT;
  const portN = R.dirOf(P.phi);
  const portAt = R.onBody(P.phi, P.y, 0.02);
  const facing = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), portN);
  const ring = mesh(new THREE.TorusGeometry(P.r + 0.02, 0.05, 16, 64), brass, portAt.x, portAt.y, portAt.z);
  ring.quaternion.copy(facing);
  body.add(ring);
  const glass = mesh(new THREE.CircleGeometry(P.r + 0.01, 48), new THREE.MeshStandardMaterial({ color: 0xcfe0e8, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false }), portAt.x, portAt.y, portAt.z);
  glass.quaternion.copy(facing);
  glass.castShadow = false;
  body.add(glass);
  // Sa tête derrière la vitre : le casque ouvert, le visage ; éclairés comme dehors (pas d'ombre de la coque).
  const face = new THREE.Group();
  face.add(spaceHelmet(M, { open: true }));
  const inner = copilotHead(M);
  inner.position.set(0, -0.035, 0.025);
  face.add(inner);
  face.scale.setScalar(0.5);
  const faceAt = R.dirOf(P.phi).multiplyScalar(0.42).setY(P.y - 0.05);
  face.position.copy(faceAt);
  face.quaternion.copy(facing);
  face.traverse((o) => o.isMesh && ((o.castShadow = false), (o.receiveShadow = false)));
  face.visible = false;
  body.add(face);

  // Le marchepied sous la trappe, où il se tient avant d'entrer.
  const S = R.STEP;
  const stepAt = R.dirOf(H.phi).multiplyScalar(S.r).setY(S.y);
  const step = mesh(new RoundedBoxGeometry(S.w, S.h, S.d, 2, 0.015), brass, stepAt.x, stepAt.y, stepAt.z);
  step.rotation.y = H.phi;
  body.add(step);

  // Trois ailerons lavande, de part et d'autre de la trappe et à l'opposé : ils portent la fusée.
  const fin = new THREE.Shape();
  fin.moveTo(0.5, 1.75);
  fin.quadraticCurveTo(1.05, 1.05, 1.5, -0.32);
  fin.lineTo(1.6, -R.LIFT);
  fin.lineTo(1.22, -R.LIFT);
  fin.quadraticCurveTo(0.95, -0.12, 0.5, 0.02);
  fin.closePath();
  const finGeo = new THREE.ExtrudeGeometry(fin, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 3, curveSegments: 24 });
  finGeo.translate(0, 0, -0.06);
  for (const phi of [H.phi + Math.PI / 3, H.phi - Math.PI / 3, H.phi + Math.PI]) {
    const f = mesh(finGeo, lav);
    f.rotation.y = phi - Math.PI / 2;
    body.add(f);
  }
  // La tuyère, sombre, et son liseré de laiton.
  body.add(mesh(new THREE.CylinderGeometry(0.34, 0.47, 0.42, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.45, metalness: 0.35, side: THREE.DoubleSide }), 0, -0.21, 0));
  const lip = mesh(new THREE.TorusGeometry(0.47, 0.028, 12, 64), brass, 0, -0.42, 0);
  lip.rotation.x = Math.PI / 2;
  body.add(lip);

  // La flamme : trois gouttes emboîtées, terre cuite, laiton, crème, lumineuses ; elles vacillent.
  const flame = new THREE.Group();
  flame.position.y = -0.42;
  const drop = (len, rad, color, glow) => {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      pts.push(new THREE.Vector2(rad * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.6 + 0.08) * 0.5 + (t > 0.55 ? 0 : 0)), 1) * Math.pow(1 - t, 0.55) + 0.0005, -t * len));
    }
    const m = new THREE.MeshStandardMaterial({ color, emissive: glow, emissiveIntensity: 1.4, roughness: 0.6, transparent: true, opacity: 1 });
    const o = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), m);
    return o;
  };
  const flames = [drop(2.0, 0.46, 0xe58a4a, 0xe0702a), drop(1.45, 0.34, 0xf2c25a, 0xf0b040), drop(0.85, 0.21, 0xfff3dc, 0xfff0d0)];
  flames[1].position.y = -0.01;
  flames[2].position.y = -0.02;
  for (const f of flames) flame.add(f);
  flame.visible = false;
  body.add(flame);
  const glow = new THREE.PointLight(0xffb060, 0, 0, 2);
  glow.position.y = -0.9;
  body.add(glow);

  g.userData = { body, door, face, flame, flames, glow, hinge };
  return g;
}

// ——— Le pas de tir : la dalle, ses trois feux du compte à rebours, l'échelle ———
function launchPad(M) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(2.6, 2.75, 0.16, 96), M.clay2, 0, 0.08, 0));
  const rim = mesh(new THREE.TorusGeometry(2.6, 0.03, 10, 160), M.accent, 0, 0.16, 0);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  const pit = mesh(new THREE.CircleGeometry(0.95, 64), new THREE.MeshStandardMaterial({ color: 0x4a443e, roughness: 0.9 }), 0, 0.162, 0);
  pit.rotation.x = -Math.PI / 2;
  g.add(pit);
  // Les feux : trois petits lampadaires sur le bord droit, face à la caméra, éteints (argile) ou allumés (crème
  // lumineuse), un par seconde du compte à rebours.
  const lights = [];
  for (const a of [0.5, 0.82, 1.14]) {
    const x = Math.sin(a) * 2.25, z = Math.cos(a) * 2.25;
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.42, 14), M.clay2, x, 0.16 + 0.21, z));
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 20), M.accent, x, 0.16 + 0.43, z));
    const m = new THREE.MeshStandardMaterial({ color: 0x9a8b78, emissive: 0xffe2a8, emissiveIntensity: 0, roughness: 0.4 });
    g.add(mesh(new THREE.SphereGeometry(0.12, 24, 16), m, x, 0.16 + 0.55, z));
    lights.push(m);
  }
  g.userData.lights = lights;
  return g;
}

// L'échelle : deux montants de laiton, cinq barreaux d'argile, assez large pour ses épaules. Son origine est à son
// pied (la charnière) ; elle monte selon y, et `tilt` (rotation x) la penche vers la fusée (valeur négative) ou la
// couche vers l'extérieur. Penchée de `lean`, son dernier barreau arrive au ras du marchepied, juste devant lui.
const LADDER = { rungs: 5, lean: 0.3, half: 0.36 };
LADDER.rise = ROCKET.LIFT + ROCKET.STEP.top - 0.03;
LADDER.length = LADDER.rise / Math.cos(LADDER.lean);
function ladder(M) {
  const yaw = new THREE.Group();
  const tilt = new THREE.Group();
  yaw.add(tilt);
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a063, metalness: 0.9, roughness: 0.32 });
  const tall = LADDER.length - 0.02; // les montants s'arrêtent au dernier barreau, sous le marchepied
  for (const x of [-LADDER.half, LADDER.half]) tilt.add(mesh(new THREE.CylinderGeometry(0.032, 0.032, tall, 14), brass, x, tall / 2, 0));
  for (let k = 1; k <= LADDER.rungs; k++) {
    const r = mesh(new THREE.CylinderGeometry(0.026, 0.026, 2 * LADDER.half, 12), M.clay, 0, (k * LADDER.length) / LADDER.rungs, 0);
    r.rotation.z = Math.PI / 2;
    tilt.add(r);
  }
  yaw.userData.tilt = tilt;
  return yaw;
}

// ——— La mise en scène ———
// Le pas de tir dans le repère local : la fusée en R0, la trappe tournée vers la gauche de la caméra.
const SITE = (() => {
  const R0 = new THREE.Vector3(1.0, 0, -0.6);
  const h = ROCKET.dirOf(ROCKET.HATCH.phi); // vers la trappe
  const s = new THREE.Vector3(h.z, 0, -h.x); // à sa droite, vue de l'échelle : l'axe x de l'échelle
  const PAD_Y = 0.16;
  const stepY = PAD_Y + ROCKET.LIFT + ROCKET.STEP.top; // le dessus du marchepied
  const topR = ROCKET.STEP.outer + 0.03; // le haut de l'échelle, juste devant le marchepied
  const lean = LADDER.lean;
  const footR = topR + LADDER.length * Math.sin(lean);
  const at = (r, y = 0) => R0.clone().addScaledVector(h, r).setY(y);
  // Le centre du barreau k (0 : le pied de l'échelle), décalé de x le long du barreau.
  const rung = (k, x = 0) => at(footR - (k / LADDER.rungs) * LADDER.length * Math.sin(lean), PAD_Y + (k / LADDER.rungs) * LADDER.rise).addScaledVector(s, x);
  return {
    R0, h, s, PAD_Y, stepY, topR, footR, lean, at, rung,
    // Où il se tient : un pas devant le pied de l'échelle, à sa gauche (vu de la caméra) ; puis sur le marchepied ;
    // puis dedans.
    standA: at(footR + 0.05, PAD_Y).addScaledVector(s, -0.85),
    landing: at(ROCKET.STEP.r + 0.08, stepY),
    inside: at(0.1, stepY),
    // Les directions où il regarde (rotation y de son corps ; son avant est +z).
    faceCam: 0.25,
    faceLadder: Math.atan2(-h.x, -h.z),
  };
})();

// Sur l'échelle : ses pieds sur le barreau k (0 : la dalle), les orteils juste au-delà du barreau, le corps derrière.
const CLIMB_OFF = 0.14;
const footOn = (k) => {
  const c = SITE.rung(k);
  return (k === 0 ? c.setY(SITE.PAD_Y) : c.setY(c.y + 0.026)).addScaledVector(SITE.h, CLIMB_OFF);
};
// Ses prises, de bas en haut : les barreaux 1 à 5, le bord du marchepied, puis les côtés de la trappe. `side` est le
// côté de la main dans son repère (+1 : le bras du salut) ; face à l'échelle, son +x est le -x de l'échelle.
function hold(j, side) {
  const x = -side * 0.2;
  if (j <= LADDER.rungs) return SITE.rung(j, x).addScaledVector(SITE.h, 0.09).add(new THREE.Vector3(0, 0.115, 0));
  if (j === LADDER.rungs + 1) return SITE.at(ROCKET.STEP.outer - 0.06, SITE.stepY + 0.12).addScaledVector(SITE.s, x);
  const H = ROCKET.HATCH, by = SITE.stepY - SITE.PAD_Y - ROCKET.LIFT + 0.4;
  const phi = H.phi - (side * (H.hw - 0.12)) / ROCKET.radius(by);
  return ROCKET.dirOf(phi).multiplyScalar(ROCKET.radius(by) + 0.06).add(SITE.R0).setY(SITE.PAD_Y + ROCKET.LIFT + by);
}

// Les poses du copilote. Chaque pose : position (pieds), lacet du corps, rebond, inclinaison, tête, bras droit (le
// salut) et gauche, coudes, jambes. Les angles des bras suivent ceux de copilot() : z ouvre le bras sur le côté
// (positif à droite, négatif à gauche), x le lève vers l'avant (négatif). Une pose peut aussi donner une prise à une
// main (rh, lh : un point du pas de tir) et le poids de cette prise (rw, lw) : le bras s'y tend (armIK).
const ARM = { L1: 0.24, L2: 0.29, x: 0.33, y: 0.14, hip: 0.63 };
const UP = new THREE.Vector3(0, 1, 0);
function armIK(p, side, target) {
  // La prise, ramenée dans le repère de l'épaule (pieds, lacet, hanches, inclinaison du corps).
  const T = target.clone().sub(p.pos).applyAxisAngle(UP, -p.yaw);
  T.y -= ARM.hip + (p.bob ?? 0);
  T.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(p.lean ?? 0, 0, p.roll ?? 0)).invert());
  T.x -= side * ARM.x;
  T.y -= ARM.y;
  const { L1, L2 } = ARM;
  const D = Math.min(L1 + L2 - 1e-4, Math.max(L2 - L1 + 1e-4, T.length()));
  T.setLength(D);
  // Le coude plie vers l'avant ; l'épaule (x, z) place la main sur la prise, le coude le plus bas possible.
  const ex = -Math.acos((D * D - L1 * L1 - L2 * L2) / (2 * L1 * L2));
  const N = -(L1 + L2 * Math.cos(ex));
  const A = Math.hypot(T.y, T.z), phiA = Math.atan2(T.y, T.z);
  const c = Math.max(-1, Math.min(1, (-L2 * Math.sin(ex)) / A));
  let best = null;
  for (const sgn of [1, -1]) {
    const x = -phiA + sgn * Math.acos(c);
    const B = T.y * Math.cos(x) + T.z * Math.sin(x);
    const z = Math.atan2(-T.x * N, B * N);
    const low = -Math.cos(z) * Math.cos(x);
    if (!best || low < best.low) best = { x: Math.atan2(Math.sin(x), Math.cos(x)), z, low };
  }
  return { a: [best.x, 0, best.z], e: [ex, 0, 0] };
}
function posePilot(parts, root, p) {
  const { fig, head, wave, rest, legL, legR } = parts;
  root.position.copy(p.pos);
  root.rotation.set(0, p.yaw, 0);
  fig.position.set(0, p.bob ?? 0, 0);
  fig.rotation.set(p.lean ?? 0, 0, p.roll ?? 0);
  head.rotation.set(...(p.head ?? [0, 0, 0]));
  let { ra, re, la, le } = p;
  if (p.rh && p.rw > 0) {
    const ik = armIK(p, 1, p.rh);
    (ra = mixV(ra, ik.a, p.rw)), (re = mixV(re, ik.e, p.rw));
  }
  if (p.lh && p.lw > 0) {
    const ik = armIK(p, -1, p.lh);
    (la = mixV(la, ik.a, p.lw)), (le = mixV(le, ik.e, p.lw));
  }
  wave.a.rotation.set(...ra);
  wave.elbow.rotation.set(...re);
  rest.a.rotation.set(...la);
  rest.elbow.rotation.set(...le);
  legL.rotation.set(p.ll ?? 0, 0, 0);
  legR.rotation.set(p.lr ?? 0, 0, 0);
}
const NEUTRAL = { ra: [0, 0, 0.18], re: [-0.25, 0, 0], la: [0, 0, -0.18], le: [-0.25, 0, 0] };
// Le salut : bras droit ouvert, avant-bras levé qui balance une fois par seconde (u ∈ [0, 1)).
const waving = (u, amp = 1) => ({
  ra: [0.1, 0, 1.25 + 0.06 * amp * Math.sin(2 * Math.PI * u)],
  re: [0, 0, 1.2 + 0.5 * amp * Math.sin(2 * Math.PI * u)],
});
// Les prises (rh, lh) ne se mélangent pas : seul leur poids (rw, lw) passe de l'une à l'autre.
const lerpPose = (a, b, t) => {
  const out = { ...a };
  for (const k of Object.keys(b)) {
    if (k === "pos") out.pos = a.pos.clone().lerp(b.pos, t);
    else if (k === "rh" || k === "lh") out[k] = b[k];
    else if (Array.isArray(b[k])) out[k] = mixV(a[k] ?? [0, 0, 0], b[k], t);
    else out[k] = mix(a[k] ?? 0, b[k], t);
  }
  return out;
};

// Au pied de l'échelle, tourné vers nous (un peu vers la bulle, à gauche), il salue.
const poseA = (u) => ({
  pos: SITE.standA,
  yaw: SITE.faceCam - 0.4,
  bob: 0.006 * (1 + Math.sin(4 * Math.PI * u)),
  head: [0.05, 0.12, 0.06 * Math.sin(2 * Math.PI * u + 0.5)],
  ...waving(u),
  la: [-0.15, 0, -0.32],
  le: [-0.5, 0, 0],
  ll: 0,
  lr: 0,
  lean: 0,
  roll: 0.02 * Math.sin(2 * Math.PI * u),
});
// Sur le marchepied, tourné vers nous, il salue, l'autre main sur la hanche (loin de la porte ouverte).
const poseB = (u) => ({
  pos: SITE.landing,
  yaw: SITE.faceCam - 0.3,
  bob: 0.005 * (1 + Math.sin(4 * Math.PI * u)),
  head: [0.08, -0.1, 0.06 * Math.sin(2 * Math.PI * u + 0.5)],
  ...waving(u),
  la: [-0.1, 0, -0.75],
  le: [0, 0, 1.2],
  ll: 0,
  lr: 0,
  lean: 0,
  roll: 0.02 * Math.sin(2 * Math.PI * u),
});

// La montée (plan « echelle », t en secondes sur 2,5 s) : il cesse de saluer, fait un pas de côté jusqu'à l'échelle en
// se tournant vers elle et l'empoigne ; il grimpe cinq barreaux, les mains l'une après l'autre deux prises plus haut,
// les pieds qui montent puis se posent sur le barreau suivant ; en haut, il passe sur le marchepied et se retourne.
const CLIMB = { walk: [0.1, 0.85], climb: [0.85, 2.05], turn: [2.05, 2.5] };
function poseClimb(t) {
  const [W0, CLIMB0] = CLIMB.walk, CLIMB1 = CLIMB.climb[1], TURN1 = CLIMB.turn[1];
  const n = LADDER.rungs;
  // Les deux mains : la prise k+2 pour l'une, k+3 pour l'autre ; à chaque barreau, celle du bas passe deux crans
  // plus haut. Les prises paires sont à la main du salut.
  const handsAt = (k) => (k % 2 === 0 ? { rh: hold(k + 2, 1), lh: hold(k + 3, -1) } : { rh: hold(k + 3, 1), lh: hold(k + 2, -1) });
  const onLadder = { yaw: SITE.faceLadder, bob: 0, lean: 0.06, roll: 0, head: [-0.3, 0, 0], ...NEUTRAL, ll: 0, lr: 0, rw: 1, lw: 1 };
  if (t < CLIMB0) {
    const k = span(t, W0, CLIMB0);
    const turn = ease.inOut(span(t, 0.05, 0.7));
    const stepPhase = Math.sin(Math.PI * 2 * k);
    const from = { ...poseA(t), rw: 0, lw: 0 };
    const to = { ...onLadder, pos: footOn(0), ...handsAt(0), rw: 0, lw: 0 };
    const p = lerpPose(from, to, ease.inOut(span(t, 0.05, 0.45)));
    // Il longe l'échelle un peu en retrait (ses pieds passent devant les montants), puis s'en approche.
    const back = 0.24 * ease.inOut(span(k, 0, 0.3)) * (1 - ease.inOut(span(k, 0.8, 1)));
    p.pos = SITE.standA.clone().lerp(footOn(0), ease.inOut(span(k, 0, 0.8))).addScaledVector(SITE.h, back);
    p.yaw = mix(SITE.faceCam - 0.4, SITE.faceLadder, turn);
    p.bob = 0.04 * Math.abs(stepPhase) * (k > 0 && k < 1 ? 1 : 0);
    p.ll = -0.45 * stepPhase * (k < 1 ? 1 : 0);
    p.lr = 0.45 * stepPhase * (k < 1 ? 1 : 0);
    // Il empoigne l'échelle à la fin du pas.
    p.rw = p.lw = ease.inOut(span(t, 0.62, CLIMB0));
    return p;
  }
  if (t < CLIMB1) {
    const kf = span(t, CLIMB0, CLIMB1) * n;
    const k = Math.floor(Math.min(n - 1e-6, kf));
    const f = kf - k;
    // Les pieds montent d'abord (un peu plus haut que le barreau, pour le passer), puis se posent dessus.
    const a = footOn(k), b = footOn(k + 1);
    const up = ease.inOut(span(f, 0, 0.6)), over = 0.03 * Math.sin(Math.PI * span(f, 0.2, 1));
    const pos = a.clone().lerp(b, ease.inOut(span(f, 0.45, 1)));
    pos.y = mix(a.y, b.y, up) + over;
    // La main du bas lâche sa prise, s'écarte, et va deux crans plus haut ; l'autre tient.
    const g = ease.inOut(span(f, 0.05, 0.8));
    const from = handsAt(k), to = handsAt(k + 1);
    const moving = k % 2 === 0 ? "rh" : "lh";
    const hands = { rh: from.rh, lh: from.lh };
    hands[moving] = from[moving].clone().lerp(to[moving], g).addScaledVector(SITE.h, 0.12 * Math.sin(Math.PI * g));
    // La jambe du côté de la main qui monte se replie en arrière, et revient.
    const kick = 0.4 * Math.sin(Math.PI * span(f, 0, 0.9));
    const p = { ...onLadder, pos, ...hands, roll: 0.04 * (k % 2 === 0 ? 1 : -1) * Math.sin(Math.PI * f) };
    if (k % 2 === 0) p.lr = kick;
    else p.ll = kick;
    return p;
  }
  // En haut : il se hisse sur le marchepied en tenant la trappe, la lâche, se retourne vers nous les bras le long du
  // corps, puis lève le bras pour saluer.
  const kin = ease.inOut(span(t, CLIMB1, CLIMB1 + 0.2));
  const kturn = ease.inOut(span(t, CLIMB1 + 0.15, TURN1));
  const karm = ease.inOut(span(t, CLIMB1 + 0.25, TURN1));
  const to = { ...poseB(0), rw: 0, lw: 0 };
  const p = lerpPose({ ...onLadder, pos: footOn(n), ...handsAt(n) }, to, kturn);
  for (const k of ["ra", "re", "la", "le"]) p[k] = mixV(NEUTRAL[k], to[k], karm);
  p.rw = p.lw = 1 - ease.inOut(span(t, CLIMB1 + 0.12, CLIMB1 + 0.25));
  // Il tourne par la gauche (le plus court chemin vers la caméra).
  p.yaw = mix(SITE.faceLadder, SITE.faceCam - 0.3, kturn);
  p.pos = footOn(n).lerp(SITE.landing, kin).setY(SITE.stepY);
  return p;
}

// L'envol (t en secondes sur 13,5 s) : il se tourne vers la trappe et entre ; elle se ferme ; il paraît au hublot ;
// l'échelle se couche ; les trois feux s'allument ; la fusée tremble, s'allume, décolle.
const ENVOL = { duration: 13.5, enter: [0.1, 0.95], door: [0.95, 1.5], face: [1.45, 3.6], ladder: [1.6, 2.4], lights: [2.4, 3.0, 3.6], ignite: 4.2, liftoff: 4.8, follow: [4.8, 6.6], back: [6.0, 9.0] };
function poseEnter(t) {
  const [a, b] = ENVOL.enter;
  const k = span(t, a, b);
  const turn = ease.inOut(span(k, 0, 0.4));
  const walk = ease.in(span(k, 0.42, 1));
  // Les bras rentrés devant lui ; il se penche, baisse la tête et l'incline pour passer l'antenne.
  const tucked = { ra: [-0.6, 0, -0.12], re: [-0.3, 0, 0], la: [-0.6, 0, 0.12], le: [-0.3, 0, 0] };
  const p = lerpPose(poseB(0), { ...tucked, pos: SITE.landing, yaw: SITE.faceLadder, bob: 0, head: [0, 0, 0], ll: 0, lr: 0, lean: 0, roll: 0 }, ease.inOut(span(k, 0, 0.4)));
  p.yaw = mix(SITE.faceCam - 0.3, SITE.faceLadder, turn);
  p.pos = SITE.landing.clone().lerp(SITE.inside, walk);
  // D'abord la tête qui s'incline (l'antenne rentre dans la largeur de la trappe), puis il se penche.
  p.head = mixV(p.head, [0, 0, -0.6], ease.inOut(span(k, 0.2, 0.42)));
  const duck = ease.inOut(span(k, 0.35, 0.6));
  p.head[0] = 0.35 * duck;
  const step = Math.sin(Math.PI * 2 * span(k, 0.42, 1));
  p.lean = 0.7 * duck;
  // Les jambes compensent l'inclinaison : elles restent droites sous lui.
  p.ll = -p.lean - 0.4 * step;
  p.lr = -p.lean + 0.4 * step;
  p.bob = 0;
  return p;
}

// ——— La fusée en croisière, à l'escale 1 ———
// Après l'envol, elle reste dans le cadre de l'espace : entre la planète et la Terre (56 % / 46 % de l'image), le nez
// vers la Terre, le hublot vers nous. Elle flotte et sa flamme vacille au rythme de la boucle de l'espace (phi, 8 s).
// Sa taille est celle d'un dessin : à l'échelle de la planète, elle ne ferait qu'un pixel.
const CRUISE = { pos: new THREE.Vector3(0.734, -0.462, 1), roll: -0.85, scale: 0.1, flame: 0.55 };
CRUISE.heading = new THREE.Vector3(-Math.sin(CRUISE.roll), Math.cos(CRUISE.roll), 0);
const cruise = (phi) => ({
  pos: CRUISE.pos.clone().add(new THREE.Vector3(0.02 * Math.sin(2 * phi), 0.035 * Math.sin(phi), 0)),
  quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.06 * Math.sin(phi + 1), 0.1 * Math.sin(phi), CRUISE.roll + 0.05 * Math.sin(phi + 0.5))),
});
// Les trois gouttes de sa flamme, en croisière (des multiples entiers de phi : la boucle reste sans couture).
const cruiseFlame = (i, phi) => {
  const fl = 1 + 0.12 * Math.sin(37 * phi + i) + 0.07 * Math.sin(23 * phi + 2 * i);
  return [CRUISE.flame * (1 + 0.04 * Math.sin(41 * phi + i)), CRUISE.flame * fl, CRUISE.flame * (1 + 0.04 * Math.sin(43 * phi + i))];
};

// La caméra, plan par plan. Les plans rapprochés se règlent dans le repère local (position, cible, focale) ; la fin
// de l'envol rejoint la caméra de la scène « espace », dans le monde.
const SHOTS = {
  // La caméra regarde 17° à gauche de la Terre, qui se lève à droite ; le copilote à gauche, le ciel libre au-dessus
  // de lui pour sa bulle.
  A: { pos: [4.93, 2.1, 10.24], target: [1.88, 2.5, 0.2], fov: 34 },
  B: { pos: [4.08, 3.05, 7.92], target: [1.76, 3.3, 0.27], fov: 34 },
  C: { pos: [6.35, 2.4, 14.04], target: [2.0, 3.2, -0.3], fov: 34 },
};
const ESPACE_CAM = { pos: new THREE.Vector3(0, 0.5, 10), target: new THREE.Vector3(0.2, -0.8, 0), fov: 32 };
// Téléphone : la zone de l'image d'ordinateur qui doit rester visible (comme BOXES dans voyage-render.mjs).
const PHONE_BOX = { A: [0.17, 0.06, 0.74, 0.98], B: [0.2, 0.06, 0.75, 0.94], C: [0.22, 0.0, 0.84, 1.0], espace: [0.06, 0.1, 0.76, 0.66] };

// Applique une caméra (monde) avec, pour le téléphone, le recadrage de setupScene sur `box`.
function placeCamera(cur, pos, target, fov, box, up = new THREE.Vector3(0, 1, 0)) {
  const camera = cur.camera;
  camera.fov = fov;
  camera.up.copy(up);
  // Le téléphone (une image presque carrée) : recadré sur `box`, comme setupScene le fait pour les boucles.
  if (box && cur.size && cur.size[0] / cur.size[1] < 1.5) {
    const [x0, y0, x1, y1] = box;
    const [w, h] = cur.size;
    const D = pos.distanceTo(target);
    const f = target.clone().sub(pos).normalize();
    const r = new THREE.Vector3().crossVectors(f, up).normalize();
    const u = new THREE.Vector3().crossVectors(r, f);
    const tan = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const hd = D * tan, wd = hd * (16 / 9);
    const aim = target.clone().addScaledVector(r, ((x0 + x1) / 2 - 0.5) * 2 * wd).addScaledVector(u, (0.5 - (y0 + y1) / 2) * 2 * hd);
    const dist = Math.max(((x1 - x0) * wd) / (tan * (w / h)), ((y1 - y0) * hd) / tan) * 1.03;
    camera.position.copy(aim).addScaledVector(f, -dist);
    camera.lookAt(aim);
  } else {
    camera.position.copy(pos);
    camera.lookAt(target);
  }
  // Plans rapprochés : le plan proche suit la distance, pour garder la profondeur précise.
  const d = camera.position.distanceTo(target);
  camera.near = Math.max(0.0004, d * 0.01);
  camera.far = 80;
  camera.updateProjectionMatrix();
}
const shotWorld = (s) => ({ pos: L2W(new THREE.Vector3(...s.pos)), target: L2W(new THREE.Vector3(...s.target)), fov: s.fov });

// L'ombre du soleil (la lumière principale de setupScene), resserrée sur ce qu'on regarde : au plus près, quelques
// unités autour du pas de tir ; au loin, le cadre de l'espace (±5 autour de l'origine).
const SUN = new THREE.Vector3(-4, 8, 6).normalize();
function aimSun(cur, focus, half) {
  const key = cur.key;
  if (!key) return;
  if (!key.target.parent) cur.scene.add(key.target);
  key.target.position.copy(focus);
  key.position.copy(focus).addScaledVector(SUN, Math.max(half * 4, 0.05));
  const sc = key.shadow.camera;
  Object.assign(sc, { left: -half, right: half, top: half, bottom: -half, near: Math.max(half * 0.2, 0.001), far: half * 10 });
  sc.updateProjectionMatrix();
  key.shadow.normalBias = (2 * half) / 2048 * 1.2;
}

function decollage(M, clip) {
  const g = new THREE.Group();
  // — La planète et son anneau, ses lunes, la Terre, les étoiles : la scène « espace », plus finement maillée —
  const planet = new THREE.Group();
  planet.position.set(-1.6, -1.25, 0);
  planet.scale.setScalar(1.25);
  g.add(planet);
  // La sphère a son pôle sur le pas de tir : les mailles y sont les plus fines.
  const ball = mesh(new THREE.SphereGeometry(0.72, 512, 256), M.clay, 0, 1.0, 0);
  ball.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), LAUNCH.U);
  planet.add(ball);
  const lav = tinted(TINT.espace, 0.6);
  for (const [t0, dt] of [[1.18, 0.16], [1.72, 0.1], [2.05, 0.07]]) planet.add(mesh(new THREE.SphereGeometry(0.724, 512, 24, 0, Math.PI * 2, t0, dt), lav, 0, 1.0, 0));
  const ringMesh = mesh(new THREE.TorusGeometry(1.18, 0.035, 24, 720), M.accent, 0, 1.0, 0);
  ringMesh.rotation.set(Math.PI / 2.3, 0.2, 0);
  planet.add(ringMesh);
  // Comme dans « espace » : la grosse lune en lavande, la petite en argile.
  const m1 = mesh(new THREE.IcosahedronGeometry(0.16, 0), lav);
  const m2 = mesh(new THREE.IcosahedronGeometry(0.1, 0), M.clay2);
  planet.add(m1, m2);
  const earth = mesh(new THREE.SphereGeometry(0.42, 128, 96), earthMaterial());
  earth.position.copy(LAUNCH.EARTH);
  earth.rotation.z = -0.35;
  g.add(earth);
  g.add(starField(500, 7));
  // Des étoiles de plus dans tout le ciel, pour les plans rapprochés qui regardent en l'air ; elles s'effacent quand
  // la caméra recule (la scène « espace » n'a que les siennes).
  const more = (() => {
    const n = 700, arr = new Float32Array(n * 3), rnd = rng(31);
    for (let i = 0; i < n; i++) {
      const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
      const v = new THREE.Vector3(r * Math.cos(a), z, r * Math.sin(a)).multiplyScalar(14).add(LAUNCH.P);
      arr.set(v.toArray(), i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xf3efe6, size: 0.045, transparent: true, opacity: 1, depthWrite: false }));
  })();
  g.add(more);
  // La phase du monde : les lunes, l'anneau et la Terre tournent comme dans la boucle de l'espace. Figés pendant les
  // bulles, ils repartent au décollage et arrivent à la phase 0 (2π) à la fin de l'envol, à la vitesse de la boucle.
  const LOOP_S = 8;
  const RAMP = ENVOL.duration - ENVOL.liftoff + 0.6; // la montée en vitesse, jusqu'à la fin
  const PHI0 = 2 * Math.PI - (2 * Math.PI / LOOP_S) * (RAMP / 2);
  const worldPhase = (t) => {
    if (clip !== "envol") return PHI0;
    const t0 = ENVOL.duration - RAMP;
    const x = Math.max(0, t - t0);
    return PHI0 + (2 * Math.PI / LOOP_S) * (x * x) / (2 * RAMP);
  };
  const setWorld = (phi) => {
    m1.position.set(Math.cos(phi) * 1.45, 1.0 + Math.sin(phi) * 0.35, Math.sin(phi) * 1.0);
    m1.rotation.set(phi, phi, 0);
    m2.position.set(Math.cos(-phi + 1) * 1.05, 1.0 + Math.cos(phi) * 0.55, Math.sin(-phi + 1) * 0.8);
    m2.rotation.set(phi, 0, phi);
    ringMesh.rotation.z = 0.2 + 0.08 * Math.sin(phi);
    // La Terre tourne EARTH_LAPS fois moins vite que le reste (voyage-scenes.js) et retrouve -1,75 à la coupure.
    earth.rotation.y = -1.75 + (phi - 2 * Math.PI) / EARTH_LAPS;
  };

  // — Le pas de tir, à l'échelle du bonhomme —
  const site = new THREE.Group();
  site.position.copy(LAUNCH.P);
  site.quaternion.copy(LAUNCH.Q);
  site.scale.setScalar(LAUNCH.KL);
  g.add(site);
  const local = new THREE.Group(); // ce qui s'efface quand la caméra s'éloigne (la dalle, les cailloux, la fumée)
  site.add(local);
  const pad = launchPad(M);
  pad.position.copy(SITE.R0);
  local.add(pad);
  const ship = rocket(M);
  ship.position.copy(SITE.R0).setY(SITE.PAD_Y);
  site.add(ship);
  const lad = ladder(M);
  lad.position.copy(SITE.at(SITE.footR, SITE.PAD_Y));
  lad.rotation.y = Math.atan2(SITE.h.x, SITE.h.z);
  local.add(lad);
  // Des cratères et des cailloux sur le sol courbe, hors du chemin de la caméra.
  const rnd = rng(11);
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, d = 4 + rnd() * 18;
    const x = SITE.R0.x + Math.cos(a) * d, z = SITE.R0.z + Math.sin(a) * d;
    if (z > 4 && Math.abs(x - 2) < 5) continue;
    const r = 0.4 + rnd() * 1.1;
    const crater = mesh(new THREE.TorusGeometry(r, r * 0.22, 10, 40), M.clay2, x, groundY(x, z) + 0.02, z);
    crater.rotation.x = Math.PI / 2;
    crater.scale.z = 0.45;
    local.add(crater);
  }
  for (let i = 0; i < 30; i++) {
    const a = rnd() * Math.PI * 2, d = 3.2 + rnd() * 14;
    const x = SITE.R0.x + Math.cos(a) * d, z = SITE.R0.z + Math.sin(a) * d;
    if (z > 5 && Math.abs(x - 2) < 4) continue;
    const s = 0.12 + rnd() * 0.32;
    const rock = mesh(new THREE.IcosahedronGeometry(s, 0), rnd() > 0.7 ? lav : M.clay2, x, groundY(x, z) + s * 0.35, z);
    rock.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    local.add(rock);
  }
  // Le copilote, sans son cordon : ses pieds à l'origine de `pilot`.
  const pilot = new THREE.Group();
  const cop = copilot(M, "espace", { tether: false });
  cop.position.y = 0.63;
  pilot.add(cop);
  site.add(pilot);
  const parts = cop.userData.parts;

  // La fumée : des boules d'argile crème qui roulent sur la dalle à l'allumage, puis la traînée de la fusée.
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0xf2ece2, roughness: 1 });
  const puffGeo = new THREE.SphereGeometry(1, 20, 14);
  const puffs = [];
  {
    const r = rng(5);
    for (let i = 0; i < 70; i++) {
      const o = new THREE.Mesh(puffGeo, smokeMat);
      o.castShadow = false;
      o.receiveShadow = true;
      o.visible = false;
      local.add(o);
      puffs.push({ o, t0: ENVOL.ignite + 0.05 + Math.pow(r(), 1.4) * 3.0, a: r() * Math.PI * 2, v: 2.2 + r() * 2.8, s: 0.35 + r() * 0.55, up: 0.25 + r() * 0.5, squash: 0.75 + r() * 0.3 });
    }
  }
  const trail = [];
  {
    const r = rng(9);
    // Assez serrées pour former une traînée continue, même quand la fusée file, tout le long du tour.
    for (let i = 0; i < 260; i++) {
      const o = new THREE.Mesh(puffGeo, smokeMat);
      o.castShadow = false;
      o.visible = false;
      site.add(o);
      trail.push({ o, t0: ENVOL.liftoff + 0.25 + i * 0.03, j: [r() - 0.5, r() - 0.5, r() - 0.5], s: 0.36 + r() * 0.28 });
    }
  }

  // — La trajectoire de la fusée : d'abord droit vers le ciel de la planète, à l'échelle du pas de tir (τ en secondes
  //   depuis le décollage : un départ lent, puis de plus en plus vite). Puis, pendant que la caméra recule jusqu'au
  //   cadre de l'escale 1, elle s'éloigne en un long virage (la montée ralentit pendant que le tour s'amorce), puis
  //   fait le tour de la planète (ORBIT : un cercle au-delà de l'anneau
  //   et des lunes, dans le plan de la verticale du pas de tir et de la caméra de l'escale 1, penché de `tilt` vers
  //   elle pour que tout le tour reste dans l'image ; elle tourne dans le sens inverse des aiguilles d'une montre, vers
  //   la gauche d'abord). Au bas de la planète, un tour et demi plus loin, elle quitte l'orbite et ralentit jusqu'à
  //   sa croisière (cruise(0)), le nez vers la Terre. Elle grandit en route pour rester lisible. —
  const altitude = (tau) => (tau <= 0 ? 0 : 0.9 * tau * tau + 0.3 * Math.pow(tau, 5));
  const rocketLocal = (tau) => SITE.R0.clone().setY(SITE.PAD_Y + altitude(tau));
  const FREE = 6.0; // l'instant où elle quitte la verticale pour la spirale
  const PULLED = 8.4; // l'instant où la caméra atteint le cadre de l'escale 1
  const ORBIT = { r: 1.9, tilt: 0.3, climb: [FREE, 8.6], spin: [FREE, 8.8], exit: ENVOL.duration - 1.8, turns: 1.5, scale: 0.08 };
  const toSite = new THREE.Matrix4().compose(LAUNCH.P, LAUNCH.Q, new THREE.Vector3(LAUNCH.KL, LAUNCH.KL, LAUNCH.KL)).invert();
  const end = cruise(0);
  const C = LAUNCH.C, U = LAUNCH.U;
  const toCam = ESPACE_CAM.pos.clone().sub(C).normalize();
  const N = toCam.clone().addScaledVector(U, -toCam.dot(U)).normalize(); // l'axe de l'orbite
  const E2 = new THREE.Vector3().crossVectors(N, U); // le sens du tour : vers la gauche de l'image, au départ
  const tiltAxis = new THREE.Vector3().crossVectors(U, toCam).normalize();
  const tiltAt = (t) => new THREE.Quaternion().setFromAxisAngle(tiltAxis, ORBIT.tilt * ease.inOut(span(t, ORBIT.climb[0], ORBIT.climb[1])));
  const B0 = L2W(rocketLocal(FREE - ENVOL.liftoff));
  const r0 = B0.distanceTo(C);
  const drift = B0.clone().sub(C).addScaledVector(U, -r0); // la fusée n'est pas pile sur la verticale du centre
  const tau0 = FREE - ENVOL.liftoff;
  const v0 = (1.8 * tau0 + 1.5 * tau0 ** 4) * LAUNCH.KL; // sa vitesse à la fin de la montée verticale
  // La distance au centre : de la montée verticale à l'orbite, sans à-coup (Hermite cubique).
  const [c0, c1] = ORBIT.climb;
  const radius = (t) => {
    const u = span(t, c0, c1), T = c1 - c0;
    return (2 * u ** 3 - 3 * u ** 2 + 1) * r0 + (u ** 3 - 2 * u ** 2 + u) * T * v0 + (3 * u ** 2 - 2 * u ** 3) * ORBIT.r;
  };
  // L'angle parcouru : la vitesse angulaire monte en douceur pendant la montée, puis reste constante ; elle est
  // réglée pour que la fusée ait fait ORBIT.turns tours à la sortie.
  const [s0, s1] = ORBIT.spin;
  const omega = (ORBIT.turns * 2 * Math.PI) / ((s1 - s0) / 2 + (ORBIT.exit - s1));
  const angle = (t) => {
    const u = span(t, s0, s1);
    return omega * ((s1 - s0) * (u ** 6 - 3 * u ** 5 + 2.5 * u ** 4) + Math.max(0, t - s1));
  };
  const around = (t) => {
    const a = angle(t), r = radius(t);
    const rel = U.clone().multiplyScalar(r * Math.cos(a)).addScaledVector(E2, r * Math.sin(a)).applyQuaternion(tiltAt(t));
    return rel.add(C).addScaledVector(drift, 1 - ease.inOut(span(t, c0, c1)));
  };
  // Sa vitesse, par différence finie (le plan qui se penche pendant la montée y ajoute la sienne).
  const aroundDir = (t) => around(t + 1e-3).sub(around(t - 1e-3)).divideScalar(2e-3);
  // La sortie : une courbe de Bézier qui part dans l'axe de l'orbite, à sa vitesse, et arrive à l'arrêt dans l'axe
  // de la croisière (la vitesse décroît régulièrement).
  const TX = ORBIT.exit, TE = ENVOL.duration - TX;
  const X0 = around(TX), vx = aroundDir(TX);
  const X1 = X0.clone().addScaledVector(vx.clone().normalize(), (vx.length() * TE) / 6);
  const X2 = end.pos.clone().addScaledVector(CRUISE.heading, -0.5);
  const X3 = end.pos.clone();
  const exitAt = (s) => {
    const a = 1 - s;
    return X0.clone().multiplyScalar(a * a * a).addScaledVector(X1, 3 * a * a * s).addScaledVector(X2, 3 * a * s * s).addScaledVector(X3, s * s * s);
  };
  const exitDir = (s) => {
    const a = 1 - s;
    return X1.clone().sub(X0).multiplyScalar(a * a).addScaledVector(X2.clone().sub(X1), 2 * a * s).addScaledVector(X3.clone().sub(X2), s * s);
  };
  const exitS = (t) => {
    const u = span(t, TX, ENVOL.duration);
    return 2 * u - u * u;
  };
  const pathAt = (t) => (t <= TX ? around(t) : exitAt(exitS(t)));
  const pathDir = (t) => (t <= TX ? aroundDir(t) : exitDir(exitS(t))).normalize();
  // Son orientation : le nez suit la trajectoire, sans tourner sur lui-même (chaque pas fait tourner la fusée du
  // plus petit angle qui amène son axe sur la nouvelle direction), puis, en ralentissant, la pose de croisière.
  const STEP_S = 1 / 480;
  const turned = [LAUNCH.Q.clone()];
  {
    let prev = U.clone();
    for (let t = FREE + STEP_S; t <= ENVOL.duration + STEP_S; t += STEP_S) {
      const d = pathDir(Math.min(t, ENVOL.duration));
      turned.push(new THREE.Quaternion().setFromUnitVectors(prev, d).multiply(turned[turned.length - 1]));
      prev = d;
    }
  }
  const turnedAt = (t) => {
    const k = (t - FREE) / STEP_S, i = Math.min(turned.length - 2, Math.floor(k));
    return turned[i].clone().slerp(turned[i + 1], Math.min(1, k - i));
  };
  const scaleAt = (t) =>
    t < TX
      ? Math.exp(mix(Math.log(LAUNCH.KL), Math.log(ORBIT.scale), ease.inOut(span(t, FREE + 0.2, c1 + 0.2))))
      : Math.exp(mix(Math.log(ORBIT.scale), Math.log(CRUISE.scale), ease.inOut(span(t, TX, ENVOL.duration))));
  /** La fusée dans le monde après le décollage : position, orientation, et la taille d'une unité locale. */
  const flight = (t) => {
    if (t <= FREE) return { pos: L2W(rocketLocal(t - ENVOL.liftoff)), quat: LAUNCH.Q.clone(), scale: LAUNCH.KL };
    return {
      pos: pathAt(t),
      quat: turnedAt(t).slerp(end.quat, ease.inOut(span(t, ENVOL.duration - 1.2, ENVOL.duration))),
      scale: scaleAt(t),
    };
  };
  // La fusée vit dans le repère du pas de tir : on y ramène sa place dans le monde.
  const placeShip = (w) => {
    ship.position.copy(w.pos).applyMatrix4(toSite);
    ship.quaternion.copy(LAUNCH.Q).invert().multiply(w.quat);
    ship.scale.setScalar(w.scale / LAUNCH.KL);
  };

  const animate = (phi, cur) => {
    const u = phi / (Math.PI * 2);
    const dur = { pied: 1, echelle: 2.5, trappe: 1, envol: ENVOL.duration }[clip];
    const t = u * dur;
    setWorld(worldPhase(t));
    const R = ship.userData;
    // Par défaut : trappe ouverte, échelle posée, feux éteints, pas de flamme ni de fumée.
    let doorOpen = 1, ladderTilt = -SITE.lean, lit = 0, flameK = 0, shake = 0, faceK = 0, cleanup = 0, trailOut = 0, starFade = 0;
    let pose;
    if (clip === "pied") pose = poseA(u);
    else if (clip === "echelle") pose = poseClimb(t);
    else if (clip === "trappe") pose = poseB(u);
    else {
      pose = poseEnter(t);
      doorOpen = 1 - ease.back(span(t, ...ENVOL.door));
      faceK = span(t, ENVOL.face[0], ENVOL.face[0] + 0.3) * (1 - span(t, ENVOL.face[1], ENVOL.face[1] + 0.3));
      ladderTilt = mix(-SITE.lean, Math.PI / 2, ease.drop(span(t, ...ENVOL.ladder)));
      lit = ENVOL.lights.filter((x) => t >= x).length;
      shake = span(t, ENVOL.lights[2], ENVOL.ignite) * (1 - span(t, ENVOL.liftoff + 1.2, ENVOL.liftoff + 2));
      flameK = ease.out(span(t, ENVOL.ignite, ENVOL.ignite + 0.4));
      cleanup = ease.inOut(span(t, 7.4, 8.6));
      trailOut = ease.inOut(span(t, ENVOL.duration - 1, ENVOL.duration - 0.2));
      starFade = ease.inOut(span(t, 6.6, 8.4));
    }
    // Le copilote : caché une fois entré.
    pilot.visible = !(clip === "envol" && t > ENVOL.enter[1]);
    posePilot(parts, pilot, pose);
    // La trappe : ouverte, elle a pivoté vers l'extérieur autour de sa charnière.
    R.door.rotation.y = -ROCKET.DOOR_OPEN * doorOpen;
    R.face.visible = faceK > 0;
    R.face.position.y = ROCKET.PORT.y - 0.05 - 0.25 * (1 - ease.out(faceK));
    R.face.rotation.z = 0.15 * Math.sin(t * 7);
    // L'échelle : penchée sur la fusée, puis couchée sur la dalle.
    lad.userData.tilt.rotation.x = ladderTilt;
    pad.userData.lights.forEach((m, i) => {
      m.emissiveIntensity = i < lit ? 2.2 : 0;
      m.color.setHex(i < lit ? 0xffe9c2 : 0x9a8b78);
    });
    // La fusée : elle tremble, s'allume, monte, puis file vers sa croisière.
    if (clip === "envol" && t > FREE) placeShip(flight(t));
    else {
      const jitter = shake * 0.025;
      const pos = clip === "envol" && t > ENVOL.liftoff ? rocketLocal(t - ENVOL.liftoff) : SITE.R0.clone().setY(SITE.PAD_Y);
      ship.position.set(pos.x + jitter * Math.sin(t * 61), pos.y + jitter * 0.5 * Math.sin(t * 47 + 1), pos.z + jitter * Math.sin(t * 53 + 2));
      ship.quaternion.identity();
      ship.scale.setScalar(1);
    }
    // La flamme : celle du décollage, puis, à l'approche de la croisière, la sienne (comme la boucle de l'espace).
    R.flame.visible = flameK > 0;
    const calm = ease.inOut(span(t, ENVOL.duration - 1.6, ENVOL.duration - 0.2));
    R.flames.forEach((f, i) => {
      const fl = 1 + 0.12 * Math.sin(t * 37 + i) + 0.07 * Math.sin(t * 23 + 2 * i);
      const lift = [flameK * (1 + 0.04 * Math.sin(t * 41 + i)), flameK * fl * (1 + 0.6 * span(t, ENVOL.liftoff, ENVOL.liftoff + 1.5)), flameK * (1 + 0.04 * Math.sin(t * 43 + i))];
      f.scale.set(...mixV(lift, cruiseFlame(i, worldPhase(t)), calm));
    });
    R.glow.intensity = flameK * 0.0011 * (1 + 0.15 * Math.sin(t * 31)) * (1 - ease.inOut(span(t, FREE, 7.6)));
    // La fumée de la dalle : chaque bouffée roule vers l'extérieur en ralentissant, grossit, monte un peu.
    for (const p of puffs) {
      const tau = clip === "envol" ? t - p.t0 : -1;
      p.o.visible = tau > 0 && cleanup < 1;
      if (!p.o.visible) continue;
      const out = p.v * (1 - Math.exp(-tau / 0.7));
      const x = SITE.R0.x + Math.cos(p.a) * (0.6 + out), z = SITE.R0.z + Math.sin(p.a) * (0.6 + out);
      const s = p.s * (0.3 + 1.5 * (1 - Math.exp(-tau / 0.8))) * (1 - cleanup);
      p.o.position.set(x, SITE.PAD_Y + s * 0.6 + p.up * tau * 0.6, z);
      p.o.scale.set(s, s * p.squash, s);
    }
    // La traînée : laissée derrière la fusée, elle gonfle puis fond, en une queue de comète (TRAIL_LIFE).
    const TRAIL_LIFE = 1.4;
    for (const p of trail) {
      const tau = clip === "envol" ? t - p.t0 : -1;
      p.o.visible = tau > 0 && tau < TRAIL_LIFE && trailOut < 1;
      if (!p.o.visible) continue;
      // Sous la tuyère, là où était la fusée à l'instant où la bouffée est partie, à sa taille d'alors.
      // Quand elle file, chaque bouffée couvre au moins l'écart jusqu'à la suivante : la traînée reste continue.
      const w = flight(p.t0);
      const k = w.scale / LAUNCH.KL;
      const gap = flight(p.t0 + 0.03).pos.distanceTo(w.pos) / LAUNCH.KL;
      const at = w.pos.addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(w.quat), -0.4 * w.scale).applyMatrix4(toSite);
      p.o.position.set(at.x + p.j[0] * 0.3 * k, at.y + p.j[1] * 0.3 * k, at.z + p.j[2] * 0.3 * k);
      const s = Math.max(p.s * k, 0.6 * gap) * (0.4 + 1.2 * (1 - Math.exp(-tau / 0.5))) * Math.max(0, 1 - tau / TRAIL_LIFE) * (1 - trailOut);
      p.o.scale.setScalar(Math.max(0.0001, s));
    }
    local.scale.setScalar(1 - cleanup * 0.9999);
    more.material.opacity = 1 - starFade;
    more.visible = starFade < 1;

    if (!cur) return;
    // — La caméra —
    const shot = (s) => shotWorld(SHOTS[s]);
    let pos2, target2, fov2, box, up = LAUNCH.U.clone();
    const upWorld = new THREE.Vector3(0, 1, 0);
    if (clip === "pied") ({ pos: pos2, target: target2, fov: fov2 } = shot("A")), (box = PHONE_BOX.A);
    else if (clip === "trappe") ({ pos: pos2, target: target2, fov: fov2 } = shot("B")), (box = PHONE_BOX.B);
    else if (clip === "echelle") {
      const k = ease.inOut(span(t, 0.6, 2.5));
      const a = shot("A"), b = shot("B");
      pos2 = a.pos.lerp(b.pos, k);
      target2 = a.target.lerp(b.target, k);
      fov2 = mix(a.fov, b.fov, k);
      box = mixV(PHONE_BOX.A, PHONE_BOX.B, k);
    } else {
      // De B à C (on recule pour voir toute la fusée), puis on la suit qui monte : la cible monte avec elle (un peu
      // en retard), la caméra se soulève.
      const follow = (t) => {
        const b = shot("B"), c = shot("C");
        const kc = ease.inOut(span(t, 1.2, 3.6));
        const fw = flight(Math.max(t, ENVOL.liftoff));
        const rocketW = fw.pos.addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(fw.quat), 2.2 * fw.scale);
        const kf = ease.inOut(span(t, ENVOL.follow[0], ENVOL.follow[1]));
        return {
          pos: b.pos.lerp(c.pos, kc).add(L2Wdir(new THREE.Vector3(0, 1, 0)).multiplyScalar(LAUNCH.KL * 3 * kf)),
          target: b.target.lerp(c.target, kc).lerp(rocketW, kf * 0.85),
          box: mixV(PHONE_BOX.B, PHONE_BOX.C, kc),
        };
      };
      if (t <= FREE) {
        ({ pos: pos2, target: target2, box } = follow(t));
        fov2 = SHOTS.C.fov;
      } else {
        // Puis la caméra part avec elle et s'en éloigne jusqu'au cadre de l'escale 1 : sa place et sa cible, vues
        // d'un point d'attache, glissent de celles du suivi à celles de l'espace (la distance en progression
        // géométrique), et ce point, d'abord sur la fusée, passe à sa place de croisière quand la caméra est déjà
        // loin. Le cadre atteint (PULLED), la caméra
        // ne bouge plus : la fusée fait le tour de la planète sous nos yeux.
        const f0 = follow(FREE), at0 = flight(FREE).pos;
        const O0 = f0.pos.sub(at0), O1 = ESPACE_CAM.pos.clone().sub(end.pos);
        const T0 = f0.target.sub(at0).divideScalar(O0.length()), T1 = ESPACE_CAM.target.clone().sub(end.pos).divideScalar(O1.length());
        const e = ease.inOut(span(t, FREE, PULLED));
        const anchor = flight(t).pos.lerp(end.pos, ease.inOut(span(t, PULLED - 1, PULLED)));
        const len = Math.exp(mix(Math.log(O0.length()), Math.log(O1.length()), e));
        const turn = new THREE.Quaternion().setFromUnitVectors(O0.clone().normalize(), O1.clone().normalize());
        const dir = O0.clone().normalize().applyQuaternion(new THREE.Quaternion().slerp(turn, e));
        pos2 = anchor.clone().addScaledVector(dir, len);
        target2 = anchor.clone().addScaledVector(T0.lerp(T1, e), len);
        fov2 = mix(SHOTS.C.fov, ESPACE_CAM.fov, e);
        up = LAUNCH.U.clone().lerp(upWorld, e).normalize();
        box = mixV(f0.box, PHONE_BOX.espace, e);
      }
    }
    placeCamera(cur, pos2, target2, fov2, box, up);
    // Le soleil : resserré sur le pas de tir, puis sur le cadre de l'espace.
    const far = clip === "envol" ? ease.inOut(span(t, ENVOL.back[0] + 0.3, ENVOL.back[1])) : 0;
    const half = Math.exp(mix(Math.log(9 * LAUNCH.KL), Math.log(5), far));
    const focus = LAUNCH.P.clone().lerp(new THREE.Vector3(0, 0, 0), far);
    if (far >= 1) {
      // Exactement le soleil de setupScene : l'image finale est celle de l'espace.
      cur.key.position.set(-4, 8, 6);
      cur.key.target.position.set(0, 0, 0);
      Object.assign(cur.key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 30 });
      cur.key.shadow.camera.updateProjectionMatrix();
      cur.key.shadow.normalBias = 0;
    } else aimSun(cur, focus, half);
  };
  g.userData.animate = animate;
  g.userData.camera = { ...shotWorld(SHOTS.A), pos: shotWorld(SHOTS.A).pos.toArray(), target: shotWorld(SHOTS.A).target.toArray() };
  return g;
}

for (const clip of ["pied", "echelle", "trappe", "envol"]) SCENES[`decollage-${clip}`] = (M) => decollage(M, clip);

// L'escale 1 : l'espace, avec la fusée en croisière (où l'envol la laisse). Le départ, lui, garde l'espace d'avant le
// décollage, sans elle : la scène « depart » (START.scene sur le site).
{
  const espace = SCENES.espace;
  SCENES.depart = espace;
  SCENES.espace = (M) => {
    const g = espace(M);
    const ship = rocket(M);
    const R = ship.userData;
    ship.scale.setScalar(CRUISE.scale);
    R.flame.visible = true;
    g.add(ship);
    const base = g.userData.animate;
    g.userData.animate = (phi, cur) => {
      base(phi, cur);
      const c = cruise(phi);
      ship.position.copy(c.pos);
      ship.quaternion.copy(c.quat);
      R.flames.forEach((f, i) => f.scale.set(...cruiseFlame(i, phi)));
    };
    g.userData.animate(0);
    return g;
  };
}

// Le moteur passe l'état courant (caméra, lumière, cadrage) aux scènes animées : ces plans bougent la caméra.
{
  const setup = window.setupScene;
  window.setupScene = (name, themeName, accent, w = 1280, h = 720, box = null) => {
    const ok = setup(name, themeName, accent, w, h, box);
    current.box = box;
    current.size = [w, h];
    current.scene.traverse((o) => o.isDirectionalLight && o.castShadow && (current.key = o));
    current.obj.userData.animate?.(0, current);
    return ok;
  };
  window.drawFrame = (i, n) => {
    const phi = (Math.PI * 2 * i) / n;
    const { scene, camera, obj, base, sway } = current;
    obj.rotation.y = base + sway * Math.sin(phi);
    obj.userData.animate?.(phi, current);
    renderer.render(scene, camera);
  };
  window.renderFrame = (i, n) => {
    window.drawFrame(i, n);
    return canvas.toDataURL("image/png");
  };
}
