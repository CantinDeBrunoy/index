// French display helpers shared by the notifications and the console report.

import { parseIsoDate } from "./dates.js";

const dayMonth = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" });
const CURRENCY_SYMBOLS: Record<string, string> = { eur: "€", usd: "$", gbp: "£" };

/** "2027-03-12" → "12 mars" */
export function formatDayMonth(date: string): string {
  return dayMonth.format(parseIsoDate(date));
}

/** "2027-03" → "mars 2027" */
export function formatMonth(month: string): string {
  return monthYear.format(parseIsoDate(`${month}-01`));
}

/** 548, "eur" → "548 €" */
export function formatPrice(price: number, currency: string): string {
  return `${Math.round(price)} ${CURRENCY_SYMBOLS[currency.toLowerCase()] ?? currency.toUpperCase()}`;
}
