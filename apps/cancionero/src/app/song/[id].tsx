import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { PapelPicado } from '@/components/decor/papel-picado';
import { LyricsMode } from '@/components/song/lyrics-mode';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { gradientFor } from '@/features/songs/gradient';
import { useSongs } from '@/features/songs/store';
import { LEVEL_LABELS } from '@/features/songs/types';
import { useTheme } from '@/hooks/use-theme';

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getSong } = useSongs();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const song = getSong(id);

  if (!song) {
    return (
      <ThemedView style={styles.missing}>
        <Stack.Screen options={{ title: 'Introuvable' }} />
        <ThemedText type="subtitle">🤔</ThemedText>
        <ThemedText type="default">Chanson introuvable.</ThemedText>
      </ThemedView>
    );
  }

  const grad = gradientFor(song.id);
  const c1 = grad[0];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: song.title }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <PapelPicado width={Math.min(width, 560) - Spacing.three * 2} height={64} />
          <View style={styles.medallion}>
            <ThemedText style={styles.emoji}>{song.emoji}</ThemedText>
          </View>
          <ThemedText style={styles.title}>{song.title}</ThemedText>
          <ThemedText style={styles.artist}>{song.artist}</ThemedText>
          <View style={styles.levelPill}>
            <ThemedText style={styles.levelText}>{LEVEL_LABELS[song.level]}</ThemedText>
          </View>

          <Pressable
            onPress={() => router.push(`/karaoke?id=${song.id}`)}
            style={({ pressed }) => [styles.karaokeBtn, pressed && { opacity: 0.85 }]}>
            <ThemedText style={[styles.karaokeText, { color: c1 }]}>▶  Karaoké</ThemedText>
          </Pressable>
        </LinearGradient>

        <View style={styles.body}>
          <LyricsMode lines={song.lines} accent={c1} songTitle={song.title} />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingBottom: Spacing.six,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.three,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 6,
  },
  medallion: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  emoji: { fontSize: 46 },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
  artist: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  levelPill: {
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  levelText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  karaokeBtn: {
    marginTop: Spacing.three,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: Spacing.five,
    paddingVertical: 12,
  },
  karaokeText: { fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
  body: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
