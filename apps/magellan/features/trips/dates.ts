// Dates des étapes, saisies en texte libre (« March 2025 », « 19–23 août 2025 »,
// « 5 oct. 2024 », « 2019 ») : interprétation, période d'un voyage et libellé court.

import type { Trip } from './types';

const DAY = 24 * 3600 * 1000;

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, janvier: 1, janv: 1,
  february: 2, feb: 2, février: 2, fevrier: 2, févr: 2, fevr: 2,
  march: 3, mar: 3, mars: 3,
  april: 4, apr: 4, avril: 4, avr: 4,
  may: 5, mai: 5,
  june: 6, jun: 6, juin: 6,
  july: 7, jul: 7, juillet: 7, juil: 7,
  august: 8, aug: 8, août: 8, aout: 8,
  september: 9, sep: 9, sept: 9, septembre: 9,
  october: 10, oct: 10, octobre: 10,
  november: 11, nov: 11, novembre: 11,
  december: 12, dec: 12, décembre: 12, decembre: 12, déc: 12,
};

/** Période d'une date d'étape : [start, end[ en ms UTC, et sa précision. */
export type StopDate = { start: number; end: number; precision: 'day' | 'month' | 'year' };

/** Interprète une date d'étape en texte libre. `null` si on n'y reconnaît rien. */
export function parseStopDate(text?: string): StopDate | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const year = t.match(/\b(19|20)\d{2}\b/);
  if (!year) return null;
  const y = Number(year[0]);
  const month = t
    .split(/[^a-zàâçéèêëîïôûùü]+/)
    .map((w) => MONTHS[w])
    .find(Boolean);
  if (!month) return { start: Date.UTC(y, 0, 1), end: Date.UTC(y + 1, 0, 1), precision: 'year' };

  const range = t.match(/\b(\d{1,2})\s*[–—-]\s*(\d{1,2})\b/);
  const single = t.match(/\b(\d{1,2})\b(?=\.?\s*[a-zàâçéèêëîïôûùü])/);
  if (range || single) {
    const d1 = Number(range ? range[1] : single![1]);
    const d2 = Number(range ? range[2] : single![1]);
    return { start: Date.UTC(y, month - 1, d1), end: Date.UTC(y, month - 1, d2 + 1), precision: 'day' };
  }
  return { start: Date.UTC(y, month - 1, 1), end: Date.UTC(y, month, 1), precision: 'month' };
}

/**
 * Période élargie d'une date d'étape, pour rapprocher des photos : ± 2 jours autour
 * de dates précises, ± 10 jours autour d'un mois ou d'une année.
 */
export function stopPeriod(text?: string): { start: number; end: number } | null {
  const d = parseStopDate(text);
  if (!d) return null;
  const margin = (d.precision === 'day' ? 2 : 10) * DAY;
  return { start: d.start - margin, end: d.end + margin };
}

const monthLong = new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' });
const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function shortLabel(d: StopDate): string {
  if (d.precision === 'year') return '';
  if (d.precision === 'month') return monthLong.format(d.start);
  const last = d.end - DAY;
  const first = new Date(d.start).getUTCDate();
  return last > d.start ? `${first}–${dayMonth.format(last)}` : dayMonth.format(d.start);
}

/**
 * Quand a eu lieu un voyage : début (ms, pour trier et grouper par année) et libellé
 * court sans l'année (« 19–23 août », « mars → mai »). `start` est `null` si aucune
 * étape n'a de date reconnue.
 */
export function tripWhen(trip: Trip): { start: number | null; year: number | null; label: string } {
  const dates = trip.stops.map((s) => parseStopDate(s.date)).filter((d): d is StopDate => d !== null);
  if (dates.length === 0) return { start: null, year: null, label: '' };
  const first = dates.reduce((a, b) => (b.start < a.start ? b : a));
  const last = dates.reduce((a, b) => (b.end > a.end ? b : a));
  const a = shortLabel(first);
  const b = shortLabel(last);
  return {
    start: first.start,
    year: new Date(first.start).getUTCFullYear(),
    label: a === b || !b ? a : `${a} → ${b}`,
  };
}
