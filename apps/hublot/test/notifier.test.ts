import { describe, expect, it } from "vitest";
import { formatDeal } from "../src/notifiers/notifier.js";
import { NtfyNotifier } from "../src/notifiers/ntfy.js";
import { filterTickets } from "../src/offers.js";
import { ticket, TODAY } from "./helpers.js";

const tokyo = { to: "TYO", label: "Tokyo", maxPrice: 600 };
const rules = { origins: ["CDG", "ORY"], minDays: 14, maxDays: 90, departFrom: TODAY, departTo: "2027-12-31" };
const [offer] = filterTickets([ticket()], "PAR-TYO", "eur", rules).offers;

describe("format de la notification", () => {
  it("suit le format de la spec", () => {
    expect(offer && formatDeal(offer, tokyo)).toEqual({
      title: "✈️ Tokyo 548 € A/R",
      body: "CDG → HND · 12 mars → 4 avril (23 j) · seuil 600 €",
      url: "https://www.aviasales.fr/search/PAR1203TYO04041?t=AF18053&expected_price_currency=eur",
    });
  });
});

describe("NtfyNotifier", () => {
  it("publie en JSON sur ntfy.sh avec le lien en action de clic", async () => {
    const requests: { url: string; init: RequestInit }[] = [];
    const fetch = (async (url: string | URL, init: RequestInit = {}) => {
      requests.push({ url: String(url), init });
      return new Response("{}");
    }) as typeof globalThis.fetch;

    await new NtfyNotifier("mon-topic-secret", { retry: { fetch } }).send({ title: "✈️ Tokyo 548 € A/R", body: "corps", url: "https://www.aviasales.fr/search/x" });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://ntfy.sh");
    expect(requests[0]?.init.method).toBe("POST");
    expect(JSON.parse(String(requests[0]?.init.body))).toEqual({
      topic: "mon-topic-secret",
      title: "✈️ Tokyo 548 € A/R",
      message: "corps",
      click: "https://www.aviasales.fr/search/x",
      actions: [{ action: "view", label: "Voir l'offre", url: "https://www.aviasales.fr/search/x" }],
    });
  });

  it("ajoute un bouton vers la page des bons plans quand elle est connue", async () => {
    const bodies: unknown[] = [];
    const fetch = (async (_url: string | URL, init: RequestInit = {}) => {
      bodies.push(JSON.parse(String(init.body)));
      return new Response("{}");
    }) as typeof globalThis.fetch;
    const message = offer && formatDeal(offer, tokyo, "https://cantindebrunoy.github.io/Hublot/");

    await new NtfyNotifier("t", { retry: { fetch } }).send(message!);

    expect(bodies[0]).toMatchObject({
      actions: [
        { action: "view", label: "Voir l'offre" },
        { action: "view", label: "Tous les bons plans", url: "https://cantindebrunoy.github.io/Hublot/" },
      ],
    });
  });

  it("lève une erreur si ntfy refuse la publication", async () => {
    const fetch = (async () => new Response("topic invalide", { status: 400 })) as typeof globalThis.fetch;
    const notifier = new NtfyNotifier("t", { retry: { fetch } });

    await expect(notifier.send({ title: "t", body: "b", url: "https://x" })).rejects.toThrow("HTTP 400 : topic invalide");
  });
});
