import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Confetti } from '@/components/decor/confetti';
import { DiamondRow, ScallopEdge } from '@/components/decor/scallop';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { PrimaryButton } from '@/components/primary-button';
import { SpeakerButton } from '@/components/song/speaker-button';
import { ThemedText } from '@/components/themed-text';
import { Fonts, MaxContentWidth, Motion, SongPalette, type SongColor } from '@/constants/theme';
import { songColor } from '@/features/songs/palette';
import { useSongs } from '@/features/songs/store';
import { translateEsToFr } from '@/features/translate';
import { haptics } from '@/features/ui/haptics';
import { stopSpeaking } from '@/features/ui/speech';
import { useTroublesome, type TroubleWord } from '@/features/vocab/troublesome';
import { useEnterStyle } from '@/hooks/use-enter-style';
import { useIsDark, useTheme } from '@/hooks/use-theme';

/** Distance de glissement au-delà de laquelle la carte est triée. */
const THRESHOLD = 90;
const LEAVE_MS = 380;

// Fleur de papel picado, en filigrane sur la carte.
const FLOWER =
  'M32.5 31Q37.25 36 42 31Q37.25 26 32.5 31ZM28 35.5Q23 40.25 28 45Q33 40.25 28 35.5ZM23.5 31Q18.75 26 14 31Q18.75 36 23.5 31ZM28 26.5Q33 21.75 28 17Q23 21.75 28 26.5ZM31.18 34.18Q31 41.08 37.9 40.9Q38.08 34 31.18 34.18ZM24.82 34.18Q17.92 34 18.1 40.9Q25 41.08 24.82 34.18ZM24.82 27.82Q25 20.92 18.1 21.1Q17.92 28 24.82 27.82ZM31.18 27.82Q38.08 28 37.9 21.1Q31 20.92 31.18 27.82ZM26 31a2 2 0 1 0 4 0a2 2 0 1 0-4 0Z';

export default function PracticeScreen() {
  const theme = useTheme();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reduce = useReducedMotion();
  const { words, remove, setTranslation } = useTroublesome();
  const { songs } = useSongs();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

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

  // La séance : l'ordre des cartes et le nombre de mots sus. « Je le connais »
  // retire le mot du vocabulaire ; « À revoir » le remet au fond de la pile.
  // Les mots arrivés après le début de la séance passent en dernier.
  const [order, setOrder] = useState<string[]>([]);
  const [known, setKnown] = useState(0);
  const [round, setRound] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const byEs = useMemo(() => new Map(words.map((w) => [w.es, w])), [words]);
  const pile = useMemo(
    () => [
      ...order.filter((es) => byEs.has(es)),
      ...words.map((w) => w.es).filter((es) => !order.includes(es)),
    ],
    [order, words, byEs],
  );
  const total = known + pile.length;
  const current = pile[0] ? byEs.get(pile[0]) : undefined;
  const next = pile[1] ? byEs.get(pile[1]) : undefined;

  const colorOf = (w: TroubleWord | undefined): SongColor => {
    const song = w?.songTitle ? songs.find((s) => s.title === w.songTitle) : undefined;
    return song ? songColor(song) : SongPalette.rosa;
  };

  // Mouvement de la carte : glissé, envol, retournement, arrivée.
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const flip = useSharedValue(0);
  const arrive = useSharedValue(1);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(total ? known / total : 0, { damping: 14, stiffness: 120 });
  }, [known, total, progress]);

  const turn = () => {
    if (leaving) return;
    haptics.light();
    const to = flipped ? 0 : 180;
    flip.value = reduce ? to : withTiming(to, { duration: 550, easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
    setFlipped(!flipped);
  };

  const leave = (direction: 'right' | 'left') => {
    if (leaving || !current) return;
    setLeaving(true);
    stopSpeaking();
    if (direction === 'right') haptics.success();
    else haptics.tap();
    const out = { duration: reduce ? 1 : LEAVE_MS, easing: Easing.in(Easing.quad) };
    tx.value = withTiming(direction === 'right' ? 560 : -560, out);
    ty.value = withTiming(-60, out);
    setTimeout(
      () => {
        const es = current.es;
        const rest = pile.filter((x) => x !== es);
        if (direction === 'right') {
          setKnown((k) => k + 1);
          setOrder(rest);
          remove(es);
        } else {
          setOrder([...rest, es]);
        }
        // La carte suivante, déjà derrière, avance à sa place.
        tx.value = 0;
        ty.value = 0;
        flip.value = 0;
        setFlipped(false);
        setRound((r) => r + 1);
        arrive.value = reduce ? 1 : 0;
        if (!reduce) arrive.value = withSpring(1, { damping: 14, stiffness: 180 });
        setLeaving(false);
      },
      reduce ? 0 : LEAVE_MS,
    );
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      if (leaving) return;
      tx.value = e.translationX;
      ty.value = e.translationY * 0.15;
    })
    .onEnd((e) => {
      if (leaving) return;
      if (tx.value > THRESHOLD || e.velocityX > 900) leave('right');
      else if (tx.value < -THRESHOLD || e.velocityX < -900) leave('left');
      else {
        tx.value = withSpring(0, Motion.springUi);
        ty.value = withSpring(0, Motion.springUi);
      }
    });
  const tap = Gesture.Tap().runOnJS(true).onEnd(turn);
  const gesture = Gesture.Exclusive(pan, tap);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value + (1 - arrive.value) * 14 },
      { rotate: `${tx.value / 16}deg` },
      { scale: 0.94 + 0.06 * arrive.value },
    ],
  }));
  const frontStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 90 ? 1 : 0,
    transform: [{ perspective: 1200 }, { rotateY: `${flip.value}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: flip.value >= 90 ? 1 : 0,
    transform: [{ perspective: 1200 }, { rotateY: `${flip.value + 180}deg` }],
  }));
  const knowStamp = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, THRESHOLD], [0, 1], 'clamp'),
  }));
  const laterStamp = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-THRESHOLD, 0], [1, 0], 'clamp'),
  }));
  const speakerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(tx.value), [0, 30], [1, 0], 'clamp') * (flip.value < 90 ? 1 : 0),
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${Math.min(1, Math.max(0, progress.value)) * 100}%` }));

  const done = pile.length === 0 && known > 0;
  const empty = pile.length === 0 && known === 0;
  const color = colorOf(current);
  const nextColor = colorOf(next);
  const backSurface = theme.surface;
  const backAccent = dark ? color.light : color.deep;

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <IconButton
            icon="chevron-left"
            label="Retour"
            onPress={goBack}
            color={theme.text}
            background={theme.surface}
            style={!dark && styles.raised}
          />
          <View style={styles.headerText}>
            <ThemedText type="title" style={styles.hTitle} accessibilityRole="header">
              À réviser
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {done
                ? 'Tout est revu'
                : `${pile.length} mot${pile.length > 1 ? 's' : ''} dans la pile`}
            </ThemedText>
          </View>
          {total > 0 && (
            <ThemedText type="smallBold" themeColor="successText" style={styles.counter}>
              {known} / {total} connus
            </ThemedText>
          )}
        </View>

        {total > 0 && (
          <View style={[styles.bar, { backgroundColor: theme.line }]}>
            <Animated.View style={[styles.barFill, { backgroundColor: theme.success }, barStyle]} />
          </View>
        )}

        {empty && <EmptyState onBack={goBack} />}
        {done && <Bravo total={known} onBack={goBack} />}

        {current && (
          <>
            <View style={styles.stageWrap}>
              <View style={styles.stage}>
                {next && (
                  <View style={[styles.card, styles.behind]} pointerEvents="none">
                    <View style={[styles.cardBody, { backgroundColor: nextColor.deep }]} />
                    <ScallopEdge color={nextColor.deep} />
                  </View>
                )}

                <GestureDetector gesture={gesture}>
                  <Animated.View
                    key={round}
                    style={[styles.card, cardStyle]}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={
                      flipped
                        ? `Traduction : ${current.fr ?? 'en cours'}. Touche pour revenir au mot.`
                        : `Mot : ${current.es}. Touche pour voir la traduction.`
                    }
                    onAccessibilityTap={turn}>
                    <Animated.View style={[styles.face, frontStyle]}>
                      <View style={[styles.cardBody, { backgroundColor: color.deep }]}>
                        <Svg width={330} height={330} viewBox="12 15 32 32" style={styles.flower} pointerEvents="none">
                          <Path d={FLOWER} fill="#FFFFFF" />
                        </Svg>
                        <ThemedText type="label" style={styles.cardLabel}>
                          Espagnol
                        </ThemedText>
                        <ThemedText style={styles.cardWord} numberOfLines={2} adjustsFontSizeToFit>
                          {current.es}
                        </ThemedText>
                        {current.songTitle && (
                          <View style={styles.songTag}>
                            <Icon name="music" size={14} color="rgba(255,255,255,0.88)" />
                            <ThemedText type="small" style={styles.onCardSoft}>
                              {current.songTitle}
                            </ThemedText>
                          </View>
                        )}
                        <View style={styles.cardHint}>
                          <Icon name="flip" size={14} color="rgba(255,255,255,0.85)" />
                          <ThemedText type="caption" style={styles.onCardSoft}>
                            Touche pour retourner · glisse pour trier
                          </ThemedText>
                        </View>
                        <View style={styles.diamonds}>
                          <DiamondRow color={theme.background} />
                        </View>
                      </View>
                      <ScallopEdge color={color.deep} />
                    </Animated.View>

                    <Animated.View style={[styles.face, styles.faceBack, backStyle]}>
                      <View style={[styles.cardBody, { backgroundColor: backSurface, borderColor: theme.line, borderWidth: 1, borderBottomWidth: 0 }]}>
                        <ThemedText type="label" themeColor="textSecondary">
                          Français
                        </ThemedText>
                        <ThemedText style={[styles.cardTranslation, { color: backAccent }]} numberOfLines={3}>
                          {current.fr ?? '…'}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {current.es}
                          {current.songTitle ? ` · ${current.songTitle}` : ''}
                        </ThemedText>
                        <View style={styles.diamonds}>
                          <DiamondRow color={theme.line} />
                        </View>
                      </View>
                      <ScallopEdge color={backSurface} />
                    </Animated.View>

                    <Animated.View style={[styles.stamp, styles.stampKnow, { borderColor: theme.success }, knowStamp]} pointerEvents="none">
                      <ThemedText style={[styles.stampText, { color: theme.success }]}>Je le connais</ThemedText>
                    </Animated.View>
                    <Animated.View style={[styles.stamp, styles.stampLater, laterStamp]} pointerEvents="none">
                      <ThemedText style={[styles.stampText, { color: '#8A5100' }]}>À revoir</ThemedText>
                    </Animated.View>
                  </Animated.View>
                </GestureDetector>

                {!flipped && !leaving && (
                  <Animated.View style={[styles.speaker, speakerStyle]}>
                    <SpeakerButton
                      id={`practice-${current.es}`}
                      text={current.es}
                      rate={0.85}
                      size={48}
                      background="rgba(255,255,255,0.16)"
                      color="#FFFFFF"
                      activeBackground="rgba(255,255,255,0.32)"
                      activeColor="#FFFFFF"
                      ringColor="#FFFFFF"
                      label="Écouter le mot"
                    />
                  </Animated.View>
                )}
              </View>
            </View>

            <View style={[styles.actions, { paddingBottom: insets.bottom + 24 }]}>
              <PrimaryButton
                title="À revoir"
                icon="restart"
                variant="secondary"
                onPress={() => leave('left')}
                containerStyle={{ flex: 1 }}
                style={styles.actionButton}
              />
              <PrimaryButton
                title="Je le connais"
                icon="check"
                variant="success"
                onPress={() => leave('right')}
                containerStyle={{ flex: 1.4 }}
                style={styles.actionButton}
              />
            </View>
          </>
        )}
      </View>
      {done && <Confetti />}
    </View>
  );
}

function EmptyState({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const enter = useEnterStyle(100);
  return (
    <Animated.View style={[styles.centerBlock, enter]}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.accentTint }]}>
        <Icon name="layers" size={36} color={theme.accentText} />
      </View>
      <ThemedText type="title" style={styles.centerText}>
        Rien à réviser pour l’instant
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
        Ouvre une chanson et touche les mots que tu veux apprendre : ils arrivent ici sous forme de
        cartes.
      </ThemedText>
      <PrimaryButton title="Choisir une chanson" onPress={onBack} style={styles.centerButton} />
    </Animated.View>
  );
}

function Bravo({ total, onBack }: { total: number; onBack: () => void }) {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const pop = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) pop.value = withSpring(1, { damping: 7, stiffness: 140 });
  }, [reduce, pop]);
  const popStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.4),
    transform: [{ scale: 0.4 + 0.6 * pop.value }, { rotate: `${(1 - pop.value) * -10}deg` }],
  }));
  const textStyle = useEnterStyle(350);
  const buttonStyle = useEnterStyle(500);

  return (
    <View style={styles.centerBlock}>
      <Animated.View style={popStyle}>
        <ThemedText style={[styles.bravo, { color: theme.accentText }]}>¡Bravo!</ThemedText>
      </Animated.View>
      <Animated.View style={textStyle}>
        <ThemedText type="default" themeColor="textSecondary" style={styles.centerText}>
          {total > 1 ? `Tu connais tes ${total} mots.` : 'Tu connais ton mot.'} Touche d’autres mots dans
          tes chansons pour remplir la pile.
        </ThemedText>
      </Animated.View>
      <Animated.View style={buttonStyle}>
        <PrimaryButton title="Retour aux chansons" onPress={onBack} style={styles.centerButton} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  raised: { boxShadow: '0px 1px 0px #EFE0CB, 0px 4px 10px -6px rgba(42, 24, 16, 0.3)' },
  headerText: { flex: 1 },
  hTitle: { fontSize: 20, lineHeight: 24 },
  counter: { fontVariant: ['tabular-nums'] },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', marginHorizontal: 20, marginTop: 16 },
  barFill: { height: '100%', borderRadius: 3 },
  stageWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  stage: { height: 436 },
  card: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  behind: { opacity: 0.7, transform: [{ translateY: 14 }, { scale: 0.94 }] },
  face: { ...StyleSheet.absoluteFillObject, backfaceVisibility: 'hidden' },
  faceBack: {},
  cardBody: {
    flex: 1,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
    overflow: 'hidden',
  },
  flower: { position: 'absolute', opacity: 0.06, top: '50%', left: '50%', marginTop: -180, marginLeft: -165 },
  cardLabel: { color: 'rgba(255,255,255,0.88)', letterSpacing: 1.4 },
  cardWord: {
    color: '#FFFFFF',
    fontFamily: Fonts.displayItalic,
    fontSize: 50,
    lineHeight: 58,
    textAlign: 'center',
  },
  cardTranslation: {
    fontFamily: Fonts.displayItalic,
    fontSize: 40,
    lineHeight: 46,
    textAlign: 'center',
  },
  songTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onCardSoft: { color: 'rgba(255,255,255,0.88)' },
  cardHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  diamonds: { position: 'absolute', left: 0, right: 0, bottom: 12 },
  stamp: {
    position: 'absolute',
    top: 30,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 3,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  stampKnow: { left: 22, transform: [{ rotate: '-12deg' }] },
  stampLater: { right: 22, borderColor: '#8A5100', transform: [{ rotate: '12deg' }] },
  stampText: { fontFamily: Fonts.heavy, fontSize: 15, lineHeight: 20, letterSpacing: 0.6, textTransform: 'uppercase' },
  speaker: { position: 'absolute', top: 16, right: 16 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 8 },
  actionButton: { paddingHorizontal: 12 },
  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  centerText: { textAlign: 'center' },
  centerButton: { marginTop: 10, paddingHorizontal: 28 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  bravo: { fontFamily: Fonts.wordmark, fontSize: 60, lineHeight: 68 },
});
