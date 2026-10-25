/**
 * « Au travail » (components/voyage/Travail.astro) : un point de la scène, un feu de la tournée, ou précédent /
 * suivant, choisit une app. Son feu passe au rouge, ceux d'avant au vert, le trajet fait s'allonge en laiton et le
 * camion suit la route en serpent jusqu'à son feu, tourné dans le sens où il roule ; sa fiche prend la place de la
 * précédente, et un texte caché l'annonce. Avec le mouvement réduit, le camion se pose directement.
 */
const BOX = { w: 360, h: 480 };
/** Le camion se gare à 40 de son feu, avant lui dans le sens de la route (comme sur la page sans script). */
const PARK = 40;
const DURATION = 900;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const still = window.matchMedia("(prefers-reduced-motion: reduce)");

for (const root of document.querySelectorAll<HTMLElement>("[data-travail]")) {
  const picks = [...root.querySelectorAll<HTMLButtonElement>("[data-pick]")];
  const panels = [...root.querySelectorAll<HTMLElement>("[data-panel]")];
  const lights = picks.filter((b) => b.dataset.at !== undefined);
  const road = root.querySelector<SVGPathElement>("[data-road]");
  const trail = root.querySelector<SVGPathElement>("[data-trail]");
  const truck = root.querySelector<SVGElement>("[data-truck]");
  const pos = root.querySelector<HTMLElement>("[data-pos]");
  const status = root.querySelector<HTMLElement>("[data-status]");
  const n = panels.length;
  const total = road?.getTotalLength() ?? 0;
  /** Où le camion se gare pour chaque app, en longueur de route. */
  const park = lights.map((b) => (Number(b.dataset.at) / 100) * total - PARK);
  let at = n - 1;
  let dist = park[at] ?? 0;
  let frame = 0;

  // Le camion au point `d` de la route, tourné vers où elle va (le sens ne change pas dans un virage serré).
  const place = (d: number) => {
    if (!road || !truck) return;
    const p = road.getPointAtLength(d);
    const q = road.getPointAtLength(Math.min(total, d + 1));
    truck.style.left = `${(p.x / BOX.w) * 100}%`;
    truck.style.top = `${(p.y / BOX.h) * 100}%`;
    if (Math.abs(q.x - p.x) > 0.3) truck.style.setProperty("--flip", q.x < p.x ? "-1" : "1");
  };

  const drive = (to: number) => {
    cancelAnimationFrame(frame);
    if (still.matches) {
      dist = to;
      place(to);
      return;
    }
    const from = dist;
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / DURATION);
      dist = from + (to - from) * ease(k);
      place(dist);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };

  const show = (i: number) => {
    at = (i + n) % n;
    for (const b of picks) {
      const k = Number(b.dataset.pick);
      b.classList.toggle("on", k === at);
      b.classList.toggle("done", k < at);
      b.setAttribute("aria-pressed", String(k === at));
    }
    panels.forEach((p, k) => p.toggleAttribute("data-off", k !== at));
    if (trail && lights[at]) trail.style.strokeDashoffset = String(100 - Number(lights[at].dataset.at));
    if (park[at] !== undefined) drive(park[at]);
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
