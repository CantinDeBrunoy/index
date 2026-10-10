// Le copilote qui suit la lecture d'une fiche, dès son haut, et ramène au voyage. Sur ordinateur, il part du
// bas de l'écran et monte avec la lecture : au milieu une fois qu'on a descendu d'un demi-écran, il y reste
// (--rise, de 0 à 1 ; le CSS en fait le déplacement). Il s'efface au bas de la page, où le bouton « Reprendre
// le voyage » prend le relais : quand un élément [data-resume-hides] est à l'écran. Sans script, il reste
// visible, en bas.
const button = document.querySelector<HTMLElement>("[data-resume]");
const hides = document.querySelectorAll("[data-resume-hides]");

if (button) {
  const desktop = matchMedia("(min-width: 701px)");
  let frame = 0;
  const rise = () => {
    frame = 0;
    const progress = desktop.matches ? Math.min(1, scrollY / (innerHeight / 2)) : 0;
    button.style.setProperty("--rise", progress.toFixed(3));
  };
  addEventListener("scroll", () => (frame ||= requestAnimationFrame(rise)), { passive: true });
  addEventListener("resize", rise);
  desktop.addEventListener("change", rise);
  rise();
}

if (button && hides.length) {
  const onScreen = new Set<Element>();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) onScreen.add(entry.target);
      else onScreen.delete(entry.target);
    }
    button.classList.toggle("is-hidden", onScreen.size > 0);
  });
  hides.forEach((el) => observer.observe(el));
}
