import { describe, expect, it } from "vitest";
import { allowCall } from "../worker/github.js";

const query = (search = "") => new URLSearchParams(search);
const put = JSON.stringify({ message: "config: test", content: "e30=", sha: "abc", branch: "main" });

describe("appels GitHub laissés passer par le Worker", () => {
  it("laisse la page lire la config et le dernier relevé, sur main", () => {
    expect(allowCall("GET", "/contents/config.json", query("ref=main"), undefined)).toEqual({ ok: true });
    expect(allowCall("GET", "/contents/data/latest.json", query("ref=main"), undefined)).toEqual({ ok: true });
    expect(allowCall("GET", "/contents/config.json", query(), undefined)).toEqual({ ok: true });
  });

  it("refuse toute autre lecture", () => {
    for (const [path, search] of [
      ["/contents/data/notified.json", "ref=main"],
      ["/contents/.github/workflows/check.yml", "ref=main"],
      ["/contents/config.json", "ref=autre"],
      ["/contents/config.json", "ref=main&x=1"],
      ["/contents/../config.json", "ref=main"],
      ["/actions/runs", ""],
      ["", ""],
    ] as const) {
      expect(allowCall("GET", path, query(search), undefined).ok, `${path}?${search}`).toBe(false);
    }
  });

  it("laisse écrire config.json sur main, et rien d'autre", () => {
    expect(allowCall("PUT", "/contents/config.json", query(), put)).toEqual({ ok: true, body: put });
    expect(allowCall("PUT", "/contents/config.json", query(), put.replace('"main"', '"autre"')).ok).toBe(false);
    expect(allowCall("PUT", "/contents/README.md", query(), put).ok).toBe(false);
    expect(allowCall("PUT", "/contents/config.json", query("ref=main"), put).ok).toBe(false);
    expect(allowCall("DELETE", "/contents/config.json", query(), put).ok).toBe(false);
    expect(allowCall("PUT", "/contents/config.json", query(), "pas du JSON").ok).toBe(false);
    expect(allowCall("PUT", "/contents/config.json", query(), "null").ok).toBe(false);
  });

  it("laisse lancer la vérification des prix sur main, et aucun autre workflow", () => {
    const main = JSON.stringify({ ref: "main" });
    expect(allowCall("POST", "/actions/workflows/check.yml/dispatches", query(), main)).toEqual({ ok: true, body: main });
    expect(allowCall("POST", "/actions/workflows/check.yml/dispatches", query(), JSON.stringify({ ref: "autre" })).ok).toBe(false);
    expect(allowCall("POST", "/actions/workflows/check.yml/dispatches", query(), JSON.stringify({ ref: "main", inputs: {} })).ok).toBe(false);
    expect(allowCall("POST", "/actions/workflows/autre.yml/dispatches", query(), main).ok).toBe(false);
  });
});
