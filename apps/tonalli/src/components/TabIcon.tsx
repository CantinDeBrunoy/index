import React from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';

type Props = { name: 'today' | 'calendar' | 'settings'; color: ColorValue };

/**
 * Icônes dessinées avec des Views plutôt qu'une police d'icônes : trois
 * formes suffisent, et le châssis reste strictement gris.
 */
export function TabIcon({ name, color }: Props) {
  if (name === 'today') {
    return <View style={[styles.square, { borderColor: color }]} />;
  }

  if (name === 'calendar') {
    return (
      <View style={styles.grid}>
        {Array.from({ length: 9 }).map((_, index) => (
          <View key={index} style={[styles.dot, { backgroundColor: color }]} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.lines}>
      {[14, 20, 11].map((width, index) => (
        <View key={index} style={[styles.line, { width, backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  square: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
  },
  grid: {
    width: 20,
    height: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2.5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 1.5,
  },
  lines: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 4,
  },
  line: {
    height: 2,
    borderRadius: 1,
  },
});
