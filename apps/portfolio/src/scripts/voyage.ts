/**
 * Le voyage animé : une escale à la fois.
 * - L'objet cliqué (ou « Décoller ») : la scène plonge vers lui sous un voile de la couleur de
 *   l'escale suivante, puis la suivante se pose ; le cartel et l'anneau arrivent en dernier.
 * - Le retour, la marque et les points de la barre : un simple fondu (le point de l'escale suivante
 *   plonge, comme l'objet).
 * - Flèches gauche et droite du clavier ; l'adresse (#escale-3) garde l'escale, l'interrupteur
 *   FR / EN aussi. Sans ce script, les escales se lisent à la suite, une par écran.
 * - La dernière escale mène à « À propos » : avant, le dossier se ferme (scripts/voyage-sortie.ts).
 * - Le premier « Décoller » passe par la fusée du copilote (scripts/decollage.ts), que le retour de l'escale 1,
 *   « Le décollage », rejoue : « voyage:decoller » lui laisse la main, « voyage:fusee » la lui donne une fois
 *   l'escale quittée effacée, « voyage:arrivee » la rend à l'escale 1.
 * - La fiche de chaque escale est dessous (scripts/voyage-fiche.ts) : pendant qu'on la lit, la scène de l'escale est
 *   en pause et les flèches ne changent pas d'escale ; on change d'escale, elle se referme sous le voile.
 */

import { animatePhoneScene } from "./phone-loop";
import { startFiches } from "./voyage-fiche";
import { leaveVoyage, prepareExit, resetExit } from "./voyage-sortie";

const LEAVE_MS = 750;
const LEAVE_SOFT_MS = 400;
const SETTLE_MS = 1250;
const PALETTES = ["night", "day", "dusk", "kraft"];

interface Texts {
  announce: string;
}

const fill = (s: string, values: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));

function start(root: HTMLElement) {
  const stops = [...root.querySelectorAll<HTMLElement>("[data-stop]")];
  const announce = root.querySelector<HTMLElement>("[data-announce]");
  const langLinks = [...root.querySelectorAll<HTMLAnchorElement>("[data-lang-link]")];
  const texts = JSON.parse(root.dataset.texts ?? "{}") as Texts;
  // Sur ordinateur, la scène est une vidéo haute définition ; sur téléphone, une boucle WebP.
  const desktop = matchMedia("(min-width: 701px)");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  const fromHash = () => {
    const n = Number(/^#escale-(\d+)$/.exec(location.hash)?.[1] ?? 0);
    return n >= 0 && n < stops.length ? n : 0;
  };

  let current = fromHash();
  let busy = false;
  let later = 0;
  /** Pendant le décollage, la fusée couvre le départ : sa scène reste en pause. */
  let aboard = false;
  /** Pendant qu'on lit la fiche, sous l'escale : sa scène, hors de l'écran, reste en pause. */
  let reading = false;

  const videoOf = (i: number) => stops[i]?.querySelector<HTMLVideoElement>("video");

  // Une vidéo illisible (fichier absent, format non pris en charge) : l'escale garde sa boucle WebP.
  // Le clip de la sortie, lui, manque sans rien changer : l'escale s'efface sans lui.
  for (const video of root.querySelectorAll("video:not([data-exit-clip])")) {
    video.querySelector("source:last-of-type")?.addEventListener("error", () => video.closest("[data-stop]")?.classList.add("no-video"));
  }

  /** La vidéo de l'escale affichée tourne en boucle ; en mouvement réduit, elle reste sur sa première image. */
  const play = (i: number) => {
    const video = videoOf(i);
    if (!video || !desktop.matches || aboard || reading) return;
    video.preload = "auto";
    if (reduce.matches) {
      if (video.readyState === HTMLMediaElement.HAVE_NOTHING) video.load();
    } else void video.play().catch((error: unknown) => console.debug("voyage : lecture de la vidéo refusée", error));
  };
  const pause = (i: number) => {
    const video = videoOf(i);
    if (video && !video.paused) video.pause();
  };

  /** Une scène chargée d'avance : elle est prête quand le voile se lève. */
  const preload = (i: number) => {
    const stop = stops[i];
    // Après la dernière escale, la sortie du voyage : le dossier qui se ferme.
    if (!stop) return void (i === stops.length && prepareExit(stops[i - 1]!));
    if (desktop.matches) {
      const video = videoOf(i);
      if (video && video.readyState === HTMLMediaElement.HAVE_NOTHING && video.preload !== "auto") {
        video.preload = "auto";
        video.load();
      }
    } else if (stop.dataset.imgPhone) new Image().src = stop.dataset.imgPhone;
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

    const place = stop.dataset.place ?? "";
    if (announce) announce.textContent = i === 0 ? "" : fill(texts.announce, { i, place, name: stop.dataset.name ?? "" });

    const hash = i === 0 ? "" : `#escale-${i}`;
    history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);
    for (const link of langLinks) link.href = `${link.dataset.langLink}${hash}`;
    // La scène affichée se charge tout de suite (en différé dans la page), la suivante ensuite.
    for (const k of stops.keys()) if (k !== i) pause(k);
    play(i);
    if (!desktop.matches) {
      stop.querySelector("img")?.setAttribute("loading", "eager");
      animatePhoneScene(stop);
    }
    preloadLater(i + 1);
    // Le copilote suit le voyage (scripts/copilote.ts).
    root.dispatchEvent(new CustomEvent("voyage:escale", { detail: { i } }));
  };

  /** `replay` : depuis l'escale 1, le décollage rejoué (son bouton retour, « Le décollage ») ; on y revient ensuite. */
  const go = (next: number, soft = false, replay = false) => {
    if (busy || (next === current && !replay) || next < 0 || next >= stops.length) return;
    busy = true;
    const from = stops[current]!;
    const to = stops[next]!;
    const hadFocus = from.contains(document.activeElement);
    // Du départ à l'escale 1, ou rejoué depuis elle : la fusée, si le décollage prend la main (il annule l'évènement).
    const launch = (replay || (current === 0 && next === 1 && !soft)) && !root.dispatchEvent(new CustomEvent("voyage:decoller", { cancelable: true, detail: { replay } }));
    if (replay && !launch) {
      // La fusée n'est pas là : le retour mène au départ, comme avant.
      busy = false;
      return go(0, true);
    }

    root.style.setProperty("--veil", to.dataset.bg ?? "");
    root.classList.toggle("soft", soft);
    root.classList.add("leaving");
    from.classList.add("leave");
    from.classList.toggle("soft", soft);
    preload(next);

    window.setTimeout(
      () => {
        // Sous le voile : la fiche de l'escale quittée se referme, la page revient en haut.
        fiches.close();
        window.scrollTo({ top: 0 });
        from.classList.remove("leave", "soft");
        root.classList.remove("leaving");
        root.classList.add("entering");
        if (launch) {
          // Le voile se lève sur la fusée ; le voyage attend « voyage:arrivee » (busy jusque-là).
          aboard = true;
          pause(current);
          root.dispatchEvent(new CustomEvent("voyage:fusee"));
          window.setTimeout(() => root.classList.remove("entering", "soft"), SETTLE_MS);
          return;
        }
        to.classList.add("enter");
        to.classList.toggle("soft", soft);
        show(next);
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

  const fiches = startFiches(root, {
    stop: () => (busy || leaving || stops[current]?.querySelector<HTMLElement>(".cartel")?.inert ? -1 : current),
    reading: (on) => {
      reading = on;
      if (on) pause(current);
      else play(current);
    },
  });

  // Le décollage rend la main : l'escale 1 apparaît sous la fusée, sans transition au bout de l'envol (`cut` : sa
  // scène commence où l'envol s'arrête), en fondu si l'on a passé l'intro.
  root.addEventListener("voyage:arrivee", (event) => {
    const { cut, focus } = (event as CustomEvent<{ cut: boolean; focus: boolean }>).detail;
    const to = stops[1]!;
    aboard = false;
    // Sa scène repart de sa première image, celle qui suit l'envol (rejoué, elle s'était arrêtée en route).
    const scene = videoOf(1);
    if (scene && scene.readyState > 0) scene.currentTime = 0;
    to.classList.add("enter", cut ? "cut" : "soft");
    show(1);
    window.scrollTo({ top: 0 });
    if (focus) to.querySelector<HTMLElement>("[data-focus]")?.focus({ preventScroll: true });
    window.setTimeout(() => {
      to.classList.remove("enter", "cut", "soft");
      busy = false;
    }, SETTLE_MS);
  });

  /** « Faire connaissance » : le dossier se ferme, puis la page s'ouvre ; tout de suite si l'escale arrive encore. */
  let leaving = false;
  const leave = (href: string) => {
    if (leaving) return;
    leaving = true;
    if (busy) return location.assign(href);
    busy = true;
    void leaveVoyage(stops[current]!, videoOf(current) ?? null).then(() => location.assign(href));
  };

  root.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const exit = (event.target as Element).closest<HTMLAnchorElement>("a[data-exit]");
    if (exit) {
      event.preventDefault();
      leave(exit.href);
      return;
    }
    const link = (event.target as Element).closest<HTMLElement>("[data-go]");
    if (!link) return;
    event.preventDefault();
    // Le retour de l'escale 1, « Le décollage » : la fusée rejouée.
    if (link.hasAttribute("data-replay")) go(current, true, true);
    else go(Number(link.dataset.go), link.hasAttribute("data-soft"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if ((event.target as Element).closest("input, textarea, select, [contenteditable]")) return;
    // La fiche ouverte se lit : ses flèches sont les siennes (sa ligne de vol).
    if (fiches.isOpen()) return;
    if (event.key === "ArrowRight") go(current + 1);
    // À l'escale 1, reculer rejoue le décollage, comme son bouton retour.
    else if (event.key === "ArrowLeft") go(current === 1 ? 1 : current - 1, true, current === 1);
  });

  addEventListener("hashchange", () => go(fromHash(), true));
  // Passage du téléphone à l'ordinateur (fenêtre redimensionnée) : la bonne scène pour la bonne taille.
  desktop.addEventListener("change", () => (desktop.matches ? play(current) : pause(current)));
  // Onglet ou fenêtre en arrière-plan : le navigateur met les vidéos muettes en pause ; elles repartent au retour.
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && play(current));
  addEventListener("focus", () => play(current));
  // Retour depuis « À propos », la page restaurée telle qu'on l'a quittée : le dossier rouvert, la boucle repart.
  addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    for (const stop of stops) resetExit(stop);
    busy = leaving = false;
    play(current);
  });
}

const root = document.querySelector<HTMLElement>("[data-voyage]");
if (root) start(root);
