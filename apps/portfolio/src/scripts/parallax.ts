/**
 * Repli du parallax pour les navigateurs sans « scroll-driven animations » (CSS) :
 * mêmes couches [data-parallax], même vitesse (--parallax), mouvement linéaire,
 * uniquement des transform, au plus une mise à jour par image (requestAnimationFrame).
 */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (!CSS.supports("animation-timeline: view()")) {
  const layers = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"), (el) => ({
    el,
    speed: Number.parseFloat(getComputedStyle(el).getPropertyValue("--parallax")) || 0,
    hero: el.hasAttribute("data-parallax-hero"),
  }));

  let frame = 0;

  const update = () => {
    frame = 0;
    const vh = window.innerHeight;
    for (const { el, speed, hero } of layers) {
      if (reduceMotion.matches) {
        el.style.transform = "";
        continue;
      }
      let y: number;
      if (hero) {
        y = Math.min(window.scrollY, vh) * speed;
      } else {
        // Progression de la couche à travers l'écran, de 0 (entre par le bas) à 1 (sort par le haut).
        const box = (el.parentElement ?? el).getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (vh - box.top) / (vh + box.height)));
        y = speed * (progress * 2 - 1) * 0.25 * vh;
      }
      el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    }
  };

  const request = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  reduceMotion.addEventListener("change", request);
  update();
}
