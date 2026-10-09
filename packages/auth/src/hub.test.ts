import { describe, expect, it, vi } from "vitest";
import { handleAuth, safeNext } from "./hub.ts";
import { OWNER, SESSION_COOKIE, createSession, signToken } from "./session.ts";

const HUB = "https://index.cantin-roquier.workers.dev";
const env = { GITHUB_CLIENT_ID: "client", GITHUB_CLIENT_SECRET: "secret-client", SESSION_SECRET: "secret-session" };

const get = (path: string, cookie?: string) => new Request(`${HUB}${path}`, { headers: cookie ? { cookie } : {} });
const cookies = (response: Response) => response.headers.getSetCookie();

/** Un faux GitHub : échange du code, profil, révocation du jeton. */
function gitHub(user: { id: number; login: string }) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/login/oauth/access_token")) return Response.json({ access_token: "gho_test" });
    if (url.endsWith("/user")) return Response.json(user);
    if (url.includes("/applications/")) return new Response(null, { status: 204 });
    return new Response("inattendu", { status: 500 });
  });
}

async function startLogin(next = "/projets") {
  const response = (await handleAuth(get(`/api/auth/login?next=${encodeURIComponent(next)}`), env))!;
  const location = new URL(response.headers.get("location")!);
  const stateCookie = cookies(response)[0]!.split(";")[0]!;
  return { response, location, stateCookie, state: location.searchParams.get("state")! };
}

describe("safeNext", () => {
  const here = new URL(HUB);
  it("garde une page du hub ou d'une app du même workers.dev", () => {
    expect(safeNext("/projets#apps", here)).toBe(`${HUB}/projets#apps`);
    expect(safeNext("https://magellan.cantin-roquier.workers.dev/trip/1", here)).toBe("https://magellan.cantin-roquier.workers.dev/trip/1");
  });

  it("ramène à l'accueil pour toute autre adresse", () => {
    for (const raw of [
      "https://evil.test/",
      "//evil.test/",
      "/\\evil.test/",
      "http://magellan.cantin-roquier.workers.dev/",
      "https://magellan.cantin-roquier.workers.dev:8443/",
      "https://cantin-roquier.workers.dev.evil.test/",
      "https://a:b@magellan.cantin-roquier.workers.dev/",
      "javascript:alert(1)",
    ]) {
      expect(safeNext(raw, here), raw).toBe(`${HUB}/`);
    }
    expect(safeNext(null, here)).toBe(`${HUB}/`);
  });
});

describe("handleAuth", () => {
  it("ignore les autres chemins", async () => {
    expect(await handleAuth(get("/api/status"), env)).toBeNull();
  });

  it("dit si le propriétaire est connecté", async () => {
    const token = await createSession({ id: OWNER.githubId, login: OWNER.login }, env.SESSION_SECRET);
    const yes = await handleAuth(get("/api/auth/session", `${SESSION_COOKIE}=${token}`), env);
    const no = await handleAuth(get("/api/auth/session"), env);
    expect(await yes!.json()).toEqual({ owner: true, login: OWNER.login });
    expect(await no!.json()).toEqual({ owner: false, login: null });
    expect(yes!.headers.get("cache-control")).toBe("no-store");
  });

  it("répond « pas encore configurée » sans application GitHub", async () => {
    const response = await handleAuth(get("/api/auth/login"), { SESSION_SECRET: "x" });
    expect(response!.status).toBe(503);
  });

  it("part sur GitHub avec un état signé", async () => {
    const { response, location, stateCookie, state } = await startLogin();
    expect(response.status).toBe(302);
    expect(location.origin + location.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(location.searchParams.get("client_id")).toBe("client");
    expect(location.searchParams.get("redirect_uri")).toBe(`${HUB}/api/auth/callback`);
    expect(location.searchParams.has("scope")).toBe(false);
    expect(state.length).toBeGreaterThan(20);
    expect(stateCookie.startsWith("index_oauth=")).toBe(true);
  });

  it("connecte le propriétaire et le renvoie où il allait", async () => {
    const { stateCookie, state } = await startLogin("https://magellan.cantin-roquier.workers.dev/");
    const fetchImpl = gitHub({ id: OWNER.githubId, login: OWNER.login });
    const waitUntil = vi.fn();
    const response = (await handleAuth(get(`/api/auth/callback?code=c&state=${state}`, stateCookie), env, { waitUntil }, fetchImpl))!;
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://magellan.cantin-roquier.workers.dev/");
    const session = cookies(response).find((c) => c.startsWith(`${SESSION_COOKIE}=`))!;
    expect(session).toContain("Domain=cantin-roquier.workers.dev");
    expect(session).toContain("HttpOnly");
    expect(waitUntil).toHaveBeenCalledOnce(); // jeton GitHub rendu

    const check = await handleAuth(get("/api/auth/session", session.split(";")[0]), env);
    expect(await check!.json()).toEqual({ owner: true, login: OWNER.login });
  });

  it("refuse tout autre compte GitHub", async () => {
    const { stateCookie, state } = await startLogin();
    const response = (await handleAuth(get(`/api/auth/callback?code=c&state=${state}`, stateCookie), env, undefined, gitHub({ id: 42, login: "intrus" })))!;
    expect(response.status).toBe(403);
    expect(cookies(response).some((c) => c.startsWith(`${SESSION_COOKIE}=`))).toBe(false);
  });

  it("refuse un retour sans l'état de la connexion en cours", async () => {
    const { stateCookie } = await startLogin();
    const fetchImpl = gitHub({ id: OWNER.githubId, login: OWNER.login });
    const wrongState = await handleAuth(get("/api/auth/callback?code=c&state=autre", stateCookie), env, undefined, fetchImpl);
    const noCookie = await handleAuth(get("/api/auth/callback?code=c&state=x"), env, undefined, fetchImpl);
    const expired = `index_oauth=${await signToken({ state: "s", next: "/", exp: 1 }, env.SESSION_SECRET)}`;
    const late = await handleAuth(get("/api/auth/callback?code=c&state=s", expired), env, undefined, fetchImpl);
    expect([wrongState!.status, noCookie!.status, late!.status]).toEqual([400, 400, 400]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("déconnecte en effaçant le cookie sur tout le workers.dev", async () => {
    const response = (await handleAuth(get("/api/auth/logout?next=/projets"), env))!;
    expect(response.headers.get("location")).toBe(`${HUB}/projets`);
    expect(cookies(response)[0]).toMatch(/^index_session=; .*Domain=cantin-roquier\.workers\.dev; Max-Age=0/);
  });

  it("n'accepte que GET", async () => {
    const response = await handleAuth(new Request(`${HUB}/api/auth/logout`, { method: "POST" }), env);
    expect(response!.status).toBe(405);
  });
});
