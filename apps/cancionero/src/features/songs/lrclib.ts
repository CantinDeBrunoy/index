// Import automatique de paroles via LRCLIB (https://lrclib.net) — base
// communautaire gratuite, sans compte. Fournit les paroles brutes et, souvent,
// des paroles SYNCHRONISÉES (format LRC) idéales pour le karaoké.

import type { Song, SongLine } from './types';

const BASE = 'https://lrclib.net/api';
const HEADERS = { 'User-Agent': 'Cancionero (app perso apprentissage espagnol)' };

export type LrcResult = {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string | null;
  duration: number | null;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
};

const flatten = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

/** Titre débarrassé du nom d'artiste (LRCLIB a des entrées « ARTISTE - TITRE »). */
function titleKey(r: LrcResult) {
  const t = flatten(r.trackName);
  const a = flatten(r.artistName);
  return a && t.includes(a) ? t.replace(a, '') : t;
}

/**
 * Titre lisible : beaucoup d'entrées LRCLIB sont nommées « ARTISTE )) - TITRE ».
 * On retire le nom d'artiste en tête et la ponctuation résiduelle.
 */
export function cleanTrackName(r: LrcResult): string {
  const original = r.trackName.trim();
  const artist = r.artistName.trim();
  let t = original;
  if (artist) {
    const esc = artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp(`^\\s*${esc}\\s*`, 'i'), '');
  }
  t = t.replace(/^[\s\-–—|)(\][:.]+/, '').trim();
  return t.length > 0 ? t : original;
}

/**
 * LRCLIB renvoie beaucoup de quasi-doublons pour un même morceau. On n'en garde
 * qu'un par (artiste, titre), en privilégiant la version synchronisée et la plus
 * complète, puis on remonte les versions synchronisées en tête.
 */
export function dedupeResults(results: LrcResult[]): LrcResult[] {
  const map = new Map<string, LrcResult>();
  for (const r of results) {
    const key = `${flatten(r.artistName)}|${titleKey(r)}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, r);
      continue;
    }
    const prevSynced = !!prev.syncedLyrics;
    const rSynced = !!r.syncedLyrics;
    const better =
      (!prevSynced && rSynced) ||
      (prevSynced === rSynced &&
        (r.plainLyrics?.length ?? 0) > (prev.plainLyrics?.length ?? 0));
    if (better) map.set(key, r);
  }
  return [...map.values()].sort(
    (a, b) => Number(!!b.syncedLyrics) - Number(!!a.syncedLyrics),
  );
}

/** Cherche des chansons par titre / artiste. */
export async function searchLyrics(query: string): Promise<LrcResult[]> {
  const url = `${BASE}/search?q=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`LRCLIB a répondu ${res.status}`);
  const data = (await res.json()) as LrcResult[];
  if (!Array.isArray(data)) return [];
  return dedupeResults(data.filter((r) => !r.instrumental));
}

/** Convertit une ligne LRC « [mm:ss.xx] texte » en secondes + texte. */
function parseLrcLine(line: string): { time: number; text: string } | null {
  const m = line.match(/^\s*\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)$/);
  if (!m) return null;
  const min = parseInt(m[1], 10);
  const sec = parseInt(m[2], 10);
  const frac = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) / 1000 : 0;
  return { time: min * 60 + sec + frac, text: m[4].trim() };
}

/** Transforme des paroles LRC synchronisées en lignes horodatées. */
function fromSynced(lrc: string): SongLine[] {
  return lrc
    .split('\n')
    .map(parseLrcLine)
    .filter((l): l is { time: number; text: string } => !!l && l.text.length > 0)
    .map((l) => ({ es: l.text, fr: '', time: l.time }));
}

/** Transforme des paroles brutes (non synchronisées) en lignes. */
function fromPlain(plain: string): SongLine[] {
  return plain
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => ({ es: l, fr: '' }));
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

/** Construit une chanson Cancionero à partir d'un résultat LRCLIB. */
export function resultToSong(r: LrcResult): Song {
  const synced = r.syncedLyrics ? fromSynced(r.syncedLyrics) : [];
  const useSynced = synced.length > 0;
  const lines = useSynced ? synced : fromPlain(r.plainLyrics ?? '');
  return {
    id: `${slugify(r.artistName + '-' + r.trackName)}-${r.id}`,
    title: cleanTrackName(r),
    artist: r.artistName || 'Inconnu',
    level: 'intermediaire',
    emoji: '🎵',
    source: 'user',
    lines,
    duration: r.duration ?? undefined,
    synced: useSynced,
  };
}
