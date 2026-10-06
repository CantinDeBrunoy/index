import { describe, expect, it } from "vitest";
import { checkMonitor, checkProject, worst } from "./check.ts";
import { defineProjects } from "./index.ts";

/** Faux fetch : renvoie `response` après `delay` ms d'horloge simulée. */
function fakeFetch(response: Response | Error, delay = 100) {
  let clock = 0;
  return {
    now: () => clock,
    fetch: (async (_url: string | URL | Request, _init?: RequestInit) => {
      clock += delay;
      if (response instanceof Error) throw response;
      return response;
    }) as typeof fetch,
  };
}

const http = { kind: "http", url: "https://exemple.test" } as const;

describe("checkMonitor", () => {
  it("2xx rapide : en ligne", async () => {
    const r = await checkMonitor(http, fakeFetch(new Response("ok", { status: 200 })));
    expect(r?.health).toBe("online");
  });

  it("2xx lent : en veille (réveil)", async () => {
    const r = await checkMonitor(http, fakeFetch(new Response("ok", { status: 200 }), 9_000));
    expect(r?.health).toBe("asleep");
  });

  it("503 ou 540 : en veille", async () => {
    expect((await checkMonitor(http, fakeFetch(new Response("", { status: 503 }))))?.health).toBe("asleep");
    expect((await checkMonitor(http, fakeFetch(new Response("", { status: 540 }))))?.health).toBe("asleep");
  });

  it("404, 500 ou erreur réseau : hors ligne", async () => {
    expect((await checkMonitor(http, fakeFetch(new Response("", { status: 404 }))))?.health).toBe("offline");
    expect((await checkMonitor(http, fakeFetch(new Response("", { status: 500 }))))?.health).toBe("offline");
    expect((await checkMonitor(http, fakeFetch(new TypeError("fetch failed"))))?.health).toBe("offline");
  });

  it("supabase : ne tourne pas sans clé, envoie la clé sinon", async () => {
    const monitor = { kind: "supabase", url: "https://x.supabase.co/", table: "emotions", anonKeyEnv: "KEY" } as const;
    expect(await checkMonitor(monitor, fakeFetch(new Response("[]")))).toBeNull();

    let seen: { url: string; headers: Record<string, string> } | undefined;
    const r = await checkMonitor(monitor, {
      env: { KEY: "anon" },
      fetch: (async (url: string, init?: RequestInit) => {
        seen = { url, headers: init?.headers as Record<string, string> };
        return new Response("[]");
      }) as typeof fetch,
    });
    expect(r?.health).toBe("online");
    expect(seen?.url).toBe("https://x.supabase.co/rest/v1/emotions?select=*&limit=1");
    expect(seen?.headers.apikey).toBe("anon");
  });

  it("freshness : en veille quand les données sont trop vieilles", async () => {
    const monitor = { kind: "freshness", url: "https://x.test/latest.json", field: "generatedAt", maxAgeHours: 13 } as const;
    const at = (iso: string) => ({
      fetch: (async () => Response.json({ generatedAt: iso })) as typeof fetch,
      now: () => Date.parse("2026-10-06T20:00:00Z"),
    });
    expect((await checkMonitor(monitor, at("2026-10-06T13:00:00Z")))?.health).toBe("online");
    expect((await checkMonitor(monitor, at("2026-10-05T13:00:00Z")))?.health).toBe("asleep");
  });
});

describe("checkProject", () => {
  it("relance une fois une sonde en échec avant de conclure", async () => {
    const [project] = defineProjects([
      { slug: "p", name: "P", started: "2026-01", kind: "web", pitch: { fr: "Projet de test." }, stack: [], links: {}, monitors: [http] },
    ]);
    const statuses = [500, 200];
    const waits: number[] = [];
    const r = await checkProject(project!, {
      fetch: (async () => new Response("", { status: statuses.shift() ?? 200 })) as typeof fetch,
      retryDelayMs: 30_000,
      sleep: async (ms) => {
        waits.push(ms);
      },
    });
    expect(waits).toEqual([30_000]);
    expect(r.health).toBe("online");
  });

  it("prend la pire sonde, ignore celles qui n'ont pas pu tourner", async () => {
    const [project] = defineProjects([
      {
        slug: "p",
        name: "P",
        started: "2026-01",
        kind: "web",
        pitch: { fr: "Projet de test." },
        stack: [],
        links: {},
        monitors: [http, { kind: "supabase", url: "https://x.supabase.co", table: "t", anonKeyEnv: "ABSENTE" }],
      },
    ]);
    const r = await checkProject(project!, fakeFetch(new Response("", { status: 540 })));
    expect(r.health).toBe("asleep");
    expect(r.results).toHaveLength(1);
  });

  it("worst : offline > asleep > online", () => {
    expect(worst(["online", "asleep"])).toBe("asleep");
    expect(worst(["asleep", "offline", "online"])).toBe("offline");
    expect(worst([])).toBeNull();
  });
});
