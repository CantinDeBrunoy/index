/**
 * Le copilote du voyage (components/voyage/Copilote.astro, CopiloteAccueil.astro et CopiloteTuto.astro).
 * - À chaque départ (« Décoller », ou l'escale 1 ouverte directement) : il accueille et donne le tuto, les
 *   deux façons de visiter. « Faire le voyage », la croix ou Échap le rangent ; partir de l'escale aussi.
 *   En revenant à l'escale 1 depuis l'escale 2, il reste rangé.
 * - Rangé, à chaque escale : sa pastille porte la tenue de l'escale. Un clic sur elle rouvre le tuto ;
 *   « Continuer le voyage », la croix, Échap ou un clic ailleurs le referment.
 * Il suit le voyage par l'évènement « voyage:escale » de scripts/voyage.ts : ce module se charge avant lui.
 */

/** Le temps qu'il file vers sa pastille, puis celui où l'anneau bat plus fort. */
const BYE_MS = 750;
const NUDGE_MS = 4000;

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

  /** L'accueil, à l'escale 1. Son cartel attend la fin de l'accueil : inerte, et masqué par le CSS. */
  const welcoming = () => !!welcome && !welcome.hidden;
  const welcomeCard = welcome?.closest("[data-stop]")?.querySelector<HTMLElement>(".cartel") ?? null;
  const greet = () => {
    if (!welcome) return;
    welcome.classList.remove("bye");
    welcome.hidden = false;
    root.classList.add("copilote-accueil");
    if (welcomeCard) welcomeCard.inert = true;
  };
  const dock = (animate: boolean) => {
    root.classList.remove("copilote-accueil");
    if (welcomeCard) welcomeCard.inert = false;
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
    welcome.classList.add("bye");
    const stop = welcome.closest<HTMLElement>("[data-stop]");
    window.setTimeout(() => {
      if (!welcome.classList.contains("bye")) return;
      welcome.hidden = true;
      welcome.classList.remove("bye");
      dock(true);
      if (current !== 1 || !stop) return;
      stop.classList.add("nudge");
      window.setTimeout(() => stop.classList.remove("nudge"), NUDGE_MS);
    }, BYE_MS);
  };

  root.addEventListener("voyage:escale", (event) => {
    const { i } = (event as CustomEvent<{ i: number }>).detail;
    const from = current;
    current = i;
    closeHelp();
    for (const stop of stops) stop.classList.remove("nudge");
    if (welcoming() && i !== 1) dismiss(false);
    // Un départ : on arrive à l'escale 1 depuis le départ, ou la page s'ouvre sur elle.
    if (i === 1 && from <= 0) greet();
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
