/**
 * Le décollage (components/voyage/Decollage.astro) : au clic sur « Décoller », la fusée du copilote, en quatre plans
 * vidéo enchaînés sans couture (rendus par design/renders/decollage-scenes.js) :
 *   pied (boucle) → première bulle → echelle → trappe (boucle) → seconde bulle → envol → l'escale 1.
 * - Chaque plan commence là où finit le précédent. Une boucle finit son tour (une seconde au plus) avant que le plan
 *   suivant parte ; celui-ci, déjà chargé, ne s'affiche qu'une fois sa première image prête.
 * - La dernière image de l'envol précède la première de la scène de l'escale 1 : on y passe sans transition.
 * - Au premier décollage seulement (localStorage), le copilote explique ; ensuite, la fusée décolle tout de suite.
 * - « Passer l'intro » ou Échap : l'escale 1, en fondu. En mouvement réduit : les images fixes des deux bulles, puis
 *   un fondu ; et, l'explication déjà donnée, plus de décollage du tout.
 * Il suit scripts/voyage.ts : « voyage:decoller » (annulable : le décollage prend la main), « voyage:fusee » (la
 * plongée du départ est finie : la fusée apparaît), « voyage:arrivee » (il rend la main à l'escale 1). Ce module se
 * charge avant lui.
 */

type Clip = "pied" | "echelle" | "trappe" | "envol";

const SEEN_KEY = "index:copilote-decollage";
/** L'accueil de l'escale 1 (scripts/copilote.ts) : déjà donné par le décollage. */
const WELCOME_KEY = "index:copilote-accueil";
/** La bulle attend que la scène se soit posée. */
const BUBBLE_MS = 800;
/** Le temps de lire l'escale 1 : son anneau bat plus fort. */
const NUDGE_MS = 4000;

function stored(key: string): boolean {
  try {
    return localStorage.getItem(key) === "vu";
  } catch {
    return false;
  }
}
function store(key: string) {
  try {
    localStorage.setItem(key, "vu");
  } catch {
    // Stockage bloqué : le copilote réexpliquera à la prochaine visite.
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const once = (el: EventTarget, type: string) => new Promise<void>((resolve) => el.addEventListener(type, () => resolve(), { once: true }));

/** La prochaine image affichée d'une vidéo ; à défaut de requestVideoFrameCallback, « playing » puis deux images. */
function nextFrame(video: HTMLVideoElement, timeout = 400): Promise<void> {
  const frame = new Promise<void>((resolve) => {
    // Les types du DOM promettent requestVideoFrameCallback partout ; Firefox d'avant la version 132 ne l'a pas.
    const v = video as HTMLVideoElement & { requestVideoFrameCallback?: HTMLVideoElement["requestVideoFrameCallback"] };
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(() => resolve());
    else (v.paused ? once(v, "playing") : Promise.resolve()).then(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  return Promise.race([frame, sleep(timeout)]);
}

function start(root: HTMLElement, layer: HTMLElement) {
  const desktop = matchMedia("(min-width: 701px)");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const main = root.querySelector<HTMLElement>("main");
  const videos = Object.fromEntries([...layer.querySelectorAll<HTMLVideoElement>("video[data-clip]")].map((v) => [v.dataset.clip, v])) as Record<Clip, HTMLVideoElement>;
  const bubbles = [...layer.querySelectorAll<HTMLElement>("[data-dec-bulle]")];
  const skip = layer.querySelector<HTMLButtonElement>("[data-dec-skip]")!;
  const av1 = document.createElement("video").canPlayType('video/mp4; codecs="av01.0.12M.08"') === "probably";

  /** Le format choisi au départ de la fusée (le téléphone a ses propres plans, cadrés comme ses escales). */
  let phone = !desktop.matches;
  let explain = !stored(SEEN_KEY);
  /** Chaque décollage a son numéro : une étape d'un décollage abandonné (passé, fini) ne fait plus rien. */
  let run = 0;
  let active = false;
  let focusIn = false;

  const fileOf = (clip: Clip) => `/voyage/decollage-${clip}${phone ? "-mobile" : av1 ? "-av1" : ""}.mp4`;
  const stillOf = (clip: Clip) => `/voyage/stills/decollage-${clip}${phone ? "-mobile" : ""}.webp`;

  /** Un plan chargé d'avance : sa source, et assez d'images pour partir sans attendre. */
  const load = (clip: Clip) => {
    const video = videos[clip];
    const src = fileOf(clip);
    if (video.dataset.src === src) return;
    video.dataset.src = src;
    video.src = src;
    video.preload = "auto";
    video.load();
  };
  const ready = (video: HTMLVideoElement) =>
    video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA ? Promise.resolve(true) : Promise.race([once(video, "canplay").then(() => true), once(video, "error").then(() => false), sleep(8000).then(() => false)]);

  /** Montre un plan à la place de celui qui est affiché, une fois sa première image prête. */
  const swap = async (clip: Clip) => {
    const video = videos[clip];
    video.currentTime = 0;
    await video.play().catch(() => undefined);
    await nextFrame(video);
    for (const [k, v] of Object.entries(videos)) {
      v.classList.toggle("on", k === clip);
      if (k !== clip) v.pause();
    }
  };
  /** Le plan affiché va jusqu'au bout (une boucle finit son tour), puis le suivant part. */
  const chain = async (from: Clip, to: Clip) => {
    const video = videos[from];
    load(to);
    const ok = await ready(videos[to]);
    if (!ok) throw new Error(`décollage : plan illisible (${to})`);
    if (!video.ended) {
      video.loop = false;
      await once(video, "ended");
    }
    await swap(to);
  };
  const stale = (token: number) => token !== run;

  /** Une bulle : elle s'ouvre, et se referme sur son bouton. */
  const ask = async (n: number, token: number) => {
    const bubble = bubbles[n - 1]!;
    bubble.classList.remove("out");
    bubble.hidden = false;
    if (focusIn) bubble.querySelector<HTMLElement>(".title")?.focus({ preventScroll: true });
    await once(bubble.querySelector("[data-dec-next]")!, "click");
    if (stale(token)) return;
    focusIn = bubble.contains(document.activeElement);
    bubble.classList.add("out");
    window.setTimeout(() => {
      if (bubble.classList.contains("out")) bubble.hidden = true;
    }, 250);
  };

  /** Le voyage reprend à l'escale 1 : sans transition au bout de l'envol (`cut`), en fondu sinon. */
  const arrive = (cut: boolean) => {
    if (!active) return;
    run++;
    store(SEEN_KEY);
    store(WELCOME_KEY);
    root.dataset.fusee = "partie";
    if (main) main.inert = false;
    const focus = layer.contains(document.activeElement);
    root.dispatchEvent(new CustomEvent("voyage:arrivee", { detail: { cut, focus } }));
    const stop = root.querySelector<HTMLElement>("#escale-1");
    const scene = stop?.querySelector<HTMLVideoElement>("video");
    const fade = () => {
      layer.classList.toggle("soft", !cut);
      layer.classList.add("leave");
      window.setTimeout(close, cut ? 250 : 450);
    };
    // Sur ordinateur, la scène de l'escale 1 doit afficher sa première image avant que la fusée s'efface.
    if (cut && desktop.matches && scene && !scene.closest(".no-video")) void nextFrame(scene, 700).then(fade);
    else fade();
    if (stop && !reduce.matches) {
      stop.classList.add("nudge");
      window.setTimeout(() => stop.classList.remove("nudge"), NUDGE_MS);
    }
  };
  const close = () => {
    active = false;
    layer.hidden = true;
    layer.classList.remove("arrive", "leave", "soft");
    for (const bubble of bubbles) {
      bubble.hidden = true;
      bubble.classList.remove("out");
    }
    for (const [k, v] of Object.entries(videos)) {
      v.pause();
      v.classList.remove("on");
      v.loop = k === "pied" || k === "trappe";
      if (v.readyState > 0) v.currentTime = 0;
    }
  };

  /** Le décollage : la fusée est là, le copilote explique (ou pas), puis l'envol. */
  const fly = async (token: number) => {
    if (reduce.matches) {
      // Les images fixes, chacune sous sa bulle ; « Décoller », puis un fondu vers l'escale 1.
      videos.pied.poster = stillOf("pied");
      videos.trappe.poster = stillOf("trappe");
      videos.pied.classList.add("on");
      await ask(1, token);
      if (stale(token)) return;
      videos.trappe.classList.add("on");
      videos.pied.classList.remove("on");
      await ask(2, token);
      if (!stale(token)) arrive(false);
      return;
    }
    const first: Clip = explain ? "pied" : "envol";
    load(first);
    videos[first].poster = stillOf(explain ? "pied" : "trappe");
    videos[first].classList.add("on");
    if (!(await ready(videos[first]))) throw new Error(`décollage : plan illisible (${first})`);
    if (stale(token)) return;
    await swap(first);
    if (explain) {
      load("echelle");
      await sleep(BUBBLE_MS);
      if (stale(token)) return;
      // Pendant qu'on lit, la suite se charge.
      load("trappe");
      load("envol");
      await ask(1, token);
      if (stale(token)) return;
      await chain("pied", "echelle");
      if (stale(token)) return;
      await chain("echelle", "trappe");
      if (stale(token)) return;
      await sleep(250);
      if (stale(token)) return;
      await ask(2, token);
      if (stale(token)) return;
      store(SEEN_KEY);
      await chain("trappe", "envol");
      if (stale(token)) return;
    }
    if (!videos.envol.ended) await once(videos.envol, "ended");
    if (!stale(token)) arrive(true);
  };

  // « Décoller » depuis le départ : le décollage prend la main (sauf en mouvement réduit, l'explication déjà donnée).
  root.addEventListener("voyage:decoller", (event) => {
    if (active) return;
    phone = !desktop.matches;
    explain = !stored(SEEN_KEY);
    if (reduce.matches && !explain) return;
    event.preventDefault();
    active = true;
    focusIn = !!root.querySelector("#depart")?.contains(document.activeElement);
    if (!reduce.matches) load(explain ? "pied" : "envol");
  });
  // La plongée du départ est finie : la fusée apparaît sous le voile qui se lève.
  root.addEventListener("voyage:fusee", () => {
    const token = ++run;
    layer.hidden = false;
    layer.classList.add("arrive");
    if (main) main.inert = true;
    if (focusIn && !explain) skip.focus({ preventScroll: true });
    fly(token).catch((error: unknown) => {
      console.debug(error);
      if (!stale(token)) arrive(false);
    });
  });

  skip.addEventListener("click", () => arrive(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && active && !layer.hidden) arrive(false);
  });

  // Sur le départ, les premiers plans se chargent d'avance (après la scène du départ, et pas en économie de données).
  let later = 0;
  root.addEventListener("voyage:escale", (event) => {
    window.clearTimeout(later);
    if ((event as CustomEvent<{ i: number }>).detail.i !== 0 || reduce.matches) return;
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    later = window.setTimeout(() => {
      if (active) return;
      phone = !desktop.matches;
      explain = !stored(SEEN_KEY);
      load(explain ? "pied" : "envol");
      if (explain) load("echelle");
    }, 2500);
  });
}

const root = document.querySelector<HTMLElement>("[data-voyage]");
const layer = root?.querySelector<HTMLElement>("[data-decollage]");
if (root && layer) start(root, layer);

// Un module : ses noms ne se mêlent pas à ceux des autres scripts du voyage.
export {};
