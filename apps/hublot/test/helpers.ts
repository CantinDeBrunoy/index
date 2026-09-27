import { readFileSync } from "node:fs";
import type { Config, Watch } from "../src/config.js";
import type { ApiTicket } from "../src/travelpayouts.js";

export const TODAY = "2026-09-26";

export function watch(overrides: Partial<Watch> = {}): Watch {
  return {
    id: "tokyo",
    label: "Tokyo",
    to: "TYO",
    maxPrice: 600,
    departFrom: TODAY,
    departTo: "2027-05-31",
    minDays: 14,
    maxDays: 60,
    ...overrides,
  };
}

export const CONFIG: Config = {
  origins: ["CDG", "ORY"],
  currency: "eur",
  watches: [watch({ id: "mexico", label: "Mexico", to: "MEX", maxPrice: 500 }), watch()],
};

export const TYO_FIXTURE = "prices_for_dates_PAR-TYO_2027-03_2027-04.json";
export const MEX_FIXTURE = "prices_for_dates_PAR-MEX_2027-01_2027-02.json";

/** Mocked API response (same shape as the documented one). */
export function loadFixture(name: string): { success: boolean; currency: string; data: ApiTicket[] } {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
}

/** A valid Paris → Tokyo ticket (CDG → HND, 12 March → 4 April, 548 €) to derive edge cases from. */
export function ticket(overrides: Partial<ApiTicket> = {}): ApiTicket {
  return {
    origin: "PAR",
    destination: "TYO",
    origin_airport: "CDG",
    destination_airport: "HND",
    price: 548,
    airline: "AF",
    flight_number: "274",
    departure_at: "2027-03-12T10:25:00+01:00",
    return_at: "2027-04-04T11:05:00+09:00",
    transfers: 0,
    return_transfers: 0,
    link: "/search/PAR1203TYO04041?t=AF18053&expected_price_currency=eur",
    ...overrides,
  };
}
