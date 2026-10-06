import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { NotifiedMap } from "./alerts.js";
import type { Offer } from "./offers.js";
import type { Snapshot } from "./snapshot.js";

export const HISTORY_PATH = "data/history.json";
export const NOTIFIED_PATH = "data/notified.json";
export const SNAPSHOT_PATH = "data/latest.json";

/**
 * One price reading. Flat on purpose: the median detection planned for V2 boils down to a
 * group by route × departure month over a time window.
 */
export interface Observation {
  /** ISO date of the reading. */
  observedAt: string;
  route: string;
  departDate: string;
  returnDate: string;
  stayDays: number;
  originAirport: string;
  destinationAirport: string;
  price: number;
  currency: string;
  airline: string;
  transfers: number;
  returnTransfers: number;
}

export interface History {
  version: 1;
  observations: Observation[];
}

export function toObservation(offer: Offer, observedAt: Date): Observation {
  return {
    observedAt: observedAt.toISOString(),
    route: offer.route,
    departDate: offer.departDate,
    returnDate: offer.returnDate,
    stayDays: offer.stayDays,
    originAirport: offer.originAirport,
    destinationAirport: offer.destinationAirport,
    price: offer.price,
    currency: offer.currency,
    airline: offer.airline,
    transfers: offer.transfers,
    returnTransfers: offer.returnTransfers,
  };
}

export async function loadHistory(path = HISTORY_PATH): Promise<History> {
  const raw = await readJson(path);
  if (raw === undefined) return { version: 1, observations: [] };
  if (!isRecord(raw) || !Array.isArray(raw.observations)) throw new Error(`${path} : format inattendu`);
  return { version: 1, observations: raw.observations as Observation[] };
}

export async function saveHistory(history: History, path = HISTORY_PATH): Promise<void> {
  await writeAtomically(path, serializeHistory(history));
}

/** One observation per line: compact, and each reading shows up as a small diff in git. */
export function serializeHistory(history: History): string {
  if (history.observations.length === 0) return `{\n  "version": 1,\n  "observations": []\n}\n`;
  const lines = history.observations.map((observation) => `    ${JSON.stringify(observation)}`);
  return `{\n  "version": 1,\n  "observations": [\n${lines.join(",\n")}\n  ]\n}\n`;
}

export async function loadNotified(path = NOTIFIED_PATH): Promise<NotifiedMap> {
  const raw = await readJson(path);
  if (raw === undefined) return {};
  if (!isRecord(raw) || !Object.values(raw).every((value) => typeof value === "string")) {
    throw new Error(`${path} : format inattendu`);
  }
  return raw as NotifiedMap;
}

export async function saveNotified(notified: NotifiedMap, path = NOTIFIED_PATH): Promise<void> {
  const sorted = Object.fromEntries(Object.entries(notified).sort(([a], [b]) => a.localeCompare(b)));
  await writeAtomically(path, `${JSON.stringify(sorted, null, 2)}\n`);
}

export async function saveSnapshot(snapshot: Snapshot, path = SNAPSHOT_PATH): Promise<void> {
  await writeAtomically(path, `${JSON.stringify(snapshot, null, 2)}\n`);
}

async function readJson(path: string): Promise<unknown> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  return JSON.parse(text);
}

/** Write to a temporary file then rename it: a crash never leaves a truncated JSON file behind. */
async function writeAtomically(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, content, "utf8");
  await rename(temporary, path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
