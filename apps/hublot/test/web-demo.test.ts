import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoCities, demoConfig, demoReading, isDemo, shiftSnapshot } from "../docs/demo.js";
import { addDays, closestToThreshold, currentDeals, safeOfferLink, timeAgo, watchState, type Snapshot, type SnapshotOffer, type SnapshotWatch } from "../docs/lib.js";
import { parseConfig } from "../src/config.js";

const FIXTURE: Snapshot = JSON.parse(readFileSync(new URL("../docs/demo/latest.json", import.meta.url), "utf8"));

/** Une offre telle que le script l'aurait gardée pour cette surveillance. */
function expectCoherent(offer: SnapshotOffer, watch: SnapshotWatch) {
  expect(offer.departDate >= watch.departFrom && offer.departDate <= watch.departTo).toBe(true);
  expect(offer.stayDays >= watch.minDays && offer.stayDays <= watch.maxDays).toBe(true);
  expect(offer.returnDate).toBe(addDays(offer.departDate, offer.stayDays));
  expect(safeOfferLink(offer.link)).not.toBeNull();
}

describe("mode démo", () => {
  it("ne s'active qu'avec ?demo dans l'adresse", () => {
    expect(isDemo("?demo")).toBe(true);
    expect(isDemo("?demo=1&x=2")).toBe(true);
    expect(isDemo("")).toBe(false);
    expect(isDemo("?mode=demo")).toBe(false);
  });

  // Le jour du relevé fictif, en fin de mois, et bien plus tard : la démo doit rester vivante.
  it.each(["2026-10-09T08:00:00Z", "2026-10-31T21:00:00Z", "2027-06-15T12:00:00Z", "2028-02-29T10:00:00Z"])(
    "montre un relevé récent, cohérent et à venir le %s",
    (iso) => {
      const now = new Date(iso);
      const today = iso.slice(0, 10);
      const snapshot = shiftSnapshot(FIXTURE, now);
      const config = demoConfig(snapshot);

      expect(parseConfig(JSON.parse(JSON.stringify(config)))).toEqual(config);
      expect(timeAgo(snapshot.generatedAt, now)).toBe("il y a 47 min");
      for (const read of snapshot.watches) {
        expect(watchState(read, read, today)).toBe("ready");
        for (const deal of read.deals) {
          expectCoherent(deal, read);
          expect(deal.price).toBeLessThanOrEqual(read.maxPrice);
        }
        for (const { month, best } of read.months) {
          if (!best) continue;
          expectCoherent(best, read);
          expect(best.departDate.slice(0, 7)).toBe(month);
        }
      }

      const deals = currentDeals(config, snapshot, today);
      expect(deals).toHaveLength(9);
      expect(deals.every(({ deal }) => deal.departDate > today)).toBe(true);
      expect(new Set(deals.map(({ watch }) => watch.label))).toEqual(new Set(["Lisbonne", "Rome", "Marrakech", "Séoul"]));
      expect(closestToThreshold(config, snapshot, today)).not.toBeNull();
    },
  );

  it("propose ses villes sans appeler l'API", () => {
    expect(demoCities("rey").map((city) => city.name)).toEqual(["Reykjavik"]);
    expect(demoCities("SEOUL").map((city) => city.code)).toEqual(["SEL"]);
    expect(demoCities("ath").map((city) => city.name)).toEqual(["Athènes"]);
    expect(demoCities("zz")).toEqual([]);
  });

  it("invente un relevé reproductible, avec au moins un bon plan, pour une surveillance ajoutée", () => {
    const today = "2026-10-09";
    const reykjavik = { id: "reykjavik", label: "Reykjavik", to: "REK", maxPrice: 250, departFrom: today, departTo: "2027-01-07", minDays: 4, maxDays: 7 };
    const read = demoReading(reykjavik, ["CDG", "ORY"], today);

    expect(demoReading(reykjavik, ["CDG", "ORY"], today)).toEqual(read);
    expect(watchState(reykjavik, read, today)).toBe("ready");
    expect(read.months.map(({ month }) => month)).toEqual(["2026-10", "2026-11", "2026-12", "2027-01"]);
    expect(read.deals.length).toBeGreaterThan(0);
    for (const deal of read.deals) {
      expectCoherent(deal, read);
      expect(deal.departDate >= today).toBe(true);
    }
  });
});
