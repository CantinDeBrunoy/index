import { supabase } from '@/lib/supabase';

export const MAX_SIZE = 1200;
export const QUALITY = 0.7;
const BUCKET = 'entries';

/**
 * Capture l'image courante d'un flux vidéo, redimensionnée à 1200 px sur son
 * plus grand côté et compressée en JPEG qualité 0.7 : une photo de téléphone
 * passe ainsi de plusieurs mégaoctets à quelques centaines de kilo-octets,
 * avant tout envoi.
 */
export async function captureFromVideo(video: HTMLVideoElement, mirrored: boolean): Promise<Blob> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) throw new Error('video_not_ready');

  const scale = Math.min(1, MAX_SIZE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas_unavailable');

  if (mirrored) {
    // La caméra frontale s'affiche en miroir : on enregistre ce que la
    // personne a vu à l'écran.
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode_failed'))),
      'image/jpeg',
      QUALITY,
    );
  });
}

export function photoPath(userId: string, date: string): string {
  return `${userId}/${date}.jpg`;
}

/**
 * La photo frontale vit dans le même dossier que l'autre : les policies du
 * bucket raisonnent sur le premier segment du chemin, donc le propriétaire la
 * relit sans règle supplémentaire.
 */
export function selfiePath(userId: string, date: string): string {
  return `${userId}/${date}-selfie.jpg`;
}

/** Les deux clichés d'un même appui. `selfie` manque si l'appareil n'a qu'une caméra. */
export type Shot = { main: Blob; selfie: Blob | null };

export async function uploadPhoto(path: string, blob: Blob): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
}

export async function deletePhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

type SignedUrl = { url: string; expiresAt: number };
const signedUrls = new Map<string, SignedUrl>();
const TTL_SECONDS = 3600;

/**
 * URL signée pour un objet du bucket privé, mémorisée jusqu'à peu avant son
 * expiration. Renvoie `null` si la RLS refuse l'accès (journée non réciproque).
 */
export async function signedUrlFor(path: string): Promise<string | null> {
  const cached = signedUrls.get(path);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS);
  if (error || !data) return null;

  signedUrls.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  });
  return data.signedUrl;
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}
