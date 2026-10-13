// ——— Les passages : d'une escale à la suivante ———
// Au clic vers l'escale suivante, l'objet de l'escale part vers elle (la fusée vers la Terre, l'avion au loin, la
// voiture rentre à la maison…) ; le site plonge ensuite vers la suivante, comme d'habitude. Deux façons de le montrer,
// selon ce qu'il y a derrière l'objet :
// - « sprites » (espace, terre) : la boucle, à l'écran, continue ; le site dessine l'objet qui part par-dessus, dans un
//   canvas, depuis une planche de sprites (passage-render.mjs) : l'objet seul, image par image, et une pièce du fond
//   vide qui cache celui de la boucle (derrière lui, rien ne bouge : des étoiles fixes).
// - « clip » (les autres : derrière l'objet, la scène bouge) : une vidéo, comme la sortie du voyage. Elle a `starts`
//   départs, un par fraction de la boucle, de `length` images chacun : le monde y continue à la phase de son départ,
//   l'objet part de sa place à cet instant. Le site attend le prochain départ pour passer de la boucle au clip sans saut.
// Les nombres du site (départs, longueurs, instant du plongeon) viennent de passage-render.mjs, qui les lit ici
// (src/data/passages.json). Ce fichier suit decollage-scenes.js dans voyage.html (build-voyage.cjs) et en reprend
// les outils.

const PASSAGE_FPS = 24;
// Par escale : la boucle de sa scène (s), le cycle de l'objet dans la boucle (s, pour les sprites), le nombre de
// départs (les clips), l'instant où le site plonge vers l'escale suivante (s depuis le départ) et, si l'objet ne
// part pas vers le point qu'on clique, le point du monde vers lequel plonger (`origin`). `off` : le site ne le joue
// pas (passage-render.mjs le laisse hors de passages.json).
const PASSAGES = {
  espace: { kind: "sprites", loop: 24, cycle: 8, end: 2.15, dive: 1.35 },
  terre: { kind: "sprites", loop: 24, cycle: 4, end: 4.35, dive: 3.55 },
  // Désactivé (Cantin, 2026-10-13) : le Hublot plonge tout de suite, sans traverser les nuages.
  avion: { kind: "clip", loop: 8, starts: 8, dive: 1.35, off: true },
  paris: { kind: "clip", loop: 4, starts: 8, dive: 1.2 },
  monuments: { kind: "clip", loop: 4, starts: 8, dive: 1.35, origin: [1.3, 2.35, -6] },
  route: { kind: "clip", loop: 8, starts: 8, dive: 1.4 },
  maison: { kind: "sprites", loop: 4, cycle: 4, end: 2.0, dive: 1.25 },
  salon: { kind: "sprites", loop: 4, cycle: 4, end: 2.0, dive: 1.2 },
  calendrier: { kind: "clip", loop: 4, starts: 8, dive: 1.3 },
};
// Un clip dure jusqu'à ce que le voile de l'escale suivante couvre tout (le plongeon, 0,75 s).
const clipLength = (name) => Math.ceil((PASSAGES[name].dive + 0.8) * PASSAGE_FPS);

/**
 * Le clip d'une escale : `depart(M, g, parts)` renvoie `go(t, phi0, phase)`, qui place l'objet t secondes après un
 * départ pris à la phase phi0 de la boucle (le monde, lui, est déjà à sa phase : `phase(τ)` convertit les secondes).
 */
function clipPassage(name, depart) {
  const P = PASSAGES[name];
  const length = clipLength(name);
  SCENES[`${name}-passage`] = (M) => {
    const g = SCENES[name](M);
    const base = g.userData.animate;
    const laps = g.userData.laps ?? 1;
    const phase = (tau) => (2 * Math.PI * laps * tau) / P.loop;
    const go = depart(M, g, g.userData.parts);
    const frames = P.starts * length;
    g.userData.frames = frames;
    // Une image clé au début de chaque départ : le site y saute.
    g.userData.keys = Array.from({ length: P.starts }, (_, s) => s * length);
    g.userData.laps = 1;
    g.userData.animate = (phi) => {
      const i = Math.min(frames - 1, Math.round((phi / (Math.PI * 2)) * frames));
      const s = Math.floor(i / length), t = (i - s * length) / PASSAGE_FPS;
      const tau0 = (s * P.loop) / P.starts;
      base(phase(tau0 + t));
      go(t, phase(tau0), phase);
    };
    g.userData.passage = { ...P, length, origin: P.origin ?? null };
    g.userData.animate(0);
    return g;
  };
}

// ——— 001 → 002 : la fusée remet les gaz vers la Terre ———
// Sa flamme s'allonge, elle tremble, puis elle file vers la Terre en laissant sa traînée, rapetisse au loin et s'y fond.
// Les temps, en secondes depuis le clic.
const FUSEE = { throttle: 0.35, go: 0.2, arrive: 1.9, scale: 0.012, trail: 0.7, puff: 0.015 };
// Le chemin : une courbe de Bézier qui part dans l'axe de la croisière et arrive face à la caméra, sur la Terre.
const FUSEE_PATH = (() => {
  const P0 = CRUISE.pos.clone();
  const E = LAUNCH.EARTH.clone();
  const n = ESPACE_CAM.pos.clone().sub(E).normalize(); // de la Terre vers nous
  const T = E.clone().addScaledVector(n, 0.42 * 1.03); // juste au-dessus de sa face visible
  const B1 = P0.clone().addScaledVector(CRUISE.heading, 0.9);
  const B2 = T.clone().addScaledVector(n, 1.3);
  return arcLength((s) => {
    const a = 1 - s;
    return P0.clone().multiplyScalar(a * a * a).addScaledVector(B1, 3 * a * a * s).addScaledVector(B2, 3 * a * s * s).addScaledVector(T, s * s * s);
  });
})();

/** Une courbe `at(s)`, s ∈ [0, 1], parcourue à la longueur : `along(d)` (d de 0 à L), sa direction `dirAlong(d)`. */
function arcLength(at) {
  const N = 2000, len = [0];
  let prev = at(0);
  for (let i = 1; i <= N; i++) {
    const p = at(i / N);
    len.push(len[i - 1] + p.distanceTo(prev));
    prev = p;
  }
  const L = len[N];
  const sOf = (d) => {
    let lo = 0, hi = N;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (len[mid] < d) lo = mid;
      else hi = mid;
    }
    return (lo + (d - len[lo]) / Math.max(1e-9, len[hi] - len[lo])) / N;
  };
  const along = (d) => at(sOf(Math.min(L, Math.max(0, d))));
  const dirAlong = (d) => {
    const s = sOf(Math.min(L - 1e-4, Math.max(0, d)));
    return at(Math.min(1, s + 1e-4)).sub(at(Math.max(0, s - 1e-4))).normalize();
  };
  return { at, L, along, dirAlong };
}

/**
 * Un objet qui suit une trajectoire le nez devant, sans tourner sur lui-même (chaque pas le fait tourner du plus petit
 * angle qui amène son axe `axis` sur la nouvelle direction), depuis l'orientation `q0`. `dirAt(t)` : la direction à t.
 */
function noseAlong(q0, axis, dirAt, end) {
  const STEP_S = 1 / 480;
  const turned = [q0.clone()];
  let a = axis.clone().applyQuaternion(q0);
  for (let t = STEP_S; t <= end + STEP_S; t += STEP_S) {
    const d = dirAt(t);
    turned.push(new THREE.Quaternion().setFromUnitVectors(a, d).multiply(turned[turned.length - 1]));
    a = d;
  }
  return (t) => {
    const k = Math.max(0, t) / STEP_S, i = Math.min(turned.length - 2, Math.floor(k));
    return turned[i].clone().slerp(turned[i + 1], Math.min(1, k - i));
  };
}

/** La fusée t secondes après le clic : position, orientation, taille, et l'allure de sa flamme. */
const fuseeAt = (() => {
  const { L, along, dirAlong } = FUSEE_PATH;
  // L'avancée : un départ lent, de plus en plus vite.
  const dist = (t) => L * Math.pow(span(t, FUSEE.go, FUSEE.arrive), 2.2);
  const start = cruise(0);
  const turnedAt = noseAlong(start.quat, new THREE.Vector3(0, 1, 0), (t) => (t < FUSEE.go + 0.02 ? CRUISE.heading.clone() : dirAlong(dist(Math.min(t, FUSEE.arrive)))), PASSAGES.espace.end);
  return (t) => {
    const pos = t <= FUSEE.go ? start.pos.clone() : along(dist(Math.min(t, FUSEE.arrive)));
    // Elle tremble quand les gaz montent, puis de moins en moins.
    const shake = span(t, 0, 0.12) * (1 - span(t, 0.4, 0.9)) * 0.006;
    pos.add(new THREE.Vector3(Math.sin(t * 61), 0.5 * Math.sin(t * 47 + 1), Math.sin(t * 53 + 2)).multiplyScalar(shake));
    const quat = start.quat.clone().slerp(turnedAt(t), ease.inOut(span(t, FUSEE.go - 0.1, FUSEE.go + 0.4)));
    // Elle rapetisse en s'éloignant (sa taille est celle d'un dessin) ; au bout, elle se fond dans la Terre.
    const far = Math.exp(mix(Math.log(CRUISE.scale), Math.log(FUSEE.scale), ease.inOut(span(dist(t), 0, L))));
    const scale = far * (1 - ease.in(span(t, FUSEE.arrive - 0.18, FUSEE.arrive)));
    // Les gaz : la flamme de croisière grandit et s'allonge.
    const gas = ease.out(span(t, 0, FUSEE.throttle));
    return { pos, quat, scale, gas };
  };
})();

// Les trois gouttes de la flamme, t secondes après le clic : celles de la croisière, puis plein gaz.
const fuseeFlame = (i, t) => {
  const g = fuseeAt(t).gas;
  const fl = 1 + 0.12 * Math.sin(t * 37 + i) + 0.07 * Math.sin(t * 23 + 2 * i);
  const full = [1.05 * (1 + 0.04 * Math.sin(t * 41 + i)), 1.7 * fl, 1.05 * (1 + 0.04 * Math.sin(t * 43 + i))];
  return mixV(cruiseFlame(i, 0), full, g);
};

/**
 * Une traînée de fumée : des bouffées d'argile crème laissées toutes les `every` s entre `from` et `to` là où était
 * `emit(t0)` (sa position et sa taille), qui gonflent puis fondent en `life` s ; chacune couvre au moins l'écart
 * jusqu'à la suivante, sans dépasser `wide` fois la taille de l'objet. `mat` : une autre matière que la fumée.
 * `place(t)` les pose.
 */
function smokeTrail(g, { from, to, every, life, emit, wide = 0.7, size = [0.36, 0.28], seed = 17, mat = null }) {
  const smokeMat = mat ?? new THREE.MeshStandardMaterial({ color: 0xf2ece2, roughness: 1 });
  const puffGeo = new THREE.SphereGeometry(1, 20, 14);
  const r = rng(seed);
  const puffs = [];
  for (let t0 = from; t0 < to; t0 += every) {
    const o = new THREE.Mesh(puffGeo, smokeMat);
    o.castShadow = false;
    o.visible = false;
    g.add(o);
    puffs.push({ o, t0, j: [r() - 0.5, r() - 0.5, r() - 0.5], s: size[0] + r() * size[1] });
  }
  return {
    puffs: puffs.map((p) => p.o),
    place(t) {
      for (const p of puffs) {
        const tau = t - p.t0;
        p.o.visible = tau > 0 && tau < life;
        if (!p.o.visible) continue;
        const e = emit(p.t0);
        const gap = emit(p.t0 + every).pos.distanceTo(e.pos);
        p.o.position.set(e.pos.x + p.j[0] * 0.3 * e.scale, e.pos.y + p.j[1] * 0.3 * e.scale, e.pos.z + p.j[2] * 0.3 * e.scale);
        const s = Math.min(Math.max(p.s * e.scale, 0.6 * gap), wide * e.scale) * (0.4 + 1.2 * (1 - Math.exp(-tau / 0.4))) * Math.max(0, 1 - tau / life);
        p.o.scale.setScalar(Math.max(1e-5, s));
      }
    },
  };
}

// L'espace d'avant le décollage (sans fusée), la fusée de la croisière et sa traînée. userData.sprite : ce que
// passage-render.mjs fait rendre (la boucle à la phase phi, l'objet t secondes après le clic, l'un sans l'autre).
SCENES["espace-passage"] = (M) => {
  const g = SCENES.depart(M);
  const world = [...g.children];
  const ship = rocket(M);
  const R = ship.userData;
  R.flame.visible = true;
  g.add(ship);
  const trail = smokeTrail(g, {
    from: FUSEE.go + 0.08,
    to: FUSEE.arrive - 0.1,
    every: FUSEE.puff,
    life: FUSEE.trail,
    // Sous la tuyère, là où était la fusée à l'instant où la bouffée est partie, à sa taille d'alors.
    emit: (t0) => {
      const e = fuseeAt(t0);
      return { pos: e.pos.addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(e.quat), -0.4 * e.scale), scale: e.scale };
    },
  });
  const base = g.userData.animate;
  g.userData.laps = 1;
  g.userData.sprite = {
    world,
    objects: [ship, ...trail.puffs],
    /** La boucle à la phase phi (0 → 2π × 3 : 24 s), la fusée en croisière. */
    loopAt(phi) {
      base(phi);
      const c = cruise(phi);
      ship.position.copy(c.pos);
      ship.quaternion.copy(c.quat);
      ship.scale.setScalar(CRUISE.scale);
      ship.visible = true;
      R.flames.forEach((f, i) => f.scale.set(...cruiseFlame(i, phi)));
      trail.place(-1);
    },
    /** La fusée t secondes après le clic. */
    departAt(t) {
      const w = fuseeAt(t);
      ship.position.copy(w.pos);
      ship.quaternion.copy(w.quat);
      ship.scale.setScalar(Math.max(1e-5, w.scale));
      ship.visible = w.scale > 1e-4;
      R.flames.forEach((f, i) => f.scale.set(...fuseeFlame(i, t)));
      trail.place(t);
    },
    /** Le point vers lequel le site plonge : là où elle se fond dans la Terre. */
    origin: FUSEE_PATH.at(1),
  };
  g.userData.passage = { ...PASSAGES.espace, laps: 3 };
  g.userData.animate = (phi) => {
    g.userData.sprite.loopAt(0);
    g.userData.sprite.departAt((phi / (Math.PI * 2)) * PASSAGES.espace.end);
  };
  g.userData.sprite.loopAt(0);
  return g;
};

// ——— 008 → 003 : la voiture de laiton rentre à la maison ———
// D'où qu'elle soit sur le meilleur trajet, elle rentre : si elle s'éloignait, elle freine, fait demi-tour sur place,
// puis file jusqu'au bout du trajet, devant la maison, et s'y arrête. On plonge ensuite dans la maison (le point qu'on
// clique, son toit).
clipPassage("route", (M, g, { mine, best }) => {
  const T = 1.25; // l'arrivée
  const SPEED = (2 * Math.PI) / PASSAGES.route.loop; // la phase de la boucle, par seconde
  return (t, phi0) => {
    // Dans la boucle, elle fait l'aller-retour : u = pingpong(phi), du/dt = sin(phi)/2 × la vitesse de la phase.
    const u0 = pingpong(phi0), v0 = (Math.sin(phi0) / 2) * SPEED;
    // De là, vers u = 0, à l'arrêt en T (une cubique d'Hermite) : si elle s'éloignait, elle va un peu plus loin,
    // s'arrête, et revient.
    const x = Math.min(1, t / T);
    const u = Math.max(0, (2 * x ** 3 - 3 * x ** 2 + 1) * u0 + (x ** 3 - 2 * x ** 2 + x) * T * v0);
    const p = best.getPointAt(u);
    mine.position.set(p.x, 0.105, p.z);
    // Le nez dans le sens de la marche : vers la salle tant qu'elle s'en approche, puis vers la maison ; le demi-tour
    // se fait sur place, quand elle s'arrête.
    let back = -1;
    // Dans la boucle, elle regarde vers la salle tant que sin(phi) ≥ 0 (même arrêtée à un bout).
    if (Math.sin(phi0) >= 0) {
      // L'instant où elle s'arrête : u'(x) = 0, entre 0 et 1 (tout de suite si elle était déjà arrêtée).
      const a = 6 * u0 + 3 * T * v0, b = -6 * u0 - 4 * T * v0, c = T * v0;
      const disc = Math.max(0, b * b - 4 * a * c);
      const xs = a ? [(-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a)].filter((r) => r > 0 && r < 1) : [];
      const t0 = Math.max(0, (xs.length ? Math.min(...xs) : 0) * T - 0.12);
      back = 1 - 2 * ease.inOut(span(t, t0, t0 + 0.32));
    }
    const tg = best.getTangentAt(u);
    const turn = Math.acos(Math.max(-1, Math.min(1, back))); // 0 vers la salle, π vers la maison
    mine.rotation.y = Math.atan2(tg.x, tg.z) + turn;
  };
});

// Une note de laiton, comme celles du tourne-disque (salon) : tête ovale, hampe, un crochet si `flag`.
function brassNote(M, flag = true) {
  const n = new THREE.Group();
  const h = mesh(new THREE.SphereGeometry(0.075, 20, 16), M.accent);
  h.scale.set(1.25, 0.9, 0.9);
  h.rotation.z = 0.35;
  n.add(h);
  n.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8), M.accent, 0.075, 0.16, 0));
  if (flag) {
    const f = mesh(new RoundedBoxGeometry(0.14, 0.03, 0.025, 2, 0.01), M.accent, 0.13, 0.27, 0);
    f.rotation.z = -0.7;
    n.add(f);
  }
  n.rotation.y = 0.25;
  return n;
}

/** Une courbe de Bézier cubique entre quatre points. */
const bezier3 = (a, b, c, d) => (s) => {
  const k = 1 - s;
  return a.clone().multiplyScalar(k * k * k).addScaledVector(b, 3 * k * k * s).addScaledVector(c, 3 * k * s * s).addScaledVector(d, s * s * s);
};

// ——— 005 → 009 : l'avion fait le tour de la Terre et s'y pose ———
// Comme la fusée autour de la planète à anneau : il part de sa place, à droite du globe, passe devant lui vers la
// gauche, le contourne par derrière (le globe le cache), revient devant, puis descend en spirale et se pose sur sa
// face, en rapetissant (sa taille est celle d'un dessin). Le globe le cache par sa profondeur seule (`occluders` :
// une sphère qui n'écrit que dans le tampon de profondeur) : sa silhouette ne change pas quand il tourne.
const AVION = { go: 0.15, land: 3.4, turns: 1.2, r: 2.05, tilt: 0.42, ground: 1.53, far: 0.3 };
SCENES["terre-passage"] = (M) => {
  const g = SCENES.terre(M);
  const { jet, heading } = g.userData.parts;
  const world = g.children.filter((o) => o !== jet);
  const base = g.userData.animate;
  base(0);
  g.updateMatrixWorld(true);
  const p0 = jet.position.clone(), q0 = jet.quaternion.clone(), s0 = jet.scale.x;
  // Le plan du tour : celui du point de départ et du cap de l'avion (il part sans à-coup), qui se penche ensuite vers
  // nous autour de l'axe du départ, pour que le tour s'ouvre comme un anneau vu de biais.
  const e1 = p0.clone().normalize();
  const e2 = heading.clone().addScaledVector(e1, -heading.dot(e1)).normalize();
  const n = new THREE.Vector3().crossVectors(e1, e2).normalize();
  const r0 = p0.length();
  const END = AVION.turns * Math.PI * 2;
  // Où il se pose : sur la face du globe tournée vers nous, un peu au-dessus de son centre.
  const cam = new THREE.Vector3(0.6, 0.9, 7.4);
  const landDir = cam.clone().normalize().add(new THREE.Vector3(0.12, 0.22, 0)).normalize();
  const orbitDir = (a) => {
    // Le plan se penche dans le premier quart de tour : devant le globe, l'avion passe plus bas ; derrière, plus haut.
    const tilt = AVION.tilt * ease.inOut(Math.min(1, a / (Math.PI / 2)));
    const m = e2.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(n, Math.sin(tilt));
    return e1.clone().multiplyScalar(Math.cos(a)).addScaledVector(m, Math.sin(a)).normalize();
  };
  // La descente : sur le dernier tiers de tour, la direction glisse vers le point d'atterrissage et le rayon fond.
  const DESCENT = END - (2 * Math.PI) / 3;
  const pathAt = (a) => {
    const k = ease.inOut(span(a, DESCENT, END));
    const d = orbitDir(a);
    const dir = k > 0 ? d.clone().lerp(landDir, k).normalize() : d;
    // Il se rapproche un peu du globe dans le premier demi-tour (il reste dans le cadre du téléphone), puis descend.
    return dir.multiplyScalar(mix(mix(r0, AVION.r, ease.inOut(span(a, 0, Math.PI))), AVION.ground, k));
  };
  // L'angle parcouru : un départ en douceur, puis vite, puis il ralentit pour se poser.
  const angleAt = (t) => {
    const u = span(t, AVION.go, AVION.land);
    return END * (0.3 * u + 0.7 * ease.inOut(u));
  };
  const look = new THREE.Matrix4();
  const upLoop = new THREE.Vector3(0, 1, 0).applyQuaternion(q0);
  const quatAt = (t) => {
    const a = angleAt(t);
    const f = pathAt(Math.min(END, a + 1e-3)).sub(pathAt(Math.max(0, a - 1e-3))).normalize();
    // Le ventre vers la Terre : son haut passe, sur un demi-tour, de celui de sa pose dans la boucle à la verticale du
    // lieu (sans se mettre sur la tranche d'un coup) ; sa droite suit.
    const up = upLoop.clone().lerp(pathAt(a).normalize(), ease.inOut(span(a, 0, Math.PI))).normalize();
    const x = new THREE.Vector3().crossVectors(up, f).normalize();
    const y = new THREE.Vector3().crossVectors(f, x);
    return new THREE.Quaternion().setFromRotationMatrix(look.makeBasis(x, y, f));
  };
  /** L'avion t secondes après le clic : position, orientation, taille. */
  const avionAt = (t) => {
    const a = angleAt(t);
    const pos = pathAt(a);
    // De sa pose dans la boucle à celle du tour, en un instant.
    const q = q0.clone().slerp(quatAt(Math.min(t, AVION.land - 1e-3)), ease.inOut(span(t, 0, AVION.go + 0.15)));
    // Il rapetisse vite au début : devant le globe, il ne le cache pas.
    const far = Math.exp(mix(0, Math.log(AVION.far), ease.out(span(a, 0, END))));
    // Posé : un petit rebond des roues.
    pos.addScaledVector(pos.clone().normalize(), 0.03 * Math.sin(Math.PI * span(t, AVION.land, AVION.land + 0.25)) * far);
    return { pos, quat: q, scale: s0 * far };
  };
  // Le globe, pour la profondeur seule : il cache l'avion qui passe derrière lui.
  const occluder = new THREE.Mesh(new THREE.SphereGeometry(1.5, 128, 96), new THREE.MeshBasicMaterial({ colorWrite: false }));
  occluder.renderOrder = -1;
  occluder.visible = false;
  g.add(occluder);
  g.userData.sprite = {
    world,
    objects: [jet],
    occluders: [occluder],
    loopAt(phi) {
      base(phi);
      jet.scale.setScalar(s0);
      jet.visible = true;
    },
    departAt(t) {
      const a = avionAt(t);
      jet.position.copy(a.pos);
      jet.quaternion.copy(a.quat);
      jet.scale.setScalar(a.scale);
      jet.visible = true;
    },
    origin: pathAt(END),
  };
  g.userData.passage = { ...PASSAGES.terre, laps: 3 };
  g.userData.animate = (phi) => {
    g.userData.sprite.loopAt(0);
    g.userData.sprite.departAt((phi / (Math.PI * 2)) * PASSAGES.terre.end);
    occluder.visible = false;
  };
  g.userData.sprite.loopAt(0);
  return g;
};

// ——— 009 → 002 : l'avion descend vers Paris ———
// Par le hublot, l'horizon penche un peu et remonte (l'avion pique du nez), puis une couche de nuages monte du bas et
// l'enveloppe : le hublot se remplit de blanc, et l'on plonge vers Paris. L'aile, elle, ne bouge pas : elle est à
// l'avion.
clipPassage("avion", (M, g, { clouds, sky }) => {
  const outside = [...clouds.map((c) => c.c), sky];
  const orig = outside.map((o) => o.position.clone());
  const pivot = new THREE.Vector3(0, -0.05, -30);
  const z = new THREE.Vector3(0, 0, 1);
  // La couche qu'on traverse : de gros nuages juste derrière le hublot, sous le cadre au départ.
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xf8f6f2, roughness: 0.95 });
  const bank = new THREE.Group();
  const r = rng(41);
  const puffs = [];
  for (let i = 0; i < 26; i++) {
    const rad = 0.7 + r() * 0.9;
    const o = new THREE.Mesh(new THREE.SphereGeometry(rad, 20, 14), cloudMat);
    o.castShadow = o.receiveShadow = false;
    // Toujours derrière le mur du hublot (z = 0), même les plus gros.
    const p = new THREE.Vector3(-3.2 + r() * 6.4, -r() * 1.6, -rad - 0.25 - r() * 4.5);
    o.position.copy(p);
    o.scale.y = 0.75;
    bank.add(o);
    puffs.push({ o, p, drift: 0.6 + r() * 0.8 });
  }
  bank.visible = false;
  g.add(bank);
  return (t) => {
    const tilt = -0.12 * ease.inOut(span(t, 0, 1.0));
    const rise = 2.5 * ease.inOut(span(t, 0, 1.4));
    const q = new THREE.Quaternion().setFromAxisAngle(z, tilt);
    outside.forEach((o, i) => {
      // x : celle de la boucle (les nuages filent) ; y et z : celles d'origine, tournées autour du point visé.
      const p = new THREE.Vector3(o.position.x, orig[i].y, orig[i].z).sub(pivot).applyQuaternion(q).add(pivot);
      o.position.set(p.x, p.y + rise, p.z);
      o.rotation.z = tilt;
    });
    // La couche monte de sous le hublot jusqu'à le remplir, en filant vers l'arrière.
    const up = ease.inOut(span(t, 0.25, 1.45));
    bank.visible = up > 0;
    for (const { o, p, drift } of puffs) o.position.set(p.x + drift * t, p.y - 6.5 + 7.2 * up, p.z);
    bank.rotation.z = tilt;
  };
});

// ——— 002 → 004 : la rame file jusqu'au terminus et s'y engouffre ———
// D'où qu'elle soit sur le plus court chemin, elle va à la station d'arrivée (celle qu'on clique), quitte à repartir
// dans l'autre sens, puis s'enfonce dans la station.
clipPassage("paris", (M, g, { train, path }) => {
  const T = 1.0;
  const SPEED = (2 * Math.PI) / PASSAGES.paris.loop;
  const up = new THREE.Vector3(0, 1, 0);
  return (t, phi0) => {
    const u0 = pingpong(phi0), v0 = (Math.sin(phi0) / 2) * SPEED;
    const x = Math.min(1, t / T);
    const u = Math.min(1, Math.max(0, (2 * x ** 3 - 3 * x ** 2 + 1) * u0 + (x ** 3 - 2 * x ** 2 + x) * T * v0 + (3 * x ** 2 - 2 * x ** 3)));
    const p = path.getPointAt(u);
    const sink = ease.in(span(t, T - 0.08, T + 0.3));
    train.position.set(p.x, p.y + 0.06 - 0.1 * sink, p.z);
    train.quaternion.setFromUnitVectors(up, path.getTangentAt(u));
    train.scale.setScalar(Math.max(1e-4, 1 - sink));
  };
});

// ——— 004 → 008 : les deux voyageurs se rejoignent et s'envolent ensemble ———
// Ils filent au sommet du lien de laiton, puis s'envolent ensemble au loin, en tournant l'un autour de l'autre.
clipPassage("monuments", (M, g, { travelers, link }) => {
  const MEET = 0.45, ARRIVE = 1.9;
  const top = link.getPoint(0.5);
  const end = new THREE.Vector3(...PASSAGES.monuments.origin);
  const fly = arcLength(bezier3(top, top.clone().add(new THREE.Vector3(0.25, 0.7, 0.1)), end.clone().add(new THREE.Vector3(-0.6, -0.2, 2.0)), end));
  // Derrière eux, une poussière de laiton.
  const along = (t) => fly.along(fly.L * Math.pow(span(t, MEET, ARRIVE), 1.6));
  const shrinkAt = (t) => Math.exp(mix(0, Math.log(0.3), ease.inOut(span(t, MEET, ARRIVE))));
  const dust = smokeTrail(g, { from: MEET + 0.05, to: ARRIVE - 0.15, every: 0.01, life: 0.45, wide: 0.5, size: [0.25, 0.25], seed: 7, mat: M.accent, emit: (t0) => ({ pos: along(t0), scale: 0.1 * shrinkAt(t0) }) });
  return (t, phi0) => {
    dust.place(t);
    // Leur place dans la boucle au départ (scenes.monuments) : ils glissent vers le sommet, s'y rejoignent, s'effacent.
    const k0 = phi0 / (Math.PI * 2);
    const go0 = smooth(0, 0.6, k0);
    const s0 = smooth(0, 0.08, k0) * (1 + 0.5 * Math.sin(Math.PI * smooth(0.6, 0.8, k0))) * (1 - smooth(0.82, 1, k0));
    const k = ease.inOut(span(t, 0, MEET));
    const d = fly.L * Math.pow(span(t, MEET, ARRIVE), 1.6);
    const center = fly.along(d);
    const dir = fly.dirAlong(d);
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    const lift = new THREE.Vector3().crossVectors(side, dir).normalize();
    const shrink = Math.exp(mix(0, Math.log(0.3), ease.inOut(span(d, 0, fly.L)))) * (1 - ease.in(span(t, ARRIVE - 0.15, ARRIVE)));
    // Ils grandissent un peu en se rejoignant, comme dans la boucle quand ils se retrouvent.
    const size = mix(Math.max(0.001, s0), 1.4, ease.out(span(t, 0, 0.45))) * shrink;
    travelers.forEach((tr, i) => {
      if (t < MEET) tr.position.copy(link.getPoint(i ? mix(1 - 0.5 * go0, 0.5, k) : mix(0.5 * go0, 0.5, k)));
      else {
        // Ensemble, ils tournent l'un autour de l'autre.
        const a = 9 * (t - MEET) + (i ? Math.PI : 0);
        const r = 0.09 * ease.out(span(t, MEET, MEET + 0.3)) * shrink;
        tr.position.copy(center).addScaledVector(side, r * Math.cos(a)).addScaledVector(lift, r * Math.sin(a));
      }
      tr.scale.setScalar(Math.max(0.001, size));
    });
  };
});

/**
 * Un passage « sprites » d'objets ajoutés, absents de la boucle (des notes, une lueur) : `depart(M, g, parts)` les
 * ajoute à la scène et renvoie { objects, at(t) } ; le site les dessine par-dessus la boucle, sans rien en cacher.
 */
function addedSprites(name, depart) {
  const P = PASSAGES[name];
  SCENES[`${name}-passage`] = (M) => {
    const g = SCENES[name](M);
    const world = [...g.children];
    const base = g.userData.animate;
    const laps = g.userData.laps ?? 1;
    const { objects, at, origin = null } = depart(M, g, g.userData.parts);
    const hide = () => objects.forEach((o) => (o.visible = false));
    g.userData.laps = 1;
    g.userData.sprite = {
      world,
      objects,
      loopAt(phi) {
        base(phi);
        hide();
      },
      departAt: at,
      origin,
    };
    g.userData.passage = { ...P, laps };
    g.userData.animate = (phi) => {
      g.userData.sprite.loopAt(0);
      at((phi / (Math.PI * 2)) * P.end);
    };
    hide();
    return g;
  };
}

// ——— 003 → 006 : la platine joue ———
// Des notes de laiton s'échappent du disque et s'envolent vers nous, comme à l'escale suivante.
addedSprites("maison", (M, g, { deck }) => {
  const { rec } = deck.userData.parts;
  g.updateMatrixWorld(true);
  const center = rec.getWorldPosition(new THREE.Vector3());
  const k = deck.scale.x;
  const notes = [0, 1, 2].map((i) => {
    const n = brassNote(M, i % 2 === 0);
    g.add(n);
    return n;
  });
  return {
    objects: notes,
    at(t) {
      notes.forEach((n, i) => {
        const u = span(t, 0.15 + 0.17 * i, 1.35 + 0.17 * i);
        n.visible = u > 0 && u < 1;
        const drift = [-0.5, 0.15, 0.6][i];
        n.position.copy(center).add(new THREE.Vector3(drift * u + 0.06 * Math.sin(u * 7 + i), 0.1 + 1.3 * u, 0.9 * u));
        n.scale.setScalar(Math.max(0.001, k * 2.4 * Math.sin(Math.PI * Math.min(1, u * 1.6)) ** 0.5 * (1 - u)));
        n.rotation.set(0, 0.25, 0.3 * Math.sin(u * 6 + i * 2));
      });
    },
  };
});

// ——— 006 → 007 : une note se pose sur le jour du calendrier ———
// Une note de laiton quitte le disque, file vers la case du jour au mur, et la case s'illumine en la recevant (une
// lueur posée dessus : la couleur de la case, elle, change avec la boucle).
addedSprites("salon", (M, g, { from, cal }) => {
  const { under, geo } = cal.userData.cell;
  const note = brassNote(M);
  g.add(note);
  g.updateMatrixWorld(true);
  const cell = under.getWorldPosition(new THREE.Vector3());
  const facing = cal.getWorldQuaternion(new THREE.Quaternion());
  const to = cell.clone().add(new THREE.Vector3(0, 0, 0.12));
  geo.computeBoundingBox();
  const size = geo.boundingBox.getSize(new THREE.Vector3()).x;
  const glowTex = canvasTex(128, 128, (c, w) => {
    const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, "rgba(255,248,232,1)");
    gr.addColorStop(0.45, "rgba(255,244,220,0.85)");
    gr.addColorStop(1, "rgba(255,240,210,0)");
    c.fillStyle = gr;
    c.fillRect(0, 0, w, w);
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(size * 2.2, size * 2.2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, toneMapped: false }));
  glow.position.copy(cell).add(new THREE.Vector3(0, 0, 0.02).applyQuaternion(facing));
  glow.quaternion.copy(facing);
  g.add(glow);
  const LAND = 1.0;
  return {
    objects: [note, glow],
    at(t) {
      const u = span(t, 0.05, LAND);
      note.visible = t > 0.05 && t < LAND + 0.08;
      note.position.lerpVectors(from, to, ease.inOut(u));
      note.position.y += 0.75 * Math.sin(Math.PI * u);
      note.scale.setScalar(Math.max(0.001, 1.5 * ease.out(span(t, 0.05, 0.25)) * (1 - 0.45 * u) * (1 - ease.in(span(t, LAND - 0.1, LAND + 0.08)))));
      note.rotation.set(0, 0.25, 0.3 * Math.sin(t * 9));
      // La case s'allume quand la note la touche, puis s'apaise.
      const flash = span(t, LAND - 0.05, LAND + 0.05) * Math.exp(-Math.max(0, t - LAND - 0.05) / 0.4);
      glow.visible = flash > 0.01;
      glow.material.opacity = 0.9 * flash;
      glow.scale.setScalar(0.8 + 0.4 * flash);
    },
  };
});

// ——— 007 → 010 : la case du jour va se ranger dans le dossier ———
// La case du jour se détache du calendrier, avec sa couleur, et vole se poser à plat dans le dossier ouvert du banc.
clipPassage("calendrier", (M, g, { cal, pile }) => {
  const { under, over, geo } = cal.userData.cell;
  const tile = new THREE.Group();
  const tileUnder = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide }));
  const tileOver = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide }));
  tileOver.position.z = over.position.z - under.position.z;
  tile.add(tileUnder, tileOver);
  for (const m of [tileUnder, tileOver]) m.castShadow = true;
  g.add(tile);
  g.updateMatrixWorld(true);
  const p0 = under.getWorldPosition(new THREE.Vector3());
  const q0 = under.getWorldQuaternion(new THREE.Quaternion());
  const sheet = pile.userData.sheet;
  const p1 = sheet.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.04, 0.012, 0.02));
  // À plat sur la page : sa face vers le haut, tournée comme le dossier.
  const q1 = sheet.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
  const flight = bezier3(p0, p0.clone().add(new THREE.Vector3(0.05, 0.25, 1.6)), p1.clone().add(new THREE.Vector3(-0.3, 1.1, 0.9)), p1);
  return (t, phi0, phase) => {
    // Sa couleur : celle de la case au moment du départ (le calendrier remis ensuite à l'instant présent).
    cal.userData.animate(phi0);
    tileUnder.material.color.copy(under.material.color);
    tileOver.material.color.copy(over.material.color);
    tileOver.scale.copy(over.scale);
    cal.userData.animate(phi0 + phase(t));
    under.visible = over.visible = false;
    const k = ease.inOut(span(t, 0.08, 1.15));
    tile.position.copy(flight(k));
    tile.quaternion.copy(q0).slerp(q1, ease.inOut(span(t, 0.25, 1.1)));
    // Un petit rebond à l'atterrissage.
    tile.position.y += 0.03 * Math.sin(Math.PI * span(t, 1.15, 1.35));
    tile.scale.setScalar(1 + 0.35 * Math.sin(Math.PI * k));
  };
});
