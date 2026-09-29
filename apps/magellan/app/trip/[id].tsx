import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { euros } from '@/features/detail/DetailKit';
import {
  KraftLabel,
  NameTags,
  Notepad,
  Postcard,
  StatPostits,
  StopBoard,
  TapeTitle,
  WoodPage,
  postitColor,
  useWoodLayout,
  type BoardStop,
} from '@/features/detail/WoodKit';
import {
  budgetTotal,
  peopleLabel,
  tripBudget,
  tripCountries,
  tripDays,
  tripPeople,
} from '@/features/trips/aggregates';
import { useTrips } from '@/features/trips/store';

/** Largeur de la colonne budget / participants en mise en page large. */
const SIDE_W = 372;
const GAP = 56;

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { trips } = useTrips();
  const { wide, contentWidth } = useWoodLayout();

  const trip = trips.find((t) => t.id === id);
  if (!trip) {
    return (
      <WoodPage>
        <KraftLabel
          eyebrow="Oups"
          title="Voyage introuvable"
          subtitle="Ce voyage n’existe plus. Reviens en arrière pour en choisir un autre."
        />
      </WoodPage>
    );
  }

  // Un voyage à une seule ville n'a pas d'itinéraire : une carte postale le remplace.
  const solo = trip.stops.length === 1;
  const color = trip.color || '#ffd166';
  const budget = tripBudget(trip);
  const total = budgetTotal(budget);
  const days = tripDays(trip);
  const names = tripPeople(trip).map((p) => peopleLabel([p]));
  const countries = tripCountries(trip);

  // Un pays = une couleur de post-it, reprise par son tampon dans l'en-tête.
  const countryColor = (code: string) => postitColor(countries.findIndex((c) => c.country === code));
  const stamps = countries.map((c) => ({
    label: c.countryName || c.country,
    ink: countryColor(c.country).ink,
  }));

  // Période du voyage : dates de la première et de la dernière étape qui en portent une.
  const dated = trip.stops.filter((s) => s.date);
  const period =
    dated.length === 0
      ? undefined
      : dated.length === 1 || dated[0].date === dated[dated.length - 1].date
        ? dated[0].date
        : `${dated[0].date} → ${dated[dated.length - 1].date}`;

  // « 1 étape · 1 pays » ne dit rien d'un voyage à une ville : on ne garde que le reste.
  const stats: { value: string; label: string }[] = [];
  if (!solo) {
    stats.push({ value: String(trip.stops.length), label: 'étapes' });
    stats.push({ value: String(countries.length), label: 'pays' });
  }
  if (days) stats.push({ value: String(days), label: days > 1 ? 'jours' : 'jour' });
  if (total) stats.push({ value: euros(total), label: 'budget' });

  const boardStops: BoardStop[] = trip.stops.map((s, i) => ({
    key: s.id,
    index: i + 1,
    title: s.name,
    date: s.date,
    meta: [s.countryName, s.days ? `${s.days} j` : null, s.budget ? euros(budgetTotal(s.budget)) : null]
      .filter(Boolean)
      .join(' · '),
    color: countryColor(s.country),
    onPress: () => router.push(`/stop/${s.id}`),
  }));

  const header = (
    <KraftLabel
      big={wide}
      eyebrow={solo ? 'Voyage · une ville' : 'Voyage'}
      title={trip.name}
      subtitle={period}
      stamps={stamps}
    />
  );
  const statsBlock =
    stats.length > 0 ? <StatPostits items={stats} width={contentWidth} big={wide} /> : null;
  const budgetBlock =
    total > 0 ? (
      <Notepad
        title="Budget"
        total={total}
        rows={[
          { label: 'Hôtel', value: budget.hotel },
          { label: 'Nourriture', value: budget.food },
          { label: 'Activités', value: budget.activities },
          { label: 'Transport', value: budget.transport },
        ]}
      />
    ) : null;
  const peopleBlock = names.length > 0 ? <NameTags title="Avec qui" names={names} /> : null;

  // — Voyage à une seule ville —
  if (solo) {
    const stop = trip.stops[0];
    const cardInline = wide && contentWidth - 520 - GAP >= 420;
    const card = (
      <Postcard
        city={stop.name}
        color={color}
        width={cardInline ? Math.min(720, contentWidth - 520 - GAP) : Math.min(wide ? 720 : 360, contentWidth - 20)}
        onPress={() => router.push(`/stop/${stop.id}`)}
      />
    );

    if (!wide) {
      return (
        <WoodPage>
          {header}
          {card}
          {statsBlock}
          {budgetBlock}
          {peopleBlock}
        </WoodPage>
      );
    }
    return (
      <WoodPage>
        <View style={[styles.row, !cardInline && styles.column]}>
          <View style={styles.soloLeft}>
            {header}
            {statsBlock ? <View style={styles.statsBelow}>{statsBlock}</View> : null}
            {budgetBlock ? <View style={styles.notepadNarrow}>{budgetBlock}</View> : null}
          </View>
          <View style={styles.flex}>
            {card}
            {peopleBlock}
          </View>
        </View>
      </WoodPage>
    );
  }

  // — Road trip, mise en page étroite —
  if (!wide) {
    return (
      <WoodPage>
        {header}
        {statsBlock}
        <TapeTitle>Itinéraire</TapeTitle>
        <View style={styles.board}>
          <StopBoard stops={boardStops} width={contentWidth} wide={false} />
        </View>
        {budgetBlock}
        {peopleBlock}
      </WoodPage>
    );
  }

  // — Road trip, mise en page large : tableau d'itinéraire + colonne budget à droite —
  const hasSide = total > 0 || names.length > 0;
  const sideInline = hasSide && contentWidth - SIDE_W - GAP >= 2 * 236 + 80;
  const boardWidth = sideInline ? contentWidth - SIDE_W - GAP : contentWidth;
  // L'étiquette cède la place aux chiffres clés pour tenir sur une ligne (sinon, retour à la ligne).
  const statsWidth = stats.reduce((w, s) => w + (s.value.length > 4 ? 150 : 124) + 22, 0);
  const headerWidth = Math.max(460, Math.min(600, contentWidth - GAP - statsWidth));
  return (
    <WoodPage>
      <View style={[styles.row, styles.wrap, styles.alignEnd]}>
        <View style={{ width: Math.min(headerWidth, contentWidth) }}>{header}</View>
        {statsBlock}
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TapeTitle align="left">Itinéraire</TapeTitle>
          <View style={styles.board}>
            <StopBoard stops={boardStops} width={boardWidth} wide />
          </View>
        </View>
        {sideInline ? (
          <View style={styles.side}>
            {budgetBlock}
            {peopleBlock}
          </View>
        ) : null}
      </View>
      {hasSide && !sideInline ? (
        <View style={styles.notepadNarrow}>
          {budgetBlock}
          {peopleBlock}
        </View>
      ) : null}
    </WoodPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: GAP },
  column: { flexDirection: 'column', gap: 0 },
  wrap: { flexWrap: 'wrap', rowGap: 28 },
  alignEnd: { alignItems: 'flex-end' },
  flex: { flex: 1 },
  board: { marginTop: 18 },
  side: { width: SIDE_W, paddingTop: 50 },
  soloLeft: { width: 520 },
  statsBelow: { marginTop: 40 },
  notepadNarrow: { maxWidth: 420 },
});
