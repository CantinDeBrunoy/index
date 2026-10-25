/**
 * « Au travail » (components/voyage/Travail.astro) : un point de la scène, un arrêt de la tournée, ou précédent /
 * suivant, choisit une app. Le camion roule jusqu'à son arrêt (--at, que lisent la route et le camion), les arrêts
 * d'avant passent en laiton, et sa fiche prend la place de la précédente ; un texte caché l'annonce.
 */
for (const root of document.querySelectorAll<HTMLElement>("[data-travail]")) {
  const picks = [...root.querySelectorAll<HTMLButtonElement>("[data-pick]")];
  const panels = [...root.querySelectorAll<HTMLElement>("[data-panel]")];
  const pos = root.querySelector<HTMLElement>("[data-pos]");
  const status = root.querySelector<HTMLElement>("[data-status]");
  const n = panels.length;
  let at = n - 1;

  const show = (i: number) => {
    at = (i + n) % n;
    root.style.setProperty("--at", String(at));
    for (const b of picks) {
      const k = Number(b.dataset.pick);
      b.classList.toggle("on", k === at);
      b.classList.toggle("done", k < at);
      b.setAttribute("aria-pressed", String(k === at));
    }
    panels.forEach((p, k) => p.toggleAttribute("data-off", k !== at));
    if (pos) pos.textContent = String(at + 1);
    if (status) status.textContent = panels[at]?.dataset.title ?? "";
  };

  root.addEventListener("click", (event) => {
    const target = (event.target as Element).closest<HTMLElement>("[data-pick], [data-step]");
    if (!target) return;
    if (target.dataset.pick !== undefined) show(Number(target.dataset.pick));
    else show(at + Number(target.dataset.step));
  });
}
