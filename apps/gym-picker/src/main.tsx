import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { DEMO, showDemoToVisitor } from './demo';
import { isOwner } from './owner';
import './styles.css';

// Le mode se décide avant le premier affichage : sans « ?demo », un visiteur
// voit la démo, et seul le propriétaire ses vraies salles (owner.ts).
async function start() {
  if (!DEMO && !(await isOwner())) showDemoToVisitor();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();

// Pas en dev : le cache du service worker masquerait les modifications.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js');
}
