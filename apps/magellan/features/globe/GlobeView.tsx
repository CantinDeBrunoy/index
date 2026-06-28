import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { buildGlobeHtml, type GlobeViewProps } from './globeHtml';

/**
 * Variante mobile (iOS/Android) : globe.gl rendu dans une WebView.
 * La variante web vit dans GlobeView.web.tsx.
 */
export function GlobeView({ visitedCountries, trips, onCountryPress, focus, paused }: GlobeViewProps) {
  const ref = useRef<WebView>(null);

  // Source mémoïsée : évite de recharger la WebView à chaque rendu (focus/sélection) ;
  // elle ne change que si les données changent.
  const source = useMemo(
    () => ({ html: buildGlobeHtml(visitedCountries, trips) }),
    [visitedCountries, trips],
  );

  // Centre la caméra (avec un niveau de zoom) quand `focus` change.
  useEffect(() => {
    if (!focus) return;
    const alt = focus.altitude ?? 0.6;
    ref.current?.injectJavaScript(
      `(function(){var g=window.__magellanGlobe;if(g){` +
        `g.pointOfView({lat:${focus.lat},lng:${focus.lng},altitude:${alt}},900);}})();true;`,
    );
  }, [focus]);

  // Met en pause / reprend la rotation automatique.
  useEffect(() => {
    ref.current?.injectJavaScript(
      `(function(){var g=window.__magellanGlobe;if(g){g.controls().autoRotate=${!paused};}})();true;`,
    );
  }, [paused]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m?.type === 'countryClick') onCountryPress?.(m.iso, m.name, m.lat, m.lng);
    } catch {
      // message non JSON ignoré
    }
  };

  return (
    <WebView
      ref={ref}
      originWhitelist={['*']}
      source={source}
      style={styles.webview}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      onMessage={onMessage}
      // Évite le flash blanc avant le chargement du globe.
      androidLayerType="hardware"
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: '#0b1026' },
});
