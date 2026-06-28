// Calculs dérivés pour les fiches détail (liège) : totaux d'un voyage.

import type { Budget, Trip, TripStop } from './types';

const PEOPLE_LABELS: Record<string, string> = { family: 'Famille', school: 'Classe' };

/** Affichage lisible d'une liste de personnes (traduit family/school). */
export function peopleLabel(people: string[]): string {
  return people.map((p) => PEOPLE_LABELS[p] ?? p).join(', ');
}

/** Somme d'un budget d'étape. */
export function budgetTotal(b?: Budget): number {
  if (!b) return 0;
  return b.hotel + b.food + b.activities + b.transport;
}

/** Budget cumulé de toutes les étapes d'un voyage (par poste). */
export function tripBudget(trip: Trip): Budget {
  return trip.stops.reduce(
    (acc, s) => {
      if (s.budget) {
        acc.hotel += s.budget.hotel;
        acc.food += s.budget.food;
        acc.activities += s.budget.activities;
        acc.transport += s.budget.transport;
      }
      return acc;
    },
    { hotel: 0, food: 0, activities: 0, transport: 0 },
  );
}

/** Durée totale (jours) d'un voyage. */
export function tripDays(trip: Trip): number {
  return trip.stops.reduce((sum, s) => sum + (s.days ?? 0), 0);
}

/** Personnes du voyage (union des étapes, sans doublon, ordre conservé). */
export function tripPeople(trip: Trip): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of trip.stops) for (const p of s.people ?? []) if (!seen.has(p)) { seen.add(p); out.push(p); }
  return out;
}

/** Pays distincts d'un voyage (une étape de référence par pays). */
export function tripCountries(trip: Trip): TripStop[] {
  const seen = new Set<string>();
  const out: TripStop[] = [];
  for (const s of trip.stops) if (!seen.has(s.country)) { seen.add(s.country); out.push(s); }
  return out;
}
