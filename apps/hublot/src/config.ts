import { readFile } from "node:fs/promises";
import { isIsoDate } from "./dates.js";

export const CONFIG_PATH = "config.json";

/** City queried on the API (IATA city code: also covers BVA, LBG…, hence the `origins` filter). */
export const ORIGIN_CITY = "PAR";

/** Longest stay the API can return (see isQueryableMonthPair). */
export const MAX_STAY_DAYS = 60;

/** A trip to watch. Edited from the web page (docs/), which applies the same rules. */
export interface Watch {
  /** Stable identifier, used by the web page to edit or delete the watch. */
  id: string;
  label: string;
  /** IATA code of the destination city or airport. */
  to: string;
  /** Alert threshold for a round trip, in `Config.currency`. */
  maxPrice: number;
  /** Departure window, "YYYY-MM-DD", bounds included. */
  departFrom: string;
  departTo: string;
  /** Stay length (return − departure) in days, bounds included. */
  minDays: number;
  maxDays: number;
}

export interface Config {
  /** Departure airports accepted. */
  origins: string[];
  currency: string;
  watches: Watch[];
}

export async function loadConfig(path = CONFIG_PATH): Promise<Config> {
  return parseConfig(JSON.parse(await readFile(path, "utf8")));
}

export function parseConfig(raw: unknown): Config {
  if (!isRecord(raw)) fail("un objet JSON est attendu");

  const { origins, currency, watches } = raw;
  if (!Array.isArray(origins) || origins.length === 0 || !origins.every(isIataCode)) {
    fail(`"origins" doit être une liste de codes IATA, ex. ["CDG", "ORY"]`);
  }
  if (typeof currency !== "string" || !/^[a-z]{3}$/i.test(currency)) {
    fail(`"currency" doit être un code devise, ex. "eur"`);
  }
  if (!Array.isArray(watches)) fail(`"watches" doit être une liste`);

  const parsedWatches = watches.map(parseWatch);
  const ids = parsedWatches.map((watch) => watch.id);
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) fail(`l'identifiant "${duplicate}" apparaît deux fois dans "watches"`);

  return { origins: origins.map((code) => code.toUpperCase()), currency: currency.toLowerCase(), watches: parsedWatches };
}

function parseWatch(raw: unknown, index: number): Watch {
  const where = `watches[${index}]`;
  if (!isRecord(raw)) fail(`${where} doit être un objet`);
  const { id, label, to, maxPrice, departFrom, departTo, minDays, maxDays } = raw;

  if (typeof id !== "string" || !/^[a-z0-9-]{1,40}$/i.test(id)) fail(`${where}.id doit être un identifiant (lettres, chiffres, tirets)`);
  if (typeof label !== "string" || label.trim() === "") fail(`${where}.label doit être un nom, ex. "Tokyo"`);
  if (!isIataCode(to)) fail(`${where}.to doit être un code IATA, ex. "TYO"`);
  if (typeof maxPrice !== "number" || !(maxPrice > 0)) fail(`${where}.maxPrice doit être un prix positif`);
  if (!isIsoDate(departFrom) || !isIsoDate(departTo) || departFrom > departTo) {
    fail(`${where} : "departFrom" et "departTo" doivent être des dates AAAA-MM-JJ, dans l'ordre`);
  }
  if (!isStay(minDays) || !isStay(maxDays) || minDays > maxDays) {
    fail(`${where} : "minDays" et "maxDays" doivent être des durées de 0 à ${MAX_STAY_DAYS} jours, dans l'ordre`);
  }

  return { id, label: label.trim(), to: to.toUpperCase(), maxPrice, departFrom, departTo, minDays, maxDays };
}

function fail(message: string): never {
  throw new Error(`config.json invalide : ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIataCode(value: unknown): value is string {
  return typeof value === "string" && /^[a-z]{3}$/i.test(value);
}

function isStay(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_STAY_DAYS;
}
