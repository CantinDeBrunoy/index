import { describe, expect, it } from "vitest";
import { filterTickets, type FilterRules } from "../src/offers.js";
import { loadFixture, MEX_FIXTURE, ticket, TODAY, TYO_FIXTURE } from "./helpers.js";

const rules: FilterRules = { origins: ["CDG", "ORY"], minDays: 14, maxDays: 90, departFrom: TODAY, departTo: "2027-12-31" };

describe("filtre sur l'aéroport de départ", () => {
  it("écarte BVA et LBG ramenés par le code ville PAR", () => {
    const { data } = loadFixture(TYO_FIXTURE);
    const { offers, rejected } = filterTickets(data, "PAR-TYO", "eur", rules);

    expect(new Set(offers.map((offer) => offer.originAirport))).toEqual(new Set(["CDG", "ORY"]));
    expect(rejected.airport).toBe(2);
  });

  it("respecte la liste origins de la config", () => {
    const { offers } = filterTickets([ticket({ origin_airport: "ORY" })], "PAR-TYO", "eur", { ...rules, origins: ["CDG"] });
    expect(offers).toEqual([]);
  });
});

describe("filtre sur la durée du séjour", () => {
  it("compte les jours sur les dates locales des vols (fuseaux et changement d'heure sans effet)", () => {
    const { offers } = filterTickets([ticket()], "PAR-TYO", "eur", rules);
    expect(offers[0]).toMatchObject({ departDate: "2027-03-12", returnDate: "2027-04-04", stayDays: 23 });
  });

  it("inclut les bornes minDays et maxDays", () => {
    const { offers } = filterTickets(
      [
        ticket({ departure_at: "2027-03-20T13:40:00+01:00", return_at: "2027-04-03T09:55:00+09:00" }),
        ticket({ departure_at: "2027-01-01T13:40:00+01:00", return_at: "2027-04-01T09:55:00+09:00" }),
      ],
      "PAR-TYO",
      "eur",
      rules,
    );
    expect(offers.map((offer) => offer.stayDays)).toEqual([90, 14]);
  });

  it("écarte les séjours trop courts ou trop longs", () => {
    const tyo = filterTickets(loadFixture(TYO_FIXTURE).data, "PAR-TYO", "eur", rules);
    const mex = filterTickets(loadFixture(MEX_FIXTURE).data, "PAR-MEX", "eur", rules);
    const long = filterTickets(
      [ticket({ departure_at: "2027-01-01T13:40:00+01:00", return_at: "2027-04-02T09:55:00+09:00" })],
      "PAR-TYO",
      "eur",
      rules,
    );

    expect(tyo.rejected.stay).toBe(1); // 8 jours
    expect(mex.rejected.stay).toBe(2); // 7 et 11 jours
    expect(long.rejected.stay).toBe(1); // 91 jours
  });
});

describe("filtre sur la période de départ", () => {
  it("garde les départs entre les deux dates, bornes incluses", () => {
    const window = { ...rules, departFrom: "2027-03-05", departTo: "2027-03-20" };
    const { offers, rejected } = filterTickets(loadFixture(TYO_FIXTURE).data, "PAR-TYO", "eur", window);

    expect(offers.map((offer) => offer.departDate)).toEqual(["2027-03-12", "2027-03-20"]);
    expect(rejected.window).toBe(3); // 2, 25 et 31 mars
  });

  it("garde un départ le jour même", () => {
    const { offers } = filterTickets(
      [ticket({ departure_at: `${TODAY}T23:10:00+02:00`, return_at: "2026-10-12T08:00:00+09:00" })],
      "PAR-TYO",
      "eur",
      rules,
    );
    expect(offers).toHaveLength(1);
  });
});

describe("autres rejets", () => {
  it("écarte allers simples, départs passés et billets illisibles", () => {
    const tickets = [
      ticket({ return_at: undefined }),
      ticket({ departure_at: "2026-09-20T10:00:00+02:00", return_at: "2026-10-10T10:00:00+09:00" }),
      ticket({ departure_at: "bientôt" }),
      ticket({ price: 0 }),
    ];
    const { offers, rejected } = filterTickets(tickets, "PAR-TYO", "eur", rules);

    expect(offers).toEqual([]);
    expect(rejected).toEqual({ invalid: 2, oneWay: 1, airport: 0, window: 1, stay: 0 });
  });
});

describe("offres retenues", () => {
  it("ne garde que la moins chère pour mêmes dates et aéroports, triées par prix", () => {
    const { offers } = filterTickets(loadFixture(TYO_FIXTURE).data, "PAR-TYO", "eur", rules);

    expect(offers.map((offer) => offer.price)).toEqual([548, 575, 612, 640]); // le 579 € NH (mêmes dates que le 548 €) est absorbé
  });

  it("construit un lien absolu vers l'offre Aviasales", () => {
    const { offers } = filterTickets([ticket()], "PAR-TYO", "eur", rules);
    expect(offers[0]?.link).toBe("https://www.aviasales.fr/search/PAR1203TYO04041?t=AF18053&expected_price_currency=eur");
  });
});
