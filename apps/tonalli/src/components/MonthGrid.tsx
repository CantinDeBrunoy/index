import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DayCell } from '@/components/DayCell';
import type { EntryMap } from '@/data/types';
import { WEEKDAY_INITIALS, monthGrid, type YearMonth } from '@/lib/dates';
import { type, useTheme } from '@/theme';

const GAP = 6;

type Props = {
  month: YearMonth;
  entries: EntryMap;
  today: string;
  width: number;
  onSelectDay: (dateKey: string) => void;
};

export function MonthGrid({ month, entries, today, width, onSelectDay }: Props) {
  const theme = useTheme();
  const size = Math.floor((width - GAP * 6) / 7);
  const cells = monthGrid(month.year, month.month);

  return (
    <View>
      <View style={styles.header}>
        {WEEKDAY_INITIALS.map((initial, index) => (
          <Text
            key={`${initial}-${index}`}
            style={[type.caption, styles.headerLabel, { width: size, color: theme.textFaint }]}
          >
            {initial}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((key, index) =>
          key ? (
            <DayCell
              key={key}
              dateKey={key}
              entry={entries[key]}
              size={size}
              showNumber
              isToday={key === today}
              isFuture={key > today}
              onPress={onSelectDay}
            />
          ) : (
            <View key={`empty-${index}`} style={{ width: size, height: size }} />
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  headerLabel: { textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
});
