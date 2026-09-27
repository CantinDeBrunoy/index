import { describe, expect, it } from "vitest";
import { HttpError } from "../src/http.js";
import { buildPricesForDatesUrl, createTravelpayoutsClient, isQueryableMonthPair } from "../src/travelpayouts.js";
import { loadFixture, TYO_FIXTURE } from "./helpers.js";

const query = { origin: "PAR", destination: "TYO", departureMonth: "2027-03", returnMonth: "2027-04", currency: "eur" };

describe("requête prices_for_dates", () => {
  it("n'envoie que des paramètres documentés, sans le token", () => {
    const url = buildPricesForDatesUrl(query);

    expect(url.origin + url.pathname).toBe("https://api.travelpayouts.com/aviasales/v3/prices_for_dates");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      origin: "PAR",
      destination: "TYO",
      departure_at: "2027-03",
      return_at: "2027-04",
      one_way: "false",
      direct: "false",
      sorting: "price",
      limit: "1000",
      page: "1",
      currency: "eur",
      market: "fr",
    });
  });

  it("respecte l'écart maximal de 30 jours entre dernier départ et premier retour", () => {
    expect(isQueryableMonthPair("2027-03", "2027-03")).toBe(true);
    expect(isQueryableMonthPair("2027-03", "2027-04")).toBe(true); // 1 jour
    expect(isQueryableMonthPair("2027-03", "2027-05")).toBe(false); // 31 jours : refusé par l'API
    expect(isQueryableMonthPair("2027-01", "2027-03")).toBe(true); // 29 jours grâce à février
  });
});

describe("client Travelpayouts", () => {
  it("passe le token en en-tête X-Access-Token et renvoie les billets", async () => {
    const headers: Headers[] = [];
    const fetch = (async (_url: string | URL, init: RequestInit = {}) => {
      headers.push(new Headers(init.headers));
      return Response.json(loadFixture(TYO_FIXTURE));
    }) as typeof globalThis.fetch;

    const tickets = await createTravelpayoutsClient("jeton-de-test", { fetch })(query);

    expect(headers[0]?.get("X-Access-Token")).toBe("jeton-de-test");
    expect(tickets).toHaveLength(8);
  });

  it("remonte le message d'erreur de l'API", async () => {
    const body = { error: "bad request: departure_at: diff between max depart date and min return date exceeds supported maximum of 30.", data: null, status: 400, success: false };
    const fetch = (async () => Response.json(body, { status: 400 })) as typeof globalThis.fetch;

    const failure = createTravelpayoutsClient("jeton-de-test", { fetch })(query);
    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toThrow("HTTP 400 : bad request: departure_at: diff between max depart date");
  });

  it("refuse des prix dans une autre devise que celle demandée", async () => {
    const fetch = (async () => Response.json({ ...loadFixture(TYO_FIXTURE), currency: "rub" })) as typeof globalThis.fetch;
    await expect(createTravelpayoutsClient("jeton-de-test", { fetch })(query)).rejects.toThrow("prix renvoyés en rub au lieu de eur");
  });
});
