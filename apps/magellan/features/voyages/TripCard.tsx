// Fiche bristol d'un voyage dans la « boîte à fiches » de l'onglet Voyages.
//
// - Consultation : nom, quand, itinéraire manuscrit, tampons des pays, chiffres ;
//   toucher la fiche ouvre celle du voyage, le crayon passe en édition.
// - Édition : étapes (retirer), recherche d'une ville à ajouter, suppression du
//   voyage (confirmée).

import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FONT, euros, postitColor } from '@/features/detail/WoodKit';
import { budgetTotal, tripBudget, tripCountries, tripDays } from '@/features/trips/aggregates';
import { tripWhen } from '@/features/trips/dates';
import { searchCity, type GeoResult } from '@/features/trips/geocode';
import type { Trip, TripStop } from '@/features/trips/types';

const INK = '#2a2320';
const MUTED = '#5f5446';
const PEN = '#1f3a8a';
const RED = '#b3261e';
const LINE = 26;
/** Hauteur de la ligne de titre, au-dessus du trait rouge de la fiche. */
const HEAD = 40;

/** « Beijing → Xi'an → … → Séoul » : les deux premières étapes et la dernière. */
function itinerary(trip: Trip): string {
  const names = trip.stops.map((s) => s.name);
  if (names.length <= 3) return names.join(' → ');
  return `${names[0]} → ${names[1]} → … → ${names[names.length - 1]}`;
}

function details(trip: Trip): string {
  const days = tripDays(trip);
  const total = budgetTotal(tripBudget(trip));
  return [
    trip.stops.length === 1 ? 'une ville' : `${trip.stops.length} étapes`,
    days ? `${days} j` : null,
    total ? euros(total) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function TripCard({
  trip,
  width,
  tall,
  tilt,
  editing,
  onOpen,
  onEdit,
  onDone,
  onRemoveTrip,
  onAddStop,
  onRemoveStop,
}: {
  trip: Trip;
  width: number;
  /** Hauteur minimale commune, pour aligner les rangées d'une grille. */
  tall?: boolean;
  /** Inclinaison en degrés, pour que les fiches ne soient pas alignées au cordeau. */
  tilt: number;
  editing: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDone: () => void;
  onRemoveTrip: () => void;
  onAddStop: (stop: Omit<TripStop, 'id'>) => void;
  onRemoveStop: (stopId: string) => void;
}) {
  const when = tripWhen(trip);
  const color = trip.color || '#ffd166';

  // Papier ligné, dans un calque à part qui coupe les lignes : la fiche elle-même
  // ne masque rien, sinon le navigateur fait défiler son contenu quand le champ de
  // recherche prend le focus.
  const decor = (
    <View style={styles.paper}>
      <View style={[styles.band, { backgroundColor: color }]} />
      <View style={styles.redLine} />
      {Array.from({ length: 16 }, (_, i) => (
        <View key={i} style={[styles.blueLine, { top: HEAD + LINE * (i + 1) }]} />
      ))}
    </View>
  );

  if (editing) {
    return (
      <View style={[styles.card, { width }]}>
        {decor}
        <View style={styles.head}>
          <Text numberOfLines={1} style={styles.name}>
            {trip.name}
          </Text>
          <Pressable onPress={onDone} hitSlop={8} accessibilityRole="button" style={styles.doneBtn}>
            <Text style={styles.done}>Terminé</Text>
          </Pressable>
        </View>
        <EditBody trip={trip} onAddStop={onAddStop} onRemoveStop={onRemoveStop} onRemoveTrip={onRemoveTrip} />
      </View>
    );
  }

  const countries = tripCountries(trip);
  // La fiche et le crayon sont deux boutons voisins, pas imbriqués (interdit en HTML).
  return (
    <View style={[styles.card, tall && styles.tall, { width, transform: [{ rotate: `${tilt}deg` }] }]}>
      {decor}
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir la fiche du voyage ${trip.name}`}
        style={({ pressed }) => [styles.openArea, pressed && styles.pressed]}>
        <View style={[styles.head, styles.headRoom]}>
          <Text numberOfLines={1} style={styles.name}>
            {trip.name}
          </Text>
          {when.label ? <Text style={styles.when}>{when.label}</Text> : null}
        </View>
        {trip.stops.length === 0 ? (
          <Text style={styles.meta}>Aucune étape pour l’instant — le crayon permet d’en ajouter.</Text>
        ) : (
          <>
            {trip.stops.length > 1 ? (
              <Text numberOfLines={1} style={styles.route}>
                {itinerary(trip)}
              </Text>
            ) : null}
            <View style={styles.stampRow}>
              {countries.map((c, i) => (
                <View key={c.country} style={[styles.stamp, { borderColor: postitColor(i).ink }]}>
                  <Text style={[styles.stampText, { color: postitColor(i).ink }]}>
                    {(c.countryName || c.country).toUpperCase()}
                  </Text>
                </View>
              ))}
              <Text style={styles.meta}>{details(trip)}</Text>
            </View>
          </>
        )}
      </Pressable>
      <Pressable
        onPress={onEdit}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Modifier le voyage ${trip.name}`}
        style={styles.editBtn}>
        <Ionicons name="pencil" size={16} color={MUTED} />
      </Pressable>
    </View>
  );
}

function EditBody({
  trip,
  onAddStop,
  onRemoveStop,
  onRemoveTrip,
}: {
  trip: Trip;
  onAddStop: (stop: Omit<TripStop, 'id'>) => void;
  onRemoveStop: (stopId: string) => void;
  onRemoveTrip: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const search = async () => {
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
  };

  return (
    <>
      {trip.stops.map((s, i) => (
        <View key={s.id} style={styles.stopRow}>
          <Text style={styles.stopIndex}>{i + 1}</Text>
          <Text numberOfLines={1} style={styles.stopName}>
            {s.name}
          </Text>
          <Pressable
            onPress={() => onRemoveStop(s.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Retirer ${s.name}`}
            style={styles.removeBtn}>
            <Ionicons name="close" size={18} color={RED} />
          </Pressable>
        </View>
      ))}

      <Text style={styles.label}>Ajouter une étape</Text>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          placeholder="Une ville…"
          placeholderTextColor="#9aa7c7"
          returnKeyType="search"
          accessibilityLabel="Rechercher une ville à ajouter"
          style={styles.input}
        />
        <Pressable onPress={search} hitSlop={8} accessibilityRole="button" accessibilityLabel="Rechercher">
          <Ionicons name="search" size={20} color={PEN} />
        </Pressable>
      </View>
      {searching ? <ActivityIndicator color={PEN} style={styles.searchState} /> : null}
      {!searching && searched && results.length === 0 ? (
        <Text style={styles.searchState}>Aucune ville trouvée.</Text>
      ) : null}
      {results.length > 0 ? (
        <View style={styles.results}>
          {results.map((r, i) => (
            <Pressable
              key={`${r.lat},${r.lng},${i}`}
              onPress={() => pick(r)}
              accessibilityRole="button"
              style={[styles.result, i < results.length - 1 && styles.resultSep]}>
              <Text style={styles.resultName}>{r.name}</Text>
              <Text style={styles.resultWhere}>{`  ·  ${[r.admin1, r.countryName].filter(Boolean).join(', ')}`}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {confirmDelete ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>{`Supprimer « ${trip.name} » et ses étapes ?`}</Text>
          <Pressable onPress={onRemoveTrip} accessibilityRole="button" style={styles.confirmBtn}>
            <Text style={styles.deleteText}>Supprimer</Text>
          </Pressable>
          <Pressable onPress={() => setConfirmDelete(false)} accessibilityRole="button" style={styles.confirmBtn}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setConfirmDelete(true)} accessibilityRole="button" style={styles.deleteBtn}>
          <Text style={styles.deleteText}>Supprimer ce voyage</Text>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fffdf6',
    paddingLeft: 22,
    paddingRight: 14,
    paddingBottom: 12,
    boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.18), 0px 10px 14px -8px rgba(0, 0, 0, 0.6)',
  },
  tall: { minHeight: 132 },
  paper: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', pointerEvents: 'none' },
  band: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7 },
  redLine: { position: 'absolute', left: 0, right: 0, top: HEAD, height: 2, backgroundColor: 'rgba(214, 69, 65, 0.5)' },
  blueLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(90, 140, 200, 0.22)' },

  head: { flexDirection: 'row', alignItems: 'center', gap: 8, height: HEAD, marginBottom: 4 },
  name: { fontFamily: FONT.marker, fontSize: 22, color: INK, flexShrink: 1 },
  when: { fontFamily: FONT.hand, fontSize: 19, color: MUTED, marginLeft: 'auto' },
  openArea: { flexGrow: 1 },
  pressed: { opacity: 0.85 },
  headRoom: { paddingRight: 30 },
  editBtn: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: { marginLeft: 'auto', minHeight: 36, justifyContent: 'center' },
  done: { fontFamily: FONT.handBold, fontSize: 21, color: '#2c5418' },

  route: { fontFamily: FONT.hand, fontSize: 19, lineHeight: LINE, color: PEN },
  stampRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  stamp: { borderWidth: 2, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 },
  stampText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  meta: { fontSize: 13, color: MUTED },

  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: LINE },
  stopIndex: { fontFamily: FONT.marker, fontSize: 13, color: '#8a6d3b', width: 16 },
  stopName: { fontFamily: FONT.handBold, fontSize: 21, color: INK, flex: 1 },
  removeBtn: { width: 32, height: LINE, alignItems: 'center', justifyContent: 'center' },

  label: {
    marginTop: 12,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#8a6d3b',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    borderBottomWidth: 2,
    borderBottomColor: PEN,
  },
  input: { flex: 1, fontFamily: FONT.handBold, fontSize: 22, color: PEN, paddingVertical: 4, minWidth: 0 },
  searchState: { marginTop: 8, fontSize: 13, color: MUTED },
  results: {
    marginTop: 10,
    backgroundColor: '#ffe680',
    paddingHorizontal: 10,
    transform: [{ rotate: '-0.8deg' }],
    boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.18), 0px 8px 12px -8px rgba(0, 0, 0, 0.55)',
  },
  result: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', minHeight: 44, paddingVertical: 8 },
  resultSep: { borderBottomWidth: 1, borderBottomColor: 'rgba(92, 74, 20, 0.3)', borderStyle: 'dashed' },
  resultName: { fontFamily: FONT.handBold, fontSize: 21, color: INK },
  resultWhere: { fontSize: 12, color: '#5c4a14' },

  deleteBtn: { alignSelf: 'flex-start', marginTop: 12, minHeight: 36, justifyContent: 'center' },
  deleteText: { fontSize: 13, fontWeight: '700', color: RED },
  confirm: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 12 },
  confirmText: { fontSize: 13, color: INK, flexBasis: '100%' },
  confirmBtn: { minHeight: 36, justifyContent: 'center' },
  cancelText: { fontSize: 13, fontWeight: '700', color: MUTED },
});
