/**
 * Sur téléphone, une scène s'affiche d'abord en image fixe (quelques dizaines de Ko), puis passe à sa
 * boucle animée (plusieurs centaines) dès que celle-ci est téléchargée : la page n'attend plus la boucle
 * pour s'afficher (sur une 4G lente, la plus grande image arrivait après 3,7 s). En mouvement réduit,
 * l'image reste fixe ; sans script aussi.
 * Balisage : <source media="(max-width: 700px)" srcset="<image fixe>" data-loop="<boucle animée>">.
 */

const phone = matchMedia("(max-width: 700px)");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

export function animatePhoneScene(root: Element): void {
  if (!phone.matches || reduce.matches) return;
  // La boucle ne se télécharge qu'une fois la scène à l'écran : sous une fiche, on peut ne jamais y aller.
  const seen = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    seen.disconnect();
    for (const source of root.querySelectorAll<HTMLSourceElement>("source[data-loop]")) {
      const loop = source.dataset.loop!;
      source.removeAttribute("data-loop");
      const img = new Image();
      img.onload = () => {
        source.srcset = loop;
      };
      img.src = loop;
    }
  });
  seen.observe(root);
}
