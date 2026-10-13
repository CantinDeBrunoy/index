/**
 * Le passage d'une escale à la suivante : au clic vers l'escale suivante (l'anneau, son bouton, la flèche du clavier ou
 * son point dans la barre), l'objet de l'escale part vers elle (la fusée vers la Terre, la voiture rentre à la
 * maison…) ; le voyage plonge ensuite vers la suivante, comme d'habitude, en suivant l'objet. Le cartel, l'anneau et
 * la barre des escales s'effacent pendant qu'il part. Rendus par design/renders/passage-scenes.js ; data/passages.json
 * dit, par scène, comment le montrer :
 * - « sprites » : la boucle continue, et l'objet qui part est dessiné par-dessus, dans un canvas, depuis une planche :
 *   d'abord une pièce du fond vide (rien ne bouge derrière l'objet), qui cache celui de la boucle, puis l'objet de
 *   l'image. Il part de la place où la boucle le montre : sur ordinateur, d'après l'image de la vidéo à l'écran ; sur
 *   téléphone, dont la boucle est une image animée qu'on ne peut pas suivre, de sa place moyenne (quelques pixels
 *   près). Le noir ou la couleur du fond décodé (vidéo ou WebP) s'écarte d'un ou deux niveaux de celui du rendu : la
 *   pièce prend au départ la teinte de la scène affichée, mesurée autour de l'objet.
 * - « clip » : une vidéo, un départ par fraction de la boucle ; sur ordinateur, on attend le prochain pour passer de la
 *   boucle au clip sans saut (scripts/video-sync.ts). Sur téléphone, le clip du premier départ, téléchargé d'avance,
 *   arrive en fondu sur la boucle.
 * Ce qu'il faut se charge une fois l'escale affichée. Pas encore là, en mouvement réduit : rien, le voyage plonge tout
 * de suite.
 */

import PASSAGES from "../data/passages.json";
import { catchStart, once, wait } from "./video-sync";

type Rect = [number, number, number, number, number, number];
interface Sprites {
  src: string;
  cycle: number;
  w: number;
  h: number;
  /** La pièce de fond qui cache l'objet de la boucle ; aucune pour des objets ajoutés (absents de la boucle). */
  patch: Rect | null;
  frames: (Rect | null)[];
  bob: [number, number][];
  origin: [number, number] | null;
}
interface Clip {
  src: string;
  starts: number;
  length: number;
  loop: number;
  origin: [number, number] | null;
}
type Passage = { fps: number; dive: number } & ({ kind: "sprites"; desktop: Sprites; phone: Sprites } | { kind: "clip"; desktop: Clip; phone: Clip });

/** Le temps que met l'objet à quitter la place où la boucle le montre pour celle de la planche. */
const SETTLE_S = 0.5;

const desktop = matchMedia("(min-width: 701px)");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

const passageOf = (stop: HTMLElement) => (PASSAGES as unknown as Record<string, Passage>)[stop.dataset.scene ?? ""];
const canvasOf = (stop: HTMLElement) => stop.querySelector<HTMLCanvasElement>("canvas[data-passage]");
const clipOf = (stop: HTMLElement) => stop.querySelector<HTMLVideoElement>("video[data-passage-clip]");
const phoneOf = (stop: HTMLElement) => stop.querySelector<HTMLVideoElement>("video[data-passage-phone]");

const asked = new Set<string>();
const sheets = new Map<string, HTMLImageElement>();
const phoneClips = new Map<string, Promise<Blob | null>>();
let frame = 0;

/** Charge le passage de l'escale, une fois sa scène affichée : la planche ou le clip du format affiché. */
export function preparePassage(stop: HTMLElement): void {
  const p = passageOf(stop);
  if (!p || reduce.matches) return;
  if (p.kind === "sprites") {
    const { src } = desktop.matches ? p.desktop : p.phone;
    if (asked.has(src)) return;
    asked.add(src);
    const img = new Image();
    img.fetchPriority = "low";
    img.src = src;
    // Pas chargée (hors ligne, fichier absent) : le voyage plonge sans elle.
    img.decode().then(
      () => sheets.set(src, img),
      () => asked.delete(src),
    );
  } else if (desktop.matches) {
    const clip = clipOf(stop);
    if (clip && clip.preload !== "auto") {
      clip.preload = "auto";
      clip.load();
    }
  } else {
    const src = `${p.phone.src}.mp4`;
    if (!phoneClips.has(src)) phoneClips.set(src, fetch(src).then((r) => (r.ok ? r.blob() : null), () => null));
  }
}

/**
 * La pièce de fond, à la teinte de `media` (la vidéo ou l'image affichée) : l'écart médian, canal par canal, sur les
 * pixels de fond (proches des deux côtés) de sa partie opaque. Sans mesure possible, telle quelle.
 */
function tintedPatch(img: HTMLImageElement, sheet: Sprites & { patch: Rect }, media: CanvasImageSource, mw: number, mh: number): HTMLCanvasElement {
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
      // Le fond seul : là où l'objet de la boucle ne change pas la couleur de plus de quelques niveaux.
      if (Math.abs(a.data[i]! - b[i]!) + Math.abs(a.data[i + 1]! - b[i + 1]!) + Math.abs(a.data[i + 2]! - b[i + 2]!) > 12) continue;
      for (let c = 0; c < 3; c++) deltas[c]!.push(b[i + c]! - a.data[i + c]!);
    }
    if (deltas[0]!.length < 50) return patch;
    const median = deltas.map((d) => d.sort((x, y) => x - y)[d.length >> 1]!);
    for (let i = 0; i < a.data.length; i += 4) for (let c = 0; c < 3; c++) a.data[i + c] = a.data[i + c]! + median[c]!;
    pc.putImageData(a, 0, 0);
  } catch {
    // Scène illisible (pas encore décodée) : la pièce telle quelle.
  }
  return patch;
}

/** L'instant de la boucle à l'écran : l'image affichée de la vidéo (requestVideoFrameCallback), à défaut currentTime. */
function loopTime(video: HTMLVideoElement | null): Promise<number> {
  if (!video || !desktop.matches || video.paused || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve(0);
  if (typeof video.requestVideoFrameCallback !== "function") return Promise.resolve(video.currentTime);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(video.currentTime), 100);
    video.requestVideoFrameCallback((_, meta) => {
      window.clearTimeout(timer);
      resolve(meta.mediaTime);
    });
  });
}

/** Les sprites : l'objet dessiné par-dessus la boucle. Faux si la planche n'est pas là. */
async function spritesOn(stop: HTMLElement, p: Passage & { kind: "sprites" }, loop: HTMLVideoElement | null): Promise<boolean> {
  const canvas = canvasOf(stop);
  const sheet = desktop.matches ? p.desktop : p.phone;
  const img = sheets.get(sheet.src);
  const ctx = canvas?.getContext("2d");
  if (!canvas || !img || !ctx) return false;

  const at = await loopTime(loop);
  // La scène affichée : la vidéo sur ordinateur, sinon l'image (fixe ou animée ; derrière l'objet, rien ne bouge).
  const still = stop.querySelector<HTMLImageElement>("img.scene--still");
  const playing = desktop.matches && loop && !stop.classList.contains("no-video") && loop.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  const patched = sheet.patch ? (sheet as Sprites & { patch: Rect }) : null;
  const patch = !patched ? null : playing ? tintedPatch(img, patched, loop, loop.videoWidth, loop.videoHeight) : still?.naturalWidth ? tintedPatch(img, patched, still, still.naturalWidth, still.naturalHeight) : null;
  // Le décalage de l'objet de la boucle à cet instant (sa phase sur son cycle), par rapport à celui de la planche.
  const off = { x: 0, y: 0 };
  if (sheet.bob.length) {
    const k = ((((at % sheet.cycle) + sheet.cycle) % sheet.cycle) / sheet.cycle) * sheet.bob.length;
    const i0 = Math.floor(k) % sheet.bob.length, i1 = (i0 + 1) % sheet.bob.length, u = k - Math.floor(k);
    const [ax, ay] = sheet.bob[i0]!, [bx, by] = sheet.bob[i1]!;
    Object.assign(off, { x: ax + (bx - ax) * u, y: ay + (by - ay) * u });
  }

  canvas.width = sheet.w;
  canvas.height = sheet.h;
  const blit = (r: Rect, dx = 0, dy = 0) => ctx.drawImage(img, r[0], r[1], r[2], r[3], r[4] + dx, r[5] + dy, r[2], r[3]);
  const t0 = performance.now();
  const last = sheet.frames.length - 1;
  const draw = () => {
    const t = (performance.now() - t0) / 1000;
    const f = Math.min(last, Math.floor(t * p.fps));
    const s = Math.min(1, t / SETTLE_S);
    const keep = 1 - s * s * (3 - 2 * s);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (patch && sheet.patch) ctx.drawImage(patch, sheet.patch[4], sheet.patch[5]);
    else if (sheet.patch) blit(sheet.patch);
    const r = sheet.frames[f];
    if (r) blit(r, off.x * keep, off.y * keep);
    if (f < last) frame = requestAnimationFrame(draw);
  };
  cancelAnimationFrame(frame);
  draw();
  stop.classList.add("passage-on");
  return true;
}

/** Le clip, sur ordinateur : il remplace la boucle à son prochain départ. Faux s'il n'a pas pu. */
async function clipOnDesktop(stop: HTMLElement, p: Passage & { kind: "clip" }, loop: HTMLVideoElement | null): Promise<boolean> {
  const clip = clipOf(stop);
  if (!clip || !loop || loop.paused || stop.classList.contains("no-video")) return false;
  if (clip.readyState < HTMLMediaElement.HAVE_FUTURE_DATA || !(loop.duration > 0)) return false;
  const start = await catchStart(loop, clip, { starts: p.desktop.starts, segment: p.desktop.length, fps: p.fps });
  if (start < 0) return false;
  loop.pause();
  stop.classList.add("passage-on");
  try {
    await clip.play();
  } catch {
    stop.classList.remove("passage-on");
    void loop.play().catch(() => undefined);
    return false;
  }
  return true;
}

/** Le clip, sur téléphone : celui du premier départ, en fondu sur la boucle. Faux s'il n'est pas encore téléchargé. */
async function clipOnPhone(stop: HTMLElement, p: Passage & { kind: "clip" }): Promise<boolean> {
  const video = phoneOf(stop);
  const pending = phoneClips.get(`${p.phone.src}.mp4`);
  const blob = pending && (await Promise.race([pending, wait(300).then(() => null)]));
  if (!video || !blob) return false;
  if (!video.src) video.src = URL.createObjectURL(blob);
  video.currentTime = 0;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA && !(await once(video, "loadeddata", 1000))) return false;
  try {
    await video.play();
  } catch {
    return false;
  }
  stop.classList.add("passage-on");
  return true;
}

/**
 * L'objet de l'escale part vers la suivante : la promesse se résout quand le voyage doit plonger (vrai), ou tout de
 * suite (faux) s'il ne peut pas partir. Il continue sa course pendant le plongeon, jusqu'à resetPassage.
 */
export async function departPassage(stop: HTMLElement, loop: HTMLVideoElement | null): Promise<boolean> {
  const p = passageOf(stop);
  if (!p || reduce.matches) return false;
  // Le cartel, l'anneau et la barre s'effacent pendant que le clip attend son départ.
  stop.classList.add("passage");
  const on = await (p.kind === "sprites" ? spritesOn(stop, p, loop) : desktop.matches ? clipOnDesktop(stop, p, loop) : clipOnPhone(stop, p)).catch(() => false);
  if (!on) {
    stop.classList.remove("passage");
    return false;
  }
  // Le plongeon suit l'objet, s'il ne part pas vers le point qu'on clique.
  const origin = (desktop.matches ? p.desktop : p.phone).origin;
  if (origin) {
    stop.style.setProperty("--dive-x", `${origin[0]}%`);
    stop.style.setProperty("--dive-y", `${origin[1]}%`);
  }
  await wait(p.dive * 1000);
  return true;
}

/** Sous le voile, l'escale quittée : l'objet de la boucle reprend sa place pour la prochaine visite. */
export function resetPassage(stop: HTMLElement): void {
  if (!stop.classList.contains("passage")) return;
  cancelAnimationFrame(frame);
  stop.classList.remove("passage", "passage-on");
  stop.style.removeProperty("--dive-x");
  stop.style.removeProperty("--dive-y");
  const canvas = canvasOf(stop);
  // Un canvas vide ne garde pas en mémoire une image de 2560 × 1440.
  if (canvas) canvas.width = canvas.height = 1;
  for (const video of [clipOf(stop), phoneOf(stop)]) video?.pause();
}
