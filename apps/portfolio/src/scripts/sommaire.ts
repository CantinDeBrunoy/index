/**
 * Le sommaire (components/voyage/Sommaire.astro). Le bouton l'ouvre en boîte de dialogue modale, en plein
 * écran : Échap le ferme, et le reste de la page attend derrière. La croix, ou le lien choisi, le referme.
 * Sur le voyage, il suit l'escale affichée (l'évènement « voyage:escale » de scripts/voyage.ts : ce module se
 * charge avant lui) : les points du bouton, « 2/10 », et l'escale marquée dans la liste.
 */

const roots = [...document.querySelectorAll<HTMLElement>("[data-sommaire]")];

for (const root of roots) {
  const panel = root.querySelector<HTMLDialogElement>("[data-sommaire-panel]");
  const opener = root.querySelector<HTMLElement>("[data-sommaire-open]");
  if (!panel || !opener) continue;

  opener.addEventListener("click", (event) => {
    event.preventDefault();
    panel.showModal();
  });
  panel.addEventListener("click", (event) => {
    const target = event.target as Element;
    if (target.closest("[data-sommaire-close]")) {
      event.preventDefault();
      panel.close();
    } else if (target.closest("a[href]")) {
      // Le lien suit son cours (sur le voyage, scripts/voyage.ts change d'escale) ; le sommaire se range.
      panel.close();
    }
  });
}

/** L'escale où l'on en est : 0 au départ, de 1 à 10 ensuite. */
function mark(root: HTMLElement, i: number) {
  const where = root.querySelector<HTMLElement>("[data-where]");
  if (where) where.hidden = i === 0;
  for (const dot of root.querySelectorAll<HTMLElement>("[data-dot]")) {
    const n = Number(dot.dataset.dot);
    dot.classList.toggle("done", n < i);
    dot.classList.toggle("now", n === i);
  }
  const count = root.querySelector<HTMLElement>("[data-count]");
  if (count) count.textContent = `${i}/${root.dataset.total}`;
  for (const link of root.querySelectorAll<HTMLElement>("[data-stop-link]")) {
    if (Number(link.dataset.stopLink) === i) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}

document.querySelector("[data-voyage]")?.addEventListener("voyage:escale", (event) => {
  const { i } = (event as CustomEvent<{ i: number }>).detail;
  for (const root of roots) mark(root, i);
});

// Un module : ses noms ne se mêlent pas à ceux des autres scripts.
export {};
