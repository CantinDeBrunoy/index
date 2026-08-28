import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colorName, readableTextOn } from '@/data/palette';
import type { Entry } from '@/data/types';
import { formatLongDate, keyToDate } from '@/lib/dates';
import { useTheme } from '@/theme';

type Props = {
  dateKey: string;
  entry?: Entry;
  size: number;
  /** Affiche le numéro du jour (vue mensuelle) ou non (mosaïque annuelle). */
  showNumber?: boolean;
  isToday?: boolean;
  isFuture?: boolean;
  onPress?: (dateKey: string) => void;
};

export function DayCell({
  dateKey,
  entry,
  size,
  showNumber = false,
  isToday = false,
  isFuture = false,
  onPress,
}: Props) {
  const theme = useTheme();
  const day = keyToDate(dateKey).getDate();

  const label = entry
    ? `${formatLongDate(dateKey)}, ${colorName(entry.color)}${entry.note ? `, ${entry.note}` : ''}`
    : `${formatLongDate(dateKey)}, sans couleur`;

  return (
    <Pressable
      onPress={onPress && !isFuture ? () => onPress(dateKey) : undefined}
      disabled={isFuture || !onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={showNumber ? 0 : 2}
      style={{ width: size, height: size }}
    >
      <View
        style={[
          styles.cell,
          {
            borderRadius: Math.max(3, size * 0.22),
            backgroundColor: entry?.color ?? theme.emptyCell,
            opacity: isFuture ? 0.35 : 1,
            borderWidth: isToday ? 2 : 0,
            borderColor: theme.text,
          },
        ]}
      >
        {showNumber ? (
          <Text
            style={[
              styles.number,
              { color: entry ? readableTextOn(entry.color) : theme.textMuted },
            ]}
          >
            {day}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 13,
    fontWeight: '500',
  },
});
