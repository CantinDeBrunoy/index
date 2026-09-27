import type { Watch } from "../config.js";
import { formatDayMonth, formatPrice } from "../format.js";
import type { Offer } from "../offers.js";

export interface NotificationMessage {
  title: string;
  body: string;
  /** Opened when the notification is tapped. */
  url: string;
  /** Web page listing every current deal, when it is published. */
  overviewUrl?: string;
}

/** A push channel: ntfy today, Telegram tomorrow… */
export interface Notifier {
  readonly name: string;
  send(message: NotificationMessage): Promise<void>;
}

/**
 * Title: "✈️ Tokyo 548 € A/R"
 * Body:  "CDG → HND · 12 mars → 4 avril (23 j) · seuil 600 €"
 */
export function formatDeal(offer: Offer, watch: Pick<Watch, "label" | "maxPrice">, overviewUrl?: string): NotificationMessage {
  return {
    title: `✈️ ${watch.label} ${formatPrice(offer.price, offer.currency)} A/R`,
    body: [
      `${offer.originAirport} → ${offer.destinationAirport}`,
      `${formatDayMonth(offer.departDate)} → ${formatDayMonth(offer.returnDate)} (${offer.stayDays} j)`,
      `seuil ${formatPrice(watch.maxPrice, offer.currency)}`,
    ].join(" · "),
    url: offer.link,
    ...(overviewUrl ? { overviewUrl } : {}),
  };
}
