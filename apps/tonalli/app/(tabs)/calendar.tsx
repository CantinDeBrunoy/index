import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { MonthGrid } from '@/components/MonthGrid';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { YearMosaic } from '@/components/YearMosaic';
import {
  currentYearMonth,
  monthDays,
  monthLabel,
  shiftMonth,
  yearMonthOfKey,
} from '@/lib/dates';
import { useEntries } from '@/state/EntriesProvider';
import { radius, spacing, type, useTheme } from '@/theme';

type Mode = 'month' | 'year';

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { entries, today } = useEntries();

  const [mode, setMode] = useState<Mode>('month');
  const [month, setMonth] = useState(currentYearMonth);
  const [year, setYear] = useState(() => currentYearMonth().year);
  const [width, setWidth] = useState(0);

  const limit = yearMonthOfKey(today);
  const atMonthLimit = month.year === limit.year && month.month === limit.month;
  const atYearLimit = year >= limit.year;

  const filledCount = useMemo(() => {
    if (mode === 'month') {
      return monthDays(month.year, month.month).filter((key) => entries[key]).length;
    }
    return Object.keys(entries).filter((key) => key.startsWith(`${year}-`)).length;
  }, [mode, month, year, entries]);

  const total = useMemo(
    () => (mode === 'month' ? monthDays(month.year, month.month).length : 365),
    [mode, month],
  );

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const openDay = (key: string) => router.push({ pathname: '/day/[date]', params: { date: key } });

  const goPrevious = () =>
    mode === 'month' ? setMonth(shiftMonth(month, -1)) : setYear(year - 1);
  const goNext = () => {
    if (mode === 'month') {
      if (!atMonthLimit) setMonth(shiftMonth(month, 1));
    } else if (!atYearLimit) {
      setYear(year + 1);
    }
  };

  const nextDisabled = mode === 'month' ? atMonthLimit : atYearLimit;

  return (
    <Screen>
      <Text style={[type.title, { color: theme.text }]}>Calendrier</Text>

      <View style={styles.segmented}>
        <Segmented<Mode>
          options={[
            { value: 'month', label: 'Mois' },
            { value: 'year', label: 'Année' },
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>

      <View style={styles.nav}>
        <NavButton label="‹" onPress={goPrevious} />
        <Text style={[type.body, styles.navLabel, { color: theme.text }]}>
          {mode === 'month' ? monthLabel(month) : String(year)}
        </Text>
        <NavButton label="›" onPress={goNext} disabled={nextDisabled} />
      </View>

      <Text style={[type.caption, styles.count, { color: theme.textFaint }]}>
        {filledCount} jour{filledCount > 1 ? 's' : ''} coloré{filledCount > 1 ? 's' : ''} sur{' '}
        {total}
      </Text>

      <View onLayout={onLayout} style={styles.board}>
        {width > 0 ? (
          mode === 'month' ? (
            <MonthGrid
              month={month}
              entries={entries}
              today={today}
              width={width}
              onSelectDay={openDay}
            />
          ) : (
            <YearMosaic
              year={year}
              entries={entries}
              today={today}
              width={width}
              onSelectDay={openDay}
            />
          )
        ) : null}
      </View>
    </Screen>
  );
}

function NavButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label === '‹' ? 'Période précédente' : 'Période suivante'}
      style={[
        styles.navButton,
        { backgroundColor: theme.surface, borderColor: theme.border },
        disabled && { opacity: 0.35 },
      ]}
    >
      <Text style={{ color: theme.text, fontSize: 20, lineHeight: 24 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segmented: { marginTop: spacing.lg },
  nav: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLabel: { textTransform: 'capitalize' },
  navButton: {
    width: 40,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { marginTop: spacing.sm, textAlign: 'center' },
  board: { marginTop: spacing.lg },
});
