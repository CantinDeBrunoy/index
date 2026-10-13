/**
 * La fusée de l'escale 1 repart vers la Terre, l'escale 2 : au clic vers l'escale suivante (l'anneau, son bouton, la
 * flèche du clavier ou son point dans la barre), sa flamme s'allonge, elle tremble, puis elle file vers la Terre en
 * laissant sa traînée et rapetisse jusqu'à s'y fondre ; le voyage plonge alors vers la Terre, comme d'habitude.
 * - La boucle de l'espace continue : la fusée qui part est dessinée par-dessus, dans un canvas, depuis une planche de
 *   sprites (design/renders/fusee-render.mjs, data/fusee.json). D'abord une pièce de ciel vide (des étoiles fixes,
 *   rien d'autre ne passe là) qui cache la fusée de la boucle, puis la fusée de l'image.
 * - Elle part de la place où la boucle la montre : sur ordinateur, d'après l'image de la vidéo à l'écran ; sur
 *   téléphone, dont la boucle est une image animée qu'on ne peut pas suivre, de sa place moyenne (quelques pixels près).
 * - Le noir du ciel décodé (vidéo ou WebP) s'écarte d'un ou deux niveaux de celui du rendu : la pièce de ciel prend
 *   au départ la teinte de la scène affichée, mesurée autour de la fusée, pour ne pas se voir.
 * - La planche se charge une fois l'escale 1 affichée. Pas encore là, en mouvement réduit : rien, le voyage plonge
 *   tout de suite.
 */

import FUSEE from "../data/fusee.json";

type Rect = [number, number, number, number, number, number];
interface Sheet {
  src: string;
  w: number;
  h: number;
  patch: Rect;
  frames: (Rect | null)[];
  bob: [number, number][];
}

/** La boucle de l'espace : trois cycles de 8 s (la fusée flotte au rythme des lunes), la Terre en fait un tour. */
const CYCLE_S = 8;
/** Le temps que met la fusée à quitter la place où la boucle la montre pour celle de la planche. */
const SETTLE_S = 0.5;

const desktop = matchMedia("(min-width: 701px)");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

const sheetOf = (): Sheet => (desktop.matches ? FUSEE.desktop : FUSEE.phone) as Sheet;
const asked = new Set<string>();
const loaded = new Map<string, HTMLImageElement>();
let frame = 0;

const canvasOf = (stop: HTMLElement) => stop.querySelector<HTMLCanvasElement>("canvas[data-fusee]");

/** Charge la planche du format affiché, une fois l'escale 1 à l'écran. */
export function prepareFusee(stop: HTMLElement): void {
  if (reduce.matches || !canvasOf(stop)) return;
  const { src } = sheetOf();
  if (asked.has(src)) return;
  asked.add(src);
  const img = new Image();
  img.fetchPriority = "low";
  img.src = src;
  // Pas chargée (hors ligne, fichier absent) : le voyage plonge sans elle.
  img.decode().then(
    () => loaded.set(src, img),
    () => asked.delete(src),
  );
}

/** L'instant de la boucle à l'écran : l'image affichée de la vidéo (requestVideoFrameCallback), à défaut currentTime. */
function shownTime(video: HTMLVideoElement | null): Promise<number> {
  if (!video || !desktop.matches || video.paused || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve(0);
  const v = video as HTMLVideoElement & { requestVideoFrameCallback?: HTMLVideoElement["requestVideoFrameCallback"] };
  if (!v.requestVideoFrameCallback) return Promise.resolve(video.currentTime);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(video.currentTime), 100);
    v.requestVideoFrameCallback((_, meta) => {
      window.clearTimeout(timer);
      resolve(meta.mediaTime);
    });
  });
}

/**
 * La pièce de ciel, à la teinte de `media` (la vidéo ou l'image affichée) : l'écart médian, canal par canal, sur les
 * pixels de fond (sombres des deux côtés) de sa partie opaque. Sans mesure possible, telle quelle.
 */
function skyPatch(img: HTMLImageElement, sheet: Sheet, media: CanvasImageSource, mw: number, mh: number): HTMLCanvasElement {
  const [sx, sy, w, h, dx, dy] = sheet.patch;
  const patch = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const pc = patch.getContext("2d", { willReadFrequently: true })!;
  pc.drawImage(img, sx, sy, w, h, 0, 0, w, h);
  try {
    const seen = Object.assign(document.createElement("canvas"), { width: w, height: h }).getContext("2d", { willReadFrequently: true })!;
    const kx = mw / sheet.w, ky = mh / sheet.h;
    seen.drawImage(media, dx * kx, dy * ky, w * kx, h * ky, 0, 0, w, h);
    const a = pc.getImageData(0, 0, w, h), b = seen.getImageData(0, 0, w, h).data;
    const deltas: number[][] = [[], [], []];
    for (let i = 0; i < a.data.length; i += 4) {
      if (a.data[i + 3] !== 255) continue;
      if (Math.max(a.data[i]!, a.data[i + 1]!, a.data[i + 2]!) > 30 || Math.max(b[i]!, b[i + 1]!, b[i + 2]!) > 30) continue;
      for (let c = 0; c < 3; c++) deltas[c]!.push(b[i + c]! - a.data[i + c]!);
    }
    if (deltas[0]!.length < 50) return patch;
    const median = deltas.map((d) => d.sort((x, y) => x - y)[d.length >> 1]!);
    if (median.some((d) => Math.abs(d) > 8)) return patch;
    for (let i = 0; i < a.data.length; i += 4) for (let c = 0; c < 3; c++) a.data[i + c] = a.data[i + c]! + median[c]!;
    pc.putImageData(a, 0, 0);
  } catch {
    // Scène illisible (pas encore décodée) : la pièce telle quelle.
  }
  return patch;
}

/**
 * La fusée repart : la promesse se résout quand le voyage doit plonger vers la Terre (vrai), ou tout de suite (faux)
 * si elle ne peut pas partir. Elle continue sa course pendant le plongeon, jusqu'à resetFusee.
 */
export async function departFusee(stop: HTMLElement, video: HTMLVideoElement | null): Promise<boolean> {
  const canvas = canvasOf(stop);
  const sheet = sheetOf();
  const img = loaded.get(sheet.src);
  const ctx = canvas?.getContext("2d");
  if (reduce.matches || !canvas || !img || !ctx) return false;

  const at = await shownTime(video);
  // La scène affichée : la vidéo sur ordinateur, sinon l'image (fixe ou animée ; derrière la fusée, le ciel ne bouge pas).
  const still = stop.querySelector<HTMLImageElement>("img.scene--still");
  const playing = desktop.matches && video && !stop.classList.contains("no-video") && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  const patch = playing
    ? skyPatch(img, sheet, video, video.videoWidth, video.videoHeight)
    : still?.naturalWidth
      ? skyPatch(img, sheet, still, still.naturalWidth, still.naturalHeight)
      : null;
  // Le décalage de la fusée de la boucle à cet instant (sa phase sur le cycle), par rapport à celle de la planche.
  const k = (((at % CYCLE_S) + CYCLE_S) % CYCLE_S) / CYCLE_S * sheet.bob.length;
  const i0 = Math.floor(k) % sheet.bob.length, i1 = (i0 + 1) % sheet.bob.length, u = k - Math.floor(k);
  const [ax, ay] = sheet.bob[i0]!, [bx, by] = sheet.bob[i1]!;
  const off = { x: ax + (bx - ax) * u, y: ay + (by - ay) * u };

  canvas.width = sheet.w;
  canvas.height = sheet.h;
  const blit = (r: Rect, dx = 0, dy = 0) => ctx.drawImage(img, r[0], r[1], r[2], r[3], r[4] + dx, r[5] + dy, r[2], r[3]);
  const t0 = performance.now();
  const last = sheet.frames.length - 1;
  const draw = () => {
    const t = (performance.now() - t0) / 1000;
    const f = Math.min(last, Math.floor(t * FUSEE.fps));
    const s = Math.min(1, t / SETTLE_S);
    const keep = 1 - s * s * (3 - 2 * s);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (patch) ctx.drawImage(patch, sheet.patch[4], sheet.patch[5]);
    else blit(sheet.patch);
    const r = sheet.frames[f];
    if (r) blit(r, off.x * keep, off.y * keep);
    if (f < last) frame = requestAnimationFrame(draw);
  };
  cancelAnimationFrame(frame);
  draw();
  stop.classList.add("fusee");
  await new Promise((resolve) => window.setTimeout(resolve, FUSEE.dive * 1000));
  return true;
}

/** Sous le voile, l'escale 1 quittée : la fusée de la boucle reprend sa place pour la prochaine visite. */
export function resetFusee(stop: HTMLElement): void {
  if (!stop.classList.contains("fusee")) return;
  cancelAnimationFrame(frame);
  stop.classList.remove("fusee");
  const canvas = canvasOf(stop);
  // Un canvas vide ne garde pas en mémoire une image de 2560 × 1440.
  if (canvas) canvas.width = canvas.height = 1;
}
