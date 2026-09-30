// Rangement automatique des photos importées dans les étapes des voyages.
//
// Trois niveaux de confiance :
// - « sûres » : prises près d'une étape (GPS, < RADIUS_KM) ET à une date compatible avec
//   la date de l'étape ;
// - « à vérifier » : prises près d'une étape qui n'a pas de date, ou sans position mais
//   datées pendant un voyage (ex. photos reçues par WhatsApp, qui perdent leur GPS) ;
// - « non classées » : ni l'un ni l'autre — la vie courante, le plus souvent.
//
// Indépendant de la plateforme (pas d'accès aux fichiers ici) : testable seul.

import { parseStopDate, stopPeriod, type StopDate } from '@/features/trips/dates';
import type { PhotoRef, Trip, TripStop } from '@/features/trips/types';

/** Photo lue dans le dossier, avec l'origine de sa date (pour l'afficher). */
export type ScannedPhoto = PhotoRef & { dateFrom?: 'exif' | 'nom' | 'fichier' };

export type Confidence = 'sure' | 'probable' | 'unknown';

export type PhotoGroup = {
  key: string;
  confidence: Confidence;
  /** Étape proposée (absente pour les non classées). */
  stopId?: string;
  /** Mois (AAAA-MM) pour les groupes découpés par mois ; absent si sans date. */
  month?: string;
  photos: ScannedPhoto[];
};

/** Distance maximale entre une photo et une étape pour l'y rattacher. */
const RADIUS_KM = 50;
/** Distance à vol d'oiseau entre deux points (km). */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

type Candidate = {
  stop: TripStop;
  order: number;
  /** Période élargie (marge), pour ne pas rater une photo en bord de voyage. */
  period: { start: number; end: number } | null;
  /** Période exacte de la date saisie, pour départager deux voyages qui se chevauchent. */
  exact: StopDate | null;
};

function inPeriod(c: Candidate, time: number): boolean {
  return !!c.period && !Number.isNaN(time) && time >= c.period.start && time <= c.period.end;
}

/**
 * Parmi les étapes dont la période (avec marge) contient la date, la plus plausible :
 * d'abord celles dont la date exacte la contient (« février 2025 » bat « mars 2025 »
 * pour une photo du 20 février), puis la période la plus précise.
 */
function bestByDate(candidates: Candidate[], time: number): Candidate | undefined {
  const exactly = (c: Candidate) => !!c.exact && time >= c.exact.start && time < c.exact.end;
  const span = (c: Candidate) => (c.exact ? c.exact.end - c.exact.start : Infinity);
  return candidates
    .filter((c) => inPeriod(c, time))
    .sort((a, b) => Number(exactly(b)) - Number(exactly(a)) || span(a) - span(b) || a.order - b.order)[0];
}

/**
 * Range les photos : un groupe par étape pour les sûres, par étape et par mois pour
 * celles à vérifier, par mois pour les non classées. Les photos déjà présentes dans
 * une étape sont ignorées.
 */
export function matchPhotos(photos: ScannedPhoto[], trips: Trip[]): PhotoGroup[] {
  const candidates: Candidate[] = trips
    .flatMap((t) => t.stops)
    .map((stop, order) => ({ stop, order, period: stopPeriod(stop.date), exact: parseStopDate(stop.date) }));
  const known = new Set(trips.flatMap((t) => t.stops.flatMap((s) => (s.photos ?? []).map((p) => p.path))));
  const fresh = photos.filter((p) => !known.has(p.path));

  const result = new Map<ScannedPhoto, { stop: Candidate; confidence: Confidence }>();
  // Jour -> étape -> nombre de photos géolocalisées : « où étais-je ce jour-là ».
  const dayVotes = new Map<string, Map<Candidate, number>>();
  const vote = (p: ScannedPhoto, c: Candidate) => {
    if (!p.takenAt) return;
    const day = p.takenAt.slice(0, 10);
    const votes = dayVotes.get(day) ?? new Map<Candidate, number>();
    votes.set(c, (votes.get(c) ?? 0) + 1);
    dayVotes.set(day, votes);
  };

  // 1. Position : l'étape la plus proche dans le rayon, départagée par la date.
  for (const p of fresh) {
    if (p.lat == null || p.lng == null) continue;
    const time = p.takenAt ? Date.parse(p.takenAt) : NaN;
    const near = candidates
      .map((c) => ({ c, km: distanceKm(p.lat!, p.lng!, c.stop.lat, c.stop.lng) }))
      .filter((x) => x.km <= RADIUS_KM)
      .sort((a, b) => a.km - b.km)
      .map((x) => x.c);
    const dated = bestByDate(near, time);
    const undated = near.find((c) => !c.period);
    if (dated) {
      result.set(p, { stop: dated, confidence: 'sure' });
      vote(p, dated);
    } else if (undated) {
      result.set(p, { stop: undated, confidence: 'probable' });
      vote(p, undated);
    }
    // Sinon : lieu d'une étape mais à une autre époque (autre visite) → non classée.
  }

  // 2. Date seule (pas de position) : l'étape où l'on était ce jour-là, sinon celle
  //    dont la période contient la date. Une photo géolocalisée loin de toute étape
  //    reste non classée : on sait qu'elle a été prise ailleurs.
  for (const p of fresh) {
    if (result.has(p) || !p.takenAt || p.lat != null) continue;
    const votes = dayVotes.get(p.takenAt.slice(0, 10));
    if (votes) {
      const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
      result.set(p, { stop: best, confidence: 'probable' });
      continue;
    }
    const time = Date.parse(p.takenAt);
    const hit = bestByDate(candidates, time);
    if (hit) result.set(p, { stop: hit, confidence: 'probable' });
  }

  // 3. Groupes.
  const groups = new Map<string, PhotoGroup & { order: number }>();
  for (const p of fresh) {
    const r = result.get(p);
    const month = p.takenAt?.slice(0, 7);
    const confidence: Confidence = r?.confidence ?? 'unknown';
    const key =
      confidence === 'sure'
        ? `sure:${r!.stop.stop.id}`
        : confidence === 'probable'
          ? `probable:${r!.stop.stop.id}:${month ?? '-'}`
          : `unknown:${month ?? '-'}`;
    const g = groups.get(key) ?? {
      key,
      confidence,
      stopId: r?.stop.stop.id,
      month: confidence === 'sure' ? undefined : month,
      photos: [],
      order: r?.stop.order ?? 0,
    };
    g.photos.push(p);
    groups.set(key, g);
  }

  const rank: Record<Confidence, number> = { sure: 0, probable: 1, unknown: 2 };
  return [...groups.values()]
    .sort(
      (a, b) =>
        rank[a.confidence] - rank[b.confidence] ||
        a.order - b.order ||
        // Non classées : les plus récentes d'abord.
        (a.confidence === 'unknown' ? (b.month ?? '').localeCompare(a.month ?? '') : (a.month ?? '').localeCompare(b.month ?? '')),
    )
    .map(({ order: _order, ...g }) => {
      g.photos.sort((x, y) => (x.takenAt ?? '').localeCompare(y.takenAt ?? ''));
      return g;
    });
}
