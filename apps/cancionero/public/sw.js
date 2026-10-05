/* Service worker de Cancionero : met en cache ce qui a déjà été chargé pour
   que l'app s'ouvre hors ligne. Les chansons, elles, sont déjà sur l'appareil
   (AsyncStorage → localStorage) : une fois l'app en cache, tout marche sans
   réseau, sauf la recherche de paroles et la traduction automatique.

   Enregistré en production seulement (src/features/pwa/service-worker.ts). */

/* À changer quand une ressource non versionnée change (icônes, favicon) : le
   cache d'abord la servirait sinon pour toujours. L'activation efface les
   caches qui ne portent pas ce nom. Les icônes portent aussi un `?v=` dans
   src/app/+html.tsx et le manifeste : à incrémenter en même temps. */
const CACHE = 'cancionero-v2';

self.addEventListener('install', (event) => {
  // L'accueil est mis en cache tout de suite : c'est lui qui sert de repli
  // hors ligne pour n'importe quelle adresse (le routeur fait le reste).
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add('/'))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Navigation : le réseau d'abord, le cache si l'on est hors ligne. L'export
  // statique d'Expo produit une page HTML par route : chacune est gardée sous
  // sa propre adresse, avec l'accueil en dernier recours.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request, { ignoreSearch: true })
            .then((cached) => cached || caches.match('/'))
            .then((cached) => cached || Response.error()),
        ),
    );
    return;
  }

  // Ressources versionnées (JS, CSS, polices, images) : le cache d'abord.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
