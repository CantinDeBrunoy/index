/**
 * La connexion, côté apps (Magellan, Hublot) : elles ne connaissent pas le secret de session, elles
 * demandent au hub, par leur liaison de service HUB (wrangler.jsonc : services → index), si le cookie
 * reçu est celui du propriétaire.
 *
 * Routes communes :
 * - GET /api/session : { owner, login }, pour la page de l'app ;
 * - GET /api/auth/login?next=… et /api/auth/logout?next=… : renvoient vers le hub, qui revient ensuite
 *   sur la page de l'app.
 */

import { PORTFOLIO_URL } from "@index/projects";
import { SESSION_COOKIE, json, readCookie } from "./session.ts";

/** La liaison de service vers le Worker « index » (un Fetcher, dans les types de Workers). */
export interface Hub {
  fetch(input: string, init?: RequestInit): Promise<Response>;
}

/** La session du propriétaire, d'après le hub ; null sans cookie, hors connexion, ou si le hub ne répond pas. */
export async function ownerSession(request: Request, hub: Hub | undefined): Promise<{ login: string } | null> {
  const cookie = request.headers.get("cookie");
  if (!hub || !readCookie(cookie, SESSION_COOKIE)) return null;
  try {
    // L'hôte ne compte pas : la liaison de service mène toujours au hub.
    const response = await hub.fetch("https://index/api/auth/session", { headers: { cookie: cookie! } });
    if (!response.ok) return null;
    const body = (await response.json()) as { owner?: unknown; login?: unknown };
    return body.owner === true ? { login: typeof body.login === "string" ? body.login : "" } : null;
  } catch {
    return null;
  }
}

/** La réponse pour /api/session et /api/auth/*, ou null si le chemin n'en est pas un. */
export async function handleAppAuth(request: Request, hub: Hub | undefined, hubUrl = PORTFOLIO_URL): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname === "/api/session") {
    const session = await ownerSession(request, hub);
    return json({ owner: session !== null, login: session?.login ?? null });
  }
  if (url.pathname !== "/api/auth/login" && url.pathname !== "/api/auth/logout") return null;
  if (!hubUrl) return new Response("Adresse du hub inconnue", { status: 503 });

  // Revenir sur cette app, jamais ailleurs.
  const next = new URL(url.searchParams.get("next") ?? "/", url.origin);
  const target = new URL(url.pathname, hubUrl);
  target.searchParams.set("next", next.origin === url.origin ? next.href : `${url.origin}/`);
  return new Response(null, { status: 302, headers: { location: target.href, "cache-control": "no-store" } });
}

/**
 * Une écriture ne vient que de la page de l'app elle-même : l'en-tête Origin, que le navigateur pose et
 * qu'une page tierce ne peut pas falsifier, doit être celui de l'app. (Le cookie est en SameSite=Lax, mais
 * les autres apps du même workers.dev sont « du même site » : ce contrôle-ci les écarte aussi.)
 */
export function fromOwnPage(request: Request): boolean {
  return request.headers.get("origin") === new URL(request.url).origin;
}
