// ——— Le décollage : la fusée du copilote, sur la planète de l'escale 1 ———
// Au clic sur « Décoller », le site montre le copilote au pied de sa fusée : il explique le voyage, grimpe à bord,
// et la fusée décolle. Quatre plans, que le site enchaîne (components/voyage/Decollage.astro) :
//   decollage-pied     boucle d'1 s : au pied de l'échelle, il salue (première bulle) ;
//   decollage-echelle  2,5 s        : il grimpe jusqu'à la trappe ;
//   decollage-trappe   boucle d'1 s : à la trappe, tourné vers nous, il salue (deuxième bulle) ;
//   decollage-envol    9 s          : il entre, la trappe se ferme, l'échelle se couche, compte à rebours, la fusée
//                                     décolle ; la caméra la suit, puis recule jusqu'au cadre de l'escale 1.
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
  // La trappe face à la caméra (un peu à gauche), entre deux ailerons ; le hublot au-dessus.
  const HATCH = { phi: -0.12, y: 1.5, hw: 0.36, hh: 0.56 }; // direction, centre, demi-largeur (arc), demi-hauteur
  const PORT = { phi: 0.02, y: 2.85, r: 0.23 };
  const inHatch = (phi, y, grow = 0) => {
    const u = (angleTo(phi, HATCH.phi) * radius(y)) / (HATCH.hw + grow), v = (y - HATCH.y) / (HATCH.hh + grow);
    return u ** 4 + v ** 4 < 1;
  };
  const inPort = (phi, y) => (angleTo(phi, PORT.phi) * radius(y)) ** 2 + (y - PORT.y) ** 2 < PORT.r ** 2;
  const dirOf = (phi) => new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi));
  const onBody = (phi, y, out = 0) => dirOf(phi).multiplyScalar(radius(y) + out).setY(y);
  return { LIFT, radius, NOSE, HATCH, PORT, inHatch, inPort, dirOf, onBody };
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
  const stepAt = R.dirOf(H.phi).multiplyScalar(R.radius(H.y - H.hh) + 0.2).setY(H.y - H.hh - 0.03);
  const step = mesh(new RoundedBoxGeometry(0.62, 0.05, 0.42, 2, 0.015), brass, stepAt.x, stepAt.y, stepAt.z);
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

// L'échelle : deux montants de laiton, cinq barreaux d'argile. Son origine est à son pied (la charnière) ; elle
// monte selon y, et `tilt` (rotation x) la penche vers la fusée (valeur négative) ou la couche vers l'extérieur.
const LADDER = { length: 1.36, rungs: 5 };
function ladder(M) {
  const yaw = new THREE.Group();
  const tilt = new THREE.Group();
  yaw.add(tilt);
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a063, metalness: 0.9, roughness: 0.32 });
  for (const x of [-0.25, 0.25]) tilt.add(mesh(new THREE.CylinderGeometry(0.032, 0.032, LADDER.length + 0.18, 14), brass, x, (LADDER.length + 0.18) / 2, 0));
  for (let k = 1; k <= LADDER.rungs; k++) {
    const r = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.5, 12), M.clay, 0, (k * LADDER.length) / LADDER.rungs, 0);
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
  const s = new THREE.Vector3(h.z, 0, -h.x); // à sa droite, vue de l'échelle
  const PAD_Y = 0.16;
  const stepY = ROCKET.LIFT + ROCKET.HATCH.y - ROCKET.HATCH.hh - 0.005; // le dessus du marchepied
  const topR = ROCKET.radius(ROCKET.HATCH.y - ROCKET.HATCH.hh) + 0.42; // le haut de l'échelle, au bord du marchepied
  const rise = stepY - PAD_Y;
  const footR = topR + Math.sqrt(LADDER.length ** 2 - rise ** 2);
  const lean = Math.asin((footR - topR) / LADDER.length);
  const at = (r, y = 0) => R0.clone().addScaledVector(h, r).setY(y);
  return {
    R0, h, s, PAD_Y, stepY, topR, footR, lean, at,
    // Où il se tient : au pied de l'échelle, un pas à sa gauche (vu de la caméra) ; puis devant l'échelle ; puis sur
    // le marchepied ; puis dedans.
    standA: at(footR + 0.15, PAD_Y).addScaledVector(s, -0.85),
    foot: at(footR + 0.32, PAD_Y),
    landing: at(topR - 0.2, stepY),
    inside: at(ROCKET.radius(ROCKET.HATCH.y) - 0.65, stepY),
    // Les directions où il regarde (rotation y de son corps ; son avant est +z).
    faceCam: 0.25,
    faceLadder: Math.atan2(-h.x, -h.z),
  };
})();

// Les poses du copilote. Chaque pose : position (pieds), lacet du corps, rebond, inclinaison, tête, bras droit (le
// salut) et gauche, coudes, jambes. Les angles des bras suivent ceux de copilot() : z ouvre le bras sur le côté
// (positif à droite, négatif à gauche), x le lève vers l'avant (négatif).
function posePilot(parts, root, p) {
  const { fig, head, wave, rest, legL, legR } = parts;
  root.position.copy(p.pos);
  root.rotation.set(0, p.yaw, 0);
  fig.position.set(0, p.bob ?? 0, 0);
  fig.rotation.set(p.lean ?? 0, 0, p.roll ?? 0);
  head.rotation.set(...(p.head ?? [0, 0, 0]));
  wave.a.rotation.set(...p.ra);
  wave.elbow.rotation.set(...p.re);
  rest.a.rotation.set(...p.la);
  rest.elbow.rotation.set(...p.le);
  legL.rotation.set(p.ll ?? 0, 0, 0);
  legR.rotation.set(p.lr ?? 0, 0, 0);
}
const NEUTRAL = { ra: [0, 0, 0.18], re: [-0.25, 0, 0], la: [0, 0, -0.18], le: [-0.25, 0, 0] };
// Le salut : bras droit ouvert, avant-bras levé qui balance une fois par seconde (u ∈ [0, 1)).
const waving = (u, amp = 1) => ({
  ra: [0.1, 0, 1.25 + 0.06 * amp * Math.sin(2 * Math.PI * u)],
  re: [0, 0, 1.2 + 0.5 * amp * Math.sin(2 * Math.PI * u)],
});
const lerpPose = (a, b, t) => {
  const out = {};
  for (const k of Object.keys(b)) {
    if (k === "pos") out.pos = a.pos.clone().lerp(b.pos, t);
    else if (Array.isArray(b[k])) out[k] = mixV(a[k] ?? [0, 0, 0], b[k], t);
    else out[k] = mix(a[k] ?? 0, b[k], t);
  }
  return out;
};

// Au pied de l'échelle, tourné vers nous (un peu vers la bulle, à gauche), il salue.
const poseA = (u) => ({
  pos: SITE.standA,
  yaw: SITE.faceCam - 0.4,
  bob: 0.012 * Math.sin(4 * Math.PI * u),
  head: [0.05, 0.12, 0.06 * Math.sin(2 * Math.PI * u + 0.5)],
  ...waving(u),
  la: [-0.15, 0, -0.32],
  le: [-0.5, 0, 0],
  ll: 0,
  lr: 0,
  lean: 0,
  roll: 0.02 * Math.sin(2 * Math.PI * u),
});
// Sur le marchepied, tourné vers nous, la main gauche au cadre de la trappe, il salue.
const poseB = (u) => ({
  pos: SITE.landing,
  yaw: SITE.faceCam - 0.3,
  bob: 0.01 * Math.sin(4 * Math.PI * u),
  head: [0.08, -0.1, 0.06 * Math.sin(2 * Math.PI * u + 0.5)],
  ...waving(u),
  la: [-0.6, 0, -1.0],
  le: [-0.9, 0, 0],
  ll: 0,
  lr: 0,
  lean: 0,
  roll: 0.02 * Math.sin(2 * Math.PI * u),
});

// La montée (plan « echelle », t en secondes sur 2,5 s) : il cesse de saluer, fait un pas de côté jusqu'à l'échelle en
// se tournant vers elle, grimpe cinq barreaux, et se retourne vers nous sur le marchepied.
function poseClimb(t) {
  const CLIMB0 = 0.85, CLIMB1 = 2.05, TURN1 = 2.5;
  if (t < CLIMB0) {
    const k = span(t, 0.1, CLIMB0);
    const turn = ease.inOut(span(t, 0.05, 0.7));
    const stepPhase = Math.sin(Math.PI * 2 * k);
    const from = poseA(t);
    const to = { ...NEUTRAL, pos: SITE.foot, yaw: SITE.faceLadder, bob: 0, head: [-0.1, 0, 0], ll: 0, lr: 0, lean: 0.06, roll: 0 };
    const p = lerpPose(from, to, ease.inOut(span(t, 0.05, 0.45)));
    p.pos = SITE.standA.clone().lerp(SITE.foot, ease.inOut(k));
    p.yaw = mix(SITE.faceCam - 0.4, SITE.faceLadder, turn);
    p.bob = 0.04 * Math.abs(stepPhase) * (k > 0 && k < 1 ? 1 : 0);
    p.ll = -0.45 * stepPhase * (k < 1 ? 1 : 0);
    p.lr = 0.45 * stepPhase * (k < 1 ? 1 : 0);
    return p;
  }
  if (t < CLIMB1) {
    // Cinq barreaux, une main puis l'autre ; le pied suit la main opposée.
    const k = span(t, CLIMB0, CLIMB1) * LADDER.rungs;
    const n = Math.floor(Math.min(LADDER.rungs - 1e-6, k));
    const f = k - n;
    const lift = ease.inOut(f);
    const y = SITE.PAD_Y + ((n + lift) / LADDER.rungs) * (SITE.stepY - SITE.PAD_Y);
    const r = mix(SITE.footR, SITE.topR, (y - SITE.PAD_Y) / (SITE.stepY - SITE.PAD_Y)) + 0.32;
    const pos = SITE.at(r, y);
    const odd = n % 2 === 0;
    const reachHi = -2.75, reachLo = -2.0;
    const armA = odd ? mix(reachLo, reachHi, lift) : mix(reachHi, reachLo, lift);
    const armB = odd ? mix(reachHi, reachLo, lift) : mix(reachLo, reachHi, lift);
    const legHi = -0.75 * Math.sin(Math.PI * f);
    return {
      pos,
      yaw: SITE.faceLadder,
      bob: 0,
      lean: 0.12,
      roll: 0.05 * (odd ? 1 : -1) * Math.sin(Math.PI * f),
      head: [-0.25, 0, 0],
      ra: [armA, 0, 0.12],
      re: [-0.35, 0, 0],
      la: [armB, 0, -0.12],
      le: [-0.35, 0, 0],
      ll: odd ? legHi : 0,
      lr: odd ? 0 : legHi,
    };
  }
  // Sur le marchepied : il lâche l'échelle et se retourne vers nous, le bras qui se lève pour saluer.
  const k = ease.inOut(span(t, CLIMB1, TURN1));
  const from = { pos: SITE.landing, yaw: SITE.faceLadder, bob: 0, lean: 0.12, roll: 0, head: [-0.25, 0, 0], ra: [-2.0, 0, 0.12], re: [-0.35, 0, 0], la: [-2.75, 0, -0.12], le: [-0.35, 0, 0], ll: 0, lr: 0 };
  const to = poseB(0);
  const p = lerpPose(from, to, k);
  // Il tourne par la gauche (le plus court chemin vers la caméra).
  p.yaw = mix(SITE.faceLadder, SITE.faceCam - 0.3, k);
  p.pos = SITE.at(SITE.topR + 0.32, SITE.stepY).lerp(SITE.landing, k);
  return p;
}

// L'envol (t en secondes sur 9 s) : il se tourne vers la trappe et entre ; elle se ferme ; il paraît au hublot ;
// l'échelle se couche ; les trois feux s'allument ; la fusée tremble, s'allume, décolle.
const ENVOL = { duration: 9, enter: [0.1, 0.95], door: [0.95, 1.5], face: [1.45, 3.6], ladder: [1.6, 2.4], lights: [2.4, 3.0, 3.6], ignite: 4.2, liftoff: 4.8, follow: [4.8, 6.6], back: [6.0, 9.0] };
function poseEnter(t) {
  const [a, b] = ENVOL.enter;
  const k = span(t, a, b);
  const turn = ease.inOut(span(k, 0, 0.45));
  const walk = ease.in(span(k, 0.3, 1));
  const p = lerpPose(poseB(0), { ...NEUTRAL, pos: SITE.landing, yaw: SITE.faceLadder, bob: 0, head: [0, 0, 0], ll: 0, lr: 0, lean: 0.08, roll: 0 }, ease.inOut(span(k, 0, 0.4)));
  // Il se tourne vers la trappe (face à la fusée, comme sur l'échelle) puis avance dedans.
  p.yaw = mix(SITE.faceCam - 0.3, SITE.faceLadder, turn);
  p.pos = SITE.landing.clone().lerp(SITE.inside, walk);
  const step = Math.sin(Math.PI * 2 * span(k, 0.3, 1));
  p.ll = -0.4 * step;
  p.lr = 0.4 * step;
  p.bob = 0.03 * Math.abs(step);
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
    earth.rotation.y = -1.75 + phi;
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
    for (let i = 0; i < 46; i++) {
      const o = new THREE.Mesh(puffGeo, smokeMat);
      o.castShadow = false;
      o.visible = false;
      site.add(o);
      trail.push({ o, t0: ENVOL.liftoff + 0.25 + i * 0.075, j: [r() - 0.5, r() - 0.5, r() - 0.5], s: 0.45 + r() * 0.35 });
    }
  }

  // — La trajectoire de la fusée : d'abord droit vers le ciel de la planète, à l'échelle du pas de tir (τ en secondes
  //   depuis le décollage : un départ lent, puis de plus en plus vite) ; puis, pendant que la caméra recule, une courbe
  //   dans le monde jusqu'à sa croisière (cruise(0)), où elle grandit pour rester lisible. —
  const altitude = (tau) => (tau <= 0 ? 0 : 0.9 * tau * tau + 0.3 * Math.pow(tau, 5));
  const rocketLocal = (tau) => SITE.R0.clone().setY(SITE.PAD_Y + altitude(tau));
  const FREE = 6.0; // l'instant où elle quitte la verticale pour la courbe
  const toSite = new THREE.Matrix4().compose(LAUNCH.P, LAUNCH.Q, new THREE.Vector3(LAUNCH.KL, LAUNCH.KL, LAUNCH.KL)).invert();
  const end = cruise(0);
  const B0 = L2W(rocketLocal(FREE - ENVOL.liftoff));
  const B1 = B0.clone().addScaledVector(LAUNCH.U, 0.7);
  const B2 = end.pos.clone().addScaledVector(CRUISE.heading, -0.9);
  const B3 = end.pos.clone();
  const bezier = (s) => {
    const a = 1 - s;
    return B0.clone().multiplyScalar(a * a * a).addScaledVector(B1, 3 * a * a * s).addScaledVector(B2, 3 * a * s * s).addScaledVector(B3, s * s * s);
  };
  // La courbe part à la vitesse de la montée (sans à-coup) et arrive à l'arrêt.
  const tau0 = FREE - ENVOL.liftoff;
  const v0 = (1.8 * tau0 + 1.5 * tau0 ** 4) * LAUNCH.KL;
  const m0 = (v0 * (ENVOL.duration - FREE)) / (3 * B1.distanceTo(B0));
  const hermite = (u) => m0 * (u ** 3 - 2 * u ** 2 + u) + 3 * u ** 2 - 2 * u ** 3;
  /** La fusée dans le monde après le décollage : position, orientation, et la taille d'une unité locale. */
  const flight = (t) => {
    if (t <= FREE) return { pos: L2W(rocketLocal(t - ENVOL.liftoff)), quat: LAUNCH.Q.clone(), scale: LAUNCH.KL };
    return {
      pos: bezier(hermite(span(t, FREE, ENVOL.duration))),
      quat: LAUNCH.Q.clone().slerp(end.quat, ease.inOut(span(t, FREE, ENVOL.duration - 0.3))),
      scale: Math.exp(mix(Math.log(LAUNCH.KL), Math.log(CRUISE.scale), ease.inOut(span(t, FREE + 0.4, ENVOL.duration)))),
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
    let doorOpen = 1, ladderTilt = -SITE.lean, lit = 0, flameK = 0, shake = 0, faceK = 0, cleanup = 0, starFade = 0;
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
      starFade = ease.inOut(span(t, 6.6, 8.4));
    }
    // Le copilote : caché une fois entré.
    pilot.visible = !(clip === "envol" && t > ENVOL.enter[1]);
    posePilot(parts, pilot, pose);
    // La trappe : ouverte, elle a pivoté vers l'extérieur autour de sa charnière.
    R.door.rotation.y = -1.9 * doorOpen;
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
    const calm = ease.inOut(span(t, 7.4, 8.8));
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
    // La traînée : laissée derrière la fusée, elle gonfle puis fond.
    for (const p of trail) {
      const tau = clip === "envol" ? t - p.t0 : -1;
      p.o.visible = tau > 0 && cleanup < 1;
      if (!p.o.visible) continue;
      // Sous la tuyère, là où était la fusée à l'instant où la bouffée est partie, à sa taille d'alors.
      const w = flight(p.t0);
      const k = w.scale / LAUNCH.KL;
      const at = w.pos.addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(w.quat), -0.4 * w.scale).applyMatrix4(toSite);
      p.o.position.set(at.x + p.j[0] * 0.3 * k, at.y + p.j[1] * 0.3 * k, at.z + p.j[2] * 0.3 * k);
      const s = p.s * k * (0.4 + 1.2 * (1 - Math.exp(-tau / 0.5))) * Math.max(0, 1 - tau / 2.6) * (1 - cleanup);
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
      // De B à C (on recule pour voir toute la fusée), puis on la suit, puis on rejoint la caméra de l'espace.
      const b = shot("B"), c = shot("C");
      const kc = ease.inOut(span(t, 1.2, 3.6));
      let p = b.pos.lerp(c.pos, kc), tg = b.target.lerp(c.target, kc);
      // Suivre : la cible monte avec la fusée (un peu en retard), la caméra se soulève.
      const fw = flight(Math.max(t, ENVOL.liftoff));
      const rocketW = fw.pos.addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(fw.quat), 2.2 * fw.scale);
      const kf = ease.inOut(span(t, ENVOL.follow[0], ENVOL.follow[1]));
      tg = tg.lerp(rocketW, kf * 0.85);
      p = p.add(L2Wdir(new THREE.Vector3(0, 1, 0)).multiplyScalar(LAUNCH.KL * 3 * kf));
      // Reculer : la position glisse depuis la planète, de plus en plus loin, jusqu'à la caméra de l'espace.
      const kb = span(t, ENVOL.back[0], ENVOL.back[1]);
      const eb = ease.inOut(kb);
      const C = LAUNCH.C;
      const d0 = p.distanceTo(C), d1 = ESPACE_CAM.pos.distanceTo(C);
      const dir0 = p.clone().sub(C).normalize(), dir1 = ESPACE_CAM.pos.clone().sub(C).normalize();
      const dist = Math.exp(mix(Math.log(d0), Math.log(d1), ease.inOut(span(kb, 0.0, 1))));
      const qd = new THREE.Quaternion().setFromUnitVectors(dir0, dir1);
      const dir = dir0.clone().applyQuaternion(new THREE.Quaternion().slerp(qd, ease.inOut(span(kb, 0.05, 1))));
      pos2 = kb > 0 ? C.clone().addScaledVector(dir, dist) : p;
      target2 = tg.lerp(ESPACE_CAM.target, ease.inOut(span(kb, 0.15, 1)));
      fov2 = mix(c.fov, ESPACE_CAM.fov, eb);
      up = LAUNCH.U.clone().lerp(upWorld, ease.inOut(span(kb, 0.1, 0.9))).normalize();
      box = mixV(mixV(PHONE_BOX.B, PHONE_BOX.C, kc), PHONE_BOX.espace, ease.inOut(span(kb, 0.2, 1)));
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
