// Accès au dossier photos du PC (ex. « iCloud Photos » synchronisé par iCloud pour
// Windows), via l'API File System Access de Chrome / Edge.
//
// Web uniquement : n'est importé que par des fichiers `.web.tsx`. Rien ne touche au
// navigateur au chargement du module (le rendu statique d'Expo l'évalue côté Node).
//
// - Le dossier choisi est mémorisé (poignée gardée dans IndexedDB) : d'une visite à
//   l'autre, il suffit de réautoriser l'accès d'un clic.
// - Les miniatures sont générées une fois et gardées dans IndexedDB : les afficher ne
//   demande plus d'accès au dossier.

import exifr from 'exifr';
import { createStore, get, set, type UseStore } from 'idb-keyval';

import type { ScannedPhoto } from './match-photos';

type Permission = 'granted' | 'denied' | 'prompt';
type FileEntry = { kind: 'file'; name: string; getFile(): Promise<File> };
export type FolderHandle = {
  kind: 'directory';
  name: string;
  values(): AsyncIterableIterator<FileEntry | FolderHandle>;
  getDirectoryHandle(name: string): Promise<FolderHandle>;
  getFileHandle(name: string): Promise<FileEntry>;
  queryPermission(opts: { mode: 'read' }): Promise<Permission>;
  requestPermission(opts: { mode: 'read' }): Promise<Permission>;
};

const FOLDER_KEY = 'folder';
const IMAGE = /\.(jpe?g|png|webp|heic|heif)$/i;
const HEIC = /\.hei[cf]$/i;
/** Côté long des miniatures (px) : ~2× la taille affichée sur la corde à linge. */
const THUMB_PX = 360;

let store: UseStore | undefined;
function kv(): UseStore {
  store ??= createStore('magellan-photos', 'kv');
  return store;
}

/** Le navigateur sait-il donner accès à un dossier (Chrome / Edge) ? */
export function folderAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/** Fait choisir le dossier photos (à appeler depuis un clic) et le mémorise. */
export async function pickFolder(): Promise<FolderHandle> {
  const picker = (window as unknown as {
    showDirectoryPicker(opts: { id: string; mode: 'read' }): Promise<FolderHandle>;
  }).showDirectoryPicker;
  const folder = await picker({ id: 'magellan-photos', mode: 'read' });
  await set(FOLDER_KEY, folder, kv());
  return folder;
}

/** Dossier mémorisé et état de l'autorisation (sans rien demander). */
export async function savedFolder(): Promise<{ folder: FolderHandle; permission: Permission } | null> {
  const folder = await get<FolderHandle>(FOLDER_KEY, kv());
  if (!folder) return null;
  return { folder, permission: await folder.queryPermission({ mode: 'read' }) };
}

/** Réautorise l'accès au dossier mémorisé (à appeler depuis un clic). */
export async function requestAccess(folder: FolderHandle): Promise<boolean> {
  return (await folder.requestPermission({ mode: 'read' })) === 'granted';
}

async function* walk(
  folder: FolderHandle,
  prefix = '',
): AsyncGenerator<{ path: string; entry: FileEntry }> {
  for await (const entry of folder.values()) {
    if (entry.kind === 'directory') yield* walk(entry, `${prefix}${entry.name}/`);
    else if (IMAGE.test(entry.name)) yield { path: prefix + entry.name, entry };
  }
}

/** Exécute `task` sur chaque élément, `limit` à la fois. */
async function pool<T>(items: T[], limit: number, task: (item: T, i: number) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      await task(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/** Métadonnées déjà lues d'une photo, reconnue à sa taille et sa date de modification. */
type MetaCache = { size: number; modified: number; photo: ScannedPhoto };

/**
 * Date et position d'une photo. Ordre de confiance : métadonnées EXIF, puis date
 * dans le nom (WhatsApp enregistre « IMG-20250524-WA0012.jpg »), puis date du fichier.
 */
async function readMeta(path: string, entry: FileEntry): Promise<{ photo: ScannedPhoto; cached: boolean }> {
  // getFile() ne lit que la fiche du fichier (taille, date) : pas encore de téléchargement.
  const file = await entry.getFile();
  const key = `meta:${path}`;
  const known = await get<MetaCache>(key, kv());
  if (known && known.size === file.size && known.modified === file.lastModified) {
    return { photo: known.photo, cached: true };
  }

  // Lire le contenu déclenche, pour un fichier iCloud « en ligne uniquement », le
  // téléchargement complet de la photo (~1 photo/s) : d'où le cache ci-dessus.
  const photo: ScannedPhoto = { path };
  try {
    const m = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      ifd1: false,
      interop: false,
      xmp: false,
      icc: false,
      iptc: false,
      jfif: false,
      ihdr: false,
    });
    const date = m?.DateTimeOriginal ?? m?.CreateDate;
    if (date instanceof Date && !Number.isNaN(+date)) {
      photo.takenAt = date.toISOString();
      photo.dateFrom = 'exif';
    }
    if (typeof m?.latitude === 'number' && typeof m?.longitude === 'number' && (m.latitude || m.longitude)) {
      photo.lat = m.latitude;
      photo.lng = m.longitude;
    }
  } catch {
    // Pas de métadonnées lisibles (PNG, image retouchée…) : on passe aux indices suivants.
  }
  if (!photo.takenAt) {
    const n = entry.name.match(/(20\d{2})[-_]?([01]\d)[-_]?([0-3]\d)/);
    if (n) {
      photo.takenAt = new Date(Date.UTC(+n[1], +n[2] - 1, +n[3], 12)).toISOString();
      photo.dateFrom = 'nom';
    } else if (file.lastModified) {
      photo.takenAt = new Date(file.lastModified).toISOString();
      photo.dateFrom = 'fichier';
    }
  }
  await set(key, { size: file.size, modified: file.lastModified, photo } satisfies MetaCache, kv());
  return { photo, cached: false };
}

export type ScanProgress = {
  /** Photos trouvées dans le dossier (HEIC comprises). */
  found: number;
  /** Photos traitées : déjà connues, lues ou en échec. */
  read: number;
  /** Photos à traiter (connu une fois le dossier parcouru). */
  total?: number;
  /** Dont déjà connues (analyse précédente, même fichier inchangé). */
  known: number;
  /** Dont illisibles (téléchargement iCloud en échec…) — retentées à la prochaine analyse. */
  failed: number;
  /** Début des lectures réelles (ms), pour estimer le temps restant. */
  startedAt?: number;
};

/**
 * Parcourt tout le dossier (sous-dossiers compris) et lit la date et la position de
 * chaque photo. Les HEIC sont comptées à part : Chrome / Edge ne savent pas les afficher.
 * Ce qui est lu est gardé : une analyse interrompue reprend là où elle s'était arrêtée.
 */
export async function scanFolder(
  folder: FolderHandle,
  onProgress: (p: ScanProgress) => void,
): Promise<{ photos: ScannedPhoto[]; heic: number }> {
  const files: { path: string; entry: FileEntry }[] = [];
  let heic = 0;
  for await (const f of walk(folder)) {
    if (HEIC.test(f.path)) heic += 1;
    else files.push(f);
    if ((files.length + heic) % 250 === 0) onProgress({ found: files.length + heic, read: 0, known: 0, failed: 0 });
  }
  const progress: ScanProgress = { found: files.length + heic, read: 0, total: files.length, known: 0, failed: 0 };
  onProgress({ ...progress });
  const photos: ScannedPhoto[] = new Array(files.length);
  await pool(files, 6, async (f, i) => {
    try {
      const { photo, cached } = await readMeta(f.path, f.entry);
      photos[i] = photo;
      if (cached) progress.known += 1;
      else progress.startedAt ??= Date.now();
    } catch {
      // Photo illisible (téléchargement iCloud en échec, fichier verrouillé…) : on la
      // garde sans métadonnées plutôt que d'arrêter toute l'analyse.
      photos[i] = { path: f.path };
      progress.failed += 1;
    }
    progress.read += 1;
    onProgress({ ...progress });
  });
  return { photos, heic };
}

async function fileAt(folder: FolderHandle, path: string): Promise<File> {
  const parts = path.split('/');
  let dir = folder;
  for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part);
  return (await dir.getFileHandle(parts[parts.length - 1])).getFile();
}

async function makeThumb(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, THUMB_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.82 });
}

// Décoder une photo pleine taille coûte cher (~1 s pour 12 Mpx) : pas plus de 4 miniatures
// à la fois, et la dernière demandée passe en premier — c'est celle que l'on regarde.
const MAX_DECODES = 4;
let running = 0;
const waiting: (() => void)[] = [];
async function limited<T>(task: () => Promise<T>): Promise<T> {
  // En sortant de la file, on reprend directement la place de la tâche terminée.
  if (running >= MAX_DECODES) await new Promise<void>((resolve) => waiting.push(resolve));
  else running += 1;
  try {
    return await task();
  } finally {
    const next = waiting.pop();
    if (next) next();
    else running -= 1;
  }
}

const urls = new Map<string, string>();

/**
 * URL d'une miniature, générée au besoin depuis le dossier (s'il est autorisé) puis
 * gardée dans IndexedDB. `null` si elle n'existe pas encore et que le dossier n'est
 * pas accessible, ou si l'image ne se décode pas.
 */
export async function thumbnailUrl(path: string): Promise<string | null> {
  const cached = urls.get(path);
  if (cached) return cached;
  let blob = await get<Blob>(`thumb:${path}`, kv());
  if (!blob) {
    const saved = await savedFolder();
    if (!saved || saved.permission !== 'granted') return null;
    try {
      blob = await limited(async () => makeThumb(await fileAt(saved.folder, path)));
    } catch {
      return null;
    }
    await set(`thumb:${path}`, blob, kv());
  }
  const url = URL.createObjectURL(blob);
  urls.set(path, url);
  return url;
}

/** Rotation à appliquer à la vignette EXIF selon l'orientation de la photo. */
const ORIENTATION_DEG: Record<number, number> = { 3: 180, 6: 90, 8: 270 };
const previews = new Map<string, { uri: string; rotate: number }>();

/**
 * Aperçu rapide pour l'écran de vérification : la miniature déjà prête si elle existe,
 * sinon la vignette intégrée aux photos d'appareil (EXIF), lue sans décoder la photo
 * (quelques Ko en tête de fichier), sinon la miniature complète.
 */
export async function previewUrl(path: string): Promise<{ uri: string; rotate: number } | null> {
  const ready = urls.get(path);
  if (ready) return { uri: ready, rotate: 0 };
  const known = previews.get(path);
  if (known) return known;
  if (await get<Blob>(`thumb:${path}`, kv())) {
    const uri = await thumbnailUrl(path);
    return uri ? { uri, rotate: 0 } : null;
  }
  const saved = await savedFolder();
  if (saved?.permission === 'granted') {
    try {
      const file = await fileAt(saved.folder, path);
      const bytes = await exifr.thumbnail(file);
      if (bytes && bytes.length > 0) {
        const orientation = await exifr.orientation(file).catch(() => 1);
        const preview = {
          uri: URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/jpeg' })),
          rotate: ORIENTATION_DEG[orientation ?? 1] ?? 0,
        };
        previews.set(path, preview);
        return preview;
      }
    } catch {
      // Pas de vignette intégrée (capture, photo WhatsApp…) : miniature complète.
    }
  }
  const uri = await thumbnailUrl(path);
  return uri ? { uri, rotate: 0 } : null;
}

/** Prépare les miniatures d'un lot de photos (après un import), avec progression. */
export async function prepareThumbnails(paths: string[], onProgress: (done: number) => void) {
  let done = 0;
  await pool(paths, 3, async (path) => {
    await thumbnailUrl(path);
    done += 1;
    onProgress(done);
  });
}
