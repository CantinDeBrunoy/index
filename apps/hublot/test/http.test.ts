import { describe, expect, it } from "vitest";
import { fetchWithRetry } from "../src/http.js";

/** fetch mock replaying the given responses (an Error = network failure) and a fake sleep. */
function scripted(...steps: (Response | Error)[]) {
  const delays: number[] = [];
  let calls = 0;
  const fetch = (async () => {
    const step = steps[Math.min(calls++, steps.length - 1)];
    if (step instanceof Error) throw step;
    return step;
  }) as typeof globalThis.fetch;
  const sleep = async (ms: number) => {
    delays.push(ms);
  };
  return { options: { fetch, sleep }, delays, calls: () => calls };
}

describe("retry avec backoff", () => {
  it("attend le délai annoncé par X-Rate-Limit-Reset après un 429", async () => {
    const api = scripted(new Response("", { status: 429, headers: { "X-Rate-Limit-Reset": "12" } }), new Response("ok"));
    const response = await fetchWithRetry("https://api.test", {}, api.options);

    expect(response.status).toBe(200);
    expect(api.delays).toEqual([12_500]);
  });

  it("recule de façon exponentielle sur 5xx puis rend la dernière réponse", async () => {
    const api = scripted(new Response("", { status: 502 }));
    const response = await fetchWithRetry("https://api.test", {}, { ...api.options, retries: 3 });

    expect(response.status).toBe(502);
    expect(api.calls()).toBe(4);
    expect(api.delays).toEqual([1_000, 2_000, 4_000]);
  });

  it("réessaie après une erreur réseau", async () => {
    const api = scripted(new TypeError("fetch failed"), new Response("ok"));
    expect((await fetchWithRetry("https://api.test", {}, api.options)).status).toBe(200);
  });

  it("ne réessaie pas une erreur client (4xx hors 429)", async () => {
    const api = scripted(new Response("", { status: 400 }), new Response("ok"));
    expect((await fetchWithRetry("https://api.test", {}, api.options)).status).toBe(400);
    expect(api.calls()).toBe(1);
  });

  it("propage l'erreur réseau une fois les essais épuisés", async () => {
    const api = scripted(new TypeError("fetch failed"));
    await expect(fetchWithRetry("https://api.test", {}, { ...api.options, retries: 2 })).rejects.toThrow("fetch failed");
    expect(api.calls()).toBe(3);
  });
});
