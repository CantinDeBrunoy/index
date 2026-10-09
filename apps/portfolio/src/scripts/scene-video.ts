/**
 * Une scène seule (la 404) : sur ordinateur, la vidéo haute définition tourne en boucle ; en mouvement
 * réduit, elle reste sur sa première image ; illisible, elle laisse sa place à la boucle WebP.
 * Sur téléphone, c'est la boucle WebP, qui remplace l'image fixe une fois chargée (scripts/phone-loop.ts).
 */

import { animatePhoneScene } from "./phone-loop";

const desktop = matchMedia("(min-width: 701px)");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

for (const root of document.querySelectorAll<HTMLElement>("[data-scene-video]")) {
  animatePhoneScene(root);
  const video = root.querySelector("video");
  if (!video) continue;
  video.querySelector("source:last-of-type")?.addEventListener("error", () => root.classList.add("no-video"));

  const play = () => {
    if (!desktop.matches) return;
    video.preload = "auto";
    if (reduce.matches) {
      if (video.readyState === HTMLMediaElement.HAVE_NOTHING) video.load();
    } else void video.play().catch(() => {});
  };

  play();
  desktop.addEventListener("change", () => (desktop.matches ? play() : video.pause()));
  // Fenêtre en arrière-plan : le navigateur met les vidéos muettes en pause ; elles repartent au retour.
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && play());
  addEventListener("focus", play);
}
