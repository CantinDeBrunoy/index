/**
 * Tout le calendrier de Tonalli raisonne en dates locales *de leur auteur*.
 *
 * Deux règles, jamais enfreintes ailleurs dans le code :
 *   1. une clé `YYYY-MM-DD` se construit toujours via `Intl` dans un fuseau
 *      explicite — jamais avec `toISOString()`, qui renvoie de l'UTC et décale
 *      la journée d'un cran le soir à Paris comme le matin à Mexico ;
 *   2. la date d'une entrée n'est jamais convertie à l'affichage : le
 *      calendrier du binôme montre ses dates à lui.
 */

export type YearMonth = { year: number; month: number }; // month : 0-11

export type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const pad = (n: number) => String(n).padStart(2, '0');

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partsCache.set(timeZone, formatter);
  }
  return formatter;
}

/** Fuseau IANA de l'appareil, ex. `Europe/Paris`. */
export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Vrai si le fuseau est connu du navigateur. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Décomposition d'un instant dans un fuseau donné. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');
  // `hour12: false` peut rendre 24 pour minuit selon les moteurs.
  const hour = read('hour') % 24;
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour,
    minute: read('minute'),
    second: read('second'),
  };
}

/** Clé `YYYY-MM-DD` d'un instant, vu depuis un fuseau donné. */
export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

/** Le jour courant tel que le vit quelqu'un dans ce fuseau. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  return dateKeyInTimeZone(now, timeZone);
}

/** Heure locale d'un fuseau, ex. `21:05`. */
export function clockInTimeZone(timeZone: string, now: Date = new Date()): string {
  const parts = zonedParts(now, timeZone);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** Décalage d'un fuseau par rapport à UTC, en minutes, à cet instant. */
export function offsetMinutes(timeZone: string, at: Date = new Date()): number {
  const parts = zonedParts(at, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return Math.round((asUtc - at.getTime()) / 60000);
}

/**
 * Décalage entre deux fuseaux, en minutes, à cet instant. Positif si `a` est
 * en avance sur `b` (Paris vs Mexico : +480 en été, +420 en hiver).
 */
export function offsetBetween(a: string, b: string, at: Date = new Date()): number {
  return offsetMinutes(a, at) - offsetMinutes(b, at);
}

/** « +8 h », « −7 h 30 », « même heure ». */
export function formatOffset(minutes: number, sameLabel: string): string {
  if (minutes === 0) return sameLabel;
  const sign = minutes > 0 ? '+' : '−';
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;
  return rest === 0 ? `${sign}${hours} h` : `${sign}${hours} h ${pad(rest)}`;
}

/** Vraie clé de calendrier : bien formée *et* correspondant à un jour réel. */
export function isValidKey(value: unknown): value is string {
  if (typeof value !== 'string' || !KEY_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month - 1);
}

export function makeKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function yearMonthOfKey(key: string): YearMonth {
  const [year, month] = key.split('-').map(Number);
  return { year, month: month - 1 };
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const date = new Date(Date.UTC(year, month + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

/** Index 0-6 du jour de la semaine, lundi = 0. */
function mondayFirstIndex(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (weekday + 6) % 7;
}

/**
 * Grille d'un mois, lundi en première colonne : `null` pour les cases vides
 * de début et de fin, une clé par jour entre les deux.
 */
export function monthGrid(year: number, month: number): (string | null)[] {
  const cells: (string | null)[] = [];
  const lead = mondayFirstIndex(makeKey(year, month, 1));
  for (let i = 0; i < lead; i += 1) cells.push(null);
  const total = daysInMonth(year, month);
  for (let day = 1; day <= total; day += 1) cells.push(makeKey(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function monthDays(year: number, month: number): string[] {
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => makeKey(year, month, i + 1));
}

export function daysInYear(year: number): number {
  return daysInMonth(year, 1) === 29 ? 366 : 365;
}

/** Jour du mois d'une clé, sans passer par un `Date` local. */
export function dayOfKey(key: string): number {
  return Number(key.slice(8, 10));
}

/**
 * Une clé de date se formate à midi UTC : à cette heure-là, tous les fuseaux
 * de la planète sont le même jour, donc le libellé ne peut pas glisser d'un
 * cran selon le fuseau du lecteur.
 */
function keyToNeutralDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function formatLongDate(key: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(keyToNeutralDate(key));
}

export function formatMonthLabel({ year, month }: YearMonth, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month, 12)),
  );
}

export function formatMonthShort(month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2021, month, 12)),
  );
}

/** Initiales de la semaine, lundi en premier, dans la langue demandée. */
export function weekdayInitials(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' });
  // 2021-02-01 est un lundi.
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(Date.UTC(2021, 1, 1 + index))),
  );
}

export function formatTime(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`;
}
