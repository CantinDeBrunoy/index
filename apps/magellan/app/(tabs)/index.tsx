import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTrips } from '@/features/trips/store';

export default function GlobeScreen() {
  const { visitedCountries, cities } = useTrips();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.center}>
        <ThemedText type="title">🌍 Magellan</ThemedText>
        <ThemedText style={styles.subtitle}>
          Le globe 3D arrive en Phase 2.
        </ThemedText>
        <ThemedText style={styles.stats}>
          {visitedCountries.length} pays · {cities.length} villes
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  subtitle: { opacity: 0.7, textAlign: 'center' },
  stats: { marginTop: 8, fontWeight: '600' },
});
