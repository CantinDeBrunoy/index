/**
 * Le voyage animé : une escale à la fois.
 * - L'objet cliqué (ou « Décoller ») : la scène plonge vers lui sous un voile de la couleur de
 *   l'escale suivante, puis la suivante se pose ; le cartel et l'anneau arrivent en dernier.
 * - Les points, le retour et la marque : un simple fondu.
 * - Flèches gauche et droite du clavier ; l'adresse (#escale-3) garde l'escale, l'interrupteur
 *   FR / EN aussi. Sans ce script, les escales se lisent à la suite, une par écran.
 */

const LEAVE_MS = 750;
const LEAVE_SOFT_MS = 400;
const SETTLE_MS = 1250;
const PALETTES = ["night", "day", "dusk", "kraft"];

interface Texts {
  caption0: string;
  caption: string;
  announce: string;
}

const fill = (s: string, values: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));

function start(root: HTMLElement) {
  const stops = [...root.querySelectorAll<HTMLElement>("[data-stop]")];
  const dots = [...root.querySelectorAll<HTMLElement>("[data-dot]")];
  const caption = root.querySelector<HTMLElement>("[data-caption]");
  const announce = root.querySelector<HTMLElement>("[data-announce]");
  const langLinks = [...root.querySelectorAll<HTMLAnchorElement>("[data-lang-link]")];
  const texts = JSON.parse(root.dataset.texts ?? "{}") as Texts;
  const phone = matchMedia("(max-width: 700px)");

  const fromHash = () => {
    const n = Number(/^#escale-(\d+)$/.exec(location.hash)?.[1] ?? 0);
    return n >= 0 && n < stops.length ? n : 0;
  };

  let current = fromHash();
  let busy = false;
  let later = 0;

  /** Une scène chargée d'avance : elle est prête quand le voile se lève. */
  const preload = (i: number) => {
    const stop = stops[i];
    const src = phone.matches ? stop?.dataset.imgPhone : stop?.dataset.img;
    if (src) new Image().src = src;
  };
  /** L'escale suivante, une fois la scène affichée chargée, et pas en mode économie de données. */
  const preloadLater = (i: number) => {
    window.clearTimeout(later);
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    later = window.setTimeout(() => preload(i), 1500);
  };

  const show = (i: number) => {
    const stop = stops[i]!;
    current = i;
    for (const [k, s] of stops.entries()) s.classList.toggle("is-current", k === i);
    root.classList.remove(...PALETTES.map((p) => `pal-${p}`));
    root.classList.add(`pal-${stop.dataset.pal}`);
    root.style.setProperty("--bg", stop.dataset.bg ?? "");
    document.body.style.setProperty("--page-bg", stop.dataset.bg ?? "");

    for (const [k, dot] of dots.entries()) {
      const n = k + 1;
      dot.classList.toggle("done", n < i);
      if (n === i) dot.setAttribute("aria-current", "step");
      else dot.removeAttribute("aria-current");
    }
    const place = stop.dataset.place ?? "";
    if (caption) caption.textContent = i === 0 ? texts.caption0 : fill(texts.caption, { i, place });
    if (announce) announce.textContent = i === 0 ? "" : fill(texts.announce, { i, place, name: stop.dataset.name ?? "" });

    const hash = i === 0 ? "" : `#escale-${i}`;
    history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);
    for (const link of langLinks) link.href = `${link.dataset.langLink}${hash}`;
    // La scène affichée se charge tout de suite (elle est en différé dans la page), la suivante ensuite.
    stop.querySelector("img")?.setAttribute("loading", "eager");
    preloadLater(i + 1);
  };

  const go = (next: number, soft = false) => {
    if (busy || next === current || next < 0 || next >= stops.length) return;
    busy = true;
    const from = stops[current]!;
    const to = stops[next]!;
    const hadFocus = from.contains(document.activeElement);

    root.style.setProperty("--veil", to.dataset.bg ?? "");
    root.classList.toggle("soft", soft);
    root.classList.add("leaving");
    from.classList.add("leave");
    from.classList.toggle("soft", soft);
    preload(next);

    window.setTimeout(
      () => {
        from.classList.remove("leave", "soft");
        root.classList.remove("leaving");
        root.classList.add("entering");
        to.classList.add("enter");
        to.classList.toggle("soft", soft);
        show(next);
        window.scrollTo({ top: 0 });
        // Le focus suit le voyage : sur le titre de l'escale, sans faire défiler la page.
        if (hadFocus) to.querySelector<HTMLElement>("[data-focus]")?.focus({ preventScroll: true });
        window.setTimeout(() => {
          to.classList.remove("enter", "soft");
          root.classList.remove("entering", "soft");
          busy = false;
        }, SETTLE_MS);
      },
      soft ? LEAVE_SOFT_MS : LEAVE_MS,
    );
  };

  show(current);
  root.classList.add("is-live", "is-ready");

  root.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLElement>("[data-go]");
    if (!link) return;
    event.preventDefault();
    go(Number(link.dataset.go), link.hasAttribute("data-soft"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if ((event.target as Element).closest("input, textarea, select, [contenteditable]")) return;
    if (event.key === "ArrowRight") go(current + 1);
    else if (event.key === "ArrowLeft") go(current - 1, true);
  });

  addEventListener("hashchange", () => go(fromHash(), true));
}

const root = document.querySelector<HTMLElement>("[data-voyage]");
if (root) start(root);
