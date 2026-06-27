import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { flagEmoji } from '@/data/isoCodes';
import { searchCity, type GeoResult } from '@/features/trips/geocode';
import { useTrips } from '@/features/trips/store';
import type { Trip, TripStop } from '@/features/trips/types';

export default function VoyagesScreen() {
  const { trips, cities, visitedCountries, addTrip, removeTrip, addStop, removeStop } = useTrips();
  const [newTripName, setNewTripName] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="title">Mes voyages</ThemedText>
        <ThemedText style={styles.stats}>
          {trips.length} voyages · {cities.length} villes · {visitedCountries.length} pays
        </ThemedText>

        {trips.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onRemove={() => removeTrip(trip.id)}
            onAddStop={(stop) => addStop(trip.id, stop)}
            onRemoveStop={(stopId) => removeStop(trip.id, stopId)}
          />
        ))}

        <View style={styles.newTrip}>
          <TextInput
            value={newTripName}
            onChangeText={setNewTripName}
            placeholder="Nom du nouveau voyage"
            placeholderTextColor="#8a8f98"
            style={styles.input}
            onSubmitEditing={() => {
              if (newTripName.trim()) {
                addTrip(newTripName);
                setNewTripName('');
              }
            }}
          />
          <Pressable
            style={styles.addBtn}
            onPress={() => {
              addTrip(newTripName);
              setNewTripName('');
            }}>
            <ThemedText style={styles.addBtnText}>+ Voyage</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TripCard({
  trip,
  onRemove,
  onAddStop,
  onRemoveStop,
}: {
  trip: Trip;
  onRemove: () => void;
  onAddStop: (stop: Omit<TripStop, 'id'>) => void;
  onRemoveStop: (stopId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setSearched(true);
    setResults(await searchCity(query));
    setSearching(false);
  };

  const pick = (r: GeoResult) => {
    onAddStop({
      name: r.name,
      country: r.country,
      alpha2: r.alpha2,
      countryName: r.countryName,
      lat: r.lat,
      lng: r.lng,
    });
    setQuery('');
    setResults([]);
    setSearched(false);
    setAdding(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <View style={[styles.dot, { backgroundColor: trip.color || '#ffd166' }]} />
          <ThemedText type="subtitle">{trip.name}</ThemedText>
        </View>
        <Pressable onPress={onRemove} hitSlop={8}>
          <ThemedText style={styles.remove}>✕</ThemedText>
        </Pressable>
      </View>

      {trip.stops.length === 0 ? (
        <ThemedText style={styles.empty}>Aucune étape.</ThemedText>
      ) : (
        trip.stops.map((stop, i) => (
          <View key={stop.id} style={styles.stopRow}>
            <ThemedText>
              {i + 1}. {flagEmoji(stop.alpha2)}  {stop.name}
            </ThemedText>
            <Pressable onPress={() => onRemoveStop(stop.id)} hitSlop={8}>
              <ThemedText style={styles.remove}>✕</ThemedText>
            </Pressable>
          </View>
        ))
      )}

      {adding ? (
        <View style={styles.addStop}>
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher une ville…"
              placeholderTextColor="#8a8f98"
              style={styles.input}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={runSearch}
            />
            <Pressable style={styles.addBtn} onPress={runSearch}>
              <ThemedText style={styles.addBtnText}>Rechercher</ThemedText>
            </Pressable>
          </View>

          {searching && <ActivityIndicator style={styles.searchState} />}
          {!searching && searched && results.length === 0 && (
            <ThemedText style={styles.searchState}>Aucune ville trouvée.</ThemedText>
          )}
          {results.map((r, idx) => (
            <Pressable key={`${r.lat},${r.lng},${idx}`} style={styles.result} onPress={() => pick(r)}>
              <ThemedText>
                {flagEmoji(r.alpha2)}  {r.name}
              </ThemedText>
              <ThemedText style={styles.resultSub}>
                {[r.admin1, r.countryName].filter(Boolean).join(', ')}
              </ThemedText>
            </Pressable>
          ))}

          <Pressable
            onPress={() => {
              setAdding(false);
              setQuery('');
              setResults([]);
              setSearched(false);
            }}>
            <ThemedText style={styles.cancel}>Annuler</ThemedText>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setAdding(true)} style={styles.addStopTrigger}>
          <ThemedText style={styles.addStopTriggerText}>+ Ajouter une étape</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 4, paddingBottom: 48 },
  stats: { opacity: 0.7, marginBottom: 12 },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    backgroundColor: 'rgba(127, 127, 127, 0.10)',
    gap: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  remove: { color: '#ef476f', fontWeight: '700', fontSize: 16 },
  empty: { opacity: 0.6, paddingVertical: 4 },
  stopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  addStopTrigger: { paddingVertical: 8 },
  addStopTriggerText: { color: '#118ab2', fontWeight: '600' },
  addStop: { gap: 10, marginTop: 6 },
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  searchState: { paddingVertical: 6, opacity: 0.7 },
  result: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(127, 127, 127, 0.12)',
  },
  resultSub: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  cancel: { opacity: 0.7, paddingVertical: 4 },
  newTrip: { flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8a8f98',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#888',
  },
  addBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#118ab2',
  },
  addBtnText: { color: '#fff', fontWeight: '700' },
});
