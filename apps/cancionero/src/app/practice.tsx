import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { SpeakerButton } from '@/components/song/speaker-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fiesta, Spacing } from '@/constants/theme';
import { translateEsToFr } from '@/features/translate';
import { useTroublesome } from '@/features/vocab/troublesome';
import { useTheme } from '@/hooks/use-theme';

/** Assombrit une couleur hex pour composer un dégradé. */
function darken(hex: string, f = 0.22) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - f));
  const g = Math.round(((n >> 8) & 255) * (1 - f));
  const b = Math.round((n & 255) * (1 - f));
  return `rgb(${r},${g},${b})`;
}

const GRADIENT: [string, string] = [Fiesta.rosa, darken(Fiesta.rosa)];

export default function PracticeScreen() {
  const theme = useTheme();
  const { words, remove, setTranslation } = useTroublesome();

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Récupère les traductions manquantes, une par une (fiable).
  const attempted = useRef<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const w of words) {
        if (w.fr !== undefined || attempted.current.has(w.es)) continue;
        attempted.current.add(w.es);
        const fr = await translateEsToFr(w.es);
        if (cancelled) return;
        if (fr) setTranslation(w.es, fr);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [words, setTranslation]);

  if (words.length === 0) {
    return (
      <ThemedView style={styles.empty}>
        <ThemedText style={styles.bigEmoji}>🗂️</ThemedText>
        <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
          Ton vocabulaire est vide
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center' }}>
          Ouvre une chanson et touche les mots que tu veux apprendre : ils arrivent ici sous forme
          de cartes à réviser.
        </ThemedText>
      </ThemedView>
    );
  }

  const safeIndex = Math.min(index, words.length - 1);
  const card = words[safeIndex];

  const go = (dir: 1 | -1) => {
    setFlipped(false);
    setIndex((i) => {
      const cur = Math.min(i, words.length - 1);
      return (cur + dir + words.length) % words.length;
    });
  };

  const knowIt = () => {
    setFlipped(false);
    // après suppression, rester sur la même position (ou reculer si c'était la dernière)
    setIndex((i) => (i >= words.length - 1 ? Math.max(0, i - 1) : i));
    remove(card.es);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.inner}>
        <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center' }}>
          Carte {safeIndex + 1} / {words.length}
        </ThemedText>

        <Pressable
          onPress={() => setFlipped((f) => !f)}
          accessibilityRole="button"
          accessibilityLabel="Retourner la carte"
          style={styles.cardPress}>
          <LinearGradient
            colors={GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}>
            <ThemedText style={styles.faceLabel}>
              {flipped ? 'Français' : 'Espagnol — touche pour retourner'}
            </ThemedText>
            <ThemedText style={styles.word}>
              {flipped ? card.fr ?? '…' : card.es}
            </ThemedText>
            {card.songTitle && !flipped && (
              <ThemedText style={styles.songTag}>🎵 {card.songTitle}</ThemedText>
            )}
            {!flipped && <SpeakerButton text={card.es} color="#ffffff" size={46} rate={0.85} />}
          </LinearGradient>
        </Pressable>

        <View style={styles.nav}>
          <PrimaryButton
            title="← Précédent"
            variant="secondary"
            onPress={() => go(-1)}
            style={styles.navBtn}
          />
          <PrimaryButton title="Suivant →" onPress={() => go(1)} style={styles.navBtn} />
        </View>

        <PrimaryButton title="✓ Je le connais" onPress={knowIt} style={styles.knowBtn} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.three,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  cardPress: {},
  card: {
    borderRadius: 24,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    minHeight: 240,
  },
  faceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  word: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '800',
    textAlign: 'center',
  },
  songTag: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  nav: { flexDirection: 'row', gap: Spacing.two },
  navBtn: { flex: 1 },
  knowBtn: {},
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  bigEmoji: { fontSize: 64 },
});
