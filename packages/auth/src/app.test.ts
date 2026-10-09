import { describe, expect, it, vi } from "vitest";
import { fromOwnPage, handleAppAuth, ownerSession } from "./app.ts";

const APP = "https://magellan.cantin-roquier.workers.dev";
const HUB = "https://index.cantin-roquier.workers.dev";

const hubSaying = (body: unknown) => ({ fetch: vi.fn(async () => Response.json(body)) });

describe("ownerSession", () => {
  it("demande au hub, cookie compris", async () => {
    const hub = hubSaying({ owner: true, login: "CantinDeBrunoy" });
    const request = new Request(`${APP}/api/session`, { headers: { cookie: "index_session=abc" } });
    expect(await ownerSession(request, hub)).toEqual({ login: "CantinDeBrunoy" });
    expect(hub.fetch).toHaveBeenCalledWith("https://index/api/auth/session", { headers: { cookie: "index_session=abc" } });
  });

  it("ne dérange pas le hub sans cookie de session", async () => {
    const hub = hubSaying({ owner: true });
    expect(await ownerSession(new Request(APP, { headers: { cookie: "autre=1" } }), hub)).toBeNull();
    expect(hub.fetch).not.toHaveBeenCalled();
  });

  it("vaut « non connecté » quand le hub dit non, ou ne répond pas", async () => {
    const request = new Request(APP, { headers: { cookie: "index_session=abc" } });
    expect(await ownerSession(request, hubSaying({ owner: false }))).toBeNull();
    expect(await ownerSession(request, { fetch: vi.fn(async () => { throw new Error("hors ligne"); }) })).toBeNull();
    expect(await ownerSession(request, undefined)).toBeNull();
  });
});

describe("handleAppAuth", () => {
  it("renvoie vers la connexion du hub, retour sur l'app", async () => {
    const response = (await handleAppAuth(new Request(`${APP}/api/auth/login?next=/trip/1`), undefined, HUB))!;
    const location = new URL(response.headers.get("location")!);
    expect(location.origin + location.pathname).toBe(`${HUB}/api/auth/login`);
    expect(location.searchParams.get("next")).toBe(`${APP}/trip/1`);
  });

  it("ne renvoie jamais ailleurs que sur l'app", async () => {
    const response = (await handleAppAuth(new Request(`${APP}/api/auth/logout?next=https://evil.test/`), undefined, HUB))!;
    expect(new URL(response.headers.get("location")!).searchParams.get("next")).toBe(`${APP}/`);
  });

  it("ignore les autres chemins", async () => {
    expect(await handleAppAuth(new Request(`${APP}/api/trips`), undefined, HUB)).toBeNull();
  });
});

describe("fromOwnPage", () => {
  it("n'accepte que l'origine de l'app", () => {
    const at = (origin?: string) => new Request(`${APP}/api/trips`, { method: "PUT", headers: origin ? { origin } : {} });
    expect(fromOwnPage(at(APP))).toBe(true);
    expect(fromOwnPage(at(HUB))).toBe(false);
    expect(fromOwnPage(at())).toBe(false);
  });
});
