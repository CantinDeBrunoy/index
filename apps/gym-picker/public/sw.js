// Service worker minimal : l'app s'ouvre instantanément depuis le cache, puis
// se met à jour en arrière-plan (stale-while-revalidate) ; la nouvelle version
// sert à l'ouverture suivante. /api n'est jamais mis en cache : un temps de
// trajet périmé est pire qu'une erreur.
const CACHE = 'gym-picker-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const fresh = fetch(request).then((response) => {
        if (response.ok) void cache.put(request, response.clone());
        return response;
      });
      if (!cached) return fresh;
      event.waitUntil(fresh.catch(() => undefined));
      return cached;
    }),
  );
});
