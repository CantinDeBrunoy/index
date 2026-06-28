import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { alpha3ToAlpha2, flagEmoji } from '@/data/isoCodes';
import { GlobeView } from '@/features/globe/GlobeView';
import { useTrips } from '@/features/trips/store';
import type { Trip } from '@/features/trips/types';

type SelectedCountry = { iso: string; name: string; lat: number | null; lng: number | null };

export default function GlobeScreen() {
  const { visitedCountries, cities, trips } = useTrips();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [country, setCountry] = useState<SelectedCountry | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number; altitude?: number } | null>(null);
  const [replay, setReplay] = useState<{ tripId: string; key: number } | null>(null);

  // Panneau à droite : ~40 % sur grand écran (plafonné), plus large en proportion
  // sur écran étroit pour rester lisible.
  const panelWidth = width < 560 ? Math.round(width * 0.6) : Math.min(440, width * 0.4);

  const tripsHere = useMemo(
    () => (country ? trips.filter((t) => t.stops.some((s) => s.country === country.iso)) : []),
    [country, trips],
  );
  const selectedTrip = tripId ? trips.find((t) => t.id === tripId) : null;

  const onCountryPress = (iso: string, name: string, lat: number | null, lng: number | null) => {
    setCountry({ iso, name, lat, lng });
    setTripId(null);
    // Centre la caméra sur le pays cliqué (le globe rétrécit à gauche).
    if (lat != null && lng != null) setFocus({ lat, lng, altitude: 1.1 });
  };

  const openTrip = (t: Trip) => {
    setTripId(t.id);
    if (t.stops.length) {
      const lat = t.stops.reduce((a, s) => a + s.lat, 0) / t.stops.length;
      const lng = t.stops.reduce((a, s) => a + s.lng, 0) / t.stops.length;
      setFocus({ lat, lng, altitude: 0.55 });
    }
  };

  const close = () => {
    setCountry(null);
    setTripId(null);
    setFocus(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.globeWrap}>
        <GlobeView
          visitedCountries={visitedCountries}
          trips={trips}
          focus={focus}
          paused={country !== null}
          replay={replay}
          onCountryPress={onCountryPress}
          onFlagPress={(stopId) => router.push(`/stop/${stopId}`)}
        />
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>
            {trips.length} voyages · {cities.length} villes · {visitedCountries.length} pays
          </ThemedText>
        </View>
      </View>

      {country && (
        <View style={[styles.panel, { width: panelWidth }]}>
          <View style={styles.panelHeader}>
            {selectedTrip ? (
              <Pressable onPress={() => setTripId(null)} hitSlop={8}>
                <ThemedText style={styles.back}>‹ {country.name}</ThemedText>
              </Pressable>
            ) : (
              <ThemedText type="subtitle" numberOfLines={1} style={styles.headerTitle}>
                {flagEmoji(alpha3ToAlpha2(country.iso))}  {country.name}
              </ThemedText>
            )}
            <Pressable onPress={close} hitSlop={8}>
              <ThemedText style={styles.close}>✕</ThemedText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.panelContent}>
            {selectedTrip ? (
              <>
                <View style={styles.tripTitle}>
                  <View style={[styles.dot, { backgroundColor: selectedTrip.color || '#ffd166' }]} />
                  <ThemedText type="defaultSemiBold">{selectedTrip.name}</ThemedText>
                </View>
                <Pressable
                  style={styles.detailBtn}
                  onPress={() => router.push(`/trip/${selectedTrip.id}`)}>
                  <ThemedText style={styles.detailBtnText}>📌 Ouvrir la fiche du voyage</ThemedText>
                </Pressable>
                {selectedTrip.stops.length > 1 ? (
                  <Pressable
                    style={styles.replayBtn}
                    onPress={() => setReplay({ tripId: selectedTrip.id, key: Date.now() })}>
                    <ThemedText style={styles.replayBtnText}>▶ Rejouer l’itinéraire</ThemedText>
                  </Pressable>
                ) : null}
                {selectedTrip.stops.map((s, i) => (
                  <Pressable key={s.id} onPress={() => router.push(`/stop/${s.id}`)} style={styles.stopRow2}>
                    <ThemedText style={styles.stop}>
                      {i + 1}. {flagEmoji(s.alpha2)}  {s.name}
                    </ThemedText>
                    <ThemedText style={styles.chev}>›</ThemedText>
                  </Pressable>
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
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#0b1026' },
  globeWrap: { flex: 1 },
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
    backgroundColor: '#11162a',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 24,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: { flex: 1, marginRight: 8 },
  back: { color: '#7cc7ff', fontWeight: '600', fontSize: 16 },
  close: { color: '#fff', fontWeight: '700', fontSize: 18 },
  panelContent: { gap: 6, paddingBottom: 8 },
  tripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tripTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  count: { color: '#7cc7ff' },
  stop: { color: '#e6e9f0', paddingVertical: 5 },
  stopRow2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chev: { color: '#7cc7ff', fontSize: 16 },
  detailBtn: {
    backgroundColor: 'rgba(124, 199, 255, 0.15)',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginVertical: 6,
    alignItems: 'center',
  },
  detailBtnText: { color: '#7cc7ff', fontWeight: '700' },
  replayBtn: {
    backgroundColor: 'rgba(46, 160, 67, 0.18)',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 6,
    alignItems: 'center',
  },
  replayBtnText: { color: '#5fd07a', fontWeight: '700' },
  empty: { color: '#aeb4c0', paddingVertical: 6 },
});
