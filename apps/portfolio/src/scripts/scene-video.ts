/**
 * Une scène seule (la 404, l'en-tête d'une fiche) : sur ordinateur, la vidéo haute définition tourne en boucle
 * tant qu'elle est à l'écran ; en mouvement réduit, elle reste sur sa première image ; illisible, elle laisse sa
 * place à la boucle WebP. Au voyage, les fiches sous les escales restent fermées : leurs scènes ne se chargent pas.
 * Sur téléphone, c'est la boucle WebP, qui remplace l'image fixe une fois chargée (scripts/phone-loop.ts).
 */

import { animatePhoneScene } from "./phone-loop";

const desktop = matchMedia("(min-width: 701px)");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

/** Les scènes de la page, ou celle d'une fiche posée sous son escale au voyage (scripts/voyage-fiche.ts). */
export function startScenes(scope: Document | Element = document) {
  for (const root of scope.querySelectorAll<HTMLElement>("[data-scene-video]")) {
    // Le script en ligne de la scène l'a déjà dit, sauf pour une fiche posée après coup.
    root.classList.add("js");
    animatePhoneScene(root);
    const video = root.querySelector("video");
    if (!video) continue;
    video.querySelector("source:last-of-type")?.addEventListener("error", () => root.classList.add("no-video"));

    let seen = false;
    const play = () => {
      if (!desktop.matches || !seen) return;
      video.preload = "auto";
      if (reduce.matches) {
        if (video.readyState === HTMLMediaElement.HAVE_NOTHING) video.load();
      } else void video.play().catch(() => {});
    };

    new IntersectionObserver(([entry]) => {
      seen = entry?.isIntersecting ?? false;
      if (seen) play();
      else video.pause();
    }).observe(root);
    desktop.addEventListener("change", () => (desktop.matches ? play() : video.pause()));
    // Fenêtre en arrière-plan : le navigateur met les vidéos muettes en pause ; elles repartent au retour.
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && play());
    addEventListener("focus", play);
  }
}

startScenes();
