import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SpeakerButton } from '@/components/song/speaker-button';
import { TappableLyricLine } from '@/components/song/tappable-line';
import { ThemedText } from '@/components/themed-text';
import { Fiesta, Spacing } from '@/constants/theme';
import { translateEsToFr } from '@/features/translate';
import type { SongLine } from '@/features/songs/types';
import { useTheme } from '@/hooks/use-theme';

export function LyricsMode({
  lines,
  accent = Fiesta.rojo,
  songTitle,
}: {
  lines: SongLine[];
  accent?: string;
  songTitle?: string;
}) {
  const theme = useTheme();
  const [showFr, setShowFr] = useState(true);

  // Traduction ligne par ligne, une requête à la fois (l'API gratuite rejette
  // les rafales), avec cache. Les chansons fournies ont déjà leur `fr`.
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translating, setTranslating] = useState(false);
  const attempted = useRef<Set<number>>(new Set());

  const missing = useMemo(
    () => lines.map((l, i) => (l.fr ? -1 : i)).filter((i) => i >= 0),
    [lines],
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
        const fr = await translateEsToFr(lines[i].es);
        if (cancelled) return;
        if (fr) setTranslations((t) => ({ ...t, [i]: fr }));
        await new Promise((r) => setTimeout(r, 120));
      }
      if (!cancelled) setTranslating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [missing, lines]);

  const frFor = (i: number) => lines[i].fr || translations[i] || null;
  const done = missing.filter((i) => translations[i]).length;

  return (
    <View style={styles.container}>
      <View style={[styles.tip, { backgroundColor: accent + '14', borderColor: accent + '40' }]}>
        <ThemedText type="small" style={{ color: theme.text }}>
          👆 Touche un mot pour l&apos;ajouter à ton{' '}
          <ThemedText type="smallBold" style={{ color: accent }}>
            vocabulaire à réviser
          </ThemedText>
          .
        </ThemedText>
      </View>

      <View style={styles.topRow}>
        {translating && missing.length > 0 ? (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Traduction… {done}/{missing.length}
          </ThemedText>
        ) : (
          <View />
        )}
        <Pressable
          onPress={() => setShowFr((v) => !v)}
          style={[styles.toggle, { backgroundColor: accent + '18', borderColor: accent + '55' }]}
          accessibilityRole="switch">
          <ThemedText type="smallBold" style={{ color: accent }}>
            {showFr ? '🙈 Masquer la traduction' : '👁️ Afficher la traduction'}
          </ThemedText>
        </Pressable>
      </View>

      {lines.map((line, i) => {
        const fr = frFor(i);
        return (
          <View
            key={i}
            style={[
              styles.lineCard,
              { backgroundColor: theme.backgroundElement, borderLeftColor: accent },
            ]}>
            <View style={styles.esRow}>
              <View style={styles.esTextWrap}>
                <TappableLyricLine
                  text={line.es}
                  songTitle={songTitle}
                  color={theme.text}
                  size={17}
                  weight="700"
                />
              </View>
              <SpeakerButton text={line.es} color={accent} size={38} />
            </View>

            {showFr && (
              <ThemedText type="small" style={[styles.fr, { color: theme.textSecondary }]}>
                {fr ?? (translating ? '…' : '')}
              </ThemedText>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  tip: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.two + 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  toggle: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  lineCard: {
    borderRadius: 16,
    borderLeftWidth: 6,
    padding: Spacing.three,
    gap: 6,
  },
  esRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  esTextWrap: {
    flex: 1,
  },
  fr: {
    fontStyle: 'italic',
  },
});
