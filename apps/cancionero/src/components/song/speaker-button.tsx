import * as Speech from 'expo-speech';
import { useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

const USE_NATIVE = Platform.OS !== 'web';

/** Bouton « écouter » : lit le texte en espagnol et fait un pop élastique. */
export function SpeakerButton({
  text,
  color,
  size = 40,
  rate = 0.9,
}: {
  text: string;
  color: string;
  size?: number;
  rate?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.28, useNativeDriver: USE_NATIVE, speed: 50, bounciness: 16 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: USE_NATIVE, speed: 18, bounciness: 12 }),
    ]).start();
    Speech.stop();
    Speech.speak(text, { language: 'es-ES', rate });
  };

  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel="Écouter en espagnol">
      <Animated.View
        style={[
          styles.btn,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color + '22',
            borderColor: color + '66',
            transform: [{ scale }],
          },
        ]}>
        <ThemedText style={{ fontSize: size * 0.48 }}>🔊</ThemedText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
