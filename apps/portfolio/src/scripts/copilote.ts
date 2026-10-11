/**
 * Le copilote du voyage (components/voyage/Copilote.astro, CopiloteAccueil.astro et CopiloteTuto.astro).
 * - Au premier départ seulement (« Décoller », ou l'escale 1 ouverte directement) : il accueille et donne le
 *   tuto, les deux façons de visiter. « Faire le voyage », la croix ou Échap le rangent ; partir de l'escale
 *   aussi. Le navigateur s'en souvient (localStorage) : aux visites suivantes, il reste rangé d'emblée.
 *   L'anneau doré de l'escale attend la fin de l'accueil : il naît alors sur le bouton « Faire le voyage » et
 *   file se poser sur la planète, pour qu'on voie où cliquer.
 * - Rangé, à chaque escale, au bout de la barre des escales : sa pastille porte la tenue de l'escale. Un clic sur elle rouvre le tuto ;
 *   « Continuer le voyage », la croix, Échap ou un clic ailleurs le referment.
 * Il suit le voyage par l'évènement « voyage:escale » de scripts/voyage.ts : ce module se charge avant lui.
 */

/** Le temps qu'il file vers sa pastille, puis celui où l'anneau bat plus fort. */
const BYE_MS = 750;
const NUDGE_MS = 4000;
/** L'anneau qui naît sur « Faire le voyage », son vol jusqu'à la planète, puis le petit rebond où il se pose. */
const RING_POP_MS = 350;
const RING_FLY_MS = 950;
const RING_LAND_MS = 250;
const SEEN_KEY = "index:copilote-accueil";

/** L'accueil a-t-il déjà été donné dans ce navigateur ? Sans stockage (navigation privée bloquée), on le redonne. */
function welcomed(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "vu";
  } catch {
    return false;
  }
}
function rememberWelcome() {
  try {
    localStorage.setItem(SEEN_KEY, "vu");
  } catch {
    // Stockage bloqué : l'accueil reviendra à la prochaine visite.
  }
}

function start(root: HTMLElement) {
  const welcome = root.querySelector<HTMLElement>("[data-copilote-accueil]");
  const stops = [...root.querySelectorAll<HTMLElement>("[data-stop]")];
  /** L'escale affichée ; -1 avant la première. */
  let current = -1;
  let open: HTMLElement | null = null;

  const dockOf = (wrap: HTMLElement) => wrap.querySelector<HTMLButtonElement>("[data-copilote-dock]")!;
  const helpOf = (wrap: HTMLElement) => wrap.querySelector<HTMLElement>("[data-copilote-help]")!;

  /** Le tuto qu'il rouvre depuis sa pastille. */
  const closeHelp = (focusDock = false) => {
    if (!open) return;
    helpOf(open).hidden = true;
    const dock = dockOf(open);
    dock.setAttribute("aria-expanded", "false");
    if (focusDock) dock.focus();
    open = null;
  };
  const openHelp = (wrap: HTMLElement) => {
    closeHelp();
    helpOf(wrap).hidden = false;
    dockOf(wrap).setAttribute("aria-expanded", "true");
    open = wrap;
  };

  /** L'accueil, à l'escale 1. Son cartel et sa barre des escales attendent la fin de l'accueil : inertes, et
   *  masqués par le CSS. La barre revient dès qu'il file vers sa pastille, le cartel une fois qu'il y est. */
  const welcoming = () => !!welcome && !welcome.hidden;
  const welcomeStop = welcome?.closest<HTMLElement>("[data-stop]") ?? null;
  const welcomeCard = welcomeStop?.querySelector<HTMLElement>(".cartel") ?? null;
  const welcomeNav = welcomeStop?.querySelector<HTMLElement>(".stop-nav") ?? null;
  const hold = (el: HTMLElement | null, on: boolean) => {
    if (el) el.inert = on;
  };

  /** L'anneau de l'escale 1, masqué par le CSS pendant l'accueil (et pendant son vol). Quand l'accueil se range en
   *  douceur, une copie naît sur le bouton « Faire le voyage » et file se poser sur lui ; il prend alors le relais.
   *  Trois étages : l'horizontale et la verticale, chacune à son rythme, tracent une courbe ; l'anneau grossit. */
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let flight: HTMLElement | null = null;
  const land = () => {
    flight?.remove();
    flight = null;
    welcomeStop?.classList.remove("ring-flying");
  };
  const flyRing = () => {
    const ring = welcomeStop?.querySelector<HTMLElement>(".spot .ring");
    const button = welcome?.querySelector<HTMLElement>("[data-copilote-voyage]");
    if (!welcomeStop || !ring || !button || reduce.matches) return;
    land();
    const from = button.getBoundingClientRect();
    const to = ring.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);

    const copy = ring.cloneNode(true) as HTMLElement;
    const lift = document.createElement("span");
    const box = document.createElement("span");
    box.className = "ring-flight";
    box.style.left = `${to.left}px`;
    box.style.top = `${to.top}px`;
    // appendChild : les types du worker (HTMLRewriter) recouvrent le append du DOM.
    lift.appendChild(copy);
    box.appendChild(lift);
    welcomeStop.appendChild(box);
    welcomeStop.classList.add("ring-flying");
    flight = box;

    const move = { duration: RING_FLY_MS, delay: RING_POP_MS, fill: "both" } as const;
    box.animate({ transform: [`translateX(${dx}px)`, "none"] }, { ...move, easing: "cubic-bezier(0.55, 0, 0.45, 1)" });
    lift.animate({ transform: [`translateY(${dy}px)`, "none"] }, { ...move, easing: "cubic-bezier(0.3, 0, 0.2, 1)" });
    const total = RING_POP_MS + RING_FLY_MS + RING_LAND_MS;
    const at = (ms: number) => ms / total;
    copy
      .animate(
        [
          { transform: "scale(0.2)", opacity: 0, offset: 0 },
          { transform: "scale(1.25)", opacity: 1, offset: at(RING_POP_MS * 0.6) },
          { transform: "scale(1)", offset: at(RING_POP_MS) },
          { transform: "scale(1)", offset: at(RING_POP_MS + RING_FLY_MS) },
          { transform: "scale(1.2)", offset: at(RING_POP_MS + RING_FLY_MS + RING_LAND_MS * 0.4) },
          { transform: "scale(1)", offset: 1 },
        ],
        { duration: total, fill: "both" },
      )
      .finished.then(
        () => flight === box && land(),
        () => {},
      );
  };

  const greet = () => {
    if (!welcome) return;
    rememberWelcome();
    welcome.classList.remove("bye");
    welcome.hidden = false;
    root.classList.add("copilote-accueil");
    hold(welcomeCard, true);
    hold(welcomeNav, true);
  };
  const dock = (animate: boolean) => {
    root.classList.remove("copilote-accueil");
    hold(welcomeCard, false);
    hold(welcomeNav, false);
    if (!animate) return;
    root.classList.add("copilote-arrive");
    window.setTimeout(() => root.classList.remove("copilote-arrive"), 900);
  };
  /** Il se range : en filant vers sa pastille (gently), ou d'un coup quand on quitte l'escale. */
  const dismiss = (gently: boolean) => {
    if (!welcome || !welcoming()) return;
    if (!gently) {
      welcome.hidden = true;
      welcome.classList.remove("bye");
      dock(false);
      return;
    }
    flyRing();
    welcome.classList.add("bye");
    hold(welcomeNav, false);
    window.setTimeout(() => {
      if (!welcome.classList.contains("bye")) return;
      welcome.hidden = true;
      welcome.classList.remove("bye");
      dock(true);
      if (current !== 1 || !welcomeStop) return;
      welcomeStop.classList.add("nudge");
      window.setTimeout(() => welcomeStop.classList.remove("nudge"), NUDGE_MS);
    }, BYE_MS);
  };

  root.addEventListener("voyage:escale", (event) => {
    const { i } = (event as CustomEvent<{ i: number }>).detail;
    const from = current;
    current = i;
    closeHelp();
    for (const stop of stops) stop.classList.remove("nudge");
    if (i !== 1) land();
    if (welcoming() && i !== 1) dismiss(false);
    // Le premier départ : on arrive à l'escale 1 depuis le départ, ou la page s'ouvre sur elle.
    if (i === 1 && from <= 0 && !welcomed()) greet();
  });

  root.addEventListener("click", (event) => {
    const target = event.target as Element;
    const dockButton = target.closest<HTMLElement>("[data-copilote-dock]");
    if (dockButton) {
      const wrap = dockButton.closest<HTMLElement>("[data-copilote]")!;
      if (open === wrap) closeHelp();
      else openHelp(wrap);
      return;
    }
    if (target.closest("[data-copilote-close]")) {
      closeHelp(true);
      return;
    }
    if (target.closest("[data-copilote-voyage], [data-copilote-fermer]")) {
      dismiss(true);
      return;
    }
    if (open && !open.contains(target)) closeHelp();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (open) closeHelp(true);
    else if (welcoming()) dismiss(true);
  });
}

const root = document.querySelector<HTMLElement>("[data-voyage]");
if (root) start(root);

// Un module : ses noms (start, root) ne se mêlent pas à ceux de scripts/voyage.ts.
export {};
