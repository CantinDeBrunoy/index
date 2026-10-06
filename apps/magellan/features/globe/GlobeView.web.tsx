import { useEffect, useMemo, useRef } from 'react';

import { buildGlobeHtml, type GlobeViewProps } from './globeHtml';

type GlobeWindow = { __magellanGlobe?: any };

/**
 * Variante web : on est déjà dans un navigateur, donc globe.gl tourne dans une
 * iframe (même HTML que la variante mobile). La variante mobile vit dans GlobeView.tsx.
 */
export function GlobeView({
  visitedCountries,
  trips,
  onCountryPress,
  onFlagPress,
  focus,
  paused,
  replay,
}: GlobeViewProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const globe = () => (ref.current?.contentWindow as unknown as GlobeWindow)?.__magellanGlobe;

  // HTML mémoïsé : ne recharge l'iframe que si les données changent.
  const html = useMemo(() => buildGlobeHtml(visitedCountries, trips), [visitedCountries, trips]);

  // Reçoit les messages émis par le globe (tap d'un pays).
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (ref.current && e.source !== ref.current.contentWindow) return;
      try {
        const m = JSON.parse(e.data);
        if (m?.type === 'countryClick') onCountryPress?.(m.iso, m.name, m.lat, m.lng);
        else if (m?.type === 'flagClick') onFlagPress?.(m.stopId);
      } catch {
        // message non JSON ignoré
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onCountryPress, onFlagPress]);

  // Centre la caméra (avec un niveau de zoom) quand `focus` change.
  useEffect(() => {
    if (!focus) return;
    globe()?.pointOfView({ lat: focus.lat, lng: focus.lng, altitude: focus.altitude ?? 0.6 }, 900);
  }, [focus]);

  // Met en pause / reprend la rotation automatique.
  useEffect(() => {
    const g = globe();
    if (g) g.controls().autoRotate = !paused;
  }, [paused]);

  // Rejoue l'itinéraire demandé.
  useEffect(() => {
    if (!replay) return;
    const g = ref.current?.contentWindow as unknown as { __magellanReplay?: (id: string) => void };
    g?.__magellanReplay?.(replay.tripId);
  }, [replay]);

  // Barre espace : stoppe / relance la rotation (quand la page, pas l'iframe, a le focus).
  // On ignore la saisie dans un champ texte (pour ne pas casser l'espace de la recherche).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        const g = globe();
        if (g) g.controls().autoRotate = !g.controls().autoRotate;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <iframe
      ref={ref}
      title="Globe Magellan"
      srcDoc={html}
      style={{ border: 'none', width: '100%', height: '100%', backgroundColor: '#0b1026' }}
    />
  );
}
