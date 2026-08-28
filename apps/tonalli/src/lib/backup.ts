import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { EntryMap } from '@/data/types';
import { todayKey } from '@/lib/dates';
import { sanitizeEntry } from '@/storage/entries';

const FORMAT = 'nuancier';
const FORMAT_VERSION = 1;

/** Contenu du fichier d'export : lisible à l'œil nu, et relisible par l'app. */
export function buildBackup(entries: EntryMap): string {
  const list = Object.values(entries).sort((a, b) => a.date.localeCompare(b.date));
  return JSON.stringify(
    {
      app: FORMAT,
      version: FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      entries: list,
    },
    null,
    2,
  );
}

/**
 * Lit un fichier d'export. Accepte aussi un simple tableau d'entrées, pour
 * qu'un JSON écrit à la main reste importable. Les entrées invalides sont
 * ignorées ; un fichier sans aucune entrée valide est une erreur.
 */
export function parseBackup(text: string): EntryMap {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n'est pas du JSON valide.");
  }

  const list = Array.isArray(payload)
    ? payload
    : typeof payload === 'object' && payload !== null && Array.isArray((payload as any).entries)
      ? ((payload as any).entries as unknown[])
      : null;

  if (!list) throw new Error("Ce fichier ne ressemble pas à un export Nuancier.");

  const entries: EntryMap = {};
  for (const item of list) {
    const entry = sanitizeEntry(item);
    if (entry) entries[entry.date] = entry;
  }

  if (Object.keys(entries).length === 0) {
    throw new Error('Aucune journée valide dans ce fichier.');
  }

  return entries;
}

export type MergeResult = {
  merged: EntryMap;
  /** Journées absentes du nuancier actuel. */
  added: number;
  /** Journées existantes remplacées par une version plus récente. */
  updated: number;
  /** Journées conservées telles quelles. */
  kept: number;
};

/** Fusion non destructive : à date égale, la version la plus récente gagne. */
export function mergeEntries(current: EntryMap, incoming: EntryMap): MergeResult {
  const merged: EntryMap = { ...current };
  let added = 0;
  let updated = 0;
  let kept = 0;

  for (const entry of Object.values(incoming)) {
    const existing = merged[entry.date];
    if (!existing) {
      merged[entry.date] = entry;
      added += 1;
    } else if (entry.updatedAt > existing.updatedAt) {
      merged[entry.date] = entry;
      updated += 1;
    } else {
      kept += 1;
    }
  }

  return { merged, added, updated, kept };
}

export type ExportOutcome = 'shared' | 'sharing-unavailable';

export async function exportEntries(entries: EntryMap): Promise<ExportOutcome> {
  const file = new File(Paths.cache, `nuancier-${todayKey()}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(buildBackup(entries));

  if (!(await Sharing.isAvailableAsync())) return 'sharing-unavailable';

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Exporter mon nuancier',
    UTI: 'public.json',
  });
  return 'shared';
}

/** `null` si l'utilisateur a annulé le sélecteur de fichier. */
export async function pickBackup(): Promise<EntryMap | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.length) return null;

  const text = await new File(result.assets[0].uri).text();
  return parseBackup(text);
}
