// Le copilote qui suit la lecture d'une fiche, dès son haut, et ramène au voyage. Sur ordinateur, il part du
// bas de l'écran et monte avec la lecture : au milieu une fois qu'on a descendu d'un demi-écran, il y reste
// (--rise, de 0 à 1 ; le CSS en fait le déplacement). Au bas de la page, il va se poser dans le rond du bouton
// « Reprendre le voyage » : dès que le pied de page ([data-resume-from]) entre à l'écran, sa bulle s'efface et
// sa pastille glisse vers le rond ([data-resume-pad]) au fil du défilement ; au bout de la page elle y est, et
// le rond la montre à sa place. En remontant, il repart. Sans script, il reste visible en bas, et le rond le
// montre aussi ; en mouvement réduit, il ne vole pas : il s'efface, et le rond le montre.
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
  const smooth = (t: number) => t * t * (3 - 2 * t);
  let frame = 0;
  let landed = false;
  // Le déplacement donné à la pastille : sa place de départ s'en déduit.
  let dx = 0;
  let dy = 0;

  const rest = () => {
    dx = dy = 0;
    dock.style.transform = "";
    dock.style.backgroundColor = "";
  };

  const update = () => {
    frame = 0;
    const rise = desktop.matches ? Math.min(1, scrollY / (innerHeight / 2)) : 0;
    button.style.setProperty("--rise", rise.toFixed(3));

    // La part de la fin de page, du haut du pied de page au bas, qui est à l'écran : 0 avant, 1 au bout.
    const top = from.getBoundingClientRect().top;
    const span = document.documentElement.scrollHeight - scrollY - top;
    const seen = innerHeight - top;
    const p = Math.min(1, Math.max(0, seen / span));
    const atEnd = seen >= span - 2;
    button.classList.toggle("is-leaving", p > 0);

    if (reduced.matches) {
      button.classList.toggle("is-landed", p > 0);
      pad.classList.remove("is-empty");
      rest();
      return;
    }
    if (atEnd !== landed) {
      landed = atEnd;
      button.classList.toggle("is-landed", landed);
      pad.classList.toggle("is-empty", !landed);
      pad.classList.toggle("is-touchdown", landed);
    }
    if (landed || p === 0) {
      rest();
      return;
    }

    // Il glisse d'abord vers le rond, puis descend s'y poser, en penchant un peu ; il prend la taille du rond.
    // Sans jamais passer sous le bas de l'écran : sur téléphone, il part de là, et le rond arrive d'en dessous.
    const d = dock.getBoundingClientRect();
    const t = pad.getBoundingClientRect();
    const k = smooth(p);
    const x = d.left + d.width / 2 - dx;
    const y = d.top + d.height / 2 - dy;
    const scale = 1 + (pad.offsetWidth / dock.offsetWidth - 1) * k;
    dx = (t.left + t.width / 2 - x) * k;
    dy = Math.min((t.top + t.height / 2 - y) * p * p, innerHeight - 12 - (dock.offsetHeight * scale) / 2 - y);
    const tilt = -12 * Math.sin(Math.PI * p);
    dock.style.transform = `translate(${dx}px, ${dy}px) rotate(${tilt}deg) scale(${scale})`;
    dock.style.backgroundColor = `rgb(${dockBg.map((c, i) => Math.round(c + (padBg[i]! - c) * k)).join(", ")})`;
  };

  pad.classList.add("is-empty");
  pad.addEventListener("animationend", () => pad.classList.remove("is-touchdown"));
  addEventListener("scroll", () => (frame ||= requestAnimationFrame(update)), { passive: true });
  addEventListener("resize", update);
  desktop.addEventListener("change", update);
  reduced.addEventListener("change", update);
  update();
}
