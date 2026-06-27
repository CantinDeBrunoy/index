import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { COUNTRIES, countryFlag, countryName } from '@/data/countries';
import { useTrips } from '@/features/trips/store';

export default function VoyagesScreen() {
  const { visitedCountries, cities, isVisited, toggleCountry } = useTrips();

  // Pays connus de la table, triés par nom, pour les (dé)cocher rapidement.
  const allCountries = useMemo(
    () =>
      Object.keys(COUNTRIES).sort((a, b) => countryName(a).localeCompare(countryName(b))),
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Mes voyages</ThemedText>
        <ThemedText style={styles.stats}>
          {visitedCountries.length} pays · {cities.length} villes
        </ThemedText>

        <ThemedText type="subtitle" style={styles.section}>
          Villes visitées
        </ThemedText>
        {cities.length === 0 ? (
          <ThemedText style={styles.empty}>Aucune ville pour l’instant.</ThemedText>
        ) : (
          cities.map((city) => (
            <View key={city.id} style={styles.row}>
              <ThemedText>
                {countryFlag(city.country)}  {city.name}
              </ThemedText>
            </View>
          ))
        )}

        <ThemedText type="subtitle" style={styles.section}>
          Pays
        </ThemedText>
        {allCountries.map((code) => {
          const visited = isVisited(code);
          return (
            <Pressable
              key={code}
              onPress={() => toggleCountry(code)}
              style={[styles.row, visited && styles.rowVisited]}>
              <ThemedText>
                {countryFlag(code)}  {countryName(code)}
              </ThemedText>
              <ThemedText style={styles.check}>{visited ? '✓' : ''}</ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 4 },
  stats: { opacity: 0.7, marginBottom: 8 },
  section: { marginTop: 20, marginBottom: 4 },
  empty: { opacity: 0.6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  rowVisited: { backgroundColor: 'rgba(46, 160, 67, 0.18)' },
  check: { color: '#2EA043', fontWeight: '700' },
});
