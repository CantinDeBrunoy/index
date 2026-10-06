import { decideAlert, dedupKey, markNotified, type AlertDecision, type NotifiedMap } from "./alerts.js";
import { ORIGIN_CITY, type Config, type Watch } from "./config.js";
import { lastDayOfMonth, monthsBetween, returnMonths } from "./dates.js";
import { HttpError } from "./http.js";
import { formatDeal, type Notifier } from "./notifiers/notifier.js";
import { filterTickets, type Offer, type RejectReason } from "./offers.js";
import { toObservation, type Observation } from "./store.js";
import { isQueryableMonthPair, type ApiTicket, type FetchPrices, type PriceQuery } from "./travelpayouts.js";

/** Offers kept in the history for each watch × departure month at every reading. */
export const HISTORY_TOP_N = 3;

export interface MonthResult {
  /** Departure month, "YYYY-MM". */
  month: string;
  /** Offers kept after filtering, cheapest first. */
  offers: Offer[];
  requests: number;
  received: number;
  rejected: Record<RejectReason, number>;
  /** Failed requests of the month. */
  errors: string[];
}

export interface WatchResult {
  watch: Watch;
  /** e.g. "PAR-TYO" */
  route: string;
  /** Departure months of the window still to come (empty once the window is over). */
  months: MonthResult[];
}

export interface PlannedAlert extends AlertDecision {
  watch: Watch;
  month: string;
}

export function routeKey(watch: Pick<Watch, "to">): string {
  return `${ORIGIN_CITY}-${watch.to}`;
}

/**
 * Queries, for every watch, each departure month of its window × each return month the API
 * accepts. Queries shared by several watches go out once. A failed request is recorded and the
 * collection goes on, so one watch in trouble never blocks the others; only a rejected token
 * (401/403, identical for every request) stops the run.
 */
export async function collectPrices(
  config: Config,
  fetchPrices: FetchPrices,
  today: string,
  onWatch: (result: WatchResult) => void = () => {},
): Promise<WatchResult[]> {
  const pending = new Map<string, Promise<ApiTicket[]>>();
  const fetchOnce = (query: PriceQuery) => {
    const key = `${query.destination}|${query.departureMonth}|${query.returnMonth}`;
    let tickets = pending.get(key);
    if (!tickets) {
      tickets = fetchPrices(query);
      pending.set(key, tickets);
    }
    return tickets;
  };

  const results: WatchResult[] = [];
  for (const watch of config.watches) {
    const route = routeKey(watch);
    const start = watch.departFrom > today ? watch.departFrom : today;
    const rules = { origins: config.origins, minDays: watch.minDays, maxDays: watch.maxDays, departFrom: start, departTo: watch.departTo };
    const months: MonthResult[] = [];

    for (const month of start <= watch.departTo ? monthsBetween(start, watch.departTo) : []) {
      const monthStart = `${month}-01`;
      const monthEnd = lastDayOfMonth(month);
      const firstDeparture = start > monthStart ? start : monthStart;
      const lastDeparture = watch.departTo < monthEnd ? watch.departTo : monthEnd;
      const returns = returnMonths(firstDeparture, lastDeparture, watch.minDays, watch.maxDays).filter((returnMonth) =>
        isQueryableMonthPair(month, returnMonth),
      );

      const tickets: ApiTicket[] = [];
      const errors: string[] = [];
      for (const returnMonth of returns) {
        try {
          const query = { origin: ORIGIN_CITY, destination: watch.to, departureMonth: month, returnMonth, currency: config.currency };
          tickets.push(...(await fetchOnce(query)));
        } catch (error) {
          if (error instanceof HttpError && (error.status === 401 || error.status === 403)) {
            throw new Error(`Travelpayouts refuse le token (${error.message}) : vérifie TRAVELPAYOUTS_TOKEN`);
          }
          errors.push(`départ ${month}, retour ${returnMonth} : ${errorMessage(error)}`);
        }
      }
      const { offers, rejected } = filterTickets(tickets, route, config.currency, rules);
      months.push({ month, offers, requests: returns.length, received: tickets.length, rejected, errors });
    }

    const result = { watch, route, months };
    results.push(result);
    onWatch(result);
  }
  return results;
}

/**
 * At most one alert per watch × departure month, for offers ≤ maxPrice never notified. An offer
 * matched by several watches is planned only once.
 */
export function planAlerts(results: readonly WatchResult[], notified: NotifiedMap): PlannedAlert[] {
  const known: NotifiedMap = { ...notified };
  const planned: PlannedAlert[] = [];
  for (const { watch, months } of results) {
    for (const { month, offers } of months) {
      const decision = decideAlert(offers, watch.maxPrice, known);
      if (!decision) continue;
      planned.push({ watch, month, ...decision });
      for (const offer of decision.mark) known[dedupKey(offer)] = "planned";
    }
  }
  return planned;
}

/** Offers are marked as notified only once their notification went through. Returns the errors. */
export async function sendAlerts(
  planned: readonly PlannedAlert[],
  notifier: Notifier,
  notified: NotifiedMap,
  now: Date,
  options: { overviewUrl?: string; log?: (message: string) => void } = {},
): Promise<string[]> {
  const errors: string[] = [];
  for (const alert of planned) {
    const message = formatDeal(alert.send, alert.watch, options.overviewUrl);
    try {
      await notifier.send(message);
      markNotified(notified, alert.mark, now);
      options.log?.(`🔔 ${message.title} · ${message.body}`);
    } catch (error) {
      errors.push(`notification ${notifier.name} « ${message.title} » : ${errorMessage(error)}`);
    }
  }
  return errors;
}

/** The cheapest offers of every watch × month; an offer seen by several watches is kept once. */
export function collectObservations(results: readonly WatchResult[], observedAt: Date, topN = HISTORY_TOP_N): Observation[] {
  const seen = new Set<string>();
  const observations: Observation[] = [];
  for (const { months } of results) {
    for (const { offers } of months) {
      for (const offer of offers.slice(0, topN)) {
        const key = `${dedupKey(offer)}|${offer.originAirport}|${offer.destinationAirport}`;
        if (seen.has(key)) continue;
        seen.add(key);
        observations.push(toObservation(offer, observedAt));
      }
    }
  }
  return observations;
}

export function collectErrors(results: readonly WatchResult[]): string[] {
  return results.flatMap(({ watch, months }) => months.flatMap(({ errors }) => errors.map((error) => `${watch.label}, ${error}`)));
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
