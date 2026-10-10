// Le copilote qui suit la lecture d'une fiche, dès son haut, et ramène au voyage. Sur ordinateur, il part du
// bas de l'écran et monte avec la lecture : au milieu une fois qu'on a descendu d'un demi-écran, il y reste,
// dans la marge (--rise, de 0 à 1 ; le CSS en fait le déplacement). Au pied de page ([data-resume-from]), sa
// bulle s'efface. Quand le rond du bouton « Reprendre le voyage » ([data-resume-pad]) est à l'écran, il va s'y
// poser d'un bond : il descend le long de la marge, puis glisse dans la bande jusqu'au rond, qui le montre alors
// à sa place. Il ne reste jamais en l'air au-dessus du texte. En remontant, il repart à sa place du même bond.
// Sans script, il reste visible en bas et le rond le montre aussi ; en mouvement réduit, il ne vole pas : il
// s'efface, et le rond le montre.
const button = document.querySelector<HTMLElement>("[data-resume]");
const dock = document.querySelector<HTMLElement>("[data-resume-dock]");
const from = document.querySelector<HTMLElement>("[data-resume-from]");
const pad = document.querySelector<HTMLElement>("[data-resume-pad]");

if (button && dock && from && pad) {
  const desktop = matchMedia("(min-width: 701px)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  // En vol, sa pastille prend peu à peu la couleur du rond, celle de la palette de l'escale.
  const rgb = (el: Element) => getComputedStyle(el).backgroundColor.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const dockBg = rgb(dock);
  const padBg = rgb(pad);
  // La durée du bond, d'un bout à l'autre.
  const flight = 700;
  const easeOut = (t: number) => 1 - (1 - t) ** 3;
  const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2);
  // Où il en est : 0 à sa place, 1 posé dans le rond ; et où il va.
  let at = 0;
  let to = 0;
  let frame = 0;
  let last = 0;
  // Le déplacement donné à la pastille : sa place de départ s'en déduit.
  let dx = 0;
  let dy = 0;

  const place = () => {
    const landed = at === 1;
    button.classList.toggle("is-landed", landed);
    button.classList.toggle("is-flying", at > 0 && !landed);
    pad.classList.toggle("is-empty", !landed && !reduced.matches);
    if (at === 0 || landed) {
      dx = dy = 0;
      dock.style.transform = "";
      dock.style.backgroundColor = "";
      return;
    }
    // Il descend d'abord (sa hauteur va vite), puis glisse vers le rond (sa position, lentement au départ), en
    // penchant un peu et en prenant la taille du rond ; jamais sous le bas de l'écran.
    const d = dock.getBoundingClientRect();
    const t = pad.getBoundingClientRect();
    const x = d.left + d.width / 2 - dx;
    const y = d.top + d.height / 2 - dy;
    const ty = t.top + t.height / 2;
    const scale = 1 + (pad.offsetWidth / dock.offsetWidth - 1) * at;
    const floor = Math.max(innerHeight - 12 - (dock.offsetHeight * scale) / 2, ty);
    dx = (t.left + t.width / 2 - x) * easeInOut(at);
    dy = Math.min(y + (ty - y) * easeOut(at), floor) - y;
    const tilt = -12 * Math.sin(Math.PI * at);
    dock.style.transform = `translate(${dx}px, ${dy}px) rotate(${tilt}deg) scale(${scale})`;
    dock.style.backgroundColor = `rgb(${dockBg.map((c, i) => Math.round(c + (padBg[i]! - c) * at)).join(", ")})`;
  };

  const tick = (now: number) => {
    frame = 0;
    const rise = desktop.matches ? Math.min(1, scrollY / (innerHeight / 2)) : 0;
    button.style.setProperty("--rise", rise.toFixed(3));
    // Il part quand le rond est entièrement à l'écran.
    to = pad.getBoundingClientRect().bottom <= innerHeight - 8 ? 1 : 0;
    if (reduced.matches) at = to;
    else if (at !== to) {
      const step = (last ? Math.min(64, now - last) : 16) / flight;
      at = to ? Math.min(1, at + step) : Math.max(0, at - step);
      if (at === 1) pad.classList.add("is-touchdown");
    }
    last = at !== to ? now : 0;
    button.classList.toggle("is-leaving", at > 0 || from.getBoundingClientRect().top < innerHeight);
    place();
    if (at !== to) frame = requestAnimationFrame(tick);
  };
  const soon = () => (frame ||= requestAnimationFrame(tick));
  const now = () => {
    cancelAnimationFrame(frame);
    tick(performance.now());
  };

  pad.addEventListener("animationend", () => pad.classList.remove("is-touchdown"));
  addEventListener("scroll", soon, { passive: true });
  addEventListener("resize", now);
  desktop.addEventListener("change", now);
  reduced.addEventListener("change", now);
  // Au chargement, il est déjà où il doit être : posé si la page s'ouvre en bas, sans bond.
  to = pad.getBoundingClientRect().bottom <= innerHeight - 8 ? 1 : 0;
  at = to;
  now();
}
