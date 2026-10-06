// Espace insécable (U+00A0) entre un nombre et son unité : « 7 min » ne se
// coupe pas. Écrite par son code : dans le source, elle serait invisible.
export const NBSP = String.fromCharCode(0xa0);

const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const clock = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** 420 → « 7 min », 3 900 → « 1 h 05 ». À la minute près, jamais moins d'une minute. */
export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}${NBSP}min`;
  const rest = String(minutes % 60).padStart(2, '0');
  return `${Math.floor(minutes / 60)}${NBSP}h${NBSP}${rest}`;
}

/** 850 → « 850 m », 4 230 → « 4,2 km ». */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10}${NBSP}m`;
  return `${decimal.format(meters / 1000)}${NBSP}km`;
}

/** Heure du calcul : « 18:42 ». */
export function formatClock(date: Date): string {
  return clock.format(date);
}

/** Durée d'une recherche : « 1,3 s ». */
export function formatElapsed(ms: number): string {
  return `${decimal.format(ms / 1000)}${NBSP}s`;
}
