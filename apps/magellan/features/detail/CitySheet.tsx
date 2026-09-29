// Fiche d'une ville sur la table en noyer : un voyage à une seule ville, ou une
// étape d'un road trip. Même mise en page dans les deux cas — seul le bandeau de
// l'étiquette change (« Voyage · une ville » / « Asie · étape 1/9 »).
//
// À placer dans une WoodPage.

import { StyleSheet, View } from 'react-native';

import { budgetTotal } from '@/features/trips/aggregates';
import type { Budget } from '@/features/trips/types';
import { KraftLabel, Notepad, Postcard, StatPostits, TagRow, useWoodLayout } from './WoodKit';

const GAP = 56;
const LEFT_W = 520;

/** Lignes du bloc-notes budget, dans l'ordre d'affichage. */
export function budgetRows(b: Budget): { label: string; value: number }[] {
  return [
    { label: 'Hôtel', value: b.hotel },
    { label: 'Nourriture', value: b.food },
    { label: 'Activités', value: b.activities },
    { label: 'Transport', value: b.transport },
  ];
}

export function CitySheet({
  eyebrow,
  title,
  subtitle,
  stamps,
  city,
  color,
  stats,
  budget,
  names,
  position,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  stamps: { label: string; ink: string }[];
  /** Ville écrite sur la carte postale. */
  city: string;
  /** Couleur du voyage (son tracé sur le globe), pour le recto de la carte postale. */
  color: string;
  stats: { value: string; label: string }[];
  budget?: Budget;
  names: string[];
  position: { lat: number; lng: number };
}) {
  const { wide, contentWidth } = useWoodLayout();
  const total = budgetTotal(budget);

  const header = (
    <KraftLabel big={wide} eyebrow={eyebrow} title={title} subtitle={subtitle} stamps={stamps} />
  );
  const statsBlock =
    stats.length > 0 ? <StatPostits items={stats} width={contentWidth} big={wide} /> : null;
  const budgetBlock =
    budget && total > 0 ? <Notepad title="Budget" rows={budgetRows(budget)} total={total} /> : null;
  const tags = (
    <>
      {names.length > 0 ? <TagRow title="Avec qui" items={names} /> : null}
      <TagRow title="Position" items={[`${position.lat.toFixed(3)}, ${position.lng.toFixed(3)}`]} />
    </>
  );

  // Large : étiquette, chiffres et budget à gauche, carte postale à droite.
  const cardInline = wide && contentWidth - LEFT_W - GAP >= 420;
  const card = (
    <Postcard
      city={city}
      color={color}
      width={
        cardInline
          ? Math.min(720, contentWidth - LEFT_W - GAP)
          : Math.min(wide ? 720 : 360, contentWidth - 20)
      }
    />
  );

  if (!wide) {
    return (
      <>
        {header}
        {card}
        {statsBlock}
        {budgetBlock}
        {tags}
      </>
    );
  }
  return (
    <View style={[styles.row, !cardInline && styles.column]}>
      <View style={styles.left}>
        {header}
        {statsBlock ? <View style={styles.statsBelow}>{statsBlock}</View> : null}
        {budgetBlock ? <View style={styles.narrow}>{budgetBlock}</View> : null}
      </View>
      <View style={styles.flex}>
        {card}
        {tags}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: GAP },
  column: { flexDirection: 'column', gap: 0 },
  left: { width: LEFT_W },
  flex: { flex: 1 },
  statsBelow: { marginTop: 40 },
  narrow: { maxWidth: 420 },
});
