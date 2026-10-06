import { portfolioLink } from '@index/projects';
import { mountIndexBar } from '@index/ui/index-bar';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Onglet « ← INDEX » vers la fiche du projet sur le portfolio ; masqué depuis l'écran d'accueil.
mountIndexBar({ ...portfolioLink('gym-picker'), corner: 'top-right' });

// Pas en dev : le cache du service worker masquerait les modifications.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js');
}
