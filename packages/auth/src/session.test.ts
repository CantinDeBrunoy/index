import { describe, expect, it } from "vitest";
import { OWNER, SESSION_COOKIE, cookieDomain, createSession, readCookie, readSession, serializeCookie, signToken, verifyToken } from "./session.ts";

const SECRET = "secret-de-test";
const owner = { id: OWNER.githubId, login: OWNER.login };
const withCookie = (cookie: string) => new Request("https://index.exemple.workers.dev/", { headers: { cookie } });

describe("jetons signés", () => {
  it("relit ce qu'il a signé", async () => {
    const token = await signToken({ a: 1, texte: "é" }, SECRET);
    expect(await verifyToken(token, SECRET)).toEqual({ a: 1, texte: "é" });
  });

  it("refuse un autre secret, une charge modifiée ou un format inattendu", async () => {
    const token = await signToken({ a: 1 }, SECRET);
    const [, signature] = token.split(".");
    const forged = `${btoa(JSON.stringify({ a: 2 })).replace(/=+$/, "")}.${signature}`;
    expect(await verifyToken(token, "autre")).toBeNull();
    expect(await verifyToken(forged, SECRET)).toBeNull();
    expect(await verifyToken(`${token}.x`, SECRET)).toBeNull();
    expect(await verifyToken("pas-un-jeton", SECRET)).toBeNull();
    expect(await verifyToken("@@@.###", SECRET)).toBeNull();
  });
});

describe("session", () => {
  it("reconnaît la session du propriétaire", async () => {
    const token = await createSession(owner, SECRET);
    expect(await readSession(withCookie(`autre=1; ${SESSION_COOKIE}=${token}`), SECRET)).toMatchObject({ login: OWNER.login });
  });

  it("refuse une session expirée", async () => {
    const token = await createSession(owner, SECRET, Date.now() - 31 * 86_400_000);
    expect(await readSession(withCookie(`${SESSION_COOKIE}=${token}`), SECRET)).toBeNull();
  });

  it("refuse une session bien signée mais d'un autre compte", async () => {
    const token = await createSession({ id: 1, login: "quelquun" }, SECRET);
    expect(await readSession(withCookie(`${SESSION_COOKIE}=${token}`), SECRET)).toBeNull();
  });

  it("refuse l'absence de cookie", async () => {
    expect(await readSession(new Request("https://x.test/"), SECRET)).toBeNull();
  });
});

describe("cookies", () => {
  it("lit un cookie parmi d'autres", () => {
    expect(readCookie("a=1; index_session=abc.def; b=2", "index_session")).toBe("abc.def");
    expect(readCookie("xindex_session=1", "index_session")).toBeUndefined();
    expect(readCookie(null, "index_session")).toBeUndefined();
  });

  it("vise tout le workers.dev du compte, et l'hôte seul ailleurs", () => {
    expect(cookieDomain("index.cantin-roquier.workers.dev", "cantin-roquier")).toBe("cantin-roquier.workers.dev");
    expect(cookieDomain("magellan.cantin-roquier.workers.dev", "cantin-roquier")).toBe("cantin-roquier.workers.dev");
    expect(cookieDomain("index.autre.workers.dev", "cantin-roquier")).toBeUndefined();
    expect(cookieDomain("localhost", "cantin-roquier")).toBeUndefined();
    expect(cookieDomain("index.cantin-roquier.workers.dev", undefined)).toBeUndefined();
  });

  it("pose un cookie HttpOnly, Secure, SameSite=Lax", () => {
    expect(serializeCookie("n", "v", { maxAge: 60, domain: "d.workers.dev" })).toBe(
      "n=v; Path=/; Domain=d.workers.dev; Max-Age=60; HttpOnly; Secure; SameSite=Lax",
    );
  });
});
