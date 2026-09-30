// Import groupé des photos depuis un dossier du PC (ex. « iCloud Photos » synchronisé
// par iCloud pour Windows) — web uniquement, Chrome / Edge.
//
// 1. choisir (ou réautoriser) le dossier ;  2. l'analyser (date + position de chaque
// photo) ;  3. vérifier le rangement proposé, par paquets ;  4. ajouter les photos aux
// étapes et préparer leurs miniatures.

import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FONT, KraftLabel, TapeTitle, WoodButton, WoodPage } from '@/features/detail/WoodKit';
import { useTrips } from '@/features/trips/store';
import type { PhotoRef, Trip } from '@/features/trips/types';
import { matchPhotos, type PhotoGroup, type ScannedPhoto } from './match-photos';
import { PhotoThumb } from './PhotoThumb';
import {
  folderAccessSupported,
  pickFolder,
  prepareThumbnails,
  requestAccess,
  savedFolder,
  scanFolder,
  type FolderHandle,
  type ScanProgress,
} from './web-folder';

/** 'manual' : photos envoyées une à une vers une étape depuis l'écran de vérification. */
type Kind = PhotoGroup['confidence'] | 'manual';
type ReviewGroup = Omit<PhotoGroup, 'confidence'> & { confidence: Kind; target: string; checked: boolean };

/** Paquet des photos écartées à la main (jamais importé tant qu'on ne lui donne pas d'étape). */
const IGNORED = 'manual:ignored';
/** Côté des miniatures de l'écran de vérification (px). */
const THUMB = 72;
const SELECT_STYLE = {
  padding: 6,
  borderRadius: 6,
  border: '1px solid #b9a27f',
  background: '#fffdf6',
  color: '#2a2320',
  maxWidth: 260,
};

const byDate = (a: ScannedPhoto, b: ScannedPhoto) => (a.takenAt ?? '').localeCompare(b.takenAt ?? '');

type Stage =
  | { name: 'checking' }
  | { name: 'unsupported' }
  | { name: 'no-folder' }
  | { name: 'folder'; folder: FolderHandle; granted: boolean }
  | { name: 'scanning'; progress: ScanProgress }
  | { name: 'review'; groups: ReviewGroup[]; heic: number; read: number }
  | { name: 'importing'; done: number; total: number }
  | { name: 'done'; photos: number; stops: number }
  | { name: 'error'; message: string };

const INK = '#2a2320';
const MUTED = '#6b5a45';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Marque du pluriel. */
const s = (n: number) => (n > 1 ? 's' : '');

function monthLabel(month?: string): string {
  if (!month) return 'Sans date';
  const [y, m] = month.split('-').map(Number);
  return monthFmt.format(new Date(Date.UTC(y, m - 1, 15)));
}

function dateRange(photos: ScannedPhoto[]): string {
  const dated = photos.filter((p) => p.takenAt);
  if (!dated.length) return 'sans date';
  const first = dateFmt.format(new Date(dated[0].takenAt!));
  const last = dateFmt.format(new Date(dated[dated.length - 1].takenAt!));
  return first === last ? first : `du ${first} au ${last}`;
}

export function ImportScreen() {
  const router = useRouter();
  const { trips, addPhotos } = useTrips();
  const [stage, setStage] = useState<Stage>({ name: 'checking' });
  const [showUnknown, setShowUnknown] = useState(false);

  useEffect(() => {
    if (!folderAccessSupported()) {
      setStage({ name: 'unsupported' });
      return;
    }
    savedFolder()
      .then((saved) =>
        setStage(
          saved
            ? { name: 'folder', folder: saved.folder, granted: saved.permission === 'granted' }
            : { name: 'no-folder' },
        ),
      )
      .catch(() => setStage({ name: 'no-folder' }));
  }, []);

  const scan = async (folder: FolderHandle) => {
    setStage({ name: 'scanning', progress: { found: 0, read: 0, known: 0, failed: 0 } });
    try {
      const { photos, heic } = await scanFolder(folder, (progress) => setStage({ name: 'scanning', progress }));
      const groups = matchPhotos(photos, trips).map((g) => ({
        ...g,
        target: g.stopId ?? '',
        // Seules les photos sûres sont cochées d'office ; le reste se décide ici.
        checked: g.confidence === 'sure',
      }));
      setStage({ name: 'review', groups, heic, read: photos.length });
    } catch (e) {
      setStage({ name: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const choose = async () => {
    try {
      scan(await pickFolder());
    } catch {
      // Fenêtre de choix fermée sans dossier : on reste où l'on est.
    }
  };

  const authorize = async (folder: FolderHandle) => {
    if (await requestAccess(folder)) scan(folder);
  };

  const importChecked = async (groups: ReviewGroup[]) => {
    const byStop: Record<string, PhotoRef[]> = {};
    for (const g of groups) {
      if (!g.checked || !g.target) continue;
      byStop[g.target] = [
        ...(byStop[g.target] ?? []),
        ...g.photos.map(({ path, takenAt, lat, lng }) => ({ path, takenAt, lat, lng })),
      ];
    }
    const paths = Object.values(byStop).flatMap((ps) => ps.map((p) => p.path));
    addPhotos(byStop);
    setStage({ name: 'importing', done: 0, total: paths.length });
    await prepareThumbnails(paths, (done) => setStage({ name: 'importing', done, total: paths.length }));
    setStage({ name: 'done', photos: paths.length, stops: Object.keys(byStop).length });
  };

  return (
    <WoodPage>
      <KraftLabel
        eyebrow="Photos"
        title="Importer mes photos"
        subtitle="depuis le dossier iCloud Photos du PC"
      />
      <Body
        stage={stage}
        trips={trips}
        showUnknown={showUnknown}
        onShowUnknown={() => setShowUnknown(true)}
        onChoose={choose}
        onAuthorize={authorize}
        onScan={scan}
        onChange={(groups) => stage.name === 'review' && setStage({ ...stage, groups })}
        onImport={importChecked}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
    </WoodPage>
  );
}

function Body({
  stage,
  trips,
  showUnknown,
  onShowUnknown,
  onChoose,
  onAuthorize,
  onScan,
  onChange,
  onImport,
  onBack,
}: {
  stage: Stage;
  trips: Trip[];
  showUnknown: boolean;
  onShowUnknown: () => void;
  onChoose: () => void;
  onAuthorize: (folder: FolderHandle) => void;
  onScan: (folder: FolderHandle) => void;
  onChange: (groups: ReviewGroup[]) => void;
  onImport: (groups: ReviewGroup[]) => void;
  onBack: () => void;
}) {
  switch (stage.name) {
    case 'checking':
      return null;
    case 'unsupported':
      return (
        <Note>
          Ce navigateur ne permet pas d’ouvrir un dossier. Ouvre Magellan dans Edge ou Chrome sur ton PC.
        </Note>
      );
    case 'no-folder':
      return (
        <>
          <Note>
            Choisis le dossier où iCloud pour Windows synchronise tes photos (en général « Images › iCloud
            Photos »). Magellan lit la date et le lieu de chaque photo pour la ranger dans la bonne étape ; rien
            n’est copié ni envoyé.
          </Note>
          <WoodButton label="Choisir le dossier" onPress={onChoose} />
        </>
      );
    case 'folder':
      return (
        <>
          <Note>{`Dossier : « ${stage.folder.name} »`}</Note>
          <View style={styles.actions}>
            <WoodButton
              label={stage.granted ? 'Analyser le dossier' : 'Autoriser l’accès et analyser'}
              onPress={() => (stage.granted ? onScan(stage.folder) : onAuthorize(stage.folder))}
            />
            <WoodButton label="Choisir un autre dossier" onPress={onChoose} light />
          </View>
        </>
      );
    case 'scanning':
      return <ScanStatus progress={stage.progress} />;
    case 'review':
      return (
        <Review
          stage={stage}
          trips={trips}
          showUnknown={showUnknown}
          onShowUnknown={onShowUnknown}
          onChange={onChange}
          onImport={onImport}
        />
      );
    case 'importing':
      return <Note>{`Préparation des miniatures : ${stage.done} / ${stage.total}…`}</Note>;
    case 'done':
      return (
        <>
          <Note>
            {`${stage.photos} photo${stage.photos > 1 ? 's' : ''} ajoutée${stage.photos > 1 ? 's' : ''} à ${stage.stops} étape${stage.stops > 1 ? 's' : ''}. Elles apparaissent sur la corde à linge des fiches.`}
          </Note>
          <WoodButton label="Retour" onPress={onBack} />
        </>
      );
    case 'error':
      return <Note>{`L’analyse a échoué : ${stage.message}`}</Note>;
  }
}

/** Progression de l'analyse, avec le temps restant estimé sur les photos réellement lues. */
function ScanStatus({ progress }: { progress: ScanProgress }) {
  const { found, read, total, known, failed, startedAt } = progress;
  if (!total) return <Note>{`Recherche des photos dans le dossier : ${found} trouvées…`}</Note>;
  const fresh = read - known - failed;
  const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : 0;
  const minutes = fresh >= 5 && elapsed > 0 ? Math.ceil((total - read) / (fresh / elapsed) / 60) : null;
  const lines = [
    `Lecture des photos : ${read} / ${total}${known ? ` (dont ${known} déjà connues)` : ''}${
      minutes != null && read < total ? ` — encore environ ${minutes} min` : '…'
    }`,
  ];
  if (failed) {
    lines.push(
      `${failed} photo${failed > 1 ? 's' : ''} illisible${failed > 1 ? 's' : ''} pour l’instant (réessayée${failed > 1 ? 's' : ''} à la prochaine analyse).`,
    );
  }
  lines.push(
    '',
    'La première fois, c’est long : iCloud pour Windows télécharge chaque photo au moment où Magellan la lit (environ une par seconde). Tu peux fermer la page sans rien perdre : l’analyse reprendra là où elle s’est arrêtée, et les suivantes seront presque instantanées.',
  );
  return <Note>{lines.join('\n')}</Note>;
}

function Review({
  stage,
  trips,
  showUnknown,
  onShowUnknown,
  onChange,
  onImport,
}: {
  stage: Extract<Stage, { name: 'review' }>;
  trips: Trip[];
  showUnknown: boolean;
  onShowUnknown: () => void;
  onChange: (groups: ReviewGroup[]) => void;
  onImport: (groups: ReviewGroup[]) => void;
}) {
  const { groups, heic, read } = stage;
  const stops = useMemo(
    () => new Map(trips.flatMap((t) => t.stops.map((s) => [s.id, { stop: s, trip: t }] as const))),
    [trips],
  );
  const count = (c: Kind) => groups.filter((g) => g.confidence === c).reduce((n, g) => n + g.photos.length, 0);
  const selected = groups.filter((g) => g.checked && g.target).reduce((n, g) => n + g.photos.length, 0);
  const update = (key: string, patch: Partial<ReviewGroup>) =>
    onChange(groups.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  const setAll = (confidence: Kind, checked: boolean) =>
    onChange(groups.map((g) => (g.confidence === confidence && g.target ? { ...g, checked } : g)));

  /**
   * Sort des photos choisies une à une de leur paquet : vers une étape (paquet « rangées
   * par toi », coché) ou écartées (`target` vide, paquet non importé).
   */
  const move = (fromKey: string, paths: string[], target: string) => {
    const picked = new Set(paths);
    const moving = groups.find((g) => g.key === fromKey)?.photos.filter((p) => picked.has(p.path)) ?? [];
    const key = target ? `manual:${target}` : IGNORED;
    let next = groups
      .map((g) => (g.key === fromKey ? { ...g, photos: g.photos.filter((p) => !picked.has(p.path)) } : g))
      .filter((g) => g.photos.length > 0);
    const existing = next.find((g) => g.key === key);
    if (existing) {
      next = next.map((g) => (g.key === key ? { ...g, photos: [...g.photos, ...moving].sort(byDate) } : g));
    } else {
      next = [
        {
          key,
          confidence: target ? 'manual' : 'unknown',
          stopId: target || undefined,
          photos: moving.sort(byDate),
          target,
          checked: !!target,
        },
        ...next,
      ];
    }
    onChange(next);
  };

  const section = (confidence: Kind) =>
    groups
      .filter((g) => g.confidence === confidence)
      .map((g) => (
        <GroupRow
          key={g.key}
          group={g}
          stops={stops}
          trips={trips}
          onToggle={() => update(g.key, { checked: !g.checked && !!g.target })}
          onTarget={(target) => update(g.key, { target, checked: !!target })}
          onMove={(paths, target) => move(g.key, paths, target)}
        />
      ));

  return (
    <>
      <Note>
        {`${read} photo${s(read)} lue${s(read)} : ${count('sure')} rangée${s(count('sure'))} automatiquement, ${count('probable')} à vérifier, ${count('unknown')} non classée${s(count('unknown'))}.`}
        {heic > 0
          ? `\n${heic} photo${heic > 1 ? 's' : ''} HEIC ignorée${heic > 1 ? 's' : ''} : Edge ne sait pas les afficher. Dans iCloud pour Windows, décoche « Conserver l’original haute efficacité » puis relance l’analyse.`
          : ''}
        {'\nClique sur des photos pour les choisir une à une, puis envoie-les vers la bonne étape ou écarte-les.'}
      </Note>

      {count('manual') > 0 ? (
        <>
          <TapeTitle align="left">Rangées par toi</TapeTitle>
          <Text style={styles.hint}>Les photos que tu as envoyées vers une étape : cochées d’office.</Text>
          {section('manual')}
        </>
      ) : null}

      <TapeTitle align="left">Rangées automatiquement</TapeTitle>
      <Text style={styles.hint}>Prises près d’une étape, à ses dates : cochées d’office.</Text>
      {section('sure')}
      {count('sure') === 0 ? <Text style={styles.empty}>Aucune.</Text> : null}

      <TapeTitle align="left">À vérifier</TapeTitle>
      <Text style={styles.hint}>
        Prises près d’une étape sans date, ou datées pendant un voyage sans lieu (photos WhatsApp…). Coche ce qui
        va bien, change l’étape au besoin, ou trie les photos une à une.
      </Text>
      {count('probable') > 0 ? (
        <View style={styles.actions}>
          <WoodButton label="Tout cocher" onPress={() => setAll('probable', true)} light />
          <WoodButton label="Tout décocher" onPress={() => setAll('probable', false)} light />
        </View>
      ) : (
        <Text style={styles.empty}>Aucune.</Text>
      )}
      {section('probable')}

      <TapeTitle align="left">Non classées</TapeTitle>
      <Text style={styles.hint}>
        Ni lieu ni date qui correspondent à un voyage — la vie courante, le plus souvent — et les photos écartées.
        Choisis une étape pour rattacher un mois entier, ou quelques photos.
      </Text>
      {count('unknown') === 0 ? (
        <Text style={styles.empty}>Aucune.</Text>
      ) : showUnknown ? (
        section('unknown')
      ) : (
        <WoodButton
          label={`Afficher les ${groups.filter((g) => g.confidence === 'unknown').length} paquets`}
          onPress={onShowUnknown}
          light
        />
      )}

      <View style={[styles.actions, styles.footer]}>
        <WoodButton
          label={selected ? `Ajouter ${selected} photo${selected > 1 ? 's' : ''}` : 'Aucune photo cochée'}
          onPress={() => selected && onImport(groups)}
          disabled={!selected}
        />
      </View>
    </>
  );
}

/** Liste des étapes, groupées par voyage, pour les menus « vers quelle étape ». */
function StopOptions({ trips }: { trips: Trip[] }) {
  return (
    <>
      {trips.map((t) => (
        <optgroup key={t.id} label={t.name}>
          {t.stops.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

/** Nombre de miniatures montrées d'emblée dans un paquet (« Voir toutes » pour la suite). */
const PREVIEW = 12;

function GroupRow({
  group,
  stops,
  trips,
  onToggle,
  onTarget,
  onMove,
}: {
  group: ReviewGroup;
  stops: Map<string, { stop: Trip['stops'][number]; trip: Trip }>;
  trips: Trip[];
  onToggle: () => void;
  onTarget: (stopId: string) => void;
  onMove: (paths: string[], target: string) => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const target = stops.get(group.target);
  const located = group.photos.filter((p) => p.lat != null).length;
  const title =
    group.key === IGNORED
      ? 'Écartées'
      : group.confidence === 'unknown'
        ? monthLabel(group.month)
        : `${target?.stop.name ?? '?'}${target && target.trip.stops.length > 1 ? ` · ${target.trip.name}` : ''}`;
  const details = [
    `${group.photos.length} photo${s(group.photos.length)}`,
    dateRange(group.photos),
    located === group.photos.length ? 'toutes géolocalisées' : located ? `${located} géolocalisées` : 'sans lieu',
  ].join(' · ');
  const shown = showAll ? group.photos : group.photos.slice(0, PREVIEW);

  const toggle = (path: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  const send = (to: string) => {
    onMove([...picked], to);
    setPicked(new Set());
  };

  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: group.checked }}
          accessibilityLabel={`Ajouter tout le paquet ${title}`}
          style={[styles.check, group.checked && styles.checkOn]}>
          {group.checked ? <Text style={styles.checkMark}>✓</Text> : null}
        </Pressable>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowDetails}>{details}</Text>
        </View>
        <select value={group.target} onChange={(e) => onTarget(e.target.value)} style={SELECT_STYLE}>
          <option value="">— Ne pas ajouter —</option>
          <StopOptions trips={trips} />
        </select>
      </View>

      <View style={styles.thumbs}>
        {shown.map((p) => {
          const on = picked.has(p.path);
          return (
            <Pressable
              key={p.path}
              onPress={() => toggle(p.path)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`Choisir la photo ${p.path}`}
              style={[styles.thumb, on && styles.thumbOn]}>
              <PhotoThumb path={p.path} width={THUMB} height={THUMB} fast />
              {on ? (
                <View style={styles.thumbCheck}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
        {group.photos.length > PREVIEW ? (
          <Pressable onPress={() => setShowAll(!showAll)} accessibilityRole="button" style={styles.moreBtn}>
            <Text style={styles.more}>
              {showAll ? 'Réduire' : `Voir les ${group.photos.length} photos`}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {picked.size > 0 ? (
        <View style={styles.pickBar}>
          <Text style={styles.pickText}>{`${picked.size} photo${s(picked.size)} choisie${s(picked.size)} :`}</Text>
          <select value="" onChange={(e) => e.target.value && send(e.target.value)} style={SELECT_STYLE}>
            <option value="">Envoyer vers l’étape…</option>
            <StopOptions trips={trips} />
          </select>
          {group.key !== IGNORED ? (
            <Pressable onPress={() => send('')} accessibilityRole="button" style={styles.pickAction}>
              <Text style={styles.pickDrop}>Écarter</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setPicked(new Set(group.photos.map((p) => p.path)))}
            accessibilityRole="button"
            style={styles.pickAction}>
            <Text style={styles.pickLink}>Tout choisir</Text>
          </Pressable>
          <Pressable onPress={() => setPicked(new Set())} accessibilityRole="button" style={styles.pickAction}>
            <Text style={styles.pickLink}>Annuler</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <View style={styles.note}>
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    marginTop: 26,
    backgroundColor: '#fdfbf2',
    padding: 16,
    maxWidth: 760,
    boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.18), 0px 10px 14px -8px rgba(0, 0, 0, 0.6)',
  },
  noteText: { color: INK, fontSize: 15, lineHeight: 22 },
  hint: { color: '#f3e6c8', fontSize: 14, marginTop: 10, maxWidth: 760 },
  empty: { color: '#f3e6c8', fontSize: 14, marginTop: 8, fontStyle: 'italic' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  footer: { marginTop: 34 },


  row: {
    marginTop: 14,
    backgroundColor: '#fdfbf2',
    padding: 12,
    maxWidth: 980,
    boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.18), 0px 8px 12px -8px rgba(0, 0, 0, 0.55)',
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  check: {
    width: 26,
    height: 26,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#8a6d3b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: '#2c5418', borderColor: '#2c5418' },
  checkMark: { color: '#fff', fontWeight: '800', fontSize: 16 },
  rowText: { flex: 1, minWidth: 180 },
  rowTitle: { fontFamily: FONT.handBold, fontSize: 24, color: INK },
  rowDetails: { color: MUTED, fontSize: 13 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' },
  more: { color: MUTED, fontSize: 14, fontWeight: '700' },
  moreBtn: { minHeight: THUMB, justifyContent: 'center', paddingHorizontal: 8 },
  thumb: { borderWidth: 3, borderColor: 'transparent' },
  thumbOn: { borderColor: '#1f3a8a' },
  thumbCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1f3a8a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ffe680',
    boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.18), 0px 6px 10px -6px rgba(0, 0, 0, 0.5)',
  },
  pickText: { fontFamily: FONT.handBold, fontSize: 21, color: INK },
  pickAction: { minHeight: 36, justifyContent: 'center' },
  pickDrop: { fontSize: 14, fontWeight: '700', color: '#b3261e' },
  pickLink: { fontSize: 14, fontWeight: '700', color: MUTED },
});
