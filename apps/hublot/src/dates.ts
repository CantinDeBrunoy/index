// Calendar math on "YYYY-MM-DD" dates and "YYYY-MM" months, computed in UTC so that
// no local timezone or DST change can shift a day.

const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(date: string): Date {
  const match = ISO_DATE.exec(date);
  if (!match) throw new Error(`Date invalide : ${date}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

/** A real calendar date written "YYYY-MM-DD" (rejects 2027-02-30). */
export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value) && toIsoDate(parseIsoDate(value)) === value;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return toIsoDate(new Date(parseIsoDate(date).getTime() + days * DAY_MS));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / DAY_MS);
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function addMonths(month: string, count: number): string {
  const first = parseIsoDate(`${month}-01`);
  return monthOf(toIsoDate(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + count, 1))));
}

export function lastDayOfMonth(month: string): string {
  return addDays(`${addMonths(month, 1)}-01`, -1);
}

/** Months overlapping the [from, to] date range, bounds included. */
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  for (let month = monthOf(from); month <= monthOf(to); month = addMonths(month, 1)) months.push(month);
  return months;
}

/** Return months reachable from departures between `firstDeparture` and `lastDeparture`. */
export function returnMonths(firstDeparture: string, lastDeparture: string, minDays: number, maxDays: number): string[] {
  return monthsBetween(addDays(firstDeparture, minDays), addDays(lastDeparture, maxDays));
}
