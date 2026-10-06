import { byPrice, type Offer } from "./offers.js";

/** Dedup key → ISO date of the notification. */
export type NotifiedMap = Record<string, string>;

export const NOTIFIED_RETENTION_DAYS = 30;

/** Key of an offer for deduplication: route + dates + price, e.g. "PAR-TYO|2027-03-12|2027-04-04|548". */
export function dedupKey(offer: Offer): string {
  return [offer.route, offer.departDate, offer.returnDate, Math.round(offer.price)].join("|");
}

export function isDeal(offer: Offer, maxPrice: number): boolean {
  return offer.price <= maxPrice;
}

export interface AlertDecision {
  /** Cheapest new deal: the only one notified. */
  send: Offer;
  /** Every new deal of the batch (`send` included), marked as notified together. */
  mark: Offer[];
}

/**
 * Anti-burst: a batch (one route × departure month) triggers at most one notification, for its
 * cheapest new deal. Otherwise a promotion would send a notification per date.
 */
export function decideAlert(offers: readonly Offer[], maxPrice: number, notified: NotifiedMap): AlertDecision | undefined {
  const fresh = offers.filter((offer) => isDeal(offer, maxPrice) && !Object.hasOwn(notified, dedupKey(offer)));
  const [send] = fresh.sort(byPrice);
  return send ? { send, mark: fresh } : undefined;
}

export function markNotified(notified: NotifiedMap, offers: readonly Offer[], at: Date): void {
  for (const offer of offers) notified[dedupKey(offer)] = at.toISOString();
}

/** Forgets keys notified more than `retentionDays` ago (an unreadable date counts as expired). */
export function purgeNotified(notified: NotifiedMap, now: Date, retentionDays = NOTIFIED_RETENTION_DAYS): NotifiedMap {
  const cutoff = now.getTime() - retentionDays * 86_400_000;
  return Object.fromEntries(Object.entries(notified).filter(([, at]) => Date.parse(at) >= cutoff));
}
