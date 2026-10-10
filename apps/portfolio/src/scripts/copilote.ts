/**
 * L'accueil du copilote (components/voyage/CopiloteAccueil.astro et CopiloteTuto.astro), au premier départ
 * seulement (« Décoller », ou l'escale 1 ouverte directement) : il accueille et donne le tuto, les deux façons
 * de visiter. « Faire le voyage », la croix ou Échap le rangent ; partir de l'escale aussi. Le navigateur s'en
 * souvient (localStorage) : aux visites suivantes, il ne revient pas.
 * Il suit le voyage par l'évènement « voyage:escale » de scripts/voyage.ts : ce module se charge avant lui.
 */

/** Le temps qu'il file dans le coin, puis celui où l'anneau bat plus fort. */
const BYE_MS = 750;
const NUDGE_MS = 4000;
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
  if (!welcome) return;
  const stops = [...root.querySelectorAll<HTMLElement>("[data-stop]")];
  /** L'escale affichée ; -1 avant la première. */
  let current = -1;

  /** L'accueil, à l'escale 1. Son cartel attend la fin de l'accueil : inerte, et masqué par le CSS. */
  const welcoming = () => !welcome.hidden;
  const welcomeCard = welcome.closest("[data-stop]")?.querySelector<HTMLElement>(".cartel") ?? null;
  const greet = () => {
    rememberWelcome();
    welcome.classList.remove("bye");
    welcome.hidden = false;
    if (welcomeCard) welcomeCard.inert = true;
  };
  const away = () => {
    welcome.hidden = true;
    welcome.classList.remove("bye");
    if (welcomeCard) welcomeCard.inert = false;
  };
  /** Il se range : en filant dans le coin (gently), puis l'anneau de l'escale bat plus fort ; ou d'un coup quand on quitte l'escale. */
  const dismiss = (gently: boolean) => {
    if (!welcoming()) return;
    if (!gently) return away();
    welcome.classList.add("bye");
    const stop = welcome.closest<HTMLElement>("[data-stop]");
    window.setTimeout(() => {
      if (!welcome.classList.contains("bye")) return;
      away();
      if (current !== 1 || !stop) return;
      stop.classList.add("nudge");
      window.setTimeout(() => stop.classList.remove("nudge"), NUDGE_MS);
    }, BYE_MS);
  };

  root.addEventListener("voyage:escale", (event) => {
    const { i } = (event as CustomEvent<{ i: number }>).detail;
    const from = current;
    current = i;
    for (const stop of stops) stop.classList.remove("nudge");
    if (welcoming() && i !== 1) dismiss(false);
    // Le premier départ : on arrive à l'escale 1 depuis le départ, ou la page s'ouvre sur elle.
    if (i === 1 && from <= 0 && !welcomed()) greet();
  });

  root.addEventListener("click", (event) => {
    if ((event.target as Element).closest("[data-copilote-voyage], [data-copilote-fermer]")) dismiss(true);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && welcoming()) dismiss(true);
  });
}

const root = document.querySelector<HTMLElement>("[data-voyage]");
if (root) start(root);

// Un module : ses noms (start, root) ne se mêlent pas à ceux de scripts/voyage.ts.
export {};
