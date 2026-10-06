import { describe, expect, it } from "vitest";
import { createGitHubClient, projectAlerts, syncIssues, workflowAlerts } from "./alerts.ts";
import type { ProjectCheck } from "./check.ts";
import { getProject, projects } from "./index.ts";

type Call = { method: string; path: string; body: unknown };

/** Faux GitHub : répond selon la méthode et le chemin, et garde la trace des appels. */
function fakeGitHub(routes: Record<string, unknown>) {
  const calls: Call[] = [];
  const fetch = (async (url: string, init: RequestInit = {}) => {
    const path = String(url).replace("https://api.github.com/repos/CantinDeBrunoy/index", "");
    const method = init.method ?? "GET";
    calls.push({ method, path, body: init.body ? JSON.parse(String(init.body)) : undefined });
    const key = `${method} ${path.split("?")[0]}`;
    if (!(key in routes)) return Response.json({}, { status: method === "GET" ? 404 : 201 });
    return Response.json(routes[key]);
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
    expect(alerts[0]!.title).toBe("[keep-alive] 008 Tonalli : en veille");
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
    const issue = { number: 7, title: "[keep-alive] 008 Tonalli : en veille", body: "… <!-- keep-alive:project:tonalli -->" };
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
