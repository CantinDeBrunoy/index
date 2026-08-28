import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ColorSwatch } from '@/components/ColorSwatch';
import { PALETTE } from '@/data/palette';

const COLUMNS = 6;
const GAP = 10;

type Props = {
  selected?: string;
  onSelect: (color: string) => void;
  /** Largeur disponible, pour dimensionner les pastilles. */
  width: number;
};

/**
 * Palette fermée : pas de sélecteur RVB libre. Trop de choix tue le rituel,
 * et des teintes figées rendent l'année comparable d'un mois à l'autre.
 */
export function ColorPicker({ selected, onSelect, width }: Props) {
  const size = Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS);

  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {PALETTE.map((swatch) => (
        <ColorSwatch
          key={swatch.color}
          color={swatch.color}
          name={swatch.name}
          size={size}
          selected={selected?.toUpperCase() === swatch.color.toUpperCase()}
          onPress={() => onSelect(swatch.color)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
});
