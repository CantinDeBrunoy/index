import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Motion } from '@/constants/theme';
import { cleanWord } from '@/features/translate';
import { useTroublesome } from '@/features/vocab/troublesome';

type Props = {
  text: string;
  /** Appelé quand on touche un mot (avec sa ponctuation, tel qu'écrit). */
  onWordPress: (word: string) => void;
  textStyle: TextStyle;
  /** Fond du surligneur et couleur du mot surligné. */
  highlight: string;
  highlightText: string;
};

/**
 * Une ligne de paroles dont chaque mot se touche. Un mot du vocabulaire à
 * réviser est surligné ; le surligneur se dessine de gauche à droite quand on
 * le marque, et le mot fait un petit bond.
 *
 * Chaque mot est une vue à part dans une rangée qui passe à la ligne : c'est
 * ce qui permet d'animer le surligneur mot par mot.
 */
export function TappableLyricLine({ text, onWordPress, textStyle, highlight, highlightText }: Props) {
  const { has } = useTroublesome();
  const tokens = text.split(/\s+/).filter(Boolean);
  const gap = (textStyle.fontSize ?? 18) * 0.27;

  return (
    <View style={[styles.line, { columnGap: gap }]}>
      {tokens.map((token, i) =>
        cleanWord(token) ? (
          <Word
            key={i}
            token={token}
            marked={has(token)}
            onPress={() => onWordPress(token)}
            textStyle={textStyle}
            highlight={highlight}
            highlightText={highlightText}
          />
        ) : (
          <Text key={i} style={textStyle}>
            {token}
          </Text>
        ),
      )}
    </View>
  );
}

function Word({
  token,
  marked,
  onPress,
  textStyle,
  highlight,
  highlightText,
}: {
  token: string;
  marked: boolean;
  onPress: () => void;
  textStyle: TextStyle;
  highlight: string;
  highlightText: string;
}) {
  const reduce = useReducedMotion();
  const fill = useSharedValue(marked ? 1 : 0);
  const bump = useSharedValue(1);

  useEffect(() => {
    fill.value = reduce
      ? marked ? 1 : 0
      : withTiming(marked ? 1 : 0, { duration: 260, easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
  }, [marked, reduce, fill]);

  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  const wordStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));

  return (
    <Pressable
      onPress={() => {
        if (!marked && !reduce) {
          bump.value = withSequence(withTiming(1.14, { duration: 110 }), withSpring(1, Motion.springUi));
        }
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Ajouter « ${cleanWord(token)} » au vocabulaire à réviser`}
      accessibilityState={{ selected: marked }}>
      <Animated.View style={wordStyle}>
        <Animated.View pointerEvents="none" style={[styles.bar, { backgroundColor: highlight }, barStyle]} />
        <Text style={[textStyle, marked && { color: highlightText }]}>{token}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', flexWrap: 'wrap' },
  bar: {
    position: 'absolute',
    top: 2,
    bottom: 1,
    left: -3,
    right: -3,
    borderRadius: 5,
    transformOrigin: 'left',
  },
});
