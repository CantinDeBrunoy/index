/**
 * La goutte d'encre dans l'eau : la géométrie de l'encre de validation.
 *
 * Tout ce qui se calcule vit ici, sans dépendance ni `window`, pour que
 * `npm run checks` puisse le vérifier. Le composant `SaveBloom` ne fait que
 * dessiner l'image que `inkFrame` lui rend, à chaque frame.
 *
 * Le récit est resté le même — l'encre naît du geste, occupe un instant tout
 * l'écran, puis se range dans le bandeau de la journée — mais la matière a
 * changé : plus un disque et un rectangle, une encre qui se déploie en
 * panaches. Trois ingrédients :
 *
 * - un **cœur** qui porte le trajet, et quelques **panaches** lancés dans des
 *   directions tirées au hasard, qui prennent de l'avance pendant la
 *   diffusion puis traînent au retour, comme des volutes aspirées ;
 * - un **voile** plus pâle devant le front, parce que l'encre dans l'eau n'a
 *   pas de bord net : elle se dilue avant de se densifier ;
 * - une **turbulence** (le filtre SVG) dont la force suit l'animation et qui
 *   dérive lentement, ce qui fait tourner les bords au lieu de les figer.
 */

/**
 * Durée du trajet, en millisecondes. Une seule valeur pilote l'animation et
 * le minuteur de secours qui démonte l'écran : deux durées séparées finiraient
 * par diverger, et l'encre disparaîtrait avant d'arriver, ou traînerait après.
 */
export const BLOOM_MS = 1500;

/** Taille de la goutte qui perle sur le bouton, en pixels. */
export const SEED = 44;

/** Nombre de panaches : assez pour briser le cercle, pas assez pour faire tache. */
export const PLUMES = 4;

/**
 * Les jalons du récit, en fraction de `BLOOM_MS`.
 *
 * `calm` est l'instant où la turbulence est retombée à zéro : l'encre arrive
 * sur le bandeau avec un bord **net**, exactement le sien, et le fondu final
 * se fait sur une forme identique au vrai bandeau. Un bord encore agité
 * pendant le fondu laisserait voir le raccord.
 */
export const PHASES = {
  /** La goutte a perlé sur le bouton. */
  drop: 0.07,
  /** L'encre occupe tout l'écran. */
  full: 0.44,
  /** Le retour vers le bandeau commence : un souffle seulement après `full`. */
  gather: 0.46,
  /** Les volutes, encore rondes, commencent à prendre la forme du bandeau. */
  shape: 0.62,
  /** Elles sont rassemblées sur lui. */
  pooled: 0.74,
  /** La turbulence est retombée : le bord est celui du bandeau. */
  calm: 0.86,
  /** L'encre est rangée ; il ne reste que le fondu. */
  settled: 0.9,
} as const;

export type Point = { x: number; y: number };
export type Box = { left: number; top: number; width: number; height: number };
export type Size = { width: number; height: number };

/** Un rectangle arrondi : un cercle quand `rx` vaut la moitié du côté. */
export type Blob = { x: number; y: number; width: number; height: number; rx: number };

/**
 * Un panache : sa direction, sa distance au bouton et sa taille (en fraction
 * du rayon du cœur), son retard, et sa torsion — l'angle dont il tourne
 * pendant la diffusion. Tirés une fois.
 */
export type Plume = { angle: number; reach: number; size: number; lag: number; twist: number };

export type InkPlan = {
  from: Point;
  target: Box;
  /** Rayon du bandeau, en pixels. */
  targetRadius: number;
  /** Rayon qui couvre l'écran entier depuis le bouton, turbulence comprise. */
  cover: number;
  /** Force maximale de la turbulence, en pixels de déplacement. */
  swirl: number;
  plumes: Plume[];
};

export type InkFrame = {
  /** Le cœur, puis les panaches. Tous pleins : leur union fait la tache. */
  blobs: Blob[];
  /** Le voile, plus pâle, qui précède le front. */
  veil: Blob;
  /** Densité du voile, sous l'opacité d'ensemble. */
  veilOpacity: number;
  /**
   * Opacité de l'ensemble. Elle se pose sur le groupe et non sur chaque
   * tache : superposées sur le bandeau, cinq taches à moitié transparentes
   * feraient une couleur presque pleine, et le fondu tomberait d'un coup.
   */
  opacity: number;
  /** Force de la turbulence (`scale` du `feDisplacementMap`). */
  swirl: number;
  /**
   * Flou du contour (`stdDeviation`), suivi d'un seuil sur l'alpha. C'est ce
   * qui fond le cœur et les panaches en une seule tache, avec des jonctions
   * arrondies au lieu de cercles qui se chevauchent, et qui lisse le bord
   * poilu que le déplacement laisse seul.
   */
  blur: number;
  /** Dérive du champ de turbulence, en pixels : c'est elle qui fait tourner les volutes. */
  drift: Point;
};

/** La turbulence ne dépasse jamais ça, même sur un grand écran : au-delà, l'encre se déchire. */
const MAX_SWIRL = 150;

/**
 * Le plan d'une ouverture : tiré **une seule fois**, comme le champ de bulles
 * des réactions. Retiré à chaque frame, les panaches sauteraient d'un endroit
 * à l'autre.
 */
export function inkPlan(from: Point, target: Box, targetRadius: number, viewport: Size, random: () => number): InkPlan {
  const swirl = Math.min(MAX_SWIRL, Math.max(60, 0.28 * Math.min(viewport.width, viewport.height)));

  // Le coin le plus éloigné du bouton, plus la turbulence : sans cette marge,
  // un creux du bord passerait à l'écran au moment où tout doit être couvert.
  const corners = [
    [0, 0],
    [viewport.width, 0],
    [0, viewport.height],
    [viewport.width, viewport.height],
  ];
  const farthest = Math.max(...corners.map(([x, y]) => Math.hypot(x - from.x, y - from.y)));
  const cover = farthest + swirl;

  // Des directions réparties autour du bouton, chacune bousculée : des angles
  // purement aléatoires se regroupent souvent d'un seul côté, et l'encre
  // aurait l'air de fuir au lieu d'éclore.
  const start = random() * Math.PI * 2;
  const plumes: Plume[] = Array.from({ length: PLUMES }, (_, index) => ({
    angle: start + (index / PLUMES) * Math.PI * 2 + (random() - 0.5) * 0.9,
    reach: 0.55 + random() * 0.3,
    size: 0.3 + random() * 0.2,
    lag: random(),
    twist: (random() - 0.5) * 1.2,
  }));

  return { from, target, targetRadius, cover, swirl, plumes };
}

/** L'image de l'encre à l'instant `t`, en fraction de `BLOOM_MS` (0 → 1). */
export function inkFrame(plan: InkPlan, t: number): InkFrame {
  const { from, target, targetRadius, cover, swirl } = plan;
  const time = clamp01(t);

  const settled = boxBlob(target, targetRadius);
  // Le retour se fait en deux temps. D'abord l'encre reste ronde et se
  // contracte vers le bandeau — un cercle géant interpolé droit vers un
  // rectangle donnait des blocs arrondis, et rien ne bougeait à l'écran
  // tant que le rectangle restait plus grand que lui. Ensuite seulement,
  // la flaque prend la forme du bandeau.
  const pool = circle(
    { x: target.left + target.width / 2, y: target.top + target.height / 2 },
    Math.hypot(target.width, target.height) / 2 * 0.85,
  );
  const shaping = inOut(span(time, PHASES.shape, PHASES.settled));
  const home = (blob: Blob, pooling: number) => toward(toward(blob, pool, pooling), settled, shaping);

  // Le cœur : il perle, se déploie, puis se range.
  const drop = easeOut(span(time, 0, PHASES.drop));
  const spread = diffuse(span(time, PHASES.drop, PHASES.full));
  const coreRadius = mix(SEED / 2, cover, spread) * (time < PHASES.drop ? drop : 1);
  const core = home(circle(from, coreRadius), draw(span(time, PHASES.gather, PHASES.pooled)));

  // Les panaches sont accrochés au front du cœur et le débordent : ce sont
  // eux qui dessinent les lobes. Ils dépassent davantage au début, quand
  // l'encre vient de toucher l'eau, et tournent un peu sur eux-mêmes pendant
  // la diffusion — c'est la volute. Au retour, ils traînent : la lenteur est
  // prise sur leur départ, jamais sur leur arrivée, pour que tous soient
  // rangés à `settled`.
  const plumes = plan.plumes.map((plume) => {
    const launch = PHASES.drop * 0.5 + plume.lag * 0.08;
    const burst = diffuse(span(time, launch, PHASES.full));
    const front = mix(SEED / 3, cover, burst) * (time < PHASES.drop ? drop : 1);
    const angle = plume.angle + plume.twist * burst;
    const distance = plume.reach * front;
    const center = {
      x: from.x + Math.cos(angle) * distance,
      y: from.y + Math.sin(angle) * distance,
    };
    const radius = plume.size * front * (1 + 0.5 * (1 - burst));
    const back = draw(span(time, PHASES.gather + 0.03 + plume.lag * 0.05, PHASES.pooled + 0.04));
    return home(circle(center, radius), back);
  });

  // Le voile précède le front puis s'éteint quand l'écran est couvert : sur
  // un écran plein il n'a plus rien à montrer, et au retour il brouillerait
  // l'arrivée sur le bandeau.
  const veilRadius = coreRadius * 1.3 + 16;
  const veilOpacity = 0.45 * (1 - span(time, PHASES.full - 0.1, PHASES.gather));

  // La turbulence monte avec la diffusion, reste vive quand l'encre revient,
  // et retombe à zéro à `calm`. Sur la goutte, un soupçon seulement : un
  // point de 44 px déformé de 100 px ne serait plus une goutte.
  const rise = easeOut(span(time, PHASES.drop, PHASES.full * 0.6));
  const settle = 1 - inOut(span(time, PHASES.gather, PHASES.calm));
  const strength = time >= PHASES.calm ? 0 : swirl * (0.08 + 0.92 * rise) * settle * (time < PHASES.drop ? drop : 1);

  // Une dérive lente et régulière, vers le haut : l'encre qui monte vers le
  // bandeau. Linéaire exprès — une dérive qui accélère se verrait comme un
  // glissement de l'image, pas comme un courant.
  const drift = { x: -0.25 * swirl * time, y: -0.9 * swirl * time };

  return {
    blobs: [core, ...plumes],
    veil: circle(from, veilRadius),
    veilOpacity,
    opacity: drop * (1 - span(time, PHASES.settled, 1)),
    swirl: strength,
    // Le flou suit la turbulence et s'éteint avec elle : un bandeau flouté,
    // même légèrement, ne se raccorderait pas au vrai.
    blur: swirl > 0 ? (6 * strength) / swirl : 0,
    drift,
  };
}

function circle(center: Point, radius: number): Blob {
  const r = Math.max(0, radius);
  return { x: center.x - r, y: center.y - r, width: 2 * r, height: 2 * r, rx: r };
}

function boxBlob(box: Box, radius: number): Blob {
  const rx = Math.min(radius, box.width / 2, box.height / 2);
  return { x: box.left, y: box.top, width: box.width, height: box.height, rx };
}

function toward(a: Blob, b: Blob, amount: number): Blob {
  if (amount <= 0) return a;
  if (amount >= 1) return { ...b };
  return {
    x: mix(a.x, b.x, amount),
    y: mix(a.y, b.y, amount),
    width: mix(a.width, b.width, amount),
    height: mix(a.height, b.height, amount),
    rx: mix(a.rx, b.rx, amount),
  };
}

function mix(a: number, b: number, amount: number) {
  return a + (b - a) * amount;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** Avancement de `t` dans l'intervalle [a, b], borné à 0 et 1. */
function span(t: number, a: number, b: number) {
  return b <= a ? (t >= b ? 1 : 0) : clamp01((t - a) / (b - a));
}

function easeOut(p: number) {
  return 1 - (1 - p) ** 3;
}

/**
 * La diffusion d'un fluide : un élan au contact de l'eau, puis un
 * ralentissement long. Assez doux pour que l'écran ne soit couvert qu'en fin
 * de phase — c'est la diffusion qu'on veut voir, pas l'écran uni.
 */
function diffuse(p: number) {
  return 1 - (1 - p) ** 1.6;
}

/**
 * L'aspiration : elle part aussitôt — une encre qui reste immobile après
 * avoir couvert l'écran n'est plus qu'un écran de couleur — et ralentit en
 * arrivant.
 */
function draw(p: number) {
  return 1 - (1 - p) ** 2.2;
}

function inOut(p: number) {
  return p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
}
