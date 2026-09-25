import { isLatLng, type LatLng } from '../shared/api';

const STORAGE_KEY = 'gym-picker:home';

// Le domicile reste sur le téléphone. Stocké côté serveur, il fuirait : le
// repo est public, donc les adresses des salles aussi, et n'importe qui
// pourrait appeler l'API « depuis le domicile » puis le situer à partir des
// quatre temps de trajet.

export function loadHome(): LatLng | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return isLatLng(value) ? value : null;
  } catch {
    return null;
  }
}

/** Peut lever une exception si le stockage est indisponible. */
export function saveHome({ lat, lng }: LatLng): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat, lng }));
}

export function clearHome(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Stockage indisponible : il n'y avait rien à effacer.
  }
}
