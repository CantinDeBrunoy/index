import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlobeView } from '@/features/globe/GlobeView';
import { useTrips } from '@/features/trips/store';

export default function GlobeScreen() {
  const { visitedCountries, cities, trips } = useTrips();

  return (
    <View style={styles.container}>
      <GlobeView visitedCountries={visitedCountries} trips={trips} />
      <View style={styles.badge}>
        <ThemedText style={styles.badgeText}>
          {trips.length} voyages · {cities.length} villes · {visitedCountries.length} pays
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1026' },
  badge: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(11, 16, 38, 0.6)',
    pointerEvents: 'none',
  },
  badgeText: { color: '#fff', fontWeight: '600' },
});
