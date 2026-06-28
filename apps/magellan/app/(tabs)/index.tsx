import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { alpha3ToAlpha2, flagEmoji } from '@/data/isoCodes';
import { GlobeView } from '@/features/globe/GlobeView';
import { useTrips } from '@/features/trips/store';
import type { Trip } from '@/features/trips/types';

type SelectedCountry = { iso: string; name: string };

export default function GlobeScreen() {
  const { visitedCountries, cities, trips } = useTrips();
  const [country, setCountry] = useState<SelectedCountry | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);

  const tripsHere = useMemo(
    () => (country ? trips.filter((t) => t.stops.some((s) => s.country === country.iso)) : []),
    [country, trips],
  );
  const selectedTrip = tripId ? trips.find((t) => t.id === tripId) : null;

  const openTrip = (t: Trip) => {
    setTripId(t.id);
    if (t.stops.length) {
      const lat = t.stops.reduce((a, s) => a + s.lat, 0) / t.stops.length;
      const lng = t.stops.reduce((a, s) => a + s.lng, 0) / t.stops.length;
      setFocus({ lat, lng });
    }
  };

  const close = () => {
    setCountry(null);
    setTripId(null);
  };

  return (
    <View style={styles.container}>
      <GlobeView
        visitedCountries={visitedCountries}
        trips={trips}
        focus={focus}
        onCountryPress={(iso, name) => {
          setCountry({ iso, name });
          setTripId(null);
        }}
      />

      <View style={styles.badge}>
        <ThemedText style={styles.badgeText}>
          {trips.length} voyages · {cities.length} villes · {visitedCountries.length} pays
        </ThemedText>
      </View>

      {country && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            {selectedTrip ? (
              <Pressable onPress={() => setTripId(null)} hitSlop={8}>
                <ThemedText style={styles.back}>‹ {country.name}</ThemedText>
              </Pressable>
            ) : (
              <ThemedText type="subtitle">
                {flagEmoji(alpha3ToAlpha2(country.iso))}  {country.name}
              </ThemedText>
            )}
            <Pressable onPress={close} hitSlop={8}>
              <ThemedText style={styles.close}>✕</ThemedText>
            </Pressable>
          </View>

          <ScrollView style={styles.panelBody} contentContainerStyle={styles.panelContent}>
            {selectedTrip ? (
              <>
                <View style={styles.tripTitle}>
                  <View style={[styles.dot, { backgroundColor: selectedTrip.color || '#ffd166' }]} />
                  <ThemedText type="defaultSemiBold">{selectedTrip.name}</ThemedText>
                </View>
                {selectedTrip.stops.map((s, i) => (
                  <ThemedText key={s.id} style={styles.stop}>
                    {i + 1}. {flagEmoji(s.alpha2)}  {s.name}
                  </ThemedText>
                ))}
              </>
            ) : tripsHere.length === 0 ? (
              <ThemedText style={styles.empty}>Aucun voyage dans ce pays.</ThemedText>
            ) : (
              tripsHere.map((t) => {
                const here = t.stops.filter((s) => s.country === country.iso).length;
                return (
                  <Pressable key={t.id} style={styles.tripRow} onPress={() => openTrip(t)}>
                    <View style={styles.tripTitle}>
                      <View style={[styles.dot, { backgroundColor: t.color || '#ffd166' }]} />
                      <ThemedText>{t.name}</ThemedText>
                    </View>
                    <ThemedText style={styles.count}>
                      {here} étape{here > 1 ? 's' : ''} ›
                    </ThemedText>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
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
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '50%',
    backgroundColor: '#11162a',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  back: { color: '#7cc7ff', fontWeight: '600', fontSize: 16 },
  close: { color: '#fff', fontWeight: '700', fontSize: 18 },
  panelBody: { flexGrow: 0 },
  panelContent: { gap: 6, paddingBottom: 8 },
  tripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  tripTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  count: { color: '#7cc7ff' },
  stop: { color: '#e6e9f0', paddingVertical: 4 },
  empty: { color: '#aeb4c0', paddingVertical: 6 },
});
