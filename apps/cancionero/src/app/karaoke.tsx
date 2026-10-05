import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/pressable-scale';
import { SpeakerButton } from '@/components/song/speaker-button';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Marigold, MaxContentWidth, Motion } from '@/constants/theme';
import { songColor } from '@/features/songs/palette';
import { useSongs } from '@/features/songs/store';
import { LEVEL_LABELS, type SongLine } from '@/features/songs/types';
import { cleanWord, translateEsToFr } from '@/features/translate';
import { haptics } from '@/features/ui/haptics';
import { useTroublesome } from '@/features/vocab/troublesome';

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

/** Attribue un horodatage à chaque ligne (réels si synchronisés, sinon répartis). */
function timeline(lines: SongLine[], duration: number): number[] {
  const hasReal = lines.some((l) => typeof l.time === 'number');
  if (hasReal) return lines.map((l, i) => l.time ?? i * (duration / Math.max(1, lines.length)));
  const per = duration / Math.max(1, lines.length);
  return lines.map((_, i) => i * per);
}

const SIZE = 22;
const ACTIVE_SIZE = 31;
const DIM = 'rgba(255,255,255,0.45)';
/** Couleur de la ligne active sous le remplissage karaoké. */
const UNFILLED = 'rgba(255,255,255,0.55)';

/**
 * Une ligne du karaoké. Active, elle grossit et se remplit de blanc de gauche
 * à droite au rythme de la chanson (le calque blanc est rogné par `wipe`).
 */
const KaraokeLine = memo(function KaraokeLine({
  text,
  active,
  isMarked,
  onWord,
  wipe,
}: {
  text: string;
  active: boolean;
  isMarked: (word: string) => boolean;
  onWord: (word: string) => void;
  wipe: SharedValue<number>;
}) {
  const reduce = useReducedMotion();
  const on = useSharedValue(active ? 1 : 0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    on.value = reduce
      ? active ? 1 : 0
      : withTiming(active ? 1 : 0, { duration: 420, easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
  }, [active, reduce, on]);

  const sized = useAnimatedStyle(() => {
    const size = SIZE + (ACTIVE_SIZE - SIZE) * on.value;
    return { fontSize: size, lineHeight: size * 1.3 };
  });
  const base = useAnimatedStyle(() => ({
    color: interpolateColor(on.value, [0, 1], [DIM, UNFILLED]),
  }));
  const clip = useAnimatedStyle(() => ({ width: wipe.value * width }));

  const tokens = text.split(/(\s+)/);
  const words = (fill?: string) =>
    tokens.map((token, i) => {
      if (/^\s*$/.test(token) || !cleanWord(token)) return token;
      const marked = isMarked(token);
      return (
        <Text
          key={i}
          onPress={fill ? undefined : () => onWord(token)}
          style={marked ? styles.marked : fill ? { color: fill } : undefined}>
          {token}
        </Text>
      );
    });

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.Text style={[styles.lyric, sized, base]}>{words()}</Animated.Text>
      {active && width > 0 && (
        <Animated.View pointerEvents="none" style={[styles.wipeLayer, clip]}>
          <Animated.Text style={[styles.lyric, sized, { width, color: '#FFFFFF' }]}>{words('#FFFFFF')}</Animated.Text>
        </Animated.View>
      )}
    </View>
  );
});

export default function KaraokeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getSong } = useSongs();
  const { has, add, setTranslation } = useTroublesome();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();

  const song = getSong(id);
  const lines = useMemo(() => song?.lines ?? [], [song]);
  const color = songColor(song ?? { id: id ?? 'x' });
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const duration = useMemo(() => {
    if (!song) return 1;
    if (song.duration) return song.duration;
    const last = Math.max(0, ...lines.map((l) => l.time ?? 0));
    return last > 0 ? last + 4 : Math.max(1, lines.length * 3);
  }, [song, lines]);
  const times = useMemo(() => timeline(lines, duration), [lines, duration]);

  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [sync, setSync] = useState(0);
  const positionRef = useRef(0);
  positionRef.current = position;

  // Avance la lecture (karaoké visuel — l'audio réel viendra avec Spotify).
  useEffect(() => {
    if (!playing) return;
    let last = Date.now();
    const t = setInterval(() => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;
      setPosition((p) => {
        const np = p + dt;
        if (np >= duration) {
          setPlaying(false);
          return duration;
        }
        return np;
      });
    }, 120);
    return () => clearInterval(t);
  }, [playing, duration]);

  const currentIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < times.length; i++) if (times[i] <= position + 0.05) idx = i;
    return idx;
  }, [times, position]);

  // Remplissage de la ligne active : recalé à chaque changement de ligne, de
  // lecture/pause, ou quand on se déplace dans la chanson.
  const wipe = useSharedValue(0);
  useEffect(() => {
    if (currentIndex < 0) return;
    const start = times[currentIndex];
    const end = times[currentIndex + 1] ?? duration;
    const span = Math.max(0.1, end - start);
    const done = Math.min(1, Math.max(0, (positionRef.current - start) / span));
    cancelAnimation(wipe);
    if (reduce) {
      wipe.value = 1;
      return;
    }
    wipe.value = done;
    if (playing) wipe.value = withTiming(1, { duration: (1 - done) * span * 1000, easing: Easing.linear });
  }, [currentIndex, playing, sync, times, duration, reduce, wipe]);

  // Traduction ligne par ligne, récupérée juste à temps (ligne courante + la
  // suivante), une requête à la fois. Les chansons fournies ont déjà leur `fr`.
  const [showFr, setShowFr] = useState(true);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const attempted = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!showFr || currentIndex < 0) return;
    let cancelled = false;
    (async () => {
      for (const i of [currentIndex, currentIndex + 1]) {
        const line = lines[i];
        if (!line || line.fr || attempted.current.has(i)) continue;
        attempted.current.add(i);
        const fr = await translateEsToFr(line.es);
        if (cancelled) return;
        if (fr) setTranslations((t) => ({ ...t, [i]: fr }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentIndex, showFr, lines]);
  const frFor = (i: number) => lines[i]?.fr || translations[i] || null;

  // Défilement automatique vers la ligne active.
  const scrollRef = useRef<ScrollView>(null);
  const lineY = useRef<number[]>([]);
  const viewH = useRef(0);
  useEffect(() => {
    if (currentIndex < 0) return;
    const y = lineY.current[currentIndex];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - viewH.current * 0.34), animated: !reduce });
  }, [currentIndex, reduce]);

  const songTitle = song?.title;
  const onWord = useCallback(
    (token: string) => {
      if (!add(token, songTitle)) return;
      haptics.tap();
      translateEsToFr(cleanWord(token)).then((fr) => {
        if (fr) setTranslation(token, fr);
      });
    },
    [add, songTitle, setTranslation],
  );

  // Barre de lecture.
  const seekWidth = useRef(1);
  const seek = (x: number) => {
    const ratio = Math.max(0, Math.min(1, x / seekWidth.current));
    setPosition(ratio * duration);
    setPlaying(true);
    setSync((n) => n + 1);
  };

  // Boutons : le bouton lecture rebondit en changeant d'icône, « recommencer » tourne.
  const playPop = useSharedValue(1);
  const spin = useSharedValue(0);
  const playStyle = useAnimatedStyle(() => ({ transform: [{ scale: playPop.value }] }));
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  const togglePlay = () => {
    if (!reduce) playPop.value = withSequence(withTiming(0.6, { duration: 90 }), withSpring(1, Motion.springUi));
    if (!playing && position >= duration) {
      setPosition(0);
      setSync((n) => n + 1);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  };
  const restart = () => {
    if (!reduce) spin.value = withTiming(spin.value - 360, { duration: 550, easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
    setPosition(0);
    setPlaying(true);
    setSync((n) => n + 1);
  };

  if (!song) {
    return (
      <View style={[styles.center, { backgroundColor: color.deep }]}>
        <StatusBar style="light" />
        <ThemedText style={styles.onColor}>Chanson introuvable.</ThemedText>
        <IconButton icon="chevron-down" label="Fermer" onPress={goBack} color="#FFFFFF" background="rgba(255,255,255,0.14)" />
      </View>
    );
  }

  const current = lines[currentIndex >= 0 ? currentIndex : 0];

  return (
    <View style={[styles.fill, { backgroundColor: color.deep }]}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="chevron-down" label="Fermer le karaoké" onPress={goBack} color="#FFFFFF" background="rgba(255,255,255,0.14)" />
        <View style={styles.headerTitle}>
          <ThemedText style={styles.hTitle} numberOfLines={1}>
            {song.title}
          </ThemedText>
          <ThemedText type="caption" style={styles.onColorSoft} numberOfLines={1}>
            {song.artist} · {LEVEL_LABELS[song.level]}
          </ThemedText>
        </View>
        <PressableScale
          onPress={() => setShowFr((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: showFr }}
          accessibilityLabel="Traduction française"
          hitSlop={8}
          style={[styles.frToggle, showFr && styles.frToggleOn]}>
          <Icon name="languages" size={16} color={showFr ? color.deep : '#FFFFFF'} />
          <ThemedText type="smallBold" style={{ color: showFr ? color.deep : '#FFFFFF', fontSize: 13 }}>
            FR
          </ThemedText>
        </PressableScale>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.fill}
        contentContainerStyle={styles.lyrics}
        onLayout={(e) => (viewH.current = e.nativeEvent.layout.height)}
        showsVerticalScrollIndicator={false}>
        {lines.map((line, i) => {
          const active = i === currentIndex;
          const fr = active && showFr ? frFor(i) : null;
          return (
            <View key={i} onLayout={(e) => (lineY.current[i] = e.nativeEvent.layout.y)}>
              <KaraokeLine text={line.es} active={active} isMarked={has} onWord={onWord} wipe={wipe} />
              {active && showFr && (
                <Animated.View entering={reduce ? undefined : FadeInDown.delay(150).duration(380)}>
                  <ThemedText style={styles.frLine}>{fr ?? '…'}</ThemedText>
                </Animated.View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.tapHint}>
          <Icon name="pointer" size={16} color="rgba(255,255,255,0.88)" />
          <ThemedText type="caption" style={styles.onColorSoft}>
            Touche un mot pour l’ajouter à tes révisions
          </ThemedText>
        </View>

        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel="Position de lecture"
          accessibilityValue={{ text: `${fmt(position)} sur ${fmt(duration)}` }}
          style={styles.seek}
          onLayout={(e) => (seekWidth.current = e.nativeEvent.layout.width)}
          onPress={(e) => seek(e.nativeEvent.locationX)}>
          <View style={styles.seekTrack} />
          <View style={[styles.seekFill, { width: `${(position / duration) * 100}%` }]} />
          <View style={[styles.seekKnob, { left: `${(position / duration) * 100}%` }]} />
        </Pressable>
        <View style={styles.timeRow}>
          <ThemedText style={styles.time}>{fmt(position)}</ThemedText>
          {!song.synced && <ThemedText style={styles.time}>Timing approximatif</ThemedText>}
          <ThemedText style={styles.time}>{fmt(duration)}</ThemedText>
        </View>

        <View style={styles.buttons}>
          <PressableScale
            onPress={restart}
            accessibilityRole="button"
            accessibilityLabel="Recommencer"
            scaleTo={0.9}
            style={styles.ctl}>
            <Animated.View style={spinStyle}>
              <Icon name="restart" size={22} color="#FFFFFF" />
            </Animated.View>
          </PressableScale>
          <PressableScale
            onPress={togglePlay}
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pause' : 'Lecture'}
            scaleTo={0.92}
            style={styles.playBtn}>
            <Animated.View style={[playStyle, !playing && { marginLeft: 3 }]}>
              <Icon name={playing ? 'pause' : 'play'} size={28} color={color.deep} />
            </Animated.View>
          </PressableScale>
          <SpeakerButton
            id="karaoke-line"
            text={current?.es ?? ''}
            size={52}
            background="rgba(255,255,255,0.14)"
            color="#FFFFFF"
            activeBackground="rgba(255,255,255,0.3)"
            activeColor="#FFFFFF"
            ringColor="#FFFFFF"
            label="Écouter la ligne"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  onColor: { color: '#FFFFFF' },
  onColorSoft: { color: 'rgba(255,255,255,0.85)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 6,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  headerTitle: { flex: 1, alignItems: 'center' },
  hTitle: { color: '#FFFFFF', fontFamily: Fonts.display, fontSize: 18, lineHeight: 24 },
  frToggle: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  frToggleOn: { backgroundColor: '#FFFFFF' },
  lyrics: {
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 220,
    gap: 22,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  lyric: { fontFamily: Fonts.displaySemi, fontSize: SIZE, lineHeight: SIZE * 1.3 },
  marked: { color: Marigold, textDecorationLine: 'underline', textDecorationColor: Marigold },
  wipeLayer: { position: 'absolute', top: 0, left: 0, bottom: 0, overflow: 'hidden' },
  frLine: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: Fonts.bodyItalic,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
  },
  controls: {
    paddingHorizontal: 24,
    paddingTop: 10,
    gap: 10,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  tapHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 },
  seek: { height: 24, justifyContent: 'center' },
  seekTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  seekFill: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  seekKnob: {
    position: 'absolute',
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.3)',
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: 'rgba(255,255,255,0.85)', fontFamily: Fonts.semi, fontSize: 12, lineHeight: 16, fontVariant: ['tabular-nums'] },
  buttons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginTop: 4 },
  ctl: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 8px 20px -8px rgba(0, 0, 0, 0.4)',
  },
});
