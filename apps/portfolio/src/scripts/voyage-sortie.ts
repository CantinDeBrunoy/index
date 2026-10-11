/**
 * La sortie du voyage, par « Faire connaissance » à la dernière escale : le cartel, son voile, l'anneau et la barre
 * des escales s'effacent, le stylo se couche devant la pile, le dossier se ferme, puis « À propos » s'ouvre.
 * - Sur ordinateur, un clip vidéo (EXIT dans data/voyage.ts). Il a un départ par huitième de la boucle de la scène :
 *   on attend le prochain pour passer de la boucle au clip sans saut, on joue ce départ (le stylo se couche), puis
 *   on saute à la fermeture, commune à tous les départs.
 * - Sur téléphone, la boucle est une image animée, qu'on ne peut pas suivre : la fermeture seule, une petite vidéo
 *   téléchargée d'avance, arrive en fondu.
 * - Si le clip n'est pas prêt (pas encore chargé, vidéo illisible), l'effacement seul ; en mouvement réduit, rien :
 *   la page s'ouvre tout de suite.
 */

import type { EXIT } from "../data/voyage";

type Clip = typeof EXIT;

const FADE_MS = 450;
/** Quoi qu'il arrive (vidéo bloquée, page cachée), la page suivante s'ouvre au bout de ce temps. */
const MAX_MS = 5000;
/** Le temps laissé au clip pour se placer sur son départ, avant que la boucle n'y arrive. */
const LEAD_S = 0.2;

const desktop = matchMedia("(min-width: 701px)");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

let phoneClip: Promise<Blob | null> | null = null;

const clipOf = (stop: HTMLElement) => stop.querySelector<HTMLVideoElement>("video[data-exit-clip]");
const phoneOf = (stop: HTMLElement) => stop.querySelector<HTMLVideoElement>("video[data-exit-phone]");

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
/** L'image suivante ; dans une page cachée, qui n'en dessine plus, au plus tard après 100 ms. */
const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
    window.setTimeout(resolve, 100);
  });
/** Attend que `test` soit vrai, image après image ; faux au bout de `ms`. */
async function until(test: () => boolean, ms: number): Promise<boolean> {
  const end = performance.now() + ms;
  while (!test()) {
    if (performance.now() > end) return false;
    await nextFrame();
  }
  return true;
}
/**
 * Le temps de l'image à l'écran (requestVideoFrameCallback) : quand le décodage peine, il traîne derrière
 * currentTime, et c'est sur lui que les raccords doivent tomber. À défaut, currentTime.
 */
function shownTime(video: HTMLVideoElement): { time: () => number; stop: () => void } {
  if (typeof video.requestVideoFrameCallback !== "function") return { time: () => video.currentTime, stop: () => {} };
  let shown = video.currentTime;
  let id = 0;
  const on: VideoFrameRequestCallback = (_, frame) => {
    shown = frame.mediaTime;
    id = video.requestVideoFrameCallback(on);
  };
  id = video.requestVideoFrameCallback(on);
  return { time: () => shown, stop: () => video.cancelVideoFrameCallback(id) };
}
const once = (target: EventTarget, type: string, ms: number) =>
  new Promise<boolean>((resolve) => {
    const timer = window.setTimeout(() => resolve(false), ms);
    target.addEventListener(type, () => (window.clearTimeout(timer), resolve(true)), { once: true });
  });

/** Charge la sortie de l'escale, une fois sa scène affichée. */
export function prepareExit(stop: HTMLElement): void {
  if (reduce.matches) return;
  if (desktop.matches) {
    const clip = clipOf(stop);
    if (clip && clip.preload !== "auto") {
      clip.preload = "auto";
      clip.load();
    }
  } else {
    const src = phoneOf(stop)?.dataset.exitPhone;
    if (src && !phoneClip) phoneClip = fetch(src).then((r) => (r.ok ? r.blob() : null), () => null);
  }
}

/** Ordinateur : de la boucle au clip, sur le prochain départ, puis la fermeture. Faux si le clip n'a pas pu jouer. */
async function closeOnDesktop(stop: HTMLElement, loop: HTMLVideoElement | null): Promise<boolean> {
  const clip = clipOf(stop);
  if (!clip || !loop || loop.paused || stop.classList.contains("no-video")) return false;
  if (clip.readyState < HTMLMediaElement.HAVE_FUTURE_DATA || !(loop.duration > 0)) return false;
  const { starts, segment, lift, fps } = JSON.parse(clip.dataset.exitClip ?? "{}") as Clip;
  const length = loop.duration;
  const step = length / starts;
  const half = 0.5 / fps;
  // Le chemin parcouru par la boucle depuis le clic, tour compris, d'après l'image affichée.
  const loopShown = shownTime(loop);
  const t0 = loop.currentTime;
  const run = () => (loopShown.time() - t0 + length) % length;

  // Le prochain départ, assez loin pour que le clip ait le temps de s'y placer. S'il est passé pendant ce temps,
  // ou si la boucle l'a dépassé de plus d'une image (page ralentie), le suivant.
  let next = Math.ceil((t0 + LEAD_S) / step);
  let start = -1;
  for (let tries = 0; tries < 4 && start < 0; tries++, next++) {
    const k = next % starts;
    clip.currentTime = (k * segment) / fps + half;
    if (!(await once(clip, "seeked", 1000))) return false;
    const at = next * step - t0 - half;
    if (run() < at && (await until(() => run() >= at, 2000)) && run() - at < 2 / fps) start = k;
  }
  loopShown.stop();
  if (start < 0) return false;

  loop.pause();
  stop.classList.add("exit-clip");
  const clipShown = shownTime(clip);
  try {
    await clip.play();
  } catch {
    clipShown.stop();
    return false;
  }
  // Le stylo couché (à l'écran, pas seulement dans le temps du clip), le clip attend six images : on saute à
  // la fermeture. Pendant ce saut, l'écran garde l'image du stylo couché, la même que celle où il arrive.
  await until(() => clipShown.time() >= (start * segment + lift) / fps - half, 2000);
  clipShown.stop();
  clip.currentTime = (starts * segment) / fps + half;
  await until(() => clip.ended, 4000);
  return true;
}

/** Téléphone : la fermeture, en fondu sur la boucle. Faux si elle n'est pas encore téléchargée. */
async function closeOnPhone(stop: HTMLElement): Promise<boolean> {
  const video = phoneOf(stop);
  const blob = phoneClip && (await Promise.race([phoneClip, wait(FADE_MS).then(() => null)]));
  if (!video || !blob) return false;
  if (!video.src) video.src = URL.createObjectURL(blob);
  video.currentTime = 0;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA && !(await once(video, "loadeddata", 1000))) return false;
  try {
    await video.play();
  } catch {
    return false;
  }
  stop.classList.add("exit-clip");
  await until(() => video.ended, 3000);
  return true;
}

/** Joue la sortie ; la promesse se résout quand la page suivante peut s'ouvrir. */
export async function leaveVoyage(stop: HTMLElement, loop: HTMLVideoElement | null): Promise<void> {
  if (reduce.matches) return;
  const started = performance.now();
  stop.classList.add("exit");
  const closing = (desktop.matches ? closeOnDesktop(stop, loop) : closeOnPhone(stop)).catch(() => false);
  await Promise.race([closing, wait(MAX_MS)]);
  // Sans clip, l'effacement suffit.
  const left = FADE_MS - (performance.now() - started);
  if (left > 0) await wait(left);
}

/** Retour arrière depuis « À propos » (page restaurée telle quelle) : l'escale comme avant le clic. */
export function resetExit(stop: HTMLElement): void {
  stop.classList.remove("exit", "exit-clip");
  clipOf(stop)?.pause();
  phoneOf(stop)?.pause();
}
