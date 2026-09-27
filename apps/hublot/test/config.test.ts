import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadConfig, parseConfig } from "../src/config.js";
import { CONFIG, watch } from "./helpers.js";

describe("config.json", () => {
  it("le fichier du dépôt est valide", async () => {
    const config = await loadConfig(fileURLToPath(new URL("../config.json", import.meta.url)));
    expect(config.watches.map((current) => current.to)).toEqual(["MEX", "TYO"]);
  });

  it("normalise les codes IATA et la devise", () => {
    const config = parseConfig({ ...CONFIG, origins: ["cdg"], currency: "EUR", watches: [watch({ to: "tyo", label: " Tokyo " })] });
    expect(config).toMatchObject({ origins: ["CDG"], currency: "eur", watches: [{ to: "TYO", label: "Tokyo" }] });
  });

  it("accepte une liste de surveillances vide", () => {
    expect(parseConfig({ ...CONFIG, watches: [] }).watches).toEqual([]);
  });

  it.each([
    [{ origins: [] }, /origins/],
    [{ watches: [watch({ departFrom: "2027-04-01", departTo: "2027-03-01" })] }, /departFrom/],
    [{ watches: [watch({ departTo: "2027-02-30" })] }, /departFrom/],
    [{ watches: [watch({ minDays: 30, maxDays: 14 })] }, /minDays/],
    [{ watches: [watch({ maxDays: 61 })] }, /de 0 à 60 jours/],
    [{ watches: [watch({ to: "Tokyo" })] }, /watches\[0\]\.to/],
    [{ watches: [watch(), watch()] }, /"tokyo" apparaît deux fois/],
  ])("rejette %j", (patch, message) => {
    expect(() => parseConfig({ ...CONFIG, ...patch })).toThrow(message);
  });
});
