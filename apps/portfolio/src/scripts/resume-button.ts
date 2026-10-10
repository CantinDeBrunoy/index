// Le copilote qui suit la lecture d'une fiche, dès son haut, et ramène au voyage. Sur ordinateur, il part du
// bas de l'écran et monte avec la lecture : au milieu une fois qu'on a descendu d'un demi-écran, il y reste,
// dans la marge (--rise, de 0 à 1 ; le CSS en fait le déplacement). Au pied de page ([data-resume-from]), sa
// bulle s'efface. Quand le rond du bouton « Reprendre le voyage » ([data-resume-pad]) est entièrement à l'écran,
// il va s'y poser d'un saut : un arc par-dessus la bande, puis il descend dans le rond, qui le montre alors à sa
// place ; le rond vide s'efface à son approche (on ne le voit pas à moitié caché sous lui). Il ne reste jamais
// en l'air au-dessus du texte. Il en repart, du même saut, quand on remonte assez pour que le rond quitte
// l'écran à moitié : pas pour quelques pixels.
// Sans script, il reste visible en bas et le rond le montre aussi ; en mouvement réduit, il ne vole pas : il
// s'efface, et le rond le montre.
const button = document.querySelector<HTMLElement>("[data-resume]");
const dock = document.querySelector<HTMLElement>("[data-resume-dock]");
const from = document.querySelector<HTMLElement>("[data-resume-from]");
const pad = document.querySelector<HTMLElement>("[data-resume-pad]");

if (button && dock && from && pad) {
  const desktop = matchMedia("(min-width: 701px)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  // En vol, sa pastille prend peu à peu le fond et le liseré du rond, ceux de la palette de l'escale.
  const rgb = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const mix = (a: number[], b: number[], k: number) => `rgb(${a.map((c, i) => Math.round(c + (b[i]! - c) * k)).join(", ")})`;
  const dockStyle = getComputedStyle(dock);
  const padStyle = getComputedStyle(pad);
  const dockBg = rgb(dockStyle.backgroundColor);
  const padBg = rgb(padStyle.backgroundColor);
  const dockLine = rgb(dockStyle.borderTopColor);
  const padLine = rgb(padStyle.borderTopColor);
  // La durée du bond, d'un bout à l'autre.
  const flight = 700;
  // La hauteur dont il s'élève au milieu du saut.
  const lift = 90;
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
      pad.classList.remove("is-arriving");
      dx = dy = 0;
      dock.style.transform = "";
      dock.style.backgroundColor = "";
      dock.style.borderColor = "";
      return;
    }
    // Un saut : il file vers le rond, s'élève un peu puis retombe de plus en plus vite, et finit à la verticale du
    // rond ; il penche un peu et prend la taille du rond.
    const d = dock.getBoundingClientRect();
    const t = pad.getBoundingClientRect();
    const x = d.left + d.width / 2 - dx;
    const y = d.top + d.height / 2 - dy;
    const scale = 1 + (pad.offsetWidth / dock.offsetWidth - 1) * at;
    dx = (t.left + t.width / 2 - x) * easeInOut(at);
    dy = (t.top + t.height / 2 - y) * at * at - 4 * lift * at * (1 - at);
    // Le rond vide s'efface un peu avant qu'il le touche.
    const gap = Math.hypot(t.left + t.width / 2 - x - dx, t.top + t.height / 2 - y - dy);
    pad.classList.toggle("is-arriving", gap < pad.offsetWidth + 140);
    const tilt = -12 * Math.sin(Math.PI * at);
    dock.style.transform = `translate(${dx}px, ${dy}px) rotate(${tilt}deg) scale(${scale})`;
    dock.style.backgroundColor = mix(dockBg, padBg, at);
    dock.style.borderColor = mix(dockLine, padLine, at);
  };
  // Il se pose quand le rond est entièrement à l'écran ; posé, il n'en repart que si le rond le quitte à moitié.
  const wanted = () => {
    const r = pad.getBoundingClientRect();
    return r.bottom <= innerHeight - 8 || (to === 1 && r.top + r.height / 2 < innerHeight) ? 1 : 0;
  };

  const tick = (now: number) => {
    frame = 0;
    const rise = desktop.matches ? Math.min(1, scrollY / (innerHeight / 2)) : 0;
    button.style.setProperty("--rise", rise.toFixed(3));
    to = wanted();
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
  to = wanted();
  at = to;
  now();
}
