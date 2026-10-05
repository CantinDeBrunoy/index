import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { PapelPicado } from '@/components/decor/papel-picado';
import { PrimaryButton } from '@/components/primary-button';
import { LevelBadge } from '@/components/song/level-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fiesta, FiestaCycle, Spacing } from '@/constants/theme';
import { useSongs } from '@/features/songs/store';
import type { Song } from '@/features/songs/types';
import { useTroublesome } from '@/features/vocab/troublesome';
import { useTheme } from '@/hooks/use-theme';

const USE_NATIVE = Platform.OS !== 'web';

function SongCard({ song, index }: { song: Song; index: number }) {
  const theme = useTheme();
  const router = useRouter();
  const color = FiestaCycle[index % FiestaCycle.length];

  // Entrée en cascade.
  const enter = useRef(new Animated.Value(0)).current;
  // Réduction au toucher.
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      delay: index * 80,
      useNativeDriver: USE_NATIVE,
    }).start();
  }, [enter, index]);

  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <Animated.View style={{ opacity: enter, transform: [{ translateY }, { scale }] }}>
      <Pressable
        onPress={() => router.push(`/song/${song.id}`)}
        onPressIn={() =>
          Animated.spring(press, { toValue: 1, useNativeDriver: USE_NATIVE, speed: 40 }).start()
        }
        onPressOut={() =>
          Animated.spring(press, { toValue: 0, useNativeDriver: USE_NATIVE, speed: 40 }).start()
        }
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: color },
        ]}>
        <View style={[styles.medallion, { backgroundColor: color + '26', borderColor: color + '66' }]}>
          <ThemedText style={styles.emoji}>{song.emoji}</ThemedText>
        </View>
        <View style={styles.cardBody}>
          <ThemedText type="default" style={styles.cardTitle} numberOfLines={1}>
            {song.title}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
            {song.artist} · {song.lines.length} lignes
          </ThemedText>
          <View style={styles.cardMeta}>
            <LevelBadge level={song.level} />
            {song.source === 'user' && (
              <ThemedText type="small" style={{ color: Fiesta.rosa, fontWeight: '700' }}>
                ✦ ma chanson
              </ThemedText>
            )}
          </View>
        </View>
        <ThemedText style={[styles.chevron, { color }]}>›</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { songs } = useSongs();
  const { words } = useTroublesome();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={songs}
        keyExtractor={(s) => s.id}
        renderItem={({ item, index }) => <SongCard song={item} index={index} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <PapelPicado width={Math.min(width, 560) - Spacing.three * 2} />
            <ThemedText type="title" style={styles.h1}>
              Cancionero
            </ThemedText>
            <View style={styles.subtitleRow}>
              <ThemedText style={styles.note}>🎶</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Apprends l&apos;espagnol en chantant
              </ThemedText>
              <ThemedText style={styles.note}>🪅</ThemedText>
            </View>

            <Pressable
              onPress={() => router.push('/practice')}
              style={[styles.practicePill, { borderColor: '#FF3B30', backgroundColor: '#FF3B3014' }]}>
              <ThemedText type="smallBold" style={{ color: '#FF3B30' }}>
                🗂️ Vocabulaire à réviser{words.length > 0 ? ` · ${words.length}` : ''}
              </ThemedText>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          <PrimaryButton
            title="＋ Ajouter ma chanson"
            variant="secondary"
            onPress={() => router.push('/add')}
            style={styles.addBtn}
          />
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    padding: Spacing.three,
    gap: Spacing.three,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  h1: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800',
    marginTop: Spacing.one,
    letterSpacing: 0.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  note: { fontSize: 18 },
  practicePill: {
    marginTop: Spacing.two,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two + 2,
    paddingRight: Spacing.three,
    borderRadius: 20,
    borderWidth: 2,
    borderLeftWidth: 7,
  },
  medallion: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 30 },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 18, fontWeight: '800' },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 2,
  },
  chevron: { fontSize: 30, fontWeight: '400' },
  addBtn: { marginTop: Spacing.three },
});
