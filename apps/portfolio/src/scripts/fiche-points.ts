// La ligne de vol de la fiche (FichePoints.astro) : un point choisi à la fois, comme des onglets. Au clic, aux
// flèches du clavier (Début et Fin aussi) ou avec précédent / suivant ; le trait parcouru et l'avion suivent.
for (const root of document.querySelectorAll<HTMLElement>("[data-points]")) {
  const route = root.querySelector<HTMLElement>(".route");
  const line = root.querySelector<HTMLElement>(".route__line");
  const done = root.querySelector<HTMLElement>(".route__done");
  const plane = root.querySelector<SVGElement>(".route__plane");
  const pos = root.querySelector<HTMLElement>("[data-pos]");
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
  if (!route || !line || !done || !plane || !pos || !tabs.length) continue;

  let sel = 0;
  const center = (el: Element) => {
    const r = el.getBoundingClientRect();
    return r.left + r.width / 2 - route.getBoundingClientRect().left;
  };
  const place = () => {
    const first = center(tabs[0]!);
    const here = center(tabs[sel]!);
    line.style.left = done.style.left = `${first}px`;
    line.style.right = "auto";
    line.style.width = `${center(tabs[tabs.length - 1]!) - first}px`;
    done.style.width = `${here - first}px`;
    plane.style.transform = `translateX(${here}px)`;
  };
  const select = (i: number, focus = false) => {
    sel = (i + tabs.length) % tabs.length;
    tabs.forEach((tab, k) => {
      tab.setAttribute("aria-selected", String(k === sel));
      tab.tabIndex = k === sel ? 0 : -1;
      tab.classList.toggle("done", k < sel);
    });
    panels.forEach((panel, k) => panel.toggleAttribute("data-off", k !== sel));
    pos.textContent = String(sel + 1);
    if (focus) tabs[sel]!.focus();
    place();
  };

  tabs.forEach((tab, k) => tab.addEventListener("click", () => select(k)));
  root.querySelector('[role="tablist"]')?.addEventListener("keydown", (event) => {
    const key = (event as KeyboardEvent).key;
    const to = { ArrowRight: sel + 1, ArrowLeft: sel - 1, Home: 0, End: tabs.length - 1 }[key];
    if (to === undefined) return;
    event.preventDefault();
    select(to, true);
  });
  root.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((button) => button.addEventListener("click", () => select(sel + Number(button.dataset.step))));
  new ResizeObserver(place).observe(route);
  select(0);
}
