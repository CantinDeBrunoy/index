import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LEVEL_LABELS, type Level } from '@/features/songs/types';

const LEVEL_COLORS: Record<Level, string> = {
  debutant: '#2E9E5B',
  intermediaire: '#E08A00',
  avance: '#D2452F',
};

export function LevelBadge({ level }: { level: Level }) {
  return (
    <View style={[styles.badge, { backgroundColor: LEVEL_COLORS[level] + '22' }]}>
      <View style={[styles.dot, { backgroundColor: LEVEL_COLORS[level] }]} />
      <ThemedText type="small" style={[styles.label, { color: LEVEL_COLORS[level] }]}>
        {LEVEL_LABELS[level]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
