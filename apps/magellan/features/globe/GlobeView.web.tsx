import { buildGlobeHtml, type GlobeViewProps } from './globeHtml';

/**
 * Variante web : on est déjà dans un navigateur, donc globe.gl tourne dans une
 * iframe (même HTML que la variante mobile). La variante mobile vit dans GlobeView.tsx.
 */
export function GlobeView({ visitedCountries }: GlobeViewProps) {
  return (
    <iframe
      title="Globe Magellan"
      srcDoc={buildGlobeHtml(visitedCountries)}
      style={{ border: 'none', width: '100%', height: '100%', backgroundColor: '#0b1026' }}
    />
  );
}
