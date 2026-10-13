// ——— La fusée repart : de l'escale 1 vers la Terre, l'escale 2 ———
// Au clic vers l'escale 2, la fusée en croisière remet les gaz : sa flamme s'allonge, elle tremble, puis elle file vers
// la Terre en laissant sa traînée, rapetisse au loin et s'y fond ; le site plonge alors vers la Terre, comme d'habitude.
// La boucle de l'espace, à l'écran, ne s'arrête pas : la fusée qui part est dessinée par-dessus, dans un canvas
// (scripts/voyage-fusee.ts), depuis une planche de sprites rendue ici (fusee-render.mjs) : la fusée et sa fumée seules,
// sur fond transparent, image par image ; et une pièce du ciel vide qui cache la fusée de la vidéo (derrière elle, rien
// ne bouge : des étoiles fixes). fusee-render.mjs joint ce fichier au moteur après voyage-scenes.js et
// decollage-scenes.js, dont il reprend les outils (la fusée, sa croisière, la caméra de l'espace).

// Les temps, en secondes depuis le clic. `dive` : le site plonge vers la Terre (scripts/voyage.ts) ; `end` : la
// dernière image, le voile couvre alors tout.
const FUSEE = { fps: 24, throttle: 0.35, go: 0.2, arrive: 1.9, end: 2.15, dive: 1.35, scale: 0.012, trail: 0.7, puff: 0.015 };
// Le chemin : une courbe de Bézier qui part dans l'axe de la croisière et arrive face à la caméra, sur la Terre.
const FUSEE_PATH = (() => {
  const P0 = CRUISE.pos.clone();
  const E = LAUNCH.EARTH.clone();
  const n = ESPACE_CAM.pos.clone().sub(E).normalize(); // de la Terre vers nous
  const T = E.clone().addScaledVector(n, 0.42 * 1.03); // juste au-dessus de sa face visible
  const B1 = P0.clone().addScaledVector(CRUISE.heading, 0.9);
  const B2 = T.clone().addScaledVector(n, 1.3);
  const at = (s) => {
    const a = 1 - s;
    return P0.clone().multiplyScalar(a * a * a).addScaledVector(B1, 3 * a * a * s).addScaledVector(B2, 3 * a * s * s).addScaledVector(T, s * s * s);
  };
  // Une table de la longueur parcourue : la fusée avance à la vitesse voulue, pas à celle du paramètre.
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
  return { at, sOf, L, T };
})();

/** La fusée t secondes après le clic : position, orientation, taille, et l'allure de sa flamme. */
const fuseeAt = (() => {
  const { at, sOf, L } = FUSEE_PATH;
  // L'avancée : un départ lent, de plus en plus vite.
  const dist = (t) => L * Math.pow(span(t, FUSEE.go, FUSEE.arrive), 2.2);
  const pathAt = (t) => at(sOf(dist(t)));
  const dirAt = (t) => {
    const d = dist(t);
    const s = sOf(Math.min(L - 1e-4, d));
    return at(Math.min(1, s + 1e-4)).sub(at(Math.max(0, s - 1e-4))).normalize();
  };
  // Le nez suit la trajectoire sans tourner sur lui-même (comme dans l'envol), depuis la pose de croisière.
  const start = cruise(0);
  const STEP_S = 1 / 480;
  const turned = [start.quat.clone()];
  let axis = new THREE.Vector3(0, 1, 0).applyQuaternion(start.quat);
  for (let t = STEP_S; t <= FUSEE.end + STEP_S; t += STEP_S) {
    const d = t < FUSEE.go + 0.02 ? CRUISE.heading.clone() : dirAt(Math.min(t, FUSEE.arrive));
    turned.push(new THREE.Quaternion().setFromUnitVectors(axis, d).multiply(turned[turned.length - 1]));
    axis = d;
  }
  const turnedAt = (t) => {
    const k = t / STEP_S, i = Math.min(turned.length - 2, Math.floor(k));
    return turned[i].clone().slerp(turned[i + 1], Math.min(1, k - i));
  };
  return (t) => {
    const pos = t <= FUSEE.go ? start.pos.clone() : pathAt(Math.min(t, FUSEE.arrive));
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

// L'espace d'avant le décollage (sans fusée), la fusée qui part et sa traînée. `animate(phi)` : le clip complet, le
// monde compris (pour le régler, fusee-render.mjs MODE=clip) ; userData.fusee(t, only) : la fusée à t, seule ou non.
SCENES["espace-fusee"] = (M) => {
  const g = SCENES.depart(M);
  const world = [...g.children];
  const ship = rocket(M);
  const R = ship.userData;
  R.flame.visible = true;
  g.add(ship);
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0xf2ece2, roughness: 1 });
  const puffGeo = new THREE.SphereGeometry(1, 20, 14);
  const trail = [];
  {
    const r = rng(17);
    for (let t0 = FUSEE.go + 0.08; t0 < FUSEE.arrive - 0.1; t0 += FUSEE.puff) {
      const o = new THREE.Mesh(puffGeo, smokeMat);
      o.castShadow = false;
      o.visible = false;
      g.add(o);
      trail.push({ o, t0, j: [r() - 0.5, r() - 0.5, r() - 0.5], s: 0.36 + r() * 0.28 });
    }
  }
  const base = g.userData.animate;
  const place = (t) => {
    const w = fuseeAt(t);
    ship.position.copy(w.pos);
    ship.quaternion.copy(w.quat);
    ship.scale.setScalar(Math.max(1e-5, w.scale));
    ship.visible = w.scale > 1e-4;
    R.flames.forEach((f, i) => f.scale.set(...fuseeFlame(i, t)));
    // La traînée : laissée sous la tuyère, elle gonfle puis fond (comme celle de l'envol).
    for (const p of trail) {
      const tau = t - p.t0;
      p.o.visible = tau > 0 && tau < FUSEE.trail;
      if (!p.o.visible) continue;
      const e = fuseeAt(p.t0);
      const gap = fuseeAt(p.t0 + FUSEE.puff).pos.distanceTo(e.pos);
      const at = e.pos.addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(e.quat), -0.4 * e.scale);
      p.o.position.set(at.x + p.j[0] * 0.3 * e.scale, at.y + p.j[1] * 0.3 * e.scale, at.z + p.j[2] * 0.3 * e.scale);
      // Elle couvre l'écart jusqu'à la suivante, sans jamais dépasser la largeur de la fusée (au loin, elle s'amincit).
      const s = Math.min(Math.max(p.s * e.scale, 0.6 * gap), 0.7 * e.scale) * (0.4 + 1.2 * (1 - Math.exp(-tau / 0.4))) * Math.max(0, 1 - tau / FUSEE.trail);
      p.o.scale.setScalar(Math.max(1e-5, s));
    }
  };
  /** La fusée à t secondes du clic ; `only` : le monde caché (les sprites), sinon à la phase de la boucle. */
  g.userData.fusee = (t, only = false, phi = 0) => {
    for (const o of world) o.visible = !only;
    if (!only) base(phi + (2 * Math.PI * t) / 8);
    place(t);
  };
  g.userData.ship = ship;
  g.userData.laps = 1;
  g.userData.frames = Math.round(FUSEE.end * FUSEE.fps);
  g.userData.animate = (phi) => g.userData.fusee((phi / (Math.PI * 2)) * FUSEE.end);
  g.userData.animate(0);
  return g;
};
