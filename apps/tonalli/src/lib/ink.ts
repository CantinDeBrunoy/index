/**
 * La goutte d'encre dans l'eau : la géométrie de l'encre de validation.
 *
 * Tout ce qui se calcule vit ici, sans dépendance ni `window`, pour que
 * `npm run checks` puisse le vérifier. Le composant `SaveBloom` ne fait que
 * dessiner l'image que `inkFrame` lui rend, à chaque frame.
 *
 * Deux temps, qui sont **le même geste** :
 *
 * 1. **L'encre.** Une goutte tombe du bouton qu'on vient d'appuyer et se
 *    déploie en panaches jusqu'à couvrir l'écran — c'est la couleur du jour,
 *    elle a le droit.
 * 2. **L'eau claire.** Une goutte d'eau tombe à son tour, au cœur de l'écran,
 *    et repousse l'encre vers les bords avec les mêmes volutes, jusqu'à ce
 *    que l'app réapparaisse.
 *
 * Le second temps est littéralement le premier rejoué : mêmes courbes, mêmes
 * panaches, même voile — seulement, ce qui se diffuse est un trou dans
 * l'encre. C'est ce qui donne à l'ensemble une seule respiration au lieu de
 * deux animations cousues.
 *
 * Chaque temps a trois ingrédients :
 *
 * - un **cœur** et quelques **panaches** accrochés à son front, lancés dans
 *   des directions tirées au hasard, qui débordent et tournent un peu ;
 * - un **voile** devant le front : l'encre dans l'eau n'a pas de bord net,
 *   elle se dilue avant de se densifier (et au retour, s'éclaircit avant de
 *   disparaître) ;
 * - une **turbulence** (le filtre SVG) dont la force suit l'animation et qui
 *   dérive lentement, ce qui fait tourner les bords au lieu de les figer.
 */

/**
 * Durée totale, en millisecondes. Une seule valeur pilote l'animation et le
 * minuteur de secours qui démonte l'écran : deux durées séparées finiraient
 * par diverger, et l'encre disparaîtrait avant la fin, ou traînerait après.
 */
export const BLOOM_MS = 1800;

/** Taille de la goutte qui perle, en pixels. */
export const SEED = 44;

/** Nombre de panaches : assez pour briser le cercle, pas assez pour faire tache. */
export const PLUMES = 4;

/** Les jalons, en fraction de `BLOOM_MS`. */
export const PHASES = {
  /** La goutte d'encre a perlé sur le bouton. */
  drop: 0.06,
  /** L'encre couvre l'écran. */
  full: 0.36,
  /**
   * La goutte d'eau claire tombe : un souffle après `full`, le temps que
   * l'écran plein soit vu comme tel, pas davantage.
   */
  clear: 0.38,
  /** Elle a perlé. */
  clearDrop: 0.43,
} as const;

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

/** Un rectangle arrondi : un cercle quand `rx` vaut la moitié du côté. */
export type Blob = { x: number; y: number; width: number; height: number; rx: number };

/**
 * Un panache : sa direction, sa distance au centre et sa taille (en fraction
 * du rayon du cœur), son retard, et sa torsion — l'angle dont il tourne
 * pendant la diffusion. Tirés une fois.
 */
export type Plume = { angle: number; reach: number; size: number; lag: number; twist: number };

/** Une diffusion : d'où elle part, jusqu'où elle doit aller, et ses panaches. */
export type Spread = { from: Point; cover: number; plumes: Plume[] };

export type InkPlan = {
  /** L'encre, depuis le bouton. */
  ink: Spread;
  /** L'eau claire, depuis le cœur de l'écran. */
  clear: Spread;
  /** Force maximale de la turbulence, en pixels de déplacement. */
  swirl: number;
};

export type InkFrame = {
  /**
   * `ink` : les taches **sont** l'encre. `clear` : les taches sont les trous
   * que l'eau claire fait dans une encre qui couvre tout le reste.
   */
  phase: 'ink' | 'clear';
  /** Le cœur, puis les panaches. Tous pleins : leur union fait la tache. */
  blobs: Blob[];
  /** Le voile, plus pâle, qui précède le front. */
  veil: Blob;
  /** Densité du voile. */
  veilOpacity: number;
  /** Opacité de l'ensemble, posée sur le groupe et non sur chaque tache. */
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

/** Densité du voile au plus fort. */
const VEIL = 0.45;

/** Flou maximal, atteint quand la turbulence est à son comble. */
const MAX_BLUR = 6;

/**
 * La diffusion d'un fluide, `1 - (1 - p) ** flow` : un élan au contact de
 * l'eau, puis un ralentissement long. Plus `flow` est grand, plus l'élan est
 * brusque.
 *
 * L'encre a l'élan d'une goutte qui tombe. L'eau claire est plus régulière :
 * avec le même élan, ses panaches découvraient les coins bien avant la fin,
 * et l'animation finissait sur un écran immobile — une fin morte d'un bon
 * tiers de seconde.
 */
const INK_FLOW = 1.6;
const CLEAR_FLOW = 1.15;

/**
 * Le plan d'une ouverture : tiré **une seule fois**, comme le champ de bulles
 * des réactions. Retiré à chaque frame, les panaches sauteraient d'un endroit
 * à l'autre.
 */
export function inkPlan(from: Point, viewport: Size, random: () => number): InkPlan {
  const swirl = Math.min(MAX_SWIRL, Math.max(60, 0.28 * Math.min(viewport.width, viewport.height)));
  const center = { x: viewport.width / 2, y: viewport.height / 2 };
  return {
    ink: spreadFrom(from, viewport, swirl, random),
    clear: spreadFrom(center, viewport, swirl, random),
    swirl,
  };
}

function spreadFrom(from: Point, viewport: Size, swirl: number, random: () => number): Spread {
  // Le coin le plus éloigné, plus la turbulence : sans cette marge, le creux
  // d'une volute laisserait passer un coin au moment où tout doit être
  // couvert — ou découvert.
  const corners = [
    [0, 0],
    [viewport.width, 0],
    [0, viewport.height],
    [viewport.width, viewport.height],
  ];
  const farthest = Math.max(...corners.map(([x, y]) => Math.hypot(x - from.x, y - from.y)));

  // Des directions réparties autour du point de départ, chacune bousculée :
  // des angles purement aléatoires se regroupent souvent d'un seul côté, et
  // l'encre aurait l'air de fuir au lieu d'éclore.
  const start = random() * Math.PI * 2;
  const plumes: Plume[] = Array.from({ length: PLUMES }, (_, index) => ({
    angle: start + (index / PLUMES) * Math.PI * 2 + (random() - 0.5) * 0.9,
    reach: 0.55 + random() * 0.3,
    size: 0.3 + random() * 0.2,
    lag: random(),
    twist: (random() - 0.5) * 1.2,
  }));

  return { from, cover: farthest + swirl, plumes };
}

/** L'image de l'encre à l'instant `t`, en fraction de `BLOOM_MS` (0 → 1). */
export function inkFrame(plan: InkPlan, t: number): InkFrame {
  const time = clamp01(t);
  // Une dérive lente et régulière, vers le haut, sur tout le trajet : le
  // courant ne s'arrête pas entre les deux gouttes. Linéaire exprès — une
  // dérive qui accélère se verrait comme un glissement de l'image.
  const drift = { x: -0.25 * plan.swirl * time, y: -0.9 * plan.swirl * time };

  if (time < PHASES.clear) {
    const bloom = diffusion(plan.ink, time, 0, PHASES.drop, PHASES.full, INK_FLOW);
    const strength = plan.swirl * bloom.agitation;
    return {
      phase: 'ink',
      blobs: bloom.blobs,
      veil: bloom.veil,
      // Le voile s'éteint quand l'écran est couvert : il n'a plus rien à montrer.
      veilOpacity: VEIL * (1 - span(time, PHASES.full - 0.08, PHASES.full)),
      opacity: bloom.drop,
      swirl: strength,
      blur: (MAX_BLUR * strength) / plan.swirl,
      drift,
    };
  }

  // L'eau claire : la même diffusion, jusqu'au bout de la durée. Elle finit
  // pile à la fin — l'écran est alors entièrement découvert, turbulence
  // comprise, et il ne reste rien à effacer.
  const wash = diffusion(plan.clear, time, PHASES.clear, PHASES.clearDrop, 1, CLEAR_FLOW);
  const strength = plan.swirl * wash.agitation;
  return {
    phase: 'clear',
    blobs: wash.blobs,
    veil: wash.veil,
    veilOpacity: VEIL * wash.drop,
    // Pas de fondu d'ensemble ici : c'est le trou qui fait disparaître
    // l'encre. Un fondu par-dessus brouillerait le front de l'eau claire.
    opacity: 1,
    swirl: strength,
    blur: (MAX_BLUR * strength) / plan.swirl,
    drift,
  };
}

/**
 * Une goutte qui perle puis se diffuse, entre `start` et `end`. Commun aux
 * deux temps : l'encre, puis l'eau claire.
 */
function diffusion(spread: Spread, time: number, start: number, dropEnd: number, end: number, flow: number) {
  const { from, cover } = spread;
  const diffuse = (p: number) => 1 - (1 - p) ** flow;
  const drop = easeOut(span(time, start, dropEnd));
  const growth = diffuse(span(time, dropEnd, end));
  const coreRadius = mix(SEED / 2, cover, growth) * drop;

  // Les panaches sont accrochés au front du cœur et le débordent : ce sont
  // eux qui dessinent les lobes. Ils dépassent davantage au début, quand la
  // goutte vient de toucher l'eau, et tournent un peu sur eux-mêmes pendant
  // la diffusion — c'est la volute.
  const plumes = spread.plumes.map((plume) => {
    const launch = start + (dropEnd - start) * 0.5 + plume.lag * 0.08 * (end - start);
    const burst = diffuse(span(time, launch, end));
    const front = mix(SEED / 3, cover, burst) * drop;
    const angle = plume.angle + plume.twist * burst;
    const distance = plume.reach * front;
    return circle(
      { x: from.x + Math.cos(angle) * distance, y: from.y + Math.sin(angle) * distance },
      plume.size * front * (1 + 0.5 * (1 - burst)),
    );
  });

  // La turbulence monte avec la diffusion. Sur la goutte, un soupçon
  // seulement : un point de 44 px déformé de 100 px ne serait plus une goutte.
  const rise = easeOut(span(time, dropEnd, dropEnd + (end - dropEnd) * 0.6));
  const agitation = (0.08 + 0.92 * rise) * drop;

  return {
    drop,
    blobs: [circle(from, coreRadius), ...plumes],
    veil: circle(from, coreRadius * 1.3 + 16 * drop),
    agitation,
  };
}

function circle(center: Point, radius: number): Blob {
  const r = Math.max(0, radius);
  return { x: center.x - r, y: center.y - r, width: 2 * r, height: 2 * r, rx: r };
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

