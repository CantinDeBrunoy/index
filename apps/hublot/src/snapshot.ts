// data/latest.json: the result of the last reading, read by the web page (docs/).

import type { Config, Watch } from "./config.js";
import { isDeal } from "./alerts.js";
import type { Offer } from "./offers.js";
import type { WatchResult } from "./run.js";

/** Deals kept per watch in the snapshot, cheapest first. */
export const SNAPSHOT_DEALS_PER_WATCH = 30;

export type SnapshotOffer = Pick<
  Offer,
  | "price"
  | "departDate"
  | "returnDate"
  | "stayDays"
  | "originAirport"
  | "destinationAirport"
  | "airline"
  | "transfers"
  | "returnTransfers"
  | "link"
>;

/** A watch as it was read (the page spots the ones edited since), with its results. */
export interface SnapshotWatch extends Watch {
  deals: SnapshotOffer[];
  months: { month: string; best: SnapshotOffer | null; offers: number; failed: boolean }[];
}

export interface Snapshot {
  version: 1;
  generatedAt: string;
  currency: string;
  origins: string[];
  watches: SnapshotWatch[];
}

/** GitHub Pages address of the repository ("owner/repo" as given by GitHub Actions), if known. */
export function pagesUrl(repository: string | undefined): string | undefined {
  const [owner, repo] = repository?.split("/") ?? [];
  return owner && repo ? `https://${owner.toLowerCase()}.github.io/${repo}/` : undefined;
}

export function buildSnapshot(config: Config, results: readonly WatchResult[], generatedAt: Date): Snapshot {
  return {
    version: 1,
    generatedAt: generatedAt.toISOString(),
    currency: config.currency,
    origins: config.origins,
    watches: results.map(({ watch, months }) => ({
      ...watch,
      deals: months
        .flatMap(({ offers }) => offers.filter((offer) => isDeal(offer, watch.maxPrice)))
        .sort((a, b) => a.price - b.price || a.departDate.localeCompare(b.departDate))
        .slice(0, SNAPSHOT_DEALS_PER_WATCH)
        .map(toSnapshotOffer),
      months: months.map(({ month, offers, errors }) => ({
        month,
        best: offers[0] ? toSnapshotOffer(offers[0]) : null,
        offers: offers.length,
        failed: errors.length > 0,
      })),
    })),
  };
}

function toSnapshotOffer(offer: Offer): SnapshotOffer {
  const { price, departDate, returnDate, stayDays, originAirport, destinationAirport, airline, transfers, returnTransfers, link } = offer;
  return { price, departDate, returnDate, stayDays, originAirport, destinationAirport, airline, transfers, returnTransfers, link };
}
