import { useEffect } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

/**
 * Apparition en fondu qui monte de quelques pixels, une seule fois au
 * montage. `delay` sert à faire arriver une liste en cascade.
 */
export function useEnterStyle(delay = 0, distance = 16) {
  const reduce = useReducedMotion();
  const progress = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (progress.value >= 1) return;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 500, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }),
    );
    // Une seule fois : rejouer à chaque rendu ferait clignoter la liste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * distance }],
  }));
}
