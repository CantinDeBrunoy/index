/**
 * La fiche sous l'escale (components/voyage/VoyagePage.astro, .fiche-sous) : on ne quitte pas le voyage pour la lire.
 * C'est la fiche de sa page (FichePage.astro, embedded), posée sous l'écran des escales. Le voyage ne la porte pas :
 *   il la charge quand on l'ouvre (ou qu'on approche son bouton), depuis sa page seule (pages/fiches), avec les
 *   feuilles de style qui lui manquent, puis démarre ce qu'elle contient. Sans réponse, on va sur sa page.
 * - « La fiche du projet » l'ouvre et la page y glisse, jusqu'à son haut ; sa bande « Reprendre le voyage » et son
 *   copilote ramènent à l'escale.
 * - À la molette ou au doigt, l'escale est retenue en haut : un petit coup laisse dépasser le bord de la fiche, qui
 *   repart ; il faut tirer un peu fort (RELEASE_PX) pour qu'elle s'ouvre. Sur téléphone, on tire depuis le bas de
 *   l'escale.
 * - Ouverte, la fiche se lit librement ; revenu tout en haut, elle se referme : l'escale est de nouveau retenue.
 *   Entre les deux, on ne reste pas à mi-chemin : la page finit le mouvement commencé.
 * Le voyage (scripts/voyage.ts) dit sur quelle escale on est et si l'on peut l'ouvrir ; il la referme sous son
 * voile quand on change d'escale.
 */

import { watchStatus } from "./brief-status";
import { startDemos } from "./demo-video";
import { startPoints } from "./fiche-points";
import { watchOwner } from "./owner";
import { startResume } from "./resume-button";
import { startScenes } from "./scene-video";

/** Jusqu'où le bord de la fiche dépasse quand on tire, et la souplesse de cette résistance. */
const PEEK_PX = 96;
const GIVE_PX = 240;
/** Le défilement cumulé (molette, ou doigt × TOUCH_GAIN) qui ouvre la fiche. */
const RELEASE_PX = 360;
const TOUCH_GAIN = 2.6;
/** Sans nouveau coup de molette pendant ce temps, la fiche repart. */
const IDLE_MS = 200;
const SPRING_MS = 280;
const GLIDE_MS = 750;
/** Arrêté entre l'escale et la fiche : au bout de ce temps sans défiler, la page finit le mouvement, à cette allure. */
const SETTLE_MS = 140;
const MAGNET_MS = 450;

const easeOut = (k: number) => 1 - (1 - k) ** 4;
const easeInOut = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);

/** Une feuille de style de la fiche que le voyage n'a pas encore : la fiche attend qu'elle soit là pour s'afficher. */
const stylesheet = (href: string) => {
  if ([...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].some((link) => link.href === href)) return Promise.resolve();
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  const ready = new Promise<void>((done) => (link.onload = link.onerror = () => done()));
  document.head.appendChild(link);
  return ready;
};
/** Ses styles écrits dans la page (les petits, et tous pendant le développement), une fois chacun. */
const styles = new Set<string>();
const inlineStyle = (css: string) => {
  if (!css || styles.has(css)) return;
  styles.add(css);
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
};

export interface FicheHooks {
  /** L'escale affichée, si l'on peut ouvrir sa fiche (pas pendant une transition ni l'accueil du copilote) ; -1 sinon. */
  stop: () => number;
  /** La lecture commence ou s'arrête : la scène de l'escale, hors de l'écran, se met en pause. */
  reading: (on: boolean) => void;
}

export function startFiches(root: HTMLElement, hooks: FicheHooks) {
  const main = root.querySelector<HTMLElement>("main");
  const fiches = new Map([...root.querySelectorAll<HTMLElement>("[data-fiche-of]")].map((el) => [Number(el.dataset.ficheOf), el]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  /** La fiche affichée (ouverte, ou qu'on tire), et son escale. */
  let open: HTMLElement | null = null;
  let openStop = 0;
  /** Ce qu'on a tiré jusqu'ici, et d'où (le défilement au repos sur l'escale). */
  let pull = 0;
  let pulling = false;
  let base = 0;
  let reading = false;
  let gliding = false;
  let anim = 0;
  let late = 0;
  let idle = 0;
  let touchY = -1;
  let touchStop = 0;

  const scrollToY = (y: number) => window.scrollTo({ top: y, behavior: "instant" });
  /** Le bas de l'écran des escales, dans la page : la fiche commence là. */
  const edge = () => (main ? main.getBoundingClientRect().bottom + scrollY : innerHeight);
  /** Le défilement au repos sur l'escale : son bas au bas de l'écran (0 sur ordinateur, où elle tient dans l'écran). */
  const rest = () => Math.max(0, Math.round(edge() - innerHeight));
  /** Où la lecture commence : le haut de la fiche en haut de l'écran, comme en arrivant sur sa page. */
  const target = () => Math.max(rest(), Math.round(edge()));

  const setReading = (on: boolean) => {
    if (reading === on) return;
    reading = on;
    root.classList.toggle("fiche-reading", on);
    hooks.reading(on);
  };
  /** La fiche à l'écran : les affiches de ses vidéos se chargent (data-poster), son copilote se met à sa place. */
  const reveal = (fiche: HTMLElement) => {
    for (const video of fiche.querySelectorAll<HTMLVideoElement>("video[data-poster]")) video.poster ||= video.dataset.poster ?? "";
    document.dispatchEvent(new CustomEvent("fiche:revele"));
  };

  /** La fiche, chargée une fois pour toutes ; sa place, d'ici là, a la couleur de son en-tête. */
  const loads = new Map<number, Promise<boolean>>();
  const fill = async (fiche: HTMLElement) => {
    const src = new URL(fiche.dataset.ficheSrc ?? "", location.href);
    const response = await fetch(src);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const page = new DOMParser().parseFromString(await response.text(), "text/html");
    const links = [...page.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')];
    await Promise.all(links.map((link) => stylesheet(new URL(link.getAttribute("href") ?? "", src).href)));
    for (const style of page.head.querySelectorAll("style")) inlineStyle(style.textContent ?? "");
    // Ses scripts ne tournent pas ici : le voyage démarre lui-même ce qu'elle contient.
    for (const script of page.body.querySelectorAll("script")) script.remove();
    fiche.replaceChildren(...[...page.body.childNodes].map((node) => document.importNode(node, true)));
    fiche.classList.add("is-loaded");
    startScenes(fiche);
    startDemos(fiche);
    startPoints(fiche);
    watchStatus(fiche);
    startResume(fiche);
    void watchOwner(fiche);
    if (open === fiche) reveal(fiche);
    return true;
  };
  const load = (n: number) => {
    const fiche = fiches.get(n);
    if (!fiche) return Promise.resolve(false);
    let loading = loads.get(n);
    if (!loading) {
      loading = fill(fiche).catch((error: unknown) => {
        console.debug("voyage : fiche introuvable", error);
        loads.delete(n);
        // Ouverte entre-temps : on va sur sa page, comme sans script.
        const page = root.querySelector<HTMLAnchorElement>(`[data-stop="${n}"] [data-fiche-open]`);
        if (open === fiche && page) location.assign(page.href);
        return false;
      });
      loads.set(n, loading);
    }
    return loading;
  };

  const show = (n: number) => {
    const fiche = fiches.get(n);
    if (!fiche) return false;
    open = fiche;
    openStop = n;
    void load(n);
    fiche.classList.add("is-open");
    if (fiche.classList.contains("is-loaded")) reveal(fiche);
    return true;
  };
  const hide = () => {
    window.clearTimeout(idle);
    window.clearTimeout(late);
    cancelAnimationFrame(anim);
    gliding = pulling = false;
    pull = 0;
    root.classList.remove("fiche-pulling");
    open?.classList.remove("is-open");
    open = null;
    setReading(false);
  };

  /** Le défilement mené par le script, image par image : la même allure partout. Si les images ne viennent pas
      (onglet en arrière-plan), il arrive quand même à l'heure : la molette ne reste pas bloquée. */
  const glide = (to: number, ms: number, ease: (k: number) => number, done?: () => void) => {
    cancelAnimationFrame(anim);
    window.clearTimeout(late);
    const from = scrollY;
    const finish = () => {
      cancelAnimationFrame(anim);
      window.clearTimeout(late);
      scrollToY(to);
      gliding = false;
      done?.();
    };
    if (reduce.matches || ms <= 0 || Math.abs(to - from) < 1) return finish();
    gliding = true;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      if (k >= 1) return finish();
      scrollToY(from + (to - from) * ease(k));
      anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
    late = window.setTimeout(finish, ms + 200);
  };

  /** On tire : le bord de la fiche dépasse, de moins en moins à mesure qu'on insiste. */
  const setPull = (value: number) => {
    pull = Math.max(0, value);
    scrollToY(base + PEEK_PX * (1 - Math.exp(-pull / GIVE_PX)));
  };
  const startPull = (n: number) => {
    if (!show(n)) return false;
    base = rest();
    pulling = true;
    root.classList.add("fiche-pulling");
    return true;
  };
  /** Pas assez fort : la fiche repart sous l'escale, et se referme. */
  const springBack = () => {
    window.clearTimeout(idle);
    glide(base, SPRING_MS, easeOut, hide);
  };
  /** Assez fort, ou le bouton : la fiche s'ouvre et la page y glisse ; au bouton, le focus y entre aussi. */
  const release = (focus = false) => {
    window.clearTimeout(idle);
    pulling = false;
    pull = 0;
    root.classList.remove("fiche-pulling");
    setReading(true);
    glide(target(), GLIDE_MS, easeOut, () => focus && open?.focus({ preventScroll: true }));
  };
  const openFiche = (n: number, focus: boolean) => {
    if (!open && !show(n)) return;
    release(focus);
  };
  /** « Remonter à l'escale » : la page remonte, la fiche se referme, le focus revient au titre de l'escale. */
  const backUp = () => {
    const n = openStop;
    const to = rest();
    glide(to, Math.min(1000, Math.max(450, (scrollY - to) * 0.35)), easeInOut, () => {
      hide();
      root.querySelector<HTMLElement>(`[data-stop="${n}"] [data-focus]`)?.focus({ preventScroll: true });
    });
  };

  /** L'escale qu'on peut tirer : au repos, et (sur téléphone) déjà défilée jusqu'en bas. */
  const pullable = () => {
    const n = hooks.stop();
    return n > 0 && fiches.has(n) && scrollY >= rest() - 2 ? n : -1;
  };

  addEventListener(
    "wheel",
    (event) => {
      if (gliding) return void event.preventDefault();
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const dy = event.deltaY * (event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? innerHeight : 1);
      if (!pulling) {
        // Fiche ouverte, on la lit : le défilement est libre. Vers le haut, l'escale n'a rien à retenir.
        if (open || dy <= 0) return;
        const n = pullable();
        if (n < 0 || !startPull(n)) return;
      }
      event.preventDefault();
      setPull(pull + dy);
      if (pull >= RELEASE_PX) return release();
      window.clearTimeout(idle);
      idle = window.setTimeout(springBack, IDLE_MS);
    },
    { passive: false },
  );

  // Au doigt : on tire depuis le bas de l'escale, et c'est en lâchant qu'elle s'ouvre, ou repart.
  addEventListener(
    "touchstart",
    (event) => {
      touchY = -1;
      if (open || gliding || event.touches.length !== 1) return;
      const n = pullable();
      if (n < 0) return;
      touchY = event.touches[0]!.clientY;
      touchStop = n;
    },
    { passive: true },
  );
  addEventListener(
    "touchmove",
    (event) => {
      if (gliding) return void (event.cancelable && event.preventDefault());
      if (touchY < 0) return;
      const d = touchY - event.touches[0]!.clientY;
      if (!pulling) {
        // Vers le bas de l'écran (on remonte l'escale), ou le navigateur défile déjà : on le laisse faire.
        if (d <= 0 || !event.cancelable || !startPull(touchStop)) {
          if (d < 0) touchY = -1;
          return;
        }
      }
      event.preventDefault();
      setPull(d * TOUCH_GAIN);
    },
    { passive: false },
  );
  const touchEnd = () => {
    if (touchY < 0) return;
    touchY = -1;
    if (!pulling) return;
    if (pull >= RELEASE_PX) release();
    else springBack();
  };
  addEventListener("touchend", touchEnd);
  addEventListener("touchcancel", touchEnd);

  // Au clavier, sur l'escale : la flèche du bas, Page suivante ou Espace descendent à la fiche, sans résistance.
  document.addEventListener("keydown", (event) => {
    if (open || pulling || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const space = event.key === " " && event.target === document.body;
    if (event.key !== "ArrowDown" && event.key !== "PageDown" && !space) return;
    const n = pullable();
    if (n < 0) return;
    event.preventDefault();
    openFiche(n, false);
  });

  // On approche du bouton de la fiche : elle se charge déjà, elle sera là au clic.
  const soon = (event: Event) => {
    const opener = (event.target as Element).closest<HTMLElement>("[data-fiche-open]");
    const n = Number(opener?.closest<HTMLElement>("[data-stop]")?.dataset.stop);
    if (n > 0) void load(n);
  };
  root.addEventListener("pointerover", soon);
  root.addEventListener("focusin", soon);

  root.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target as Element;
    const opener = target.closest<HTMLElement>("[data-fiche-open]");
    if (opener) {
      // Sans script, ou ctrl-clic, le lien mène à la page de la fiche ; ici, elle s'ouvre sous l'escale.
      event.preventDefault();
      const n = Number(opener.closest<HTMLElement>("[data-stop]")?.dataset.stop);
      if (n === hooks.stop() && !gliding) openFiche(n, true);
      return;
    }
    // La bande « Reprendre le voyage » et le copilote : des liens vers l'escale, ici on y remonte.
    if (target.closest("[data-fiche-up]")) {
      event.preventDefault();
      if (open && !gliding) backUp();
    }
  });

  // Entre l'escale et le début de la lecture, rien ne s'arrête à mi-chemin : la page finit le mouvement commencé,
  // jusqu'à l'escale (la fiche se referme) ou jusqu'à la fiche. Pas tant que le doigt est posé.
  let lastY = scrollY;
  let direction = 0;
  let settle = 0;
  let touching = false;
  const magnet = () => {
    if (!open || pulling || gliding || touching) return;
    const low = rest();
    const top = target();
    if (scrollY <= low + 1 || scrollY >= top - 1) return;
    if (direction < 0) glide(low, MAGNET_MS, easeInOut, hide);
    else glide(top, MAGNET_MS, easeInOut);
  };
  const settleSoon = () => {
    window.clearTimeout(settle);
    if (open && !pulling && !gliding) settle = window.setTimeout(magnet, SETTLE_MS);
  };
  addEventListener("touchstart", () => (touching = true), { passive: true });
  for (const type of ["touchend", "touchcancel"]) {
    addEventListener(type, () => {
      touching = false;
      settleSoon();
    });
  }
  addEventListener(
    "scroll",
    () => {
      direction = Math.sign(scrollY - lastY) || direction;
      lastY = scrollY;
      if (!open || pulling || gliding) return;
      // Remonté jusqu'à l'escale (la fiche est alors sous l'écran) : elle se referme, l'escale est de nouveau retenue.
      if (scrollY <= rest() + 1) return hide();
      settleSoon();
    },
    { passive: true },
  );

  return {
    /** Le voyage change d'escale, sous son voile : la fiche se referme sans bouger. */
    close: hide,
    isOpen: () => open !== null,
  };
}
