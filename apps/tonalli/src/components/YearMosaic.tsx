import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DayCell } from '@/components/DayCell';
import type { EntryMap } from '@/data/types';
import { MONTH_NAMES_SHORT, daysInMonth, makeKey } from '@/lib/dates';
import { type, useTheme } from '@/theme';

const GAP = 2;
const GUTTER = 32;

type Props = {
  year: number;
  entries: EntryMap;
  today: string;
  width: number;
  onSelectDay: (dateKey: string) => void;
};

/**
 * L'année entière en une seule image : une ligne par mois, une case par jour.
 * Les cases sont volontairement minuscules — c'est la mosaïque qu'on regarde,
 * pas le détail.
 */
export function YearMosaic({ year, entries, today, width, onSelectDay }: Props) {
  const theme = useTheme();
  const available = width - GUTTER;
  const size = Math.max(6, Math.floor((available - GAP * 30) / 31));

  return (
    <View style={styles.container}>
      {MONTH_NAMES_SHORT.map((label, month) => {
        const total = daysInMonth(year, month);
        return (
          <View key={label} style={styles.row}>
            <Text style={[type.caption, styles.label, { color: theme.textFaint }]}>{label}</Text>
            <View style={styles.days}>
              {Array.from({ length: 31 }).map((_, index) => {
                if (index >= total) {
                  return <View key={index} style={{ width: size, height: size }} />;
                }
                const key = makeKey(year, month, index + 1);
                return (
                  <DayCell
                    key={key}
                    dateKey={key}
                    entry={entries[key]}
                    size={size}
                    isToday={key === today}
                    isFuture={key > today}
                    onPress={onSelectDay}
                  />
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: GAP + 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { width: GUTTER, paddingRight: 6, textAlign: 'right' },
  days: { flexDirection: 'row', gap: GAP },
});
