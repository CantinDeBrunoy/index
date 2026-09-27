import { daysBetween } from "./dates.js";
import { aviasalesUrl, type ApiTicket } from "./travelpayouts.js";

/** A round trip kept after filtering. */
export interface Offer {
  /** e.g. "PAR-TYO" */
  route: string;
  /** Local date of the outbound flight, "YYYY-MM-DD". */
  departDate: string;
  /** Local date of the return flight, "YYYY-MM-DD". */
  returnDate: string;
  stayDays: number;
  originAirport: string;
  destinationAirport: string;
  price: number;
  currency: string;
  airline: string;
  transfers: number;
  returnTransfers: number;
  /** Absolute URL of the offer on Aviasales. */
  link: string;
}

export interface FilterRules {
  /** Departure airports accepted. */
  origins: readonly string[];
  minDays: number;
  maxDays: number;
  /** Departure window, "YYYY-MM-DD", bounds included (pass today at the earliest). */
  departFrom: string;
  departTo: string;
}

export type RejectReason = "invalid" | "oneWay" | "airport" | "window" | "stay";

export interface FilterResult {
  /** Cheapest first, a single offer per (dates, airports). */
  offers: Offer[];
  rejected: Record<RejectReason, number>;
}

export function filterTickets(
  tickets: readonly ApiTicket[],
  route: string,
  currency: string,
  rules: FilterRules,
): FilterResult {
  const rejected: Record<RejectReason, number> = { invalid: 0, oneWay: 0, airport: 0, window: 0, stay: 0 };
  const cheapest = new Map<string, Offer>();

  for (const ticket of tickets) {
    const offer = toOffer(ticket, route, currency, rules);
    if (typeof offer === "string") {
      rejected[offer]++;
      continue;
    }
    const key = `${offer.departDate}|${offer.returnDate}|${offer.originAirport}|${offer.destinationAirport}`;
    const known = cheapest.get(key);
    if (!known || offer.price < known.price) cheapest.set(key, offer);
  }

  return { offers: [...cheapest.values()].sort(byPrice), rejected };
}

export function byPrice(a: Offer, b: Offer): number {
  return a.price - b.price || a.departDate.localeCompare(b.departDate) || a.returnDate.localeCompare(b.returnDate);
}

function toOffer(ticket: ApiTicket, route: string, currency: string, rules: FilterRules): Offer | RejectReason {
  const departDate = localDate(ticket.departure_at);
  if (!departDate || typeof ticket.price !== "number" || !(ticket.price > 0)) return "invalid";
  if (!ticket.return_at) return "oneWay";
  const returnDate = localDate(ticket.return_at);
  if (!returnDate) return "invalid";

  // The PAR city code also brings back BVA, LBG…: only the configured airports are kept.
  const originAirport = String(ticket.origin_airport ?? "").toUpperCase();
  if (!rules.origins.includes(originAirport)) return "airport";
  if (departDate < rules.departFrom || departDate > rules.departTo) return "window";

  const stayDays = daysBetween(departDate, returnDate);
  if (stayDays < rules.minDays || stayDays > rules.maxDays) return "stay";

  return {
    route,
    departDate,
    returnDate,
    stayDays,
    originAirport,
    destinationAirport: String(ticket.destination_airport ?? "").toUpperCase(),
    price: ticket.price,
    currency,
    airline: String(ticket.airline ?? ""),
    transfers: ticket.transfers ?? 0,
    returnTransfers: ticket.return_transfers ?? 0,
    link: aviasalesUrl(ticket.link),
  };
}

/**
 * Date part of an API timestamp ("2027-03-12T10:25:00+01:00" → "2027-03-12"): the local date of
 * the flight, which is what a stay length is counted on.
 */
function localDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return /^\d{4}-\d{2}-\d{2}/.exec(value)?.[0];
}
