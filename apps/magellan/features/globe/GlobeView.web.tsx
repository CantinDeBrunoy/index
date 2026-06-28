import { useEffect, useMemo, useRef } from 'react';

import { buildGlobeHtml, type GlobeViewProps } from './globeHtml';

/**
 * Variante web : on est déjà dans un navigateur, donc globe.gl tourne dans une
 * iframe (même HTML que la variante mobile). La variante mobile vit dans GlobeView.tsx.
 */
export function GlobeView({ visitedCountries, trips, onCountryPress, focus }: GlobeViewProps) {
  const ref = useRef<HTMLIFrameElement>(null);

  // HTML mémoïsé : ne change (donc ne recharge l'iframe) que si les données changent,
  // pas sur un simple changement de focus/sélection.
  const html = useMemo(() => buildGlobeHtml(visitedCountries, trips), [visitedCountries, trips]);

  // Reçoit les messages émis par le globe (tap d'un pays).
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (ref.current && e.source !== ref.current.contentWindow) return;
      try {
        const m = JSON.parse(e.data);
        if (m?.type === 'countryClick') onCountryPress?.(m.iso, m.name);
      } catch {
        // message non JSON ignoré
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onCountryPress]);

  // Centre la caméra (et stoppe la rotation auto) quand un voyage est sélectionné.
  // L'iframe srcdoc est de même origine : on accède directement au globe exposé.
  useEffect(() => {
    if (!focus) return;
    const g = (ref.current?.contentWindow as unknown as { __magellanGlobe?: any })?.__magellanGlobe;
    if (g) {
      g.controls().autoRotate = false;
      g.pointOfView({ lat: focus.lat, lng: focus.lng, altitude: 0.6 }, 1000);
    }
  }, [focus]);

  return (
    <iframe
      ref={ref}
      title="Globe Magellan"
      srcDoc={html}
      style={{ border: 'none', width: '100%', height: '100%', backgroundColor: '#0b1026' }}
    />
  );
}
