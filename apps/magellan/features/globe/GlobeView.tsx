import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import { buildGlobeHtml, type GlobeViewProps } from './globeHtml';

/**
 * Variante mobile (iOS/Android) : globe.gl rendu dans une WebView.
 * La variante web vit dans GlobeView.web.tsx.
 */
export function GlobeView({ visitedCountries }: GlobeViewProps) {
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html: buildGlobeHtml(visitedCountries) }}
      style={styles.webview}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      // Évite le flash blanc avant le chargement du globe.
      androidLayerType="hardware"
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: '#0b1026' },
});
