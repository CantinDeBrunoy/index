import { describe, expect, it } from "vitest";
import { collectPrices } from "../src/run.js";
import { buildSnapshot, pagesUrl } from "../src/snapshot.js";
import { CONFIG, loadFixture, TODAY, TYO_FIXTURE } from "./helpers.js";

const NOW = new Date("2026-09-26T12:00:00Z");

describe("data/latest.json", () => {
  it("donne à la page les bons plans et le meilleur prix de chaque mois", async () => {
    const config = { ...CONFIG, watches: CONFIG.watches.filter((watch) => watch.to === "TYO") };
    const results = await collectPrices(config, async (query) => (query.departureMonth === "2027-03" && query.returnMonth === "2027-04" ? loadFixture(TYO_FIXTURE).data : []), TODAY);
    const snapshot = buildSnapshot(config, results, NOW);

    expect(snapshot).toMatchObject({ version: 1, generatedAt: "2026-09-26T12:00:00.000Z", currency: "eur", origins: ["CDG", "ORY"] });
    const [tokyo] = snapshot.watches;
    expect(tokyo).toMatchObject({ id: "tokyo", to: "TYO", maxPrice: 600, departFrom: TODAY, departTo: "2027-05-31" });
    expect(tokyo?.deals.map((deal) => deal.price)).toEqual([548, 575]);
    expect(tokyo?.deals[0]).toEqual({
      price: 548,
      departDate: "2027-03-12",
      returnDate: "2027-04-04",
      stayDays: 23,
      originAirport: "CDG",
      destinationAirport: "HND",
      airline: "AF",
      transfers: 0,
      returnTransfers: 0,
      link: expect.stringMatching(/^https:\/\/www\.aviasales\.fr\/search\//),
    });
    expect(tokyo?.months).toHaveLength(9);
    expect(tokyo?.months.find((month) => month.month === "2027-03")).toMatchObject({ best: { price: 548 }, offers: 4, failed: false });
    expect(tokyo?.months.find((month) => month.month === "2027-04")).toEqual({ month: "2027-04", best: null, offers: 0, failed: false });
  });

  it("adresse GitHub Pages déduite du dépôt", () => {
    expect(pagesUrl("CantinDeBrunoy/Hublot")).toBe("https://cantindebrunoy.github.io/Hublot/");
    expect(pagesUrl(undefined)).toBeUndefined();
  });
});
