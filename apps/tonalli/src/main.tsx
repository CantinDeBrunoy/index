import { portfolioLink } from '@index/projects';
import { mountIndexBar } from '@index/ui/index-bar';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/App';
import { registerServiceWorker } from '@/lib/push';
import '@/styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Onglet « ← INDEX » vers la fiche du projet sur le portfolio ; masqué dans la PWA installée.
mountIndexBar({ ...portfolioLink('tonalli'), corner: 'top-left' });

// Le service worker sert deux choses : recevoir les notifications push et
// permettre l'ouverture du site hors ligne. Mais en développement il sert des
// fichiers périmés et casse le rechargement à chaud — on ne l'active donc
// qu'en production, et on retire celui qui traînerait d'une session passée.
if (import.meta.env.PROD) {
  void registerServiceWorker();
} else {
  void navigator.serviceWorker
    ?.getRegistrations()
    .then((registrations) => registrations.forEach((registration) => void registration.unregister()))
    .catch(() => {});
  if (typeof caches !== 'undefined') {
    void caches
      .keys()
      .then((keys) => keys.forEach((key) => void caches.delete(key)))
      .catch(() => {});
  }
}
