// Le carrousel « en dehors du code » (AproposPage.astro) : un loisir au centre, ses deux voisins de côté, et il
// tourne seul toutes les 4 s quand il est à l'écran. Il s'arrête au survol et au focus ; en mouvement réduit, il
// ne tourne pas. Les flèches, les points ou un clic sur un loisir de côté le font avancer.
// Chaque loisir s'affiche d'abord en image fixe ; sa boucle animée ne se charge qu'en arrivant à côté du centre.
const carousel = document.querySelector<HTMLElement>("[data-carousel]");

if (carousel) {
  const slides = [...carousel.querySelectorAll<HTMLElement>("[data-slide]")];
  const dots = [...carousel.querySelectorAll<HTMLButtonElement>("[data-dot]")];
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  const n = slides.length;
  let cur = 0;
  let held = false;
  let visible = false;

  const show = (i: number) => {
    cur = (i + n) % n;
    slides.forEach((slide, k) => {
      let pos = (k - cur + n) % n;
      if (pos > n / 2) pos -= n;
      slide.dataset.pos = String(pos);
      const img = slide.querySelector<HTMLImageElement>("img[data-loop]");
      if (img && Math.abs(pos) <= 1) {
        img.src = img.dataset.loop!;
        delete img.dataset.loop;
      }
      // Les loisirs de côté restent cliquables, mais les lecteurs d'écran n'entendent que celui du centre.
      if (pos === 0) slide.removeAttribute("aria-hidden");
      else slide.setAttribute("aria-hidden", "true");
    });
    dots.forEach((dot, k) => {
      if (k === cur) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  };

  window.setInterval(() => {
    if (!calm.matches && !held && visible && !document.hidden) show(cur + 1);
  }, 4000);
  new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
  }).observe(carousel);

  carousel.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((button) => button.addEventListener("click", () => show(cur + Number(button.dataset.step))));
  dots.forEach((dot, k) => dot.addEventListener("click", () => show(k)));
  slides.forEach((slide, k) =>
    slide.addEventListener("click", () => {
      if (k !== cur) show(k);
    }),
  );
  carousel.addEventListener("mouseenter", () => (held = true));
  carousel.addEventListener("mouseleave", () => (held = carousel.contains(document.activeElement)));
  carousel.addEventListener("focusin", () => (held = true));
  carousel.addEventListener("focusout", (event) => (held = carousel.contains(event.relatedTarget as Node | null)));

  show(0);
}
