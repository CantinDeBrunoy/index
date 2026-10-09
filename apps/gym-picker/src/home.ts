import { isLatLng, type LatLng } from '../shared/api';
import { DEMO, DEMO_POSITION } from './demo';

const STORAGE_KEY = 'gym-picker:home';

// Le domicile reste sur le téléphone. Stocké côté serveur, il fuirait : le
// repo est public, donc les adresses des salles aussi, et n'importe qui
// pourrait appeler l'API « depuis le domicile » puis le situer à partir des
// quatre temps de trajet.

// Mode démo : un domicile inventé, gardé en mémoire le temps de la page. Le
// vrai, dans le localStorage, n'est ni lu ni écrasé.
let demoHome: LatLng | null = DEMO === 'domicile' ? DEMO_POSITION : null;

export function loadHome(): LatLng | null {
  if (DEMO) return demoHome;
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return isLatLng(value) ? value : null;
  } catch {
    return null;
  }
}

/** Peut lever une exception si le stockage est indisponible. */
export function saveHome({ lat, lng }: LatLng): void {
  if (DEMO) {
    demoHome = { lat, lng };
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat, lng }));
}

export function clearHome(): void {
  if (DEMO) {
    demoHome = null;
    return;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Stockage indisponible : il n'y avait rien à effacer.
  }
}
