import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton, ACCENT } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fiesta, Spacing } from '@/constants/theme';
import {
  cleanTrackName,
  resultToSong,
  searchLyrics,
  type LrcResult,
} from '@/features/songs/lrclib';
import { useSongs } from '@/features/songs/store';
import { LEVEL_LABELS, type Level, type Song, type SongLine } from '@/features/songs/types';
import { useTheme } from '@/hooks/use-theme';

const LEVELS: Level[] = ['debutant', 'intermediaire', 'avance'];

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
  const { addSong } = useSongs();
  const [tab, setTab] = useState<'search' | 'paste'>('search');

  const inputStyle = [
    styles.input,
    {
      color: theme.text,
      borderColor: theme.backgroundSelected,
      backgroundColor: theme.backgroundElement,
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.tabs}>
          {(['search', 'paste'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.tab,
                { borderColor: tab === t ? ACCENT : theme.backgroundSelected },
                tab === t && { backgroundColor: ACCENT + '18' },
              ]}>
              <ThemedText type="smallBold" style={{ color: tab === t ? ACCENT : theme.textSecondary }}>
                {t === 'search' ? '🔎 Rechercher' : '✍️ Coller à la main'}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {tab === 'search' ? (
          <SearchTab inputStyle={inputStyle} onImported={() => router.back()} addSong={addSong} />
        ) : (
          <PasteTab inputStyle={inputStyle} onSaved={() => router.back()} addSong={addSong} />
        )}
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

/* --------------------------- Recherche en ligne --------------------------- */

function SearchTab({
  inputStyle,
  onImported,
  addSong,
}: {
  inputStyle: any;
  onImported: () => void;
  addSong: (s: Song) => Promise<void>;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LrcResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const doSearch = async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await searchLyrics(q);
      setResults(r.slice(0, 25));
    } catch {
      setError('Recherche impossible. Vérifie ta connexion et réessaie.');
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

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

  const run = () => {
    if (query.trim().length >= 2) doSearch(query.trim());
  };

  const importResult = async (r: LrcResult) => {
    await addSong(resultToSong(r));
    onImported();
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        Les résultats s&apos;affichent au fur et à mesure que tu tapes — touche la chanson pour
        l&apos;importer. Les paroles arrivent souvent déjà synchronisées pour le karaoké.
      </ThemedText>

      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Ex. Bailando Enrique Iglesias"
          placeholderTextColor={theme.textSecondary}
          style={[inputStyle, { flex: 1 }]}
          returnKeyType="search"
          onSubmitEditing={run}
        />
        <PrimaryButton title="OK" onPress={run} style={styles.searchBtn} />
      </View>

      {loading && <ActivityIndicator color={ACCENT} style={{ marginTop: Spacing.four }} />}
      {error && (
        <ThemedText type="small" style={{ color: Fiesta.rojo, marginTop: Spacing.two }}>
          {error}
        </ThemedText>
      )}
      {!loading && searched && !error && results.length === 0 && (
        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.two }}>
          Aucun résultat. Essaie avec l&apos;artiste, ou vérifie l&apos;orthographe.
        </ThemedText>
      )}
      {!loading && !searched && query.trim().length > 0 && query.trim().length < 3 && (
        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.two }}>
          Encore {3 - query.trim().length} caractère
          {3 - query.trim().length > 1 ? 's' : ''}…
        </ThemedText>
      )}

      {results.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => importResult(r)}
          style={[styles.resultCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText type="default" style={styles.resultTitle} numberOfLines={1}>
              {cleanTrackName(r)}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
              {r.artistName}
              {r.albumName ? ` · ${r.albumName}` : ''} {r.duration ? `· ${fmt(r.duration)}` : ''}
            </ThemedText>
            {r.syncedLyrics && (
              <ThemedText type="small" style={{ color: Fiesta.verde, fontWeight: '700' }}>
                ✓ synchronisé (karaoké)
              </ThemedText>
            )}
          </View>
          <ThemedText style={[styles.importPlus, { color: ACCENT }]}>＋</ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/* ------------------------------ Coller à la main ------------------------------ */

function PasteTab({
  inputStyle,
  onSaved,
  addSong,
}: {
  inputStyle: any;
  onSaved: () => void;
  addSong: (s: Song) => Promise<void>;
}) {
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
    onSaved();
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Field label="Titre *">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ex. La Bamba"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
        />
      </Field>

      <Field label="Artiste (optionnel)">
        <TextInput
          value={artist}
          onChangeText={setArtist}
          placeholder="Ex. Ritchie Valens"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
        />
      </Field>

      <Field label="Niveau">
        <View style={styles.levels}>
          {LEVELS.map((lv) => {
            const active = lv === level;
            return (
              <Pressable
                key={lv}
                onPress={() => setLevel(lv)}
                style={[
                  styles.levelChip,
                  {
                    borderColor: active ? ACCENT : theme.backgroundSelected,
                    backgroundColor: active ? ACCENT + '1A' : 'transparent',
                  },
                ]}>
                <ThemedText type="small" style={{ color: active ? ACCENT : theme.textSecondary }}>
                  {LEVEL_LABELS[lv]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Paroles (espagnol) *">
        <TextInput
          value={es}
          onChangeText={setEs}
          placeholder={'Para bailar la bamba\nse necesita una poca de gracia'}
          placeholderTextColor={theme.textSecondary}
          multiline
          style={[inputStyle, styles.multiline]}
        />
      </Field>

      <Field label="Traduction (français, optionnel)">
        <TextInput
          value={fr}
          onChangeText={setFr}
          placeholder={'Pour danser la bamba\nil faut un peu de grâce'}
          placeholderTextColor={theme.textSecondary}
          multiline
          style={[inputStyle, styles.multiline]}
        />
      </Field>

      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {lines.length > 0
          ? `${lines.length} ligne${lines.length > 1 ? 's' : ''} détectée${lines.length > 1 ? 's' : ''}.`
          : 'Aucune ligne pour le moment.'}
      </ThemedText>

      <PrimaryButton
        title="Enregistrer la chanson"
        onPress={onSave}
        disabled={!canSave}
        loading={saving}
        style={styles.save}
      />
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, paddingBottom: 0 },
  tab: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  searchRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'stretch' },
  searchBtn: { paddingHorizontal: Spacing.four },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 16,
  },
  resultTitle: { fontSize: 16, fontWeight: '700' },
  importPlus: { fontSize: 28, fontWeight: '700' },
  field: { gap: Spacing.one },
  input: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  multiline: { minHeight: 130, textAlignVertical: 'top' },
  levels: { flexDirection: 'row', gap: Spacing.two },
  levelChip: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  save: { marginTop: Spacing.two },
});
