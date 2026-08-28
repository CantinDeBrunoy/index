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

// Le service worker sert deux choses : recevoir les notifications push et
// permettre l'ouverture du site hors ligne.
void registerServiceWorker();
