import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { COUNTRIES, countryFlag, countryName } from '@/data/countries';
import { useTrips } from '@/features/trips/store';
import type { Trip } from '@/features/trips/types';

export default function VoyagesScreen() {
  const { trips, cities, visitedCountries, addTrip, removeTrip, addStop, removeStop } = useTrips();
  const [newTripName, setNewTripName] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
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
  onAddStop: (stop: { name: string; country: string; lat: number; lng: number }) => void;
  onRemoveStop: (stopId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [cityName, setCityName] = useState('');
  const [country, setCountry] = useState<string | null>(null);

  const countryCodes = useMemo(
    () => Object.keys(COUNTRIES).sort((a, b) => countryName(a).localeCompare(countryName(b))),
    [],
  );

  const submit = () => {
    if (!country) return;
    const info = COUNTRIES[country];
    onAddStop({
      name: cityName.trim() || countryName(country),
      country,
      // Coordonnées = centre du pays pour l'instant (recherche de ville précise en Phase 5).
      lat: info.lat,
      lng: info.lng,
    });
    setCityName('');
    setCountry(null);
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
              {i + 1}. {countryFlag(stop.country)}  {stop.name}
            </ThemedText>
            <Pressable onPress={() => onRemoveStop(stop.id)} hitSlop={8}>
              <ThemedText style={styles.remove}>✕</ThemedText>
            </Pressable>
          </View>
        ))
      )}

      {adding ? (
        <View style={styles.addStop}>
          <TextInput
            value={cityName}
            onChangeText={setCityName}
            placeholder="Nom de la ville"
            placeholderTextColor="#8a8f98"
            style={styles.input}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {countryCodes.map((code) => (
              <Pressable
                key={code}
                onPress={() => setCountry(code)}
                style={[styles.chip, country === code && styles.chipActive]}>
                <ThemedText style={styles.chipText}>
                  {countryFlag(code)} {countryName(code)}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.addStopActions}>
            <Pressable onPress={() => setAdding(false)}>
              <ThemedText style={styles.cancel}>Annuler</ThemedText>
            </Pressable>
            <Pressable style={[styles.addBtn, !country && styles.addBtnDisabled]} onPress={submit}>
              <ThemedText style={styles.addBtnText}>Ajouter l’étape</ThemedText>
            </Pressable>
          </View>
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
  chips: { flexGrow: 0 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginRight: 8,
    backgroundColor: 'rgba(127, 127, 127, 0.15)',
  },
  chipActive: { backgroundColor: 'rgba(46, 160, 67, 0.30)' },
  chipText: { fontSize: 13 },
  addStopActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16 },
  cancel: { opacity: 0.7 },
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
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontWeight: '700' },
});
