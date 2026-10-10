/**
 * La démo d'une fiche ([data-demo]) : muette et en boucle, elle tourne d'elle-même dès qu'elle est à l'écran,
 * et se met en pause quand on la quitte. Ses contrôles restent (le son, le plein écran) ; mise en pause à la
 * main, elle ne repart plus seule. En mouvement réduit, elle attend qu'on la lance. Elle tourne en accéléré
 * (scripts/demo-rate.ts).
 */

import { speedUp } from "./demo-rate";

const reduce = matchMedia("(prefers-reduced-motion: reduce)");

for (const video of document.querySelectorAll<HTMLVideoElement>("video[data-demo]")) {
  speedUp(video);
  /** Mise en pause par le visiteur : on ne la relance plus. */
  let held = false;
  /** La pause qui vient d'ici (la démo a quitté l'écran), pas du visiteur. */
  let ours = false;

  video.addEventListener("pause", () => {
    if (!ours) held = true;
    ours = false;
  });
  video.addEventListener("play", () => (held = false));

  new IntersectionObserver(
    ([entry]) => {
      if (reduce.matches || held || !entry) return;
      if (entry.isIntersecting) {
        video.preload = "auto";
        void video.play().catch((error: unknown) => console.debug("fiche : lecture de la démo refusée", error));
      } else if (!video.paused) {
        ours = true;
        video.pause();
      }
    },
    { threshold: 0.4 },
  ).observe(video);
}

// Un module : ses noms ne se mêlent pas à ceux des autres scripts.
export {};
