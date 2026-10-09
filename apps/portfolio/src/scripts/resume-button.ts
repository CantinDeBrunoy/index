// Le bouton « Reprendre le voyage » qui suit la lecture d'une fiche. Il paraît quand la pastille du haut
// sort de l'écran et s'efface au bas de la page, où la carte de l'escale suivante prend le relais : il se
// montre quand aucun élément [data-resume-hides] n'est à l'écran. Sans script, il reste caché.
const button = document.querySelector<HTMLElement>("[data-resume]");
const hides = document.querySelectorAll("[data-resume-hides]");

if (button && hides.length) {
  const onScreen = new Set<Element>();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) onScreen.add(entry.target);
      else onScreen.delete(entry.target);
    }
    button.classList.toggle("is-shown", onScreen.size === 0);
  });
  hides.forEach((el) => observer.observe(el));
}
