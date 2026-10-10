// Le copilote qui suit la lecture d'une fiche, dès son haut, et ramène au voyage. Il s'efface au bas de la
// page, où le bouton « Reprendre le voyage » prend le relais : quand un élément [data-resume-hides] est à
// l'écran. Sans script, il reste visible.
const button = document.querySelector<HTMLElement>("[data-resume]");
const hides = document.querySelectorAll("[data-resume-hides]");

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
