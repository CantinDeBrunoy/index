import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { colorName, readableTextOn } from '@/data/palette';
import { formatLongDate, isValidKey } from '@/lib/dates';
import { useEntries } from '@/state/EntriesProvider';
import { radius, spacing, type, useTheme } from '@/theme';

export default function DayDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { entries, today } = useEntries();

  if (!isValidKey(date)) {
    return (
      <Screen scroll={false}>
        <Text style={[type.body, { color: theme.textMuted }]}>Date inconnue.</Text>
      </Screen>
    );
  }

  const entry = entries[date];
  const isToday = date === today;

  return (
    <Screen>
      <Text style={[type.title, styles.title, { color: theme.text }]}>
        {formatLongDate(date)}
      </Text>

      <View
        style={[
          styles.block,
          {
            backgroundColor: entry ? entry.color : theme.surface,
            borderColor: entry ? 'transparent' : theme.border,
            borderStyle: entry ? 'solid' : 'dashed',
          },
        ]}
      >
        {entry ? (
          <Text style={[type.title, { color: readableTextOn(entry.color) }]}>
            {colorName(entry.color)}
          </Text>
        ) : (
          <Text style={[type.body, { color: theme.textMuted }]}>Aucune couleur</Text>
        )}
      </View>

      {entry?.note ? (
        <>
          <Text style={[type.section, styles.section, { color: theme.textFaint }]}>NOTE</Text>
          <Text style={[type.body, { color: theme.text }]}>{entry.note}</Text>
        </>
      ) : null}

      {isToday ? (
        <Pressable
          onPress={() => {
            router.back();
            router.push('/');
          }}
          accessibilityRole="button"
          style={[styles.action, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <Text style={[type.label, { color: theme.text }]}>
            {entry ? 'Modifier la couleur du jour' : 'Choisir la couleur du jour'}
          </Text>
        </Pressable>
      ) : (
        <Text style={[type.caption, styles.locked, { color: theme.textFaint }]}>
          Une journée passée ne se repeint pas.
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { textTransform: 'capitalize' },
  block: {
    marginTop: spacing.lg,
    minHeight: 160,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  section: { marginTop: spacing.xl, marginBottom: spacing.sm },
  action: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  locked: { marginTop: spacing.xl, textAlign: 'center' },
});
