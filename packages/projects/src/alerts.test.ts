import { describe, expect, it } from "vitest";
import {
  createGitHubClient,
  parseTokenExpiration,
  projectAlerts,
  relayIssues,
  syncIssues,
  tokenAlerts,
  workflowAlerts,
} from "./alerts.ts";
import type { ProjectCheck } from "./check.ts";
import { getProject, projects } from "./index.ts";

type Call = { method: string; path: string; body: unknown };

/** Faux GitHub : répond selon la méthode et le chemin, et garde la trace des appels. */
function fakeGitHub(routes: Record<string, unknown>, headers: Record<string, string> = {}) {
  const calls: Call[] = [];
  const fetch = (async (url: string, init: RequestInit = {}) => {
    const path = String(url).replace("https://api.github.com/repos/CantinDeBrunoy/index", "");
    const method = init.method ?? "GET";
    calls.push({ method, path, body: init.body ? JSON.parse(String(init.body)) : undefined });
    const key = `${method} ${path.split("?")[0]}`;
    if (!(key in routes)) return Response.json({}, { status: method === "GET" ? 404 : 201, headers });
    return Response.json(routes[key], { headers });
  }) as typeof globalThis.fetch;
  return { github: createGitHubClient({ token: "t", fetch }), calls };
}

const tonalli = getProject("tonalli")!;
const asleep: ProjectCheck = {
  slug: "tonalli",
  health: "asleep",
  results: [
    { monitor: tonalli.monitors[0]!, health: "online", ms: 80, httpStatus: 200, detail: "HTTP 200 en 80 ms" },
    { monitor: tonalli.monitors[1]!, health: "asleep", ms: 90, httpStatus: 540, detail: "HTTP 540 : service en veille" },
  ],
};

describe("projectAlerts", () => {
  it("alerte sur un projet en veille, avec la marche à suivre", () => {
    const { alerts, checkedKeys } = projectAlerts(projects, [asleep, { slug: "hublot", health: "online", results: [] }]);
    expect(checkedKeys).toEqual(["project:tonalli", "project:hublot"]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.title).toBe("[keep-alive] 007 Tonalli : en veille");
    expect(alerts[0]!.body).toContain("Restore project");
    expect(alerts[0]!.body).toContain("<!-- keep-alive:project:tonalli -->");
  });

  it("ignore un projet qui n'a pas pu être sondé", () => {
    expect(projectAlerts(projects, [{ slug: "tonalli", health: null, results: [] }]).checkedKeys).toEqual([]);
  });
});

describe("syncIssues", () => {
  it("ouvre une issue pour une nouvelle alerte, sans doublon ensuite", async () => {
    const batch = projectAlerts(projects, [asleep]);
    const first = fakeGitHub({ "GET /issues": [] });
    expect((await syncIssues(first.github, [batch])).opened).toEqual(["project:tonalli"]);
    expect(first.calls.some((c) => c.method === "POST" && c.path === "/issues")).toBe(true);

    const existing = { number: 7, title: batch.alerts[0]!.title, body: batch.alerts[0]!.body };
    const second = fakeGitHub({ "GET /issues": [existing], "GET /labels/keep-alive": {} });
    const report = await syncIssues(second.github, [batch]);
    expect(report).toEqual({ opened: [], updated: [], closed: [] });
    expect(second.calls.filter((c) => c.method !== "GET")).toHaveLength(0);
  });

  it("ferme l'issue quand le service est rétabli", async () => {
    const batch = projectAlerts(projects, [{ ...asleep, health: "online" }]);
    const issue = { number: 7, title: "[keep-alive] 007 Tonalli : en veille", body: "… <!-- keep-alive:project:tonalli -->" };
    const { github, calls } = fakeGitHub({ "GET /issues": [issue] });
    expect((await syncIssues(github, [batch])).closed).toEqual(["project:tonalli"]);
    expect(calls.at(-1)).toMatchObject({ method: "PATCH", path: "/issues/7", body: { state: "closed" } });
  });

  it("ne ferme pas une issue dont la cible n'a pas été vérifiée", async () => {
    const issue = { number: 9, title: "[keep-alive] x", body: "<!-- keep-alive:workflow:hublot-check.yml -->" };
    const { github } = fakeGitHub({ "GET /issues": [issue] });
    expect((await syncIssues(github, [projectAlerts(projects, [])])).closed).toEqual([]);
  });
});

describe("workflowAlerts", () => {
  it("signale un cron désactivé par GitHub pour inactivité", async () => {
    const { github } = fakeGitHub({
      "GET /actions/workflows": {
        workflows: [
          { path: ".github/workflows/keep-alive.yml", state: "active", html_url: "https://github.com/x/keep-alive" },
          { path: ".github/workflows/hublot-check.yml", state: "disabled_inactivity", html_url: "https://github.com/x/hublot" },
        ],
      },
    });
    const { alerts, checkedKeys } = await workflowAlerts(github);
    expect(checkedKeys).toEqual(["workflow:keep-alive.yml", "workflow:hublot-check.yml"]);
    expect(alerts.map((a) => a.key)).toEqual(["workflow:hublot-check.yml"]);
    expect(alerts[0]!.body).toContain("Enable workflow");
  });
});

describe("parseTokenExpiration", () => {
  it("lit la date en UTC ou avec un décalage", () => {
    expect(parseTokenExpiration("2027-01-03 12:00:00 UTC")?.toISOString()).toBe("2027-01-03T12:00:00.000Z");
    expect(parseTokenExpiration("2027-01-03 04:00:00 -0800")?.toISOString()).toBe("2027-01-03T12:00:00.000Z");
    expect(parseTokenExpiration("bientôt")).toBeNull();
  });
});

describe("tokenAlerts", () => {
  const expiring = { "github-authentication-token-expiration": "2027-01-03 12:00:00 UTC" };

  it("rappelle l'expiration du jeton deux semaines avant", async () => {
    const { github } = fakeGitHub({ "GET ": {} }, expiring);
    const { alerts, checkedKeys } = await tokenAlerts(github, new Date("2026-12-24T10:00:00Z"));
    expect(checkedKeys).toEqual(["token:github-alerts"]);
    expect(alerts[0]!.title).toBe("[keep-alive] Le jeton des alertes expire le 3 janvier 2027");
    expect(alerts[0]!.body).toContain("Variables and Secrets");
  });

  it("se tait plus tôt, et pour un jeton sans date, mais ferme l'issue", async () => {
    const early = fakeGitHub({ "GET ": {} }, expiring);
    expect(await tokenAlerts(early.github, new Date("2026-12-01T10:00:00Z"))).toEqual({
      alerts: [],
      checkedKeys: ["token:github-alerts"],
    });
    const forever = fakeGitHub({ "GET ": {} });
    expect((await tokenAlerts(forever.github)).checkedKeys).toEqual(["token:github-alerts"]);
  });

  it("ne touche à rien si la date est illisible", async () => {
    const { github } = fakeGitHub({ "GET ": {} }, { "github-authentication-token-expiration": "?" });
    expect(await tokenAlerts(github)).toEqual({ alerts: [], checkedKeys: [] });
  });
});

describe("relayIssues", () => {
  it("commente une fois les issues ouvertes par le Worker, pas celles du bot", async () => {
    const worker = { number: 4, title: "x", body: "<!-- keep-alive:token:github-alerts -->", user: { type: "User" } };
    const bot = { number: 5, title: "y", body: "<!-- keep-alive:project:tonalli -->", user: { type: "Bot" } };
    const first = fakeGitHub({ "GET /issues": [worker, bot], "GET /issues/4/comments": [] });
    expect(await relayIssues(first.github)).toEqual([4]);
    expect(first.calls.at(-1)).toMatchObject({ method: "POST", path: "/issues/4/comments" });

    const done = [{ body: "… <!-- keep-alive:relay -->" }];
    const second = fakeGitHub({ "GET /issues": [worker, bot], "GET /issues/4/comments": done });
    expect(await relayIssues(second.github)).toEqual([]);
    expect(second.calls.filter((c) => c.method !== "GET")).toHaveLength(0);
  });
});
