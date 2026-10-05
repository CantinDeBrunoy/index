import { Platform } from 'react-native';

/**
 * Service worker de la version web (public/sw.js) : il garde l'app en cache
 * pour qu'elle s'ouvre hors ligne une fois installée sur l'écran d'accueil.
 *
 * En développement il servirait des fichiers périmés et casserait le
 * rechargement à chaud : on ne l'enregistre qu'en production, et on retire
 * celui qui traînerait d'un essai précédent sur localhost. Rien à faire sur
 * iOS / Android natifs.
 */
export function setUpServiceWorker() {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  if (!__DEV__) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
    return;
  }

  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => registrations.forEach((registration) => void registration.unregister()))
    .catch(() => {});
  if (typeof caches !== 'undefined') {
    caches
      .keys()
      .then((keys) => keys.forEach((key) => void caches.delete(key)))
      .catch(() => {});
  }
}
