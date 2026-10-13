/**
 * Passer d'une boucle vidéo à un clip sans saut (la sortie du voyage, scripts/voyage-sortie.ts ; les passages d'une
 * escale à la suivante, scripts/voyage-passage.ts). Le clip a un départ par fraction de la boucle (`starts`), chacun
 * de `segment` images : on le place sur le prochain, et on attend que la boucle y arrive.
 */

/** Le temps laissé au clip pour se placer sur son départ, avant que la boucle n'y arrive. */
const LEAD_S = 0.2;

export const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** L'image suivante ; dans une page cachée, qui n'en dessine plus, au plus tard après 100 ms. */
export const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
    window.setTimeout(resolve, 100);
  });

/** Attend que `test` soit vrai, image après image ; faux au bout de `ms`. */
export async function until(test: () => boolean, ms: number): Promise<boolean> {
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
export function shownTime(video: HTMLVideoElement): { time: () => number; stop: () => void } {
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

export const once = (target: EventTarget, type: string, ms: number) =>
  new Promise<boolean>((resolve) => {
    const timer = window.setTimeout(() => resolve(false), ms);
    target.addEventListener(type, () => (window.clearTimeout(timer), resolve(true)), { once: true });
  });

/**
 * Place `clip` sur le prochain de ses départs et attend que la boucle y arrive : le numéro du départ, à jouer tout de
 * suite (la boucle s'arrête, le clip la remplace), ou -1 s'il n'a pas pu se placer.
 */
export async function catchStart(loop: HTMLVideoElement, clip: HTMLVideoElement, { starts, segment, fps }: { starts: number; segment: number; fps: number }): Promise<number> {
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
    if (!(await once(clip, "seeked", 1000))) break;
    const at = next * step - t0 - half;
    if (run() < at && (await until(() => run() >= at, 2000)) && run() - at < 2 / fps) start = k;
  }
  loopShown.stop();
  return start;
}
