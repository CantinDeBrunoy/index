import { describe, expect, it } from "vitest";
import {
  closestToThreshold,
  currentDeals,
  newWatchId,
  parseCities,
  removeWatch,
  safeOfferLink,
  serializeConfig,
  timeAgo,
  upsertWatch,
  validateWatch,
  watchState,
} from "../docs/lib.js";
import { parseConfig } from "../src/config.js";
import { collectPrices } from "../src/run.js";
import { buildSnapshot } from "../src/snapshot.js";
import { CONFIG, loadFixture, TODAY, TYO_FIXTURE, watch } from "./helpers.js";

describe("formulaire de surveillance", () => {
  it("accepte une surveillance complète", () => {
    expect(validateWatch(watch(), TODAY)).toEqual([]);
  });

  it("explique chaque erreur en français", () => {
    expect(validateWatch(watch({ to: "", label: "" }), TODAY)).toEqual(["Choisis une destination dans la liste."]);
    expect(validateWatch(watch({ maxPrice: Number.NaN }), TODAY)).toEqual(["Indique un prix maximum."]);
    expect(validateWatch(watch({ departFrom: "2027-04-01", departTo: "2027-03-01" }), TODAY)).toEqual([
      "La période de départ doit finir après son début.",
    ]);
    expect(validateWatch(watch({ departFrom: "2026-08-01", departTo: "2026-08-31" }), TODAY)).toEqual(["La période de départ est déjà passée."]);
    expect(validateWatch(watch({ minDays: Number.NaN }), TODAY)).toEqual(["Indique la durée du séjour en jours."]);
    expect(validateWatch(watch({ maxDays: 75 }), TODAY)).toEqual(["Le séjour ne peut pas dépasser 60 jours (limite de l'API des prix)."]);
  });

  it("génère un identifiant lisible et unique", () => {
    expect(newWatchId("Mexico City", [])).toBe("mexico-city");
    expect(newWatchId("Tokyo", ["tokyo", "tokyo-2"])).toBe("tokyo-3");
    expect(newWatchId("Séoul", [])).toBe("seoul");
  });
});

describe("modification de config.json", () => {
  it("ajoute, remplace et supprime des surveillances", () => {
    const lima = watch({ id: "lima", label: "Lima", to: "LIM", maxPrice: 700 });
    const added = upsertWatch(CONFIG, lima);
    expect(added.watches.map((current) => current.id)).toEqual(["mexico", "tokyo", "lima"]);

    const edited = upsertWatch(added, { ...lima, maxPrice: 650 });
    expect(edited.watches.map((current) => current.maxPrice)).toEqual([500, 600, 650]);

    expect(removeWatch(edited, "tokyo").watches.map((current) => current.id)).toEqual(["mexico", "lima"]);
    expect(CONFIG.watches).toHaveLength(2); // l'original n'est pas modifié
  });

  it("écrit un fichier que le script accepte tel quel", () => {
    const next = upsertWatch(CONFIG, watch({ id: "seoul", label: "Séoul", to: "SEL", minDays: 7, maxDays: 10 }));
    expect(parseConfig(JSON.parse(serializeConfig(next)))).toEqual(next);
  });
});

describe("affichage des résultats", () => {
  async function snapshotFor(config = CONFIG) {
    const results = await collectPrices(config, async (query) => (query.destination === "TYO" && query.departureMonth === "2027-03" && query.returnMonth === "2027-04" ? loadFixture(TYO_FIXTURE).data : []), TODAY);
    return buildSnapshot(config, results, new Date("2026-09-26T12:00:00Z"));
  }

  it("liste les bons plans des surveillances à jour", async () => {
    const deals = currentDeals(CONFIG, await snapshotFor(), TODAY);
    expect(deals.map(({ watch, deal }) => `${watch.label} ${deal.price}`)).toEqual(["Tokyo 548", "Tokyo 575"]);
  });

  it("met de côté une surveillance modifiée depuis le dernier relevé", async () => {
    const snapshot = await snapshotFor();
    const edited = upsertWatch(CONFIG, watch({ maxPrice: 560 }));
    const tokyo = edited.watches[1];

    expect(tokyo && watchState(tokyo, snapshot.watches[1], TODAY)).toBe("pending");
    expect(currentDeals(edited, snapshot, TODAY)).toEqual([]);
    expect(watchState(watch({ departTo: "2026-09-01", departFrom: "2026-08-01" }), undefined, TODAY)).toBe("expired");
  });

  it("indique le prix le plus proche d'un seuil quand il n'y a aucun bon plan", async () => {
    const config = { ...CONFIG, watches: [watch({ maxPrice: 500 })] };
    const closest = closestToThreshold(config, await snapshotFor(config), TODAY);
    expect(closest?.offer.price).toBe(548);
  });

  it("n'affiche que des liens https vers Aviasales", () => {
    expect(safeOfferLink("https://www.aviasales.fr/search/PAR1203TYO04041?t=x")).toBe("https://www.aviasales.fr/search/PAR1203TYO04041?t=x");
    expect(safeOfferLink("javascript:alert(1)")).toBeNull();
    expect(safeOfferLink("https://aviasales.fr.example.com/search")).toBeNull();
  });

  it("dit depuis quand les prix ont été relevés", () => {
    const now = new Date("2026-09-26T12:00:00Z");
    expect(timeAgo("2026-09-26T11:59:40Z", now)).toBe("à l'instant");
    expect(timeAgo("2026-09-26T11:48:00Z", now)).toBe("il y a 12 min");
    expect(timeAgo("2026-09-26T06:00:00Z", now)).toBe("il y a 6 h");
    expect(timeAgo("2026-09-23T12:00:00Z", now)).toBe("il y a 3 j");
  });
});

describe("autocomplétion des villes", () => {
  it("garde les villes de la réponse de l'API", () => {
    const response = [
      { type: "city", code: "TYO", name: "Tokyo", country_name: "Japon" },
      { type: "airport", code: "HND", name: "Haneda", country_name: "Japon" },
      { type: "city", code: "LFW", name: "Lomé", country_name: "Togo" },
    ];
    expect(parseCities(response)).toEqual([
      { code: "TYO", name: "Tokyo", country: "Japon" },
      { code: "LFW", name: "Lomé", country: "Togo" },
    ]);
    expect(parseCities({ error: "oops" })).toEqual([]);
  });
});
