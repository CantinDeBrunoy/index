import { describe, expect, it } from "vitest";
import type { NotifiedMap } from "../src/alerts.js";
import { HttpError } from "../src/http.js";
import type { NotificationMessage, Notifier } from "../src/notifiers/notifier.js";
import { collectErrors, collectObservations, collectPrices, planAlerts, sendAlerts } from "../src/run.js";
import type { FetchPrices, PriceQuery } from "../src/travelpayouts.js";
import { CONFIG, loadFixture, MEX_FIXTURE, TODAY, TYO_FIXTURE, watch } from "./helpers.js";

const NOW = new Date("2026-09-26T12:00:00Z");

/** API mock: fixtures for Tokyo March → April and Mexico January → February, nothing elsewhere. */
function mockApi(overrides: (query: PriceQuery) => void = () => {}): FetchPrices & { queries: PriceQuery[] } {
  const queries: PriceQuery[] = [];
  const fetchPrices = async (query: PriceQuery) => {
    queries.push(query);
    overrides(query);
    const pair = `${query.destination} ${query.departureMonth} ${query.returnMonth}`;
    if (pair === "TYO 2027-03 2027-04") return loadFixture(TYO_FIXTURE).data;
    if (pair === "MEX 2027-01 2027-02") return loadFixture(MEX_FIXTURE).data;
    return [];
  };
  return Object.assign(fetchPrices, { queries });
}

class FakeNotifier implements Notifier {
  readonly name = "fake";
  readonly sent: NotificationMessage[] = [];
  failing = false;

  async send(message: NotificationMessage): Promise<void> {
    if (this.failing) throw new Error("ntfy injoignable");
    this.sent.push(message);
  }
}

describe("collecte des prix", () => {
  it("interroge chaque mois de départ × mois de retour que l'API accepte, depuis PAR", async () => {
    const api = mockApi();
    await collectPrices(CONFIG, api, TODAY);

    const tokyo = api.queries.filter((query) => query.destination === "TYO");
    expect(tokyo).toHaveLength(18); // sept. 2026 → mai 2027, 1 à 3 mois de retour chacun
    expect(tokyo[0]).toEqual({ origin: "PAR", destination: "TYO", departureMonth: "2026-09", returnMonth: "2026-10", currency: "eur" });
    expect(tokyo.filter((query) => query.departureMonth === "2027-03").map((query) => query.returnMonth)).toEqual([
      "2027-03",
      "2027-04",
    ]);
    // Février ne compte que 28 jours : le 1er mars tombe 29 jours après le 31 janvier.
    expect(tokyo.filter((query) => query.departureMonth === "2027-01").map((query) => query.returnMonth)).toEqual([
      "2027-01",
      "2027-02",
      "2027-03",
    ]);
  });

  it("limite les requêtes et les offres à la période de départ de la surveillance", async () => {
    const api = mockApi();
    const config = { ...CONFIG, watches: [watch({ departFrom: "2027-03-01", departTo: "2027-03-15", minDays: 14, maxDays: 30 })] };
    const [result] = await collectPrices(config, api, TODAY);

    expect(api.queries.map((query) => `${query.departureMonth}→${query.returnMonth}`)).toEqual(["2027-03→2027-03", "2027-03→2027-04"]);
    expect(result?.months.map((month) => month.offers.map((offer) => offer.price))).toEqual([[548]]);
  });

  it("n'interroge qu'une fois une requête commune à plusieurs surveillances", async () => {
    const api = mockApi();
    const config = { ...CONFIG, watches: [watch({ id: "a" }), watch({ id: "b", maxPrice: 550 })] };
    const results = await collectPrices(config, api, TODAY);

    expect(api.queries).toHaveLength(18);
    expect(results.map((result) => result.months.find((month) => month.month === "2027-03")?.offers.length)).toEqual([4, 4]);
  });

  it("ne cherche plus rien une fois la période de départ passée", async () => {
    const api = mockApi();
    const [result] = await collectPrices({ ...CONFIG, watches: [watch({ departFrom: "2026-08-01", departTo: "2026-09-25" })] }, api, TODAY);

    expect(api.queries).toEqual([]);
    expect(result?.months).toEqual([]);
  });

  it("une surveillance en échec ne bloque pas les autres", async () => {
    const api = mockApi((query) => {
      if (query.destination === "MEX") throw new HttpError(503, "Service Unavailable");
    });
    const results = await collectPrices(CONFIG, api, TODAY);

    const tokyoMarch = results.find((result) => result.watch.to === "TYO")?.months.find((month) => month.month === "2027-03");
    expect(tokyoMarch?.offers.map((offer) => offer.price)).toEqual([548, 575, 612, 640]);
    expect(collectErrors(results)).toHaveLength(18);
    expect(collectErrors(results)[0]).toBe("Mexico, départ 2026-09, retour 2026-10 : HTTP 503 : Service Unavailable");
  });

  it("s'arrête net si le token est refusé", async () => {
    const api = mockApi(() => {
      throw new HttpError(401, "Unauthorized");
    });
    await expect(collectPrices(CONFIG, api, TODAY)).rejects.toThrow(/TRAVELPAYOUTS_TOKEN/);
    expect(api.queries).toHaveLength(1);
  });
});

describe("alertes de bout en bout", () => {
  it("notifie au format attendu, puis ne renotifie pas au passage suivant", async () => {
    const results = await collectPrices(CONFIG, mockApi(), TODAY);
    const notifier = new FakeNotifier();
    const notified: NotifiedMap = {};

    await sendAlerts(planAlerts(results, notified), notifier, notified, NOW);
    expect(notifier.sent).toEqual([
      {
        title: "✈️ Mexico 489 € A/R",
        body: "CDG → MEX · 20 janvier → 10 février (21 j) · seuil 500 €",
        url: expect.stringMatching(/^https:\/\/www\.aviasales\.fr\/search\/PAR2001MEX10021\?/),
      },
      {
        title: "✈️ Tokyo 548 € A/R",
        body: "CDG → HND · 12 mars → 4 avril (23 j) · seuil 600 €",
        url: expect.stringMatching(/^https:\/\/www\.aviasales\.fr\/search\/PAR1203TYO04041\?/),
      },
    ]);
    expect(Object.keys(notified).sort()).toEqual([
      "PAR-MEX|2027-01-20|2027-02-10|489",
      "PAR-TYO|2027-03-12|2027-04-04|548",
      "PAR-TYO|2027-03-20|2027-04-03|575",
    ]);

    const secondRun = await collectPrices(CONFIG, mockApi(), TODAY);
    expect(planAlerts(secondRun, notified)).toEqual([]);
  });

  it("une offre vue par deux surveillances n'est notifiée qu'une fois", async () => {
    const config = { ...CONFIG, watches: [watch({ id: "a" }), watch({ id: "b", label: "Tokyo printemps", departFrom: "2027-03-01" })] };
    const planned = planAlerts(await collectPrices(config, mockApi(), TODAY), {});

    expect(planned.map((alert) => `${alert.watch.id} ${alert.send.price}`)).toEqual(["a 548"]);
  });

  it("ajoute le lien vers la page des bons plans", async () => {
    const results = await collectPrices(CONFIG, mockApi(), TODAY);
    const notifier = new FakeNotifier();

    await sendAlerts(planAlerts(results, {}), notifier, {}, NOW, { overviewUrl: "https://cantindebrunoy.github.io/Hublot/" });
    expect(notifier.sent.map((message) => message.overviewUrl)).toEqual([
      "https://cantindebrunoy.github.io/Hublot/",
      "https://cantindebrunoy.github.io/Hublot/",
    ]);
  });

  it("ne marque pas une offre dont la notification a échoué", async () => {
    const results = await collectPrices(CONFIG, mockApi(), TODAY);
    const notifier = Object.assign(new FakeNotifier(), { failing: true });
    const notified: NotifiedMap = {};

    const errors = await sendAlerts(planAlerts(results, notified), notifier, notified, NOW);
    expect(errors).toHaveLength(2);
    expect(notified).toEqual({});
  });

  it("historise les 3 offres les moins chères par surveillance × mois, sans doublon", async () => {
    const config = { ...CONFIG, watches: [...CONFIG.watches, watch({ id: "tokyo-bis" })] };
    const observations = collectObservations(await collectPrices(config, mockApi(), TODAY), NOW);

    expect(observations.map((observation) => `${observation.route} ${observation.price}`)).toEqual([
      "PAR-MEX 489",
      "PAR-MEX 512",
      "PAR-TYO 548",
      "PAR-TYO 575",
      "PAR-TYO 612",
    ]);
    expect(observations[2]).toEqual({
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
    });
  });
});
