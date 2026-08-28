/**
 * Tout le calendrier de l'app raisonne en *date locale de l'appareil*.
 * On n'utilise jamais `toISOString()` (qui renvoie de l'UTC et décale la
 * journée le soir dans les fuseaux négatifs, le matin dans les positifs) :
 * les clés `YYYY-MM-DD` sont toujours construites à partir de
 * `getFullYear` / `getMonth` / `getDate`.
 */

export type YearMonth = { year: number; month: number }; // month : 0-11

const pad = (n: number) => String(n).padStart(2, '0');

export const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export const MONTH_NAMES_SHORT = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

const DAY_NAMES = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
];

/** Initiales de la semaine, lundi en premier. */
export const WEEKDAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Clé `YYYY-MM-DD` d'une date, dans le fuseau de l'appareil. */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Clé du jour courant, dans le fuseau de l'appareil. */
export function todayKey(): string {
  return dateKey(new Date());
}

/** Date locale (minuit) correspondant à une clé. */
export function keyToDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Vraie clé de calendrier : bien formée *et* correspondant à un jour réel. */
export function isValidKey(value: unknown): value is string {
  if (typeof value !== 'string' || !KEY_RE.test(value)) return false;
  return dateKey(keyToDate(value)) === value;
}

export function makeKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Index 0-6 du jour de la semaine, lundi = 0. */
function mondayFirstIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * Grille d'un mois, lundi en première colonne : des `null` en tête pour les
 * cases vides, puis une clé par jour. La longueur est complétée jusqu'à un
 * multiple de 7 pour que la grille reste rectangulaire.
 */
export function monthGrid(year: number, month: number): (string | null)[] {
  const cells: (string | null)[] = [];
  const lead = mondayFirstIndex(new Date(year, month, 1));
  for (let i = 0; i < lead; i += 1) cells.push(null);
  const total = daysInMonth(year, month);
  for (let day = 1; day <= total; day += 1) cells.push(makeKey(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Les clés d'un mois, sans cases vides. */
export function monthDays(year: number, month: number): string[] {
  const total = daysInMonth(year, month);
  return Array.from({ length: total }, (_, i) => makeKey(year, month, i + 1));
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function currentYearMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function yearMonthOfKey(key: string): YearMonth {
  const date = keyToDate(key);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function isFutureKey(key: string, reference: string = todayKey()): boolean {
  return key > reference;
}

export function monthLabel({ year, month }: YearMonth): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

/** « jeudi 28 août 2026 » */
export function formatLongDate(key: string): string {
  const date = keyToDate(key);
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/** « 28 août » */
export function formatShortDate(key: string): string {
  const date = keyToDate(key);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

export function formatTime(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`;
}

/** Les `count` prochains jours à partir d'aujourd'hui inclus. */
export function nextDays(count: number, from: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    keys.push(dateKey(date));
  }
  return keys;
}

/** Instant local exact d'un rappel pour un jour donné. */
export function reminderDate(key: string, hour: number, minute: number): Date {
  const date = keyToDate(key);
  date.setHours(hour, minute, 0, 0);
  return date;
}
