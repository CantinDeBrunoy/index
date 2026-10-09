// « Les projets » sur grand écran (CarnetPage.astro) : la liste des escales et, à côté, la scène de celle qu'on
// a choisie. Un clic sur une ligne la choisit (au clavier, Entrée) ; un second clic sur la ligne déjà choisie ouvre
// sa fiche, comme le bouton du panneau. Les lignes restent des liens vers la fiche : sans script, elles y mènent
// directement. L'image fixe s'affiche tout de suite ; la boucle animée la remplace si on s'y attarde, sans
// mouvement réduit : seules les boucles regardées se chargent. Sous 1 280 px, la liste est cachée (les cartes
// postales la remplacent) et rien ne se charge.
const root = document.querySelector<HTMLElement>("[data-atlas]");
const media = root?.querySelector<HTMLElement>("[data-atlas-media]");
const img = media?.querySelector("img");
const wide = matchMedia("(min-width: 1280px)");
const calm = matchMedia("(prefers-reduced-motion: reduce)");

if (root && media && img) {
  const rows = [...root.querySelectorAll<HTMLAnchorElement>("[data-atlas-row]")];
  const panels = [...root.querySelectorAll<HTMLElement>("[data-atlas-panel]")];
  let sel = 0;
  let timer = 0;

  const animate = (row: HTMLAnchorElement) => {
    if (calm.matches || !wide.matches || !row.dataset.loop) return;
    const loop = new Image();
    loop.onload = () => {
      if (rows[sel] === row) img.src = loop.src;
    };
    loop.src = row.dataset.loop;
  };
  const show = (i: number) => {
    if (i === sel) return;
    sel = i;
    const row = rows[i]!;
    rows.forEach((r, k) => {
      r.toggleAttribute("data-on", k === i);
      if (k === i) r.setAttribute("aria-current", "true");
      else r.removeAttribute("aria-current");
    });
    panels.forEach((p, k) => p.toggleAttribute("data-off", k !== i));
    media.style.background = row.dataset.bg ?? "";
    if (row.dataset.still) img.src = row.dataset.still;
    clearTimeout(timer);
    timer = window.setTimeout(() => animate(row), 250);
  };

  rows.forEach((row, k) => {
    row.addEventListener("click", (e) => {
      // La ligne déjà choisie mène à sa fiche ; un clic avec une touche (nouvel onglet…) garde son rôle de lien.
      if (k === sel || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || !wide.matches) return;
      e.preventDefault();
      show(k);
    });
  });
  // La première escale s'anime une fois la page chargée.
  if (document.readyState === "complete") animate(rows[0]!);
  else addEventListener("load", () => animate(rows[0]!), { once: true });
}
