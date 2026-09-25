import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-color-scheme: dark)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/**
 * L'écran est-il en mode sombre ? Pour les rares dessins dont la couleur ne
 * peut pas venir de la feuille de style — le corps d'un personnage est peint
 * par une prop, pas par une variable CSS. Suit le réglage en direct.
 */
export function useDarkScheme(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
