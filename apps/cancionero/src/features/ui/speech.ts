import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';

/**
 * Lecture à voix haute, une seule à la fois. On retient quel bouton parle
 * pour que lui seul anime ses ondes : lancer une autre ligne coupe la première.
 */
let current: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function speak(id: string, text: string, rate = 0.9) {
  Speech.stop();
  current = id;
  emit();
  const done = () => {
    if (current !== id) return;
    current = null;
    emit();
  };
  Speech.speak(text, { language: 'es-ES', rate, onDone: done, onStopped: done, onError: done });
  // Filet : certaines voix web n'envoient jamais la fin de lecture.
  setTimeout(done, 1500 + text.length * 90);
}

export function stopSpeaking() {
  Speech.stop();
  current = null;
  emit();
}

export function useIsSpeaking(id: string) {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return current === id;
}
