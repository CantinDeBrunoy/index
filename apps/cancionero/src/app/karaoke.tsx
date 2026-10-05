import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TappableLyricLine } from '@/components/song/tappable-line';
import { ThemedText } from '@/components/themed-text';
import { gradientFor } from '@/features/songs/gradient';
import { useSongs } from '@/features/songs/store';
import type { SongLine } from '@/features/songs/types';
import { translateEsToFr } from '@/features/translate';

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

export default function KaraokeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getSong } = useSongs();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const song = getSong(id);
  const lines = song?.lines ?? [];
  const grad = gradientFor(id ?? 'x');
  const g1 = grad[0];

  const duration = useMemo(() => {
    if (!song) return 1;
    if (song.duration) return song.duration;
    const times = lines.map((l) => l.time ?? 0);
    const last = Math.max(0, ...times);
    return last > 0 ? last + 4 : Math.max(1, lines.length * 3);
  }, [song, lines]);

  const times = useMemo(() => timeline(lines, duration), [lines, duration]);

  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(true);

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

  // Traduction ligne par ligne, récupérée juste à temps (ligne courante + la
  // suivante), une requête à la fois : bien plus fiable qu'une traduction en
  // masse, que l'API gratuite rejette. Les chansons fournies ont déjà leur `fr`.
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
    scrollRef.current?.scrollTo({ y: Math.max(0, y - viewH.current * 0.42), animated: true });
  }, [currentIndex]);

  const seekBarW = useRef(1);
  const seek = (x: number) => {
    const ratio = Math.max(0, Math.min(1, x / seekBarW.current));
    setPosition(ratio * duration);
  };

  const speakCurrent = () => {
    const line = lines[currentIndex >= 0 ? currentIndex : 0];
    if (!line) return;
    Speech.stop();
    Speech.speak(line.es, { language: 'es-ES', rate: 0.9 });
  };

  if (!song) {
    return (
      <LinearGradient colors={grad} style={styles.center}>
        <ThemedText style={styles.close} onPress={() => router.back()}>
          ⌄
        </ThemedText>
        <ThemedText style={{ color: '#fff' }}>Chanson introuvable.</ThemedText>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.closeBtn}>
          <ThemedText style={styles.close}>⌄</ThemedText>
        </Pressable>
        <View style={styles.headerTitle}>
          <ThemedText style={styles.hTitle} numberOfLines={1}>
            {song.title}
          </ThemedText>
          <ThemedText style={styles.hArtist} numberOfLines={1}>
            {song.artist}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => setShowFr((v) => !v)}
          hitSlop={12}
          style={styles.closeBtn}
          accessibilityLabel="Afficher ou masquer la traduction">
          <View style={[styles.frToggle, showFr && styles.frToggleOn]}>
            <ThemedText style={[styles.frToggleText, showFr && { color: g1 }]}>FR</ThemedText>
          </View>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.fill}
        contentContainerStyle={styles.lyrics}
        onLayout={(e) => (viewH.current = e.nativeEvent.layout.height)}
        showsVerticalScrollIndicator={false}>
        {lines.map((line, i) => {
          const active = i === currentIndex;
          return (
            <View
              key={i}
              onLayout={(e) => (lineY.current[i] = e.nativeEvent.layout.y)}
              style={styles.lineWrap}>
              <TappableLyricLine
                text={line.es}
                songTitle={song.title}
                color={active ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
                size={active ? 26 : 21}
                weight={active ? '800' : '700'}
              />
              {active && showFr && (
                <ThemedText style={styles.frLine}>{frFor(i) ?? '…'}</ThemedText>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 14 }]}>
        <ThemedText style={styles.tapHint}>
          👆 Touche un mot → il passe en rouge et va dans « vocabulaire à réviser »
        </ThemedText>

        <Pressable
          style={styles.seekTrack}
          onLayout={(e) => (seekBarW.current = e.nativeEvent.layout.width)}
          onPress={(e) => seek(e.nativeEvent.locationX)}>
          <View style={[styles.seekFill, { width: `${(position / duration) * 100}%` }]} />
        </Pressable>
        <View style={styles.timeRow}>
          <ThemedText style={styles.time}>{fmt(position)}</ThemedText>
          <ThemedText style={styles.time}>{fmt(duration)}</ThemedText>
        </View>

        <View style={styles.buttons}>
          <Pressable onPress={() => setPosition(0)} hitSlop={12}>
            <ThemedText style={styles.ctrlIcon}>⏮</ThemedText>
          </Pressable>
          <Pressable onPress={() => setPlaying((p) => !p)} style={styles.playBtn}>
            <ThemedText style={[styles.playIcon, { color: g1 }]}>{playing ? '⏸' : '▶'}</ThemedText>
          </Pressable>
          <Pressable onPress={speakCurrent} hitSlop={12}>
            <ThemedText style={styles.ctrlIcon}>🔊</ThemedText>
          </Pressable>
        </View>

        {!song.synced && (
          <ThemedText style={styles.noSync}>
            Timing approximatif (paroles non synchronisées).
          </ThemedText>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  close: { color: '#fff', fontSize: 34, fontWeight: '800', lineHeight: 36 },
  headerTitle: { flex: 1, alignItems: 'center' },
  hTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  hArtist: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  lyrics: {
    paddingHorizontal: 26,
    paddingVertical: 40,
    gap: 18,
  },
  lineWrap: {},
  frLine: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '600',
    marginTop: 6,
  },
  frToggle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  frToggleOn: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  frToggleText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '800',
  },
  controls: {
    paddingHorizontal: 22,
    paddingTop: 10,
    gap: 8,
  },
  tapHint: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  seekTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  seekFill: { height: 8, backgroundColor: '#fff', borderRadius: 999 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 34,
    marginTop: 4,
  },
  ctrlIcon: { color: '#fff', fontSize: 26 },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 28, fontWeight: '900' },
  noSync: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    textAlign: 'center',
  },
});
