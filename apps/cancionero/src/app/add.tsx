import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/pressable-scale';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Fonts, MaxContentWidth } from '@/constants/theme';
import {
  cleanTrackName,
  resultToSong,
  searchLyrics,
  type LrcResult,
} from '@/features/songs/lrclib';
import { useSongs } from '@/features/songs/store';
import { LEVEL_LABELS, type Level, type Song, type SongLine } from '@/features/songs/types';
import { haptics } from '@/features/ui/haptics';
import { useToast } from '@/features/ui/toast';
import { useIsDark, useTheme } from '@/hooks/use-theme';

const LEVELS: Level[] = ['debutant', 'intermediaire', 'avance'];

// Le halo rosa remplace l'anneau de focus du navigateur. Chrome le dessine en
// `outline-style: auto`, que `outlineWidth: 0` n'efface pas ; « none » manque
// aux types de React Native.
const noOutline = Platform.select({ web: { outlineStyle: 'none' } as unknown as TextStyle, default: {} });

/** Assemble les paroles ES et la traduction FR ligne par ligne. */
function buildLines(esText: string, frText: string): SongLine[] {
  const es = esText.split('\n').map((l) => l.trim());
  const fr = frText.split('\n').map((l) => l.trim());
  return es.map((line, i) => ({ es: line, fr: fr[i] ?? '' })).filter((l) => l.es.length > 0);
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30) || 'chanson'
  );
}

const fmt = (s: number | null) => {
  if (!s) return '';
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

export default function AddSongScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { addSong } = useSongs();
  const [tab, setTab] = useState<'search' | 'paste'>('search');

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  // La chanson ajoutée se pose sur l'accueil (voir lastAddedId) ; on le dit aussi.
  const onAdded = (song: Song) => {
    toast.show({ message: `« ${song.title} » ajoutée à tes chansons`, success: true });
    close();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inner}>
          <View style={[styles.grabber, { backgroundColor: theme.dashed }]} />
          <View style={[styles.header, Platform.OS !== 'ios' && { paddingTop: insets.top + 8 }]}>
            <ThemedText type="title" accessibilityRole="header">
              Ajouter une chanson
            </ThemedText>
            <IconButton icon="x" label="Fermer" onPress={close} color={theme.text} background={theme.chip} size={40} iconSize={18} />
          </View>

          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'search', label: 'Rechercher', icon: 'search' },
              { value: 'paste', label: 'Coller les paroles', icon: 'clipboard' },
            ]}
          />

          <Animated.View key={tab} entering={FadeIn.duration(220)} style={styles.fill}>
            {tab === 'search' ? (
              <SearchTab addSong={addSong} onAdded={onAdded} />
            ) : (
              <PasteTab addSong={addSong} onAdded={onAdded} />
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Deux onglets dans une gélule ; la pastille blanche glisse de l'un à l'autre. */
function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon: IconName }[];
}) {
  const theme = useTheme();
  const dark = useIsDark();
  const [width, setWidth] = useState(0);
  const index = options.findIndex((o) => o.value === value);
  const x = useSharedValue(0);
  const segment = (width - 8 - 4 * (options.length - 1)) / options.length;

  useEffect(() => {
    x.value = withSpring(index * (segment + 4), { damping: 16, stiffness: 220, mass: 0.7 });
  }, [index, segment, x]);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.segmented, { backgroundColor: theme.chip }]}>
      {width > 0 && (
        <Animated.View
          style={[styles.indicator, { width: segment, backgroundColor: dark ? theme.surface : '#FFFFFF' }, indicator]}
        />
      )}
      {options.map((option) => {
        const active = option.value === value;
        const color = active ? theme.text : theme.textSecondary;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (!active) haptics.tap();
              onChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={styles.segment}>
            <Icon name={option.icon} size={16} color={color} />
            <ThemedText type="small" style={{ color, fontFamily: active ? Fonts.bold : Fonts.semi }}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Champ de saisie : la bordure passe au rosa et un halo apparaît au focus. */
function Input({ style, multiline, ...props }: TextInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...props}
      multiline={multiline}
      placeholderTextColor={theme.textMuted}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[
        styles.input,
        multiline && styles.multiline,
        {
          color: theme.text,
          backgroundColor: theme.input,
          borderColor: focused ? theme.accent : theme.inputBorder,
        },
        focused && styles.focusRing,
        style,
      ]}
    />
  );
}

/* --------------------------- Recherche en ligne --------------------------- */

type ImportState = { id: number; phase: 'loading' | 'done' } | null;

function SearchTab({ addSong, onAdded }: { addSong: (s: Song) => Promise<void>; onAdded: (s: Song) => void }) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<LrcResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [importing, setImporting] = useState<ImportState>(null);

  // Recherche instantanée : on lance dès 3 caractères, peu après l'arrêt de la
  // frappe, sans attendre de validation. Les réponses tardives sont ignorées.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const r = await searchLyrics(q);
        if (cancelled) return;
        setResults(r.slice(0, 25));
        setError(null);
      } catch {
        if (cancelled) return;
        setError('Recherche impossible. Vérifie ta connexion et réessaie.');
        setResults([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSearched(true);
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const importResult = async (r: LrcResult) => {
    if (importing) return;
    setImporting({ id: r.id, phase: 'loading' });
    const song = resultToSong(r);
    await addSong(song);
    setImporting({ id: r.id, phase: 'done' });
    haptics.success();
    setTimeout(() => onAdded(song), 550);
  };

  const n = query.trim().length;

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View
        style={[
          styles.field,
          { backgroundColor: theme.input, borderColor: focused ? theme.accent : theme.inputBorder },
          focused && styles.focusRing,
        ]}>
        <Icon name="search" size={20} color={theme.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ex. Bailando Enrique Iglesias"
          placeholderTextColor={theme.textMuted}
          accessibilityLabel="Rechercher une chanson ou un artiste"
          returnKeyType="search"
          autoCorrect={false}
          style={[styles.fieldInput, { color: theme.text }]}
        />
        {n > 0 && (
          <Animated.View entering={ZoomIn.springify().damping(14)}>
            <IconButton
              icon="x"
              label="Effacer la recherche"
              onPress={() => setQuery('')}
              color={theme.textSecondary}
              background={theme.chip}
              size={36}
              iconSize={14}
            />
          </Animated.View>
        )}
      </View>

      {n === 0 && (
        <ThemedText type="caption" themeColor="textSecondary">
          Tape un titre ou un artiste : les résultats arrivent pendant que tu tapes. Les paroles sont
          souvent déjà synchronisées pour le karaoké.
        </ThemedText>
      )}
      {n > 0 && n < 3 && (
        <ThemedText type="caption" themeColor="textSecondary">
          Encore {3 - n} caractère{3 - n > 1 ? 's' : ''}…
        </ThemedText>
      )}
      {loading && <Skeleton />}
      {error && !loading && (
        <ThemedText type="small" themeColor="dangerText">
          {error}
        </ThemedText>
      )}
      {!loading && searched && !error && results.length === 0 && (
        <ThemedText type="caption" themeColor="textSecondary">
          Aucun résultat. Essaie avec l’artiste, ou vérifie l’orthographe.
        </ThemedText>
      )}

      {!loading && results.length > 0 && (
        <>
          <ThemedText type="caption" themeColor="textSecondary">
            Touche une chanson pour l’importer.
          </ThemedText>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {results.map((r, i) => (
              <ResultRow
                key={r.id}
                result={r}
                index={i}
                state={importing?.id === r.id ? importing.phase : null}
                onPress={() => importResult(r)}
              />
            ))}
          </View>
        </>
      )}

      <ThemedText type="caption" themeColor="textSecondary" style={styles.credit}>
        Paroles fournies par LRCLIB
      </ThemedText>
    </ScrollView>
  );
}

function ResultRow({
  result,
  index,
  state,
  onPress,
}: {
  result: LrcResult;
  index: number;
  state: 'loading' | 'done' | null;
  onPress: () => void;
}) {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const title = cleanTrackName(result);
  const meta = [result.artistName, result.albumName, fmt(result.duration)].filter(Boolean).join(' · ');

  return (
    <Animated.View entering={reduce ? undefined : FadeInDown.delay(Math.min(index, 8) * 70).duration(380)}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Importer ${title}, ${result.artistName}`}
        accessibilityState={{ busy: state === 'loading' }}
        style={[styles.result, index > 0 && { borderTopWidth: 1, borderTopColor: theme.line }]}>
        <View style={[styles.resultCover, { backgroundColor: theme.chip }]}>
          <Icon name="music" size={22} color={theme.textSecondary} />
        </View>
        <View style={styles.resultText}>
          <ThemedText type="lyric" numberOfLines={1} style={styles.resultTitle}>
            {title}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {meta}
          </ThemedText>
          {result.syncedLyrics && (
            <View style={[styles.sync, { backgroundColor: theme.successTint }]}>
              <Icon name="check" size={12} color={theme.successText} strokeWidth={3} />
              <ThemedText type="smallBold" style={[styles.syncText, { color: theme.successText }]}>
                Synchronisé
              </ThemedText>
            </View>
          )}
        </View>
        <ImportBadge state={state} />
      </PressableScale>
    </Animated.View>
  );
}

/** + → roue qui tourne → coche verte qui éclot. */
function ImportBadge({ state }: { state: 'loading' | 'done' | null }) {
  const theme = useTheme();
  const spin = useSharedValue(0);
  useEffect(() => {
    if (state === 'loading') {
      spin.value = 0;
      spin.value = withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), -1, false);
    } else {
      cancelAnimation(spin);
    }
  }, [state, spin]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  if (state === 'done') {
    return (
      <Animated.View entering={ZoomIn.springify().damping(9)} style={[styles.badge, { backgroundColor: theme.success }]}>
        <Icon name="check" size={20} color="#FFFFFF" strokeWidth={2.6} />
      </Animated.View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: theme.accentTint }]}>
      {state === 'loading' ? (
        <Animated.View style={spinStyle}>
          <Icon name="loader" size={20} color={theme.accentText} />
        </Animated.View>
      ) : (
        <Icon name="plus" size={20} color={theme.accentText} />
      )}
    </View>
  );
}

/** Lignes grisées qui pulsent pendant la recherche. */
function Skeleton() {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    pulse.value = withRepeat(withSequence(withTiming(0.45, { duration: 550 }), withTiming(1, { duration: 550 })), -1);
  }, [reduce, pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const bone = { backgroundColor: theme.skeleton };

  return (
    <Animated.View
      accessibilityLabel="Recherche en cours"
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>
      {[0.6, 0.52, 0.66].map((w, i) => (
        <View key={i} style={[styles.result, i > 0 && { borderTopWidth: 1, borderTopColor: theme.line }]}>
          <View style={[styles.resultCover, bone]} />
          <View style={styles.resultText}>
            <View style={[styles.boneLine, bone, { width: `${w * 100}%`, height: 14 }]} />
            <View style={[styles.boneLine, bone, { width: `${w * 60}%`, height: 11 }]} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

/* ------------------------------ Coller à la main ------------------------------ */

function PasteTab({ addSong, onAdded }: { addSong: (s: Song) => Promise<void>; onAdded: (s: Song) => void }) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [level, setLevel] = useState<Level>('debutant');
  const [es, setEs] = useState('');
  const [fr, setFr] = useState('');
  const [saving, setSaving] = useState(false);

  const lines = buildLines(es, fr);
  const canSave = title.trim().length > 0 && lines.length > 0;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const song: Song = {
      id: `${slugify(title)}-${Date.now().toString(36)}`,
      title: title.trim(),
      artist: artist.trim() || 'Ma chanson',
      level,
      emoji: '🎵',
      source: 'user',
      lines,
    };
    await addSong(song);
    haptics.success();
    onAdded(song);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Field label="Titre">
        <Input value={title} onChangeText={setTitle} placeholder="Ex. La Bamba" accessibilityLabel="Titre" />
      </Field>
      <Field label="Artiste" optional>
        <Input value={artist} onChangeText={setArtist} placeholder="Ex. Ritchie Valens" accessibilityLabel="Artiste" />
      </Field>
      <Field label="Niveau">
        <View style={styles.levels}>
          {LEVELS.map((lv) => {
            const active = lv === level;
            return (
              <PressableScale
                key={lv}
                onPress={() => {
                  haptics.tap();
                  setLevel(lv);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                scaleTo={0.94}
                style={[
                  styles.levelChip,
                  active
                    ? { backgroundColor: theme.accent, borderColor: theme.accent }
                    : { backgroundColor: theme.input, borderColor: theme.inputBorder },
                ]}>
                <ThemedText
                  type="small"
                  style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontFamily: Fonts.semi }}>
                  {LEVEL_LABELS[lv]}
                </ThemedText>
              </PressableScale>
            );
          })}
        </View>
      </Field>
      <Field label="Paroles en espagnol">
        <Input
          value={es}
          onChangeText={setEs}
          placeholder={'Para bailar la bamba\nse necesita una poca de gracia'}
          accessibilityLabel="Paroles en espagnol"
          multiline
        />
      </Field>
      <Field label="Traduction" optional>
        <Input
          value={fr}
          onChangeText={setFr}
          placeholder={'Pour danser la bamba\nil faut un peu de grâce'}
          accessibilityLabel="Traduction en français"
          multiline
        />
      </Field>

      <ThemedText type="caption" themeColor="textSecondary">
        {lines.length > 0
          ? `${lines.length} ligne${lines.length > 1 ? 's' : ''} détectée${lines.length > 1 ? 's' : ''}, une par ligne de texte.`
          : 'Une ligne de chanson par ligne de texte ; la traduction suit le même découpage.'}
      </ThemedText>

      <PrimaryButton title="Enregistrer la chanson" onPress={onSave} disabled={!canSave} loading={saving} />
    </ScrollView>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <ThemedText type="smallBold">
        {label}
        {optional && (
          <ThemedText type="small" themeColor="textSecondary">
            {' '}
            (optionnel)
          </ThemedText>
        )}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fill: { flex: 1 },
  inner: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginTop: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingLeft: 20,
    paddingRight: 16,
  },
  segmented: { flexDirection: 'row', gap: 4, marginTop: 16, marginHorizontal: 20, padding: 4, borderRadius: 14 },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 10,
    boxShadow: '0px 1px 3px rgba(42, 24, 16, 0.15)',
  },
  segment: { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  scroll: { padding: 20, paddingTop: 16, gap: 12, paddingBottom: 64 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingLeft: 14,
    paddingRight: 6,
    borderWidth: 2,
    borderRadius: 14,
  },
  fieldInput: { flex: 1, minWidth: 0, height: '100%', fontFamily: Fonts.body, fontSize: 16, ...noOutline },
  focusRing: { boxShadow: '0px 0px 0px 4px rgba(209, 31, 107, 0.12)' },
  card: { borderRadius: 20, borderWidth: 1, boxShadow: '0px 8px 18px -12px rgba(42, 24, 16, 0.35)' },
  result: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingLeft: 14, paddingRight: 12 },
  resultCover: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  resultText: { flex: 1, minWidth: 0, gap: 3 },
  resultTitle: { fontSize: 17, lineHeight: 22 },
  sync: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  syncText: { fontSize: 12, lineHeight: 16 },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  boneLine: { borderRadius: 6 },
  credit: { textAlign: 'center', marginTop: 6 },
  fieldGroup: { gap: 6 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.body,
    fontSize: 16,
    ...noOutline,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top', lineHeight: 22 },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levelChip: { height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, justifyContent: 'center' },
});
