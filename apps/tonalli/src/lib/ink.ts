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
 * 2. **Le message.** Tant que la couleur occupe tout, une phrase courte
 *    s'y lève au centre — « Aujourd'hui porte ta teinte. » — puis se dissout.
 * 3. **La goutte d'eau.** Elle tombe du haut de l'écran en accélérant,
 *    étirée par la vitesse, et s'écrase au centre, sur le message — qui se
 *    dissout sous le choc. Deux ronds dans l'eau partent de l'impact.
 * 4. **L'eau claire.** Depuis l'impact, elle repousse l'encre vers les bords
 *    avec les mêmes volutes, jusqu'à ce que l'app réapparaisse.
 *
 * La goutte, les ronds et l'eau claire sont tous des **trous** dans l'encre :
 * on voit l'app à travers, comme à travers de l'eau.
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
export const BLOOM_MS = 3400;

/** Taille de la goutte qui perle, en pixels. */
export const SEED = 44;

/** Nombre de panaches : assez pour briser le cercle, pas assez pour faire tache. */
export const PLUMES = 4;

/** Les jalons, en fraction de `BLOOM_MS`. */
export const PHASES = {
  /** La goutte d'encre a perlé sur le bouton. */
  drop: 0.035,
  /** L'encre couvre l'écran. Le message ne se lève qu'à partir d'ici. */
  full: 0.22,
  /** Le message est entièrement lisible. */
  shown: 0.32,
  /**
   * La goutte d'eau commence à tomber, au-dessus de l'écran. C'est aussi là
   * qu'on passe au filtre de l'eau claire : l'écran est encore plein, le
   * raccord ne peut pas se voir.
   */
  fall: 0.5,
  /** Elle touche l'eau, au centre, sur le message, qui commence à se dissoudre. */
  impact: 0.6,
  /**
   * La goutte écrasée s'est arrondie : l'eau claire se diffuse depuis là. Le
   * message a disparu au même instant — le trou qui grandit ensuite sous lui
   * le poserait sur le papier, où il serait illisible.
   */
  clearDrop: 0.66,
  /** Le message a disparu. */
  gone: 0.66,
} as const;

/** Largeur de la goutte qui tombe, en pixels : plus fine que celle d'encre, c'est de l'eau. */
export const DROPLET = 18;

/** Combien la vitesse étire la goutte, en fraction de sa largeur, au moment de l'impact. */
const STRETCH = 1.3;

/** Départ des ronds dans l'eau après l'impact, en fraction de `BLOOM_MS`. */
export const RINGS = [0, 0.035];

/** Durée de vie d'un rond dans l'eau, en fraction de `BLOOM_MS`. */
const RING_SPAN = 0.13;

/**
 * Le geste propre à une émotion. Le récit reste le même pour toutes — la
 * goutte d'encre, le message, la goutte d'eau, l'eau claire — mais certaines
 * émotions ont leur façon de toucher l'eau. On garde une règle : tout ce que
 * fait l'encre doit pouvoir arriver à de la vraie encre dans l'eau. Un geste,
 * jamais un dessin — pas de cœur, pas de soleil.
 *
 * - `drop` : une goutte, la version de base ;
 * - `pair` (Amour) : deux gouttes qui s'attirent et se fondent en une seule —
 *   deux personnes, un rituel ;
 * - `bounce` (Joie) : à l'impact, une gouttelette rebondit, remonte et
 *   retombe, et c'est à cette seconde touche que la couleur éclot. C'est ce
 *   que fait une vraie goutte, et c'est joyeux par nature.
 */
export type Gesture = 'drop' | 'pair' | 'bounce';

export function gestureOf(emotion: string | null | undefined): Gesture {
  if (emotion === 'love') return 'pair';
  if (emotion === 'joy') return 'bounce';
  return 'drop';
}

/**
 * Le nombre de taches est fixe, quel que soit le geste : le cœur, les
 * panaches, puis deux places pour les gouttes du geste (les deux gouttes de
 * l'Amour, la goutte et sa gouttelette de la Joie). Une place inutilisée est
 * vide ; sans ça, une tache d'avant resterait dessinée, et deviendrait un
 * trou en changeant de filtre.
 */
export const DROP_SLOT = PLUMES + 1;
export const BLOB_SLOTS = PLUMES + 3;

/** Amour : écart entre les deux gouttes d'encre, en fraction de la largeur. */
const PAIR_GAP = 0.3;

/** Amour : écart entre les deux gouttes d'eau, en pixels — elles se touchent en s'écrasant. */
const PAIR_WATER = 20;

/** Flou qui fond deux gouttes en une : assez pour qu'un pont d'encre se forme entre elles. */
const MELT_BLUR = 9;

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

/** Un rond dans l'eau : un cercle tracé, pas rempli. */
export type Ring = { blob: Blob; stroke: number; opacity: number };

/** Ce qu'il faut à une goutte d'eau et à l'eau claire qui en part. */
type Water = {
  /** L'eau claire, depuis le point où la goutte tombe. */
  clear: Spread;
  /** Jusqu'où vont les ronds dans l'eau avant de s'éteindre, en pixels. */
  ripple: number;
  /** Force maximale de la turbulence, en pixels de déplacement. */
  swirl: number;
  /** Joie : hauteur du rebond, en pixels. */
  hop: number;
  gesture: Gesture;
};

export type InkPlan = Water & {
  /** L'encre, depuis le bouton. */
  ink: Spread;
  /** Largeur de l'écran : l'écart des deux gouttes de l'Amour s'y mesure. */
  width: number;
};

export type InkFrame = {
  /**
   * `ink` : les taches **sont** l'encre. `clear` : les taches sont les trous
   * que l'eau claire fait dans une encre qui couvre tout le reste.
   */
  phase: 'ink' | 'clear';
  /**
   * Le cœur, les panaches, puis la goutte d'eau. Tous pleins : leur union
   * fait la tache — ou le trou.
   */
  blobs: Blob[];
  /** Les ronds dans l'eau, après l'impact. */
  rings: Ring[];
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
  /** Le message au centre : son opacité, son flou et sa montée, en pixels. */
  message: { opacity: number; blur: number; rise: number };
};

/** Flou du message quand il se dissout : il se défait comme l'encre dans l'eau. */
const MESSAGE_BLUR = 8;

/** Le message se lève de quelques pixels en apparaissant, et continue en partant. */
const MESSAGE_RISE = 10;

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
export function inkPlan(from: Point, viewport: Size, random: () => number, gesture: Gesture = 'drop'): InkPlan {
  const swirl = Math.min(MAX_SWIRL, Math.max(60, 0.28 * Math.min(viewport.width, viewport.height)));
  const center = { x: viewport.width / 2, y: viewport.height / 2 };
  return {
    ink: spreadFrom(from, viewport, swirl, random),
    clear: spreadFrom(center, viewport, swirl, random),
    ripple: 0.32 * Math.min(viewport.width, viewport.height),
    swirl,
    hop: hopFor(viewport),
    gesture,
    width: viewport.width,
  };
}

/** Un rebond visible sans être démesuré : de 50 à 110 px selon l'écran. */
function hopFor(frame: Size) {
  return Math.min(110, Math.max(50, 0.22 * Math.min(frame.width, frame.height)));
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

  // Le message ne paraît que sur un écran entièrement couvert — posé sur le
  // papier, il serait illisible dans sa propre couleur. Il se dissout quand
  // la goutte le touche, et il est parti avant que l'eau claire ait grandi.
  // Il monte doucement tout du long : un texte qui s'arrête net pour
  // repartir aurait l'air posé là, pas porté.
  const rising = easeOut(span(time, PHASES.full, PHASES.shown));
  const leaving = easeOut(span(time, PHASES.impact, PHASES.gone));
  const message = {
    opacity: rising * (1 - leaving),
    blur: MESSAGE_BLUR * leaving,
    rise: MESSAGE_RISE * (1 - rising) - MESSAGE_RISE * 1.5 * leaving,
  };

  const center = plan.clear.from;

  if (time < PHASES.fall) {
    const touch = inkTouch(plan, time);
    const bloom = diffusion(plan.ink, time, touch.start, touch.start + PHASES.drop, PHASES.full, INK_FLOW);
    const strength = plan.swirl * bloom.agitation;
    return {
      phase: 'ink',
      blobs: slots(bloom.blobs, touch.extras),
      rings: RINGS.map(() => ({ blob: circle(center, 0), stroke: 0, opacity: 0 })),
      veil: bloom.veil,
      // Le voile s'éteint quand l'écran est couvert : il n'a plus rien à montrer.
      veilOpacity: VEIL * (1 - span(time, PHASES.full - 0.05, PHASES.full)),
      opacity: Math.max(bloom.drop, touch.opacity),
      swirl: strength,
      blur: Math.max((MAX_BLUR * strength) / plan.swirl, touch.blur),
      drift,
      message,
    };
  }

  return {
    phase: 'clear',
    ...waterDrop(time, WATER, plan),
    drift,
    message,
  };
}

/**
 * Le geste de l'encre, avant qu'elle se diffuse : quand la diffusion commence
 * (`start`), et les gouttes qui la précèdent. Pour la goutte simple, rien ne
 * précède : l'encre se diffuse dès qu'elle touche.
 */
function inkTouch(plan: InkPlan, time: number) {
  const from = plan.ink.from;

  if (plan.gesture === 'pair') {
    // Deux gouttes perlent de part et d'autre du bouton, la seconde un peu
    // après la première, s'attirent, et se fondent en une seule. Le flou
    // monte au moment où elles se touchent : c'est lui qui tend un pont
    // d'encre entre elles au lieu de deux cercles qui se chevauchent.
    const gap = (PAIR_GAP * plan.width) / 2;
    const a = easeOut(span(time, 0, 0.05));
    const b = easeOut(span(time, 0.03, 0.08));
    const meet = inOut(span(time, 0.07, 0.16));
    const off = gap * (1 - meet);
    const melt = span(time, 0.08, 0.12) * (1 - span(time, 0.16, 0.2));
    return {
      start: 0.14,
      extras: [
        circle({ x: from.x - off, y: from.y - 6 * (1 - meet) }, 30 * a),
        circle({ x: from.x + off, y: from.y + 6 * (1 - meet) }, 30 * b),
      ],
      opacity: a,
      blur: MELT_BLUR * melt,
    };
  }

  if (plan.gesture === 'bounce') {
    // La goutte perle, une gouttelette en jaillit, monte, retombe — et c'est
    // à cette seconde touche que l'encre éclot. Au départ du saut, le flou
    // la tient encore à la goutte par un col, comme un vrai jet qui se
    // détache.
    const land = easeOut(span(time, 0, 0.035));
    const jump = span(time, 0.035, 0.125);
    const lift = 4 * jump * (1 - jump) * plan.hop;
    const flying = jump > 0 && jump < 1;
    const neck = span(time, 0.03, 0.045) * (1 - span(time, 0.055, 0.075));
    return {
      start: 0.12,
      extras: [
        circle(from, 16 * land),
        circle({ x: from.x, y: from.y - lift }, flying ? DROPLET * 0.65 : 0),
      ],
      opacity: land,
      blur: 7 * neck,
    };
  }

  return { start: 0, extras: [], opacity: 0, blur: 0 };
}

/** Le cœur et les panaches, puis les gouttes du geste, toujours à la même place. */
function slots(bloom: Blob[], extras: Blob[]): Blob[] {
  const all = [...bloom, ...extras];
  while (all.length < BLOB_SLOTS) all.push(circle({ x: 0, y: 0 }, 0));
  return all.slice(0, BLOB_SLOTS);
}

/**
 * Les jalons d'une goutte d'eau, en fraction de la durée de l'animation qui
 * la porte : l'encre de validation, ou le dévoilement de la journée du binôme.
 */
type Waterfall = {
  /** La goutte commence à tomber, au-dessus du cadre. */
  fall: number;
  /** Elle touche l'eau. */
  impact: number;
  /** Écrasée, elle s'est arrondie : l'eau claire se diffuse depuis là. */
  clearDrop: number;
  /** Départ de chaque rond dans l'eau après l'impact. */
  rings: readonly number[];
  /** Durée de vie d'un rond. */
  ringSpan: number;
  /** Amour : retard de la seconde goutte d'eau sur la première. */
  lag: number;
  /** Joie : durée du rebond, entre l'impact et la seconde touche. */
  rebound: number;
};

const WATER: Waterfall = {
  fall: PHASES.fall,
  impact: PHASES.impact,
  clearDrop: PHASES.clearDrop,
  rings: RINGS,
  ringSpan: RING_SPAN,
  lag: 0.02,
  rebound: 0.07,
};

/**
 * La goutte d'eau, ses ronds, et l'eau claire qui en part — tous des trous
 * dans une nappe de couleur. Commun à la validation et au dévoilement : la
 * même eau efface l'encre qu'on vient de poser, et découvre celle de l'autre.
 */
function waterDrop(time: number, timing: Waterfall, water: Water) {
  const { clear, ripple, swirl, gesture } = water;
  const center = clear.from;

  // La Joie rebondit : l'eau claire ne part qu'à la seconde touche.
  const rebound = gesture === 'bounce' ? timing.rebound : 0;
  const spreadStart = timing.impact + rebound;

  // Les gouttes d'eau du geste, et d'où partent leurs ronds.
  let drops: Blob[];
  let ringAt: { center: Point; start: number }[];
  if (gesture === 'pair') {
    // L'Amour : deux gouttes tombent ensemble, à un souffle d'écart, et
    // s'écrasent l'une contre l'autre. Leurs ronds se croisent.
    const left = { x: center.x - PAIR_WATER, y: center.y };
    const right = { x: center.x + PAIR_WATER, y: center.y };
    drops = [droplet(time, timing, left, 0, SEED), droplet(time, timing, right, timing.lag, SEED)];
    ringAt = [
      { center: left, start: timing.impact },
      { center: right, start: timing.impact + timing.lag },
    ];
  } else if (gesture === 'bounce') {
    // La Joie : la goutte s'écrase à peine, une gouttelette remonte et
    // retombe. Un rond à chaque touche.
    const jump = span(time, timing.impact, spreadStart);
    const flying = jump > 0 && jump < 1;
    const lift = 4 * jump * (1 - jump) * water.hop;
    drops = [
      droplet(time, timing, center, 0, SEED * 0.6),
      circle({ x: center.x, y: center.y - lift }, flying ? DROPLET * 0.65 : 0),
    ];
    ringAt = [
      { center, start: timing.impact },
      { center, start: spreadStart },
    ];
  } else {
    drops = [droplet(time, timing, center, 0, SEED)];
    ringAt = timing.rings.map((delay) => ({ center, start: timing.impact + delay }));
  }

  // Les ronds dans l'eau : un cercle fin qui s'élargit en s'amincissant, et
  // s'éteint avant d'être rattrapé par l'eau claire. Le seuil du filtre
  // efface tout ce qui passe sous un tiers d'opacité : la leur descend donc
  // jusque-là et pas plus bas, sinon ils disparaîtraient d'un coup à
  // mi-course au lieu de s'éteindre.
  const rings = ringAt.map(({ center: at, start }) => {
    const p = span(time, start, start + timing.ringSpan);
    const alive = p > 0 && p < 1;
    return {
      blob: circle(at, mix(SEED / 2, ripple, easeOut(p))),
      stroke: alive ? mix(4, 1.5, p) : 0,
      opacity: alive ? 0.34 + 0.66 * (1 - p) : 0,
    };
  });

  // L'eau claire : la même diffusion que l'encre, depuis l'impact — ou la
  // seconde touche —, jusqu'au bout de la durée. Elle finit pile à la fin —
  // le cadre est alors entièrement découvert, turbulence comprise, et il ne
  // reste rien à effacer. Avant, elle n'a pas commencé : la turbulence est
  // nulle, et la goutte tombe nette.
  const wash = diffusion(clear, time, spreadStart, spreadStart + (timing.clearDrop - timing.impact), 1, CLEAR_FLOW);
  const strength = swirl * wash.agitation;
  return {
    blobs: slots(wash.blobs, drops),
    rings,
    veil: wash.veil,
    veilOpacity: VEIL * wash.drop,
    // Pas de fondu d'ensemble ici : c'est le trou qui fait disparaître
    // l'encre. Un fondu par-dessus brouillerait le front de l'eau claire.
    opacity: 1,
    swirl: strength,
    blur: (MAX_BLUR * strength) / swirl,
  };
}

/**
 * Une goutte d'eau : elle tombe en accélérant, comme tout ce qui tombe, et
 * s'étire avec la vitesse. À l'impact elle s'écrase, puis s'arrondit à la
 * taille `size` : c'est de là que l'eau claire se diffuse, et le cœur de la
 * diffusion la recouvre sans raccord. `lag` la retarde, pour la seconde
 * goutte de l'Amour.
 */
function droplet(time: number, timing: Waterfall, center: Point, lag: number, size: number): Blob {
  const impact = timing.impact + lag;
  if (time < impact) {
    const fall = span(time, timing.fall + lag, impact) ** 2;
    const height = DROPLET * (1 + STRETCH * fall);
    const y = mix(-height, center.y, fall);
    return { x: center.x - DROPLET / 2, y: y - height / 2, width: DROPLET, height, rx: DROPLET / 2 };
  }
  const landing = easeOut(span(time, impact, timing.clearDrop + lag));
  // Écrasée d'abord — plus large que haute —, puis ronde.
  const squash = Math.sin(Math.PI * landing) * 0.5;
  // La hauteur part de celle de la chute : sans ça, la goutte étirée
  // redeviendrait ronde d'un coup, le temps d'une frame, à l'impact.
  const width = mix(DROPLET, size, landing) * (1 + squash);
  const height = mix(DROPLET * (1 + STRETCH), size, landing) * (1 - squash);
  return { x: center.x - width / 2, y: center.y - height / 2, width, height, rx: Math.min(width, height) / 2 };
}

/**
 * Durée du dévoilement de la journée du binôme, en millisecondes. Plus court
 * que l'encre de validation : c'est la seconde cérémonie de la journée, et
 * elle se joue dans une carte, pas sur tout l'écran — le plein écran reste
 * réservé à son propre geste.
 */
export const REVEAL_MS = 1700;

/** Les jalons du dévoilement, en fraction de `REVEAL_MS`. */
export const REVEAL = {
  /** La goutte tombe dès l'appui : c'est le doigt qui l'a lâchée. */
  fall: 0,
  /** Elle touche la carte, là où le doigt s'est posé. L'invitation se dissout. */
  impact: 0.2,
  /** Écrasée, elle s'est arrondie ; l'invitation a disparu. */
  clearDrop: 0.3,
} as const;

/** Les ronds du dévoilement : mêmes durées réelles que ceux de la validation. */
const REVEAL_RINGS = RINGS.map((delay) => (delay * BLOOM_MS) / REVEAL_MS);
const REVEAL_RING_SPAN = (RING_SPAN * BLOOM_MS) / REVEAL_MS;

/** Le dévoilement, dans les unités de `REVEAL_MS` : mêmes durées réelles que la validation. */
const REVEAL_WATER: Waterfall = {
  ...REVEAL,
  rings: REVEAL_RINGS,
  ringSpan: REVEAL_RING_SPAN,
  lag: (0.02 * BLOOM_MS) / REVEAL_MS,
  rebound: (0.07 * BLOOM_MS) / REVEAL_MS,
};

export type RevealPlan = Water;

/**
 * Le plan d'un dévoilement : la carte couverte de la couleur du binôme, et le
 * point où le doigt l'a touchée — c'est là que tombe la goutte. Tiré une
 * seule fois, comme celui de l'encre.
 */
export function revealPlan(frame: Size, impact: Point, random: () => number, gesture: Gesture = 'drop'): RevealPlan {
  const swirl = Math.min(MAX_SWIRL, Math.max(40, 0.28 * Math.min(frame.width, frame.height)));
  return {
    clear: spreadFrom(impact, frame, swirl, random),
    ripple: 0.32 * Math.min(frame.width, frame.height),
    swirl,
    hop: hopFor(frame),
    gesture,
  };
}

/** L'image du dévoilement à l'instant `t`, en fraction de `REVEAL_MS` (0 → 1). */
export function revealFrame(plan: RevealPlan, t: number): InkFrame {
  const time = clamp01(t);
  // L'invitation est lisible dès le départ — la carte couverte l'affichait
  // déjà — et se dissout sous la goutte, comme la phrase de la validation.
  const leaving = easeOut(span(time, REVEAL.impact, REVEAL.clearDrop));
  return {
    phase: 'clear',
    ...waterDrop(time, REVEAL_WATER, plan),
    drift: { x: -0.25 * plan.swirl * time, y: -0.9 * plan.swirl * time },
    message: {
      opacity: 1 - leaving,
      blur: MESSAGE_BLUR * leaving,
      rise: -MESSAGE_RISE * 1.5 * leaving,
    },
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

function inOut(p: number) {
  return p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
}


