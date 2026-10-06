import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LEVEL_LABELS, type Level } from '@/features/songs/types';
import { useTheme } from '@/hooks/use-theme';

export function LevelBadge({ level }: { level: Level }) {
  const theme = useTheme();
  const [color, background] = {
    debutant: [theme.successText, theme.successTint],
    intermediaire: [theme.warningText, theme.warningTint],
    avance: [theme.dangerText, theme.dangerTint],
  }[level];

  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText type="smallBold" style={[styles.label, { color }]}>
        {LEVEL_LABELS[level]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 12, lineHeight: 16 },
});
