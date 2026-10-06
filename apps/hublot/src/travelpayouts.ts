// Aviasales Data API client, endpoint "prices_for_dates".
// Doc: https://support.travelpayouts.com/hc/en-us/articles/203956163-Aviasales-Data-API
// Limit: 600 requests/minute (https://support.travelpayouts.com/hc/en-us/articles/4402565416594).

import { daysBetween, lastDayOfMonth } from "./dates.js";
import { fetchWithRetry, HttpError, type RetryOptions } from "./http.js";

export const PRICES_FOR_DATES_URL = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";

/** Data source market ("ru" by default according to the doc); "fr" = aviasales.fr, prices in EUR. */
export const MARKET = "fr";

/** Site of the "fr" market: the `link` field of a ticket is appended to it. */
export const AVIASALES_BASE_URL = "https://www.aviasales.fr";

/** Documented maximum. Results come sorted by price, so a single page holds the cheapest ones. */
const LIMIT = 1000;

/**
 * Undocumented limit, met on the real API (HTTP 400 "diff between max depart date and min return
 * date exceeds supported maximum of 30"): a query's first return date must come at most 30 days
 * after its last departure date. With month-wide queries, stays beyond ~2 months are out of reach.
 */
export const MAX_DEPART_RETURN_GAP_DAYS = 30;

export function isQueryableMonthPair(departureMonth: string, returnMonth: string): boolean {
  return daysBetween(lastDayOfMonth(departureMonth), `${returnMonth}-01`) <= MAX_DEPART_RETURN_GAP_DAYS;
}

/** A ticket, as documented for prices_for_dates. */
export interface ApiTicket {
  origin: string;
  destination: string;
  origin_airport: string;
  destination_airport: string;
  price: number;
  airline: string;
  flight_number: string;
  /** Local time with offset, e.g. "2023-07-28T07:00:00+02:00". */
  departure_at: string;
  /** Absent for one-way tickets. */
  return_at?: string;
  transfers: number;
  return_transfers?: number;
  duration?: number;
  duration_to?: number;
  duration_back?: number;
  /** Path to append to the Aviasales site, e.g. "/search/MAD2807BCN26081?t=…". */
  link: string;
}

interface PricesForDatesResponse {
  success: boolean;
  data: ApiTicket[];
  currency?: string;
  error?: string | null;
}

export interface PriceQuery {
  /** IATA city or airport code. */
  origin: string;
  destination: string;
  /** "YYYY-MM" */
  departureMonth: string;
  /** "YYYY-MM" */
  returnMonth: string;
  currency: string;
}

export type FetchPrices = (query: PriceQuery) => Promise<ApiTicket[]>;

/** Every parameter here is documented; the token goes in the X-Access-Token header, never in the URL. */
export function buildPricesForDatesUrl(query: PriceQuery): URL {
  const url = new URL(PRICES_FOR_DATES_URL);
  url.search = new URLSearchParams({
    origin: query.origin,
    destination: query.destination,
    departure_at: query.departureMonth,
    return_at: query.returnMonth,
    // The default (true) returns a single ticket per query because of date grouping.
    one_way: "false",
    direct: "false",
    sorting: "price",
    limit: String(LIMIT),
    page: "1",
    currency: query.currency,
    market: MARKET,
  }).toString();
  return url;
}

export function createTravelpayoutsClient(token: string, retry: RetryOptions = {}): FetchPrices {
  return async (query) => {
    const response = await fetchWithRetry(
      buildPricesForDatesUrl(query),
      { headers: { "X-Access-Token": token, Accept: "application/json" } },
      retry,
    );
    const text = await response.text();
    if (!response.ok) throw new HttpError(response.status, apiErrorMessage(text));

    let body: PricesForDatesResponse;
    try {
      body = JSON.parse(text) as PricesForDatesResponse;
    } catch {
      throw new Error(`réponse non JSON : ${text.slice(0, 200)}`);
    }
    if (!body.success) throw new Error(`l'API a répondu success=false : ${body.error ?? "sans détail"}`);
    if (!Array.isArray(body.data)) throw new Error("réponse inattendue : \"data\" n'est pas une liste");
    if (body.currency && body.currency.toLowerCase() !== query.currency.toLowerCase()) {
      throw new Error(`prix renvoyés en ${body.currency} au lieu de ${query.currency}`);
    }
    if (body.data.length === LIMIT) {
      console.warn(`⚠️ ${query.destination} ${query.departureMonth}→${query.returnMonth} : ${LIMIT} billets, liste peut-être tronquée`);
    }
    return body.data;
  };
}

/** The `error` field of an error response when there is one, else the start of the raw body. */
function apiErrorMessage(body: string): string {
  try {
    const { error } = JSON.parse(body) as { error?: unknown };
    if (typeof error === "string" && error !== "") return error;
  } catch {
    // Not JSON: fall back to the raw body.
  }
  return body.slice(0, 200);
}

/** Absolute URL of the offer on Aviasales, built from the `link` field. */
export function aviasalesUrl(link: unknown): string {
  if (typeof link !== "string" || link === "") return AVIASALES_BASE_URL;
  try {
    return new URL(link, AVIASALES_BASE_URL).toString();
  } catch {
    return AVIASALES_BASE_URL;
  }
}
