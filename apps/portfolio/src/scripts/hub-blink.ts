/**
 * Le clignotement de l'écran des départs. De temps en temps, un texte au hasard (un vol, une porte,
 * une destination, une remarque surtout) clignote deux ou trois fois, comme une ligne qui vient de
 * changer. Et tout ce qui clignote (ces textes, une remarque en attente, le deux-points de l'heure)
 * suit une seule horloge, comme sur un vrai panneau : tout s'allume et s'éteint ensemble, à la seconde.
 * Sous mouvement réduit, rien ne clignote.
 */

/** L'animation du tableau (HubPage.astro) et sa période, allumé puis éteint, en ms. */
const BLINK = "led-blink";
const PERIOD = 1000;
/** Les textes qui peuvent clignoter au hasard (pas les en-têtes de colonnes, ni les « — » sans porte). */
const TEXTS = ".dep td.num, .dep td.gate, .dep td.dest a, .dep .st";

const isBlink = (animation: Animation) => (animation as CSSAnimation).animationName === BLINK;

/** Cale les clignotements continus sur l'horloge commune ; à rappeler quand un statut change. */
export function syncBlinks(root: Element) {
  for (const animation of root.getAnimations({ subtree: true })) {
    if (isBlink(animation) && animation.effect?.getComputedTiming().iterations === Infinity) animation.startTime = 0;
  }
}

/** Fait clignoter un texte `times` fois, à partir du prochain battement de l'horloge commune. */
function flash(el: HTMLElement, times: number) {
  el.style.setProperty("--blinks", String(times));
  el.classList.add("is-blinking");
  const animation = el.getAnimations().find(isBlink);
  const now = document.timeline.currentTime;
  if (animation && typeof now === "number") animation.startTime = Math.ceil(now / PERIOD) * PERIOD;
  el.addEventListener("animationend", () => el.classList.remove("is-blinking"), { once: true });
}

/**
 * Toutes les 1,5 à 4 s, un texte visible et au repos, tiré au hasard, jamais deux fois de suite le
 * même ; les remarques comptent double.
 */
export function startBlinking(board: HTMLElement) {
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let last: HTMLElement | undefined;
  const next = () => setTimeout(pick, 1500 + Math.random() * 2500);
  const pick = () => {
    if (!still.matches && document.visibilityState === "visible") {
      const texts = [...board.querySelectorAll<HTMLElement>(TEXTS)].filter(
        (el) =>
          el !== last && el.textContent?.trim() !== "—" && el.getClientRects().length > 0 && el.getAnimations().length === 0,
      );
      const pool = [...texts, ...texts.filter((el) => el.classList.contains("st"))];
      last = pool[Math.floor(Math.random() * pool.length)];
      if (last) flash(last, 2 + Math.floor(Math.random() * 2));
    }
    next();
  };
  next();
}
