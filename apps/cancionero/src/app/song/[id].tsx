import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  FadeOutUp,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/pressable-scale';
import { SpeakerButton } from '@/components/song/speaker-button';
import { TappableLyricLine } from '@/components/song/tappable-line';
import { Switch } from '@/components/switch';
import { ThemedText } from '@/components/themed-text';
import { Fonts, MaxContentWidth } from '@/constants/theme';
import { songColor } from '@/features/songs/palette';
import { useSongs } from '@/features/songs/store';
import { LEVEL_LABELS, type Song } from '@/features/songs/types';
import { cleanWord, translateEsToFr } from '@/features/translate';
import { haptics } from '@/features/ui/haptics';
import { useToast } from '@/features/ui/toast';
import { useTroublesome } from '@/features/vocab/troublesome';
import { useEnterStyle } from '@/hooks/use-enter-style';
import { useIsDark, useTheme } from '@/hooks/use-theme';

const HINT_KEY = '@cancionero/hint-tap-word';
const rowTransition = LinearTransition.duration(260);

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getSong } = useSongs();
  const song = getSong(id);
  return song ? <SongView song={song} /> : <MissingSong />;
}

function useGoBack() {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace('/'));
}

function MissingSong() {
  const theme = useTheme();
  const goBack = useGoBack();
  return (
    <View style={[styles.missing, { backgroundColor: theme.background }]}>
      <ThemedText type="title">Chanson introuvable</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        Elle a peut-être été supprimée de cet appareil.
      </ThemedText>
      <Pressable onPress={goBack} accessibilityRole="button" style={styles.missingLink}>
        <ThemedText type="smallBold" themeColor="accentText">
          Revenir à l’accueil
        </ThemedText>
      </Pressable>
    </View>
  );
}

/** Traductions manquantes, récupérées une par une (l'API gratuite rejette les rafales). */
function useLineTranslations(song: Song) {
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translating, setTranslating] = useState(false);
  const attempted = useRef<Set<number>>(new Set());
  const missing = useMemo(
    () => song.lines.map((l, i) => (l.fr ? -1 : i)).filter((i) => i >= 0),
    [song.lines],
  );

  useEffect(() => {
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      setTranslating(true);
      for (const i of missing) {
        if (cancelled) return;
        if (attempted.current.has(i)) continue;
        attempted.current.add(i);
        const fr = await translateEsToFr(song.lines[i].es);
        if (cancelled) return;
        if (fr) setTranslations((t) => ({ ...t, [i]: fr }));
        await new Promise((r) => setTimeout(r, 120));
      }
      if (!cancelled) setTranslating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [missing, song.lines]);

  return {
    frFor: (i: number) => song.lines[i].fr || translations[i] || null,
    translating,
    progress: `${missing.filter((i) => translations[i]).length}/${missing.length}`,
    hasMissing: missing.length > 0,
  };
}

function SongView({ song }: { song: Song }) {
  const theme = useTheme();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const goBack = useGoBack();
  const toast = useToast();
  const reduce = useReducedMotion();
  const { has, add, remove, setTranslation } = useTroublesome();
  const color = songColor(song);
  const { frFor, translating, progress, hasMissing } = useLineTranslations(song);

  const [showFr, setShowFr] = useState(true);
  const [hint, setHint] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(HINT_KEY)
      .then((seen) => setHint(!seen))
      .catch(() => setHint(true));
  }, []);
  const closeHint = () => {
    setHint(false);
    AsyncStorage.setItem(HINT_KEY, '1').catch(() => {});
  };

  // Entrée de l'en-tête : la vignette éclot, le reste monte en fondu.
  const pop = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) pop.value = withDelay(120, withSpring(1, { damping: 10, stiffness: 160 }));
  }, [reduce, pop]);
  const coverStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.5),
    transform: [{ scale: 0.6 + 0.4 * pop.value }, { rotate: `${(1 - pop.value) * -8}deg` }],
  }));
  const titleStyle = useEnterStyle(200, 14);
  const metaStyle = useEnterStyle(270, 14);
  const ctaStyle = useEnterStyle(420, 14);
  const bodyStyle = useEnterStyle(500, 14);

  const onWord = (token: string) => {
    const word = cleanWord(token).toLowerCase();
    if (!word) return;
    if (has(token)) {
      toast.show({ message: `« ${word} » est déjà dans tes révisions` });
      return;
    }
    add(token, song.title);
    haptics.tap();
    toast.show({
      message: `« ${word} » ajouté à tes révisions`,
      actionLabel: 'Annuler',
      onAction: () => remove(token),
    });
    translateEsToFr(word).then((fr) => {
      if (fr) setTranslation(token, fr);
    });
  };

  const lyricText = { ...styles.lyric, color: theme.text };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      {/* La barre d'état garde la couleur de la chanson même quand on fait défiler. */}
      <View style={[styles.statusBar, { height: insets.top, backgroundColor: color.deep }]} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: color.deep, paddingTop: insets.top + 8 }]}>
          <IconButton
            icon="chevron-left"
            label="Retour"
            onPress={goBack}
            color="#FFFFFF"
            background="rgba(255,255,255,0.14)"
          />
          <View style={styles.heroRow}>
            <Animated.View style={[styles.cover, coverStyle]}>
              <ThemedText style={styles.coverEmoji}>{song.emoji}</ThemedText>
            </Animated.View>
            <View style={styles.heroText}>
              <Animated.View style={titleStyle}>
                <ThemedText type="display" style={styles.onColor} accessibilityRole="header">
                  {song.title}
                </ThemedText>
              </Animated.View>
              <Animated.View style={[metaStyle, styles.heroMeta]}>
                <ThemedText type="small" style={styles.onColorSoft}>
                  {song.artist} · {song.lines.length} lignes
                </ThemedText>
                <View style={styles.levelPill}>
                  <ThemedText type="smallBold" style={[styles.onColor, styles.levelText]}>
                    {LEVEL_LABELS[song.level]}
                  </ThemedText>
                </View>
              </Animated.View>
            </View>
          </View>
          <Animated.View style={ctaStyle}>
            <PressableScale
              onPress={() => router.push(`/karaoke?id=${song.id}`)}
              accessibilityRole="button"
              style={styles.cta}>
              <Icon name="play" size={18} color={color.deep} />
              <ThemedText type="defaultBold" style={{ color: color.deep }}>
                Lancer le karaoké
              </ThemedText>
            </PressableScale>
          </Animated.View>
        </View>

        <Animated.View style={[styles.body, bodyStyle]}>
          <View style={styles.lyricsHeader}>
            <ThemedText type="title" accessibilityRole="header">
              Paroles
            </ThemedText>
            <Switch label="Traduction" value={showFr} onChange={setShowFr} onColor={dark ? color.base : color.deep} />
          </View>

          {translating && hasMissing && (
            <ThemedText type="caption" themeColor="textSecondary">
              Traduction… {progress}
            </ThemedText>
          )}

          {hint && (
            <Animated.View
              exiting={FadeOutUp.duration(200)}
              style={[styles.hint, { backgroundColor: theme.hint }]}>
              <Icon name="pointer" size={18} color={theme.hintIcon} />
              <ThemedText type="small" style={[styles.hintText, { color: theme.hintText }]}>
                Touche un mot pour l’ajouter à tes <ThemedText type="smallBold" style={{ color: theme.hintText }}>révisions</ThemedText>.
              </ThemedText>
              <IconButton
                icon="x"
                label="Masquer l’astuce"
                onPress={closeHint}
                color={theme.hintIcon}
                background="transparent"
                size={40}
                iconSize={16}
              />
            </Animated.View>
          )}

          <Animated.View
            layout={rowTransition}
            style={[styles.lyrics, { backgroundColor: theme.surface, borderColor: theme.border }, !dark && styles.lyricsShadow]}>
            {song.lines.map((line, i) => {
              const fr = frFor(i);
              return (
                <Animated.View
                  key={i}
                  layout={rowTransition}
                  style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: theme.line }]}>
                  <View style={styles.rowText}>
                    <TappableLyricLine
                      text={line.es}
                      onWordPress={onWord}
                      textStyle={lyricText}
                      highlight={theme.highlight}
                      highlightText={theme.highlightText}
                    />
                    {showFr && (fr || translating) && (
                      <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(140)}>
                        <ThemedText type="small" themeColor="textSecondary" style={styles.fr}>
                          {fr ?? '…'}
                        </ThemedText>
                      </Animated.View>
                    )}
                  </View>
                  <SpeakerButton
                    id={`${song.id}-${i}`}
                    text={line.es}
                    background={dark ? color.tintDark : color.tint}
                    color={dark ? color.light : color.deep}
                    activeBackground={dark ? color.base : color.deep}
                    activeColor="#FFFFFF"
                    ringColor={dark ? color.light : color.deep}
                    label="Écouter la ligne"
                  />
                </Animated.View>
              );
            })}
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 },
  scroll: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 4, marginTop: 12 },
  cover: {
    width: 76,
    height: 76,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: { fontSize: 40, lineHeight: 50 },
  heroText: { flex: 1, gap: 4 },
  heroMeta: { gap: 6 },
  onColor: { color: '#FFFFFF' },
  onColorSoft: { color: 'rgba(255,255,255,0.88)' },
  levelPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  levelText: { fontSize: 12, lineHeight: 16 },
  cta: {
    marginTop: 20,
    marginHorizontal: 4,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    boxShadow: '0px 8px 20px -10px rgba(0, 0, 0, 0.45)',
  },
  body: { padding: 20, paddingTop: 14, gap: 12 },
  lyricsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    paddingLeft: 14,
    paddingRight: 4,
    borderRadius: 14,
  },
  hintText: { flex: 1, paddingVertical: 6 },
  lyrics: { borderRadius: 20, borderWidth: 1 },
  lyricsShadow: { boxShadow: '0px 1px 0px #EFE0CB, 0px 8px 18px -12px rgba(42, 24, 16, 0.35)' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 12,
  },
  rowText: { flex: 1, minWidth: 0, gap: 3 },
  lyric: { fontFamily: Fonts.displaySemi, fontSize: 18, lineHeight: 26 },
  fr: { fontFamily: Fonts.bodyItalic },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  missingLink: { minHeight: 44, justifyContent: 'center' },
});
