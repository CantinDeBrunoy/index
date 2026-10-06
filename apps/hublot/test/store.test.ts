import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadHistory, loadNotified, saveHistory, saveNotified, type Observation } from "../src/store.js";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "fare-radar-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const observation: Observation = {
  observedAt: "2026-09-26T12:00:00.000Z",
  route: "PAR-TYO",
  departDate: "2027-03-12",
  returnDate: "2027-04-04",
  stayDays: 23,
  originAirport: "CDG",
  destinationAirport: "HND",
  price: 548,
  currency: "eur",
  airline: "AF",
  transfers: 0,
  returnTransfers: 0,
};

describe("fichiers data/", () => {
  it("valeurs par défaut quand les fichiers n'existent pas encore", async () => {
    expect(await loadHistory(join(dir, "history.json"))).toEqual({ version: 1, observations: [] });
    expect(await loadNotified(join(dir, "notified.json"))).toEqual({});
  });

  it("historique : relu à l'identique, une observation par ligne", async () => {
    const path = join(dir, "sub", "history.json");
    await saveHistory({ version: 1, observations: [observation, { ...observation, price: 575 }] }, path);

    expect(await loadHistory(path)).toEqual({ version: 1, observations: [observation, { ...observation, price: 575 }] });
    expect((await readFile(path, "utf8")).split("\n")).toHaveLength(8);
  });

  it("notifiés : relus à l'identique", async () => {
    const path = join(dir, "notified.json");
    await saveNotified({ "PAR-TYO|2027-03-12|2027-04-04|548": "2026-09-26T12:00:00.000Z" }, path);
    expect(await loadNotified(path)).toEqual({ "PAR-TYO|2027-03-12|2027-04-04|548": "2026-09-26T12:00:00.000Z" });
  });
});
