import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlagGarland } from '@/components/decor/flag-garland';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { LevelBadge } from '@/components/song/level-badge';
import { ThemedText } from '@/components/themed-text';
import { Fonts, MaxContentWidth } from '@/constants/theme';
import { songColor } from '@/features/songs/palette';
import { useSongs } from '@/features/songs/store';
import type { Song } from '@/features/songs/types';
import { useTroublesome } from '@/features/vocab/troublesome';
import { useEnterStyle } from '@/hooks/use-enter-style';
import { useIsDark, useTheme } from '@/hooks/use-theme';

/** Les cartes arrivent en cascade, après la chute des drapeaux. */
const CASCADE_START = 500;
const CASCADE_STEP = 70;

function SongCard({ song, index, isNew }: { song: Song; index: number; isNew: boolean }) {
  const theme = useTheme();
  const dark = useIsDark();
  const router = useRouter();
  const reduce = useReducedMotion();
  const color = songColor(song);
  const enter = useEnterStyle(CASCADE_START + (index + 2) * CASCADE_STEP);

  // Une chanson qu'on vient d'ajouter se pose avec un éclat de sa couleur.
  const glow = useSharedValue(0);
  useEffect(() => {
    if (!isNew || reduce) return;
    glow.value = withDelay(350, withSequence(withTiming(1, { duration: 260 }), withTiming(0, { duration: 1100 })));
  }, [isNew, reduce, glow]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <Animated.View style={enter}>
      <PressableScale
        onPress={() => router.push(`/song/${song.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${song.title}, ${song.artist}`}
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, !dark && styles.cardShadow]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.glow, { borderColor: color.base, backgroundColor: color.base + '14' }, glowStyle]}
        />
        <View style={[styles.cover, { backgroundColor: dark ? color.tintDark : color.tint }]}>
          <ThemedText style={styles.emoji}>{song.emoji}</ThemedText>
        </View>
        <View style={styles.cardBody}>
          <ThemedText type="lyric" style={styles.cardTitle} numberOfLines={1}>
            {song.title}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {song.artist} ·{' '}
            {song.source === 'user' ? (
              <ThemedText type="caption" style={{ color: theme.accentText, fontFamily: Fonts.bold }}>
                Ma chanson
              </ThemedText>
            ) : (
              `${song.lines.length} lignes`
            )}
          </ThemedText>
          <View style={styles.badgeRow}>
            <LevelBadge level={song.level} />
          </View>
        </View>
        <Icon name="chevron-right" size={20} color={theme.textMuted} />
      </PressableScale>
    </Animated.View>
  );
}

function Header({ width }: { width: number }) {
  const theme = useTheme();
  const router = useRouter();
  const { words } = useTroublesome();
  const { songs } = useSongs();
  const titleStyle = useEnterStyle(350);
  const reviewStyle = useEnterStyle(CASCADE_START);
  const sectionStyle = useEnterStyle(CASCADE_START + CASCADE_STEP);
  const n = words.length;

  return (
    <View>
      <View style={styles.garland}>
        <FlagGarland width={width} />
      </View>

      <Animated.View style={[styles.titleBlock, titleStyle]}>
        <ThemedText type="wordmark" accessibilityRole="header">
          Cancionero
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          Apprends l’espagnol en chantant
        </ThemedText>
      </Animated.View>

      <Animated.View style={reviewStyle}>
        <PressableScale
          onPress={() => router.push('/practice')}
          accessibilityRole="button"
          style={[styles.review, { backgroundColor: theme.accent }]}>
          <View style={styles.reviewIcon}>
            <Icon name="layers" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.reviewText}>
            <ThemedText type="defaultBold" style={styles.onAccent}>
              Vocabulaire à réviser
            </ThemedText>
            <ThemedText type="small" style={styles.onAccent}>
              {n === 0
                ? 'Touche des mots dans tes chansons'
                : `${n} mot${n > 1 ? 's' : ''} t’attend${n > 1 ? 'ent' : ''}`}
            </ThemedText>
          </View>
          <Icon name="chevron-right" size={22} color="#FFFFFF" />
        </PressableScale>
      </Animated.View>

      <Animated.View style={[styles.sectionRow, sectionStyle]}>
        <ThemedText type="title" accessibilityRole="header">
          Tes chansons
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {songs.length} chanson{songs.length > 1 ? 's' : ''}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

function AddButton({ index }: { index: number }) {
  const theme = useTheme();
  const router = useRouter();
  const enter = useEnterStyle(CASCADE_START + (index + 2) * CASCADE_STEP);
  return (
    <Animated.View style={enter}>
      <PressableScale
        onPress={() => router.push('/add')}
        accessibilityRole="button"
        style={[styles.add, { borderColor: theme.dashed }]}>
        <Icon name="plus" size={20} color={theme.accentText} />
        <ThemedText type="defaultBold" style={{ color: theme.accentText, fontSize: 15 }}>
          Ajouter une chanson
        </ThemedText>
      </PressableScale>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { songs, lastAddedId } = useSongs();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, MaxContentWidth);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={songs}
        keyExtractor={(s) => s.id}
        renderItem={({ item, index }) => (
          <SongCard song={item} index={index} isNew={item.id === lastAddedId} />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<Header width={contentWidth} />}
        ListFooterComponent={<AddButton index={songs.length} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    paddingHorizontal: 20,
    gap: 12,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  garland: { marginHorizontal: -20 },
  titleBlock: { alignItems: 'center', gap: 2, paddingTop: 10 },
  review: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
  },
  reviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewText: { flex: 1, gap: 1 },
  onAccent: { color: '#FFFFFF' },
  sectionRow: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    paddingRight: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardShadow: { boxShadow: '0px 1px 0px #EFE0CB, 0px 8px 18px -12px rgba(42, 24, 16, 0.35)' },
  glow: { ...StyleSheet.absoluteFillObject, borderRadius: 20, borderWidth: 2 },
  cover: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 30, lineHeight: 38 },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontFamily: Fonts.display },
  badgeRow: { marginTop: 4 },
  add: {
    marginTop: 4,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 18,
  },
});
