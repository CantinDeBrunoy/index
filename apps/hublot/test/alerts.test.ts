import { describe, expect, it } from "vitest";
import { decideAlert, dedupKey, isDeal, markNotified, purgeNotified, type NotifiedMap } from "../src/alerts.js";
import { filterTickets, type Offer } from "../src/offers.js";
import { loadFixture, ticket, TODAY, TYO_FIXTURE } from "./helpers.js";

const rules = { origins: ["CDG", "ORY"], minDays: 14, maxDays: 90, departFrom: TODAY, departTo: "2027-12-31" };
const NOW = new Date("2026-09-26T12:00:00Z");

function offersFor(...tickets: Parameters<typeof ticket>[0][]): Offer[] {
  return filterTickets(tickets.map((overrides) => ticket(overrides)), "PAR-TYO", "eur", rules).offers;
}

describe("détection de seuil", () => {
  it("prix ≤ maxPrice, seuil inclus", () => {
    const [offer] = offersFor({ price: 600 });
    expect(offer && isDeal(offer, 600)).toBe(true);
    expect(offer && isDeal(offer, 599)).toBe(false);
  });

  it("ne déclenche rien quand toutes les offres dépassent le seuil", () => {
    const offers = filterTickets(loadFixture(TYO_FIXTURE).data, "PAR-TYO", "eur", rules).offers;
    expect(decideAlert(offers, 540, {})).toBeUndefined();
  });
});

describe("déduplication", () => {
  it("clé = route + dates + prix", () => {
    const [offer] = offersFor({});
    expect(offer && dedupKey(offer)).toBe("PAR-TYO|2027-03-12|2027-04-04|548");
  });

  it("anti-rafale : notifie la moins chère du lot et marque toutes les nouvelles sous le seuil", () => {
    const offers = filterTickets(loadFixture(TYO_FIXTURE).data, "PAR-TYO", "eur", rules).offers;
    const decision = decideAlert(offers, 600, {});

    expect(decision?.send.price).toBe(548);
    expect(decision?.mark.map((offer) => offer.price)).toEqual([548, 575]);
  });

  it("ne renotifie pas une offre déjà notifiée", () => {
    const offers = offersFor({});
    const notified: NotifiedMap = {};
    markNotified(notified, offers, NOW);

    expect(decideAlert(offers, 600, notified)).toBeUndefined();
  });

  it("renotifie les mêmes dates si le prix change", () => {
    const notified: NotifiedMap = {};
    markNotified(notified, offersFor({}), NOW);

    expect(decideAlert(offersFor({ price: 531 }), 600, notified)?.send.price).toBe(531);
  });

  it("notifie une nouvelle offre même si une autre du mois l'a déjà été", () => {
    const notified: NotifiedMap = {};
    markNotified(notified, offersFor({}), NOW);
    const offers = offersFor({}, { departure_at: "2027-03-15T10:25:00+01:00" });

    expect(decideAlert(offers, 600, notified)?.send.departDate).toBe("2027-03-15");
  });

  it("purge les clés de plus de 30 jours", () => {
    const notified: NotifiedMap = {
      recente: "2026-09-20T12:00:00.000Z",
      limite: "2026-08-27T12:00:00.000Z",
      ancienne: "2026-08-27T11:59:59.000Z",
      illisible: "hier",
    };
    expect(Object.keys(purgeNotified(notified, NOW))).toEqual(["recente", "limite"]);
  });
});
