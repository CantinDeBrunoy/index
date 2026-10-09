import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  FONT,
  KraftLabel,
  StatPostits,
  WoodButton,
  WoodPage,
  useWoodLayout,
} from '@/features/detail/WoodKit';
import { tripWhen } from '@/features/trips/dates';
import { syncLabel, useTrips } from '@/features/trips/store';
import type { Trip } from '@/features/trips/types';
import { TripCard } from '@/features/voyages/TripCard';

type Filter = 'all' | 'road' | 'city';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'road', label: 'Road trips' },
  { key: 'city', label: 'Une ville' },
];

const GAP = 22;
/** Largeur minimale d'une fiche en mise en page large (2 à 4 colonnes). */
const MIN_CARD = 280;
const TILTS = [-0.6, 0.5, -0.4, 0.6, -0.5, 0.4];

function matches(trip: Trip, filter: Filter): boolean {
  if (filter === 'road') return trip.stops.length > 1;
  if (filter === 'city') return trip.stops.length === 1;
  return true;
}

/**
 * Boîte à fiches : voyages à compléter (sans étape) d'abord, puis par année, du plus
 * récent au plus ancien, et enfin les voyages sans date.
 */
function sections(trips: Trip[], filter: Filter): { key: string; title: string; trips: Trip[] }[] {
  const kept = trips.filter((t) => matches(t, filter));
  const drafts = kept.filter((t) => t.stops.length === 0);
  const years = new Map<number, { trip: Trip; start: number }[]>();
  const undated: Trip[] = [];
  for (const trip of kept) {
    if (trip.stops.length === 0) continue;
    const when = tripWhen(trip);
    if (when.year == null || when.start == null) undated.push(trip);
    else years.set(when.year, [...(years.get(when.year) ?? []), { trip, start: when.start }]);
  }
  return [
    ...(drafts.length ? [{ key: 'drafts', title: 'À compléter', trips: drafts }] : []),
    ...[...years.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, list]) => ({
        key: String(year),
        title: String(year),
        trips: list.sort((a, b) => b.start - a.start).map((x) => x.trip),
      })),
    ...(undated.length ? [{ key: 'undated', title: 'Sans date', trips: undated }] : []),
  ];
}

export default function VoyagesScreen() {
  const router = useRouter();
  const { trips, cities, visitedCountries, addTrip, removeTrip, addStop, removeStop, sync } = useTrips();
  const { wide, contentWidth } = useWoodLayout();
  const [filter, setFilter] = useState<Filter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const cols = wide ? Math.max(2, Math.min(4, Math.floor((contentWidth + GAP) / (MIN_CARD + GAP)))) : 1;
  const colW = (contentWidth - GAP * (cols - 1)) / cols;
  // Une fiche ouverte en édition prend deux colonnes en mise en page large.
  const editW = cols > 1 ? Math.min(2 * colW + GAP, contentWidth) : contentWidth;

  const create = (name: string) => {
    const id = addTrip(name);
    setCreating(false);
    setFilter('all');
    setEditingId(id);
  };

  const stats = [
    { value: String(trips.length), label: 'voyages' },
    { value: String(cities.length), label: 'villes' },
    { value: String(visitedCountries.length), label: 'pays' },
  ];
  const actions = (
    <View style={[styles.actions, wide && styles.actionsWide]}>
      <WoodButton label="Nouveau voyage" icon="add" onPress={() => setCreating(true)} />
      {/* L'import lit un dossier du PC (iCloud pour Windows) : version web uniquement. */}
      {Platform.OS === 'web' ? (
        <WoodButton label="Importer mes photos" icon="images-outline" light onPress={() => router.push('/photos')} />
      ) : null}
    </View>
  );

  return (
    <WoodPage back={false}>
      {wide ? (
        <View style={styles.headerWide}>
          <View style={styles.labelWide}>
            <KraftLabel big eyebrow="Magellan" title="Mes voyages" subtitle={syncLabel(sync)} />
          </View>
          <StatPostits items={stats} width={contentWidth} big />
          {actions}
        </View>
      ) : (
        <>
          <KraftLabel eyebrow="Magellan" title="Mes voyages" subtitle={syncLabel(sync)} />
          <StatPostits items={stats} width={contentWidth} />
          {actions}
        </>
      )}

      <View style={styles.tabs}>
        {FILTERS.map((f) => {
          const count = trips.filter((t) => matches(t, f.key)).length;
          const selected = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.tab, selected && styles.tabOn]}>
              <Text style={[styles.tabText, selected && styles.tabTextOn]}>{`${f.label} · ${count}`}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.tabLine} />

      {creating ? <NewTripCard width={cols > 1 ? editW : contentWidth} onCreate={create} onCancel={() => setCreating(false)} /> : null}

      {sections(trips, filter).map((section) => (
        <View key={section.key}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.grid}>
            {section.trips.map((trip, i) => (
              <TripCard
                key={trip.id}
                trip={trip}
                width={editingId === trip.id ? editW : colW}
                tall={cols > 1}
                tilt={TILTS[i % TILTS.length]}
                editing={editingId === trip.id}
                onOpen={() => router.push(`/trip/${trip.id}`)}
                onEdit={() => setEditingId(trip.id)}
                onDone={() => setEditingId(null)}
                onRemoveTrip={() => {
                  setEditingId(null);
                  removeTrip(trip.id);
                }}
                onAddStop={(stop) => addStop(trip.id, stop)}
                onRemoveStop={(stopId) => removeStop(trip.id, stopId)}
              />
            ))}
          </View>
        </View>
      ))}
      {trips.filter((t) => matches(t, filter)).length === 0 ? (
        <Text style={styles.empty}>Aucun voyage ici pour l’instant.</Text>
      ) : null}
    </WoodPage>
  );
}

/** Fiche vierge pour nommer un nouveau voyage ; ses étapes s'ajoutent ensuite. */
function NewTripCard({
  width,
  onCreate,
  onCancel,
}: {
  width: number;
  onCreate: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const submit = () => {
    if (name.trim()) onCreate(name.trim());
  };
  return (
    <View style={[styles.newCard, { width }]}>
      <Text style={styles.newLabel}>Nouveau voyage</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        onSubmitEditing={submit}
        placeholder="Son nom (ex. Japon, Week-end à Lyon…)"
        placeholderTextColor="#9aa7c7"
        autoFocus
        returnKeyType="done"
        accessibilityLabel="Nom du nouveau voyage"
        style={styles.newInput}
      />
      <View style={styles.newActions}>
        <WoodButton label="Créer" icon="checkmark" onPress={submit} disabled={!name.trim()} />
        <WoodButton label="Annuler" light onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWide: { flexDirection: 'row', alignItems: 'flex-end', gap: 40, flexWrap: 'wrap' },
  labelWide: { width: 420 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 22 },
  actionsWide: { flexDirection: 'column', marginTop: 0, marginLeft: 'auto', paddingBottom: 6 },

  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 28 },
  tab: {
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 14,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: 'rgba(245, 235, 205, 0.55)',
  },
  tabOn: { backgroundColor: '#fffdf6' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#3b2414' },
  tabTextOn: { fontWeight: '700', color: '#2a2320' },
  tabLine: { height: 4, backgroundColor: '#fffdf6', opacity: 0.9 },

  sectionTitle: { fontFamily: FONT.marker, fontSize: 23, color: '#f3e6c8', marginTop: 24, marginBottom: 12, marginLeft: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, alignItems: 'flex-start' },
  empty: { fontFamily: FONT.hand, fontSize: 22, color: '#f3e6c8', marginTop: 24 },

  newCard: {
    marginTop: 24,
    backgroundColor: '#fffdf6',
    padding: 16,
    boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.18), 0px 10px 14px -8px rgba(0, 0, 0, 0.6)',
  },
  newLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#8a6d3b' },
  newInput: {
    marginTop: 6,
    fontFamily: FONT.handBold,
    fontSize: 24,
    color: '#1f3a8a',
    borderBottomWidth: 2,
    borderBottomColor: '#1f3a8a',
    paddingVertical: 4,
  },
  newActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
});
