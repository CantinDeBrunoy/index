import { describe, expect, it } from "vitest";
import { daysBetween, isIsoDate, monthsBetween, returnMonths } from "../src/dates.js";
import { formatMonth } from "../src/format.js";

describe("calendrier", () => {
  it("mois couverts par une période", () => {
    expect(monthsBetween("2026-11-20", "2027-02-03")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(monthsBetween("2027-03-01", "2027-03-15")).toEqual(["2027-03"]);
  });

  it("mois de retour atteignables selon la durée du séjour", () => {
    expect(returnMonths("2027-03-01", "2027-03-31", 14, 60)).toEqual(["2027-03", "2027-04", "2027-05"]);
    expect(returnMonths("2026-09-26", "2026-09-30", 14, 21)).toEqual(["2026-10"]);
  });

  it("durée en jours, indifférente aux changements d'heure", () => {
    expect(daysBetween("2027-03-20", "2027-04-03")).toBe(14);
    expect(daysBetween("2026-10-20", "2026-11-03")).toBe(14);
  });

  it("reconnaît les vraies dates", () => {
    expect(isIsoDate("2027-02-28")).toBe(true);
    expect(isIsoDate("2027-02-30")).toBe(false);
    expect(isIsoDate("28/02/2027")).toBe(false);
  });

  it("libellé de mois en français", () => {
    expect(formatMonth("2026-09")).toBe("sept. 2026");
  });
});
