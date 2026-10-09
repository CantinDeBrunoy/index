/**
 * La connexion, côté hub (Worker « index ») :
 * - GET /api/auth/login?next=… : part sur GitHub (OAuth, aucune permission demandée : le profil public suffit) ;
 * - GET /api/auth/callback : GitHub revient ici ; seul le compte du propriétaire reçoit une session ;
 * - GET /api/auth/logout?next=… : efface la session ;
 * - GET /api/auth/session : { owner, login } — lu par les pages du hub, et par Magellan et Hublot
 *   via leur liaison de service (le secret de session ne quitte jamais le hub).
 *
 * Variables : GITHUB_CLIENT_ID (publique, dans wrangler.jsonc). Secrets : GITHUB_CLIENT_SECRET et
 * SESSION_SECRET. Tant qu'il en manque un, la connexion répond « pas encore configurée ».
 */

import { WORKERS_SUBDOMAIN } from "@index/projects";
import {
  OWNER,
  SESSION_COOKIE,
  SESSION_DAYS,
  cookieDomain,
  createSession,
  json,
  randomToken,
  readCookie,
  readSession,
  serializeCookie,
  signToken,
  verifyToken,
} from "./session.ts";

export interface HubAuthEnv {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
}

interface WaitUntil {
  waitUntil(promise: Promise<unknown>): void;
}

/** L'aller-retour par GitHub : l'état anti-CSRF et la page où revenir, signés, valables 10 minutes. */
interface OAuthState {
  state: string;
  next: string;
  exp: number;
}

const STATE_COOKIE = "index_oauth";
const STATE_PATH = "/api/auth";
const STATE_SECONDS = 600;
const USER_AGENT = "index-hub";

/** La réponse du hub pour /api/auth/*, ou null si le chemin n'en est pas un. */
export async function handleAuth(
  request: Request,
  env: HubAuthEnv,
  ctx?: WaitUntil,
  fetchImpl: typeof fetch = fetch,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(`${STATE_PATH}/`)) return null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Méthode non autorisée", { status: 405, headers: { allow: "GET, HEAD" } });
  }
  switch (url.pathname) {
    case "/api/auth/session":
      return session(request, env);
    case "/api/auth/login":
      return login(request, env);
    case "/api/auth/callback":
      return callback(request, env, ctx, fetchImpl);
    case "/api/auth/logout":
      return logout(request);
    default:
      return null;
  }
}

async function session(request: Request, env: HubAuthEnv): Promise<Response> {
  const found = env.SESSION_SECRET ? await readSession(request, env.SESSION_SECRET) : null;
  return json({ owner: found !== null, login: found?.login ?? null });
}

async function login(request: Request, env: HubAuthEnv): Promise<Response> {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"), url);
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_SECRET) {
    return page(503, "Connexion pas encore configurée", "Il manque l'application GitHub ou le secret de session du hub.", next);
  }
  // Déjà connecté : rien à refaire.
  if (await readSession(request, env.SESSION_SECRET)) return redirect(next);

  const state = randomToken();
  const payload: OAuthState = { state, next, exp: Math.floor(Date.now() / 1000) + STATE_SECONDS };
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.search = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${url.origin}${STATE_PATH}/callback`,
    state,
    allow_signup: "false",
  }).toString();
  return redirect(authorize.href, [
    serializeCookie(STATE_COOKIE, await signToken(payload, env.SESSION_SECRET), { maxAge: STATE_SECONDS, path: STATE_PATH }),
  ]);
}

async function callback(request: Request, env: HubAuthEnv, ctx: WaitUntil | undefined, fetchImpl: typeof fetch): Promise<Response> {
  const url = new URL(request.url);
  const home = `${url.origin}/`;
  const clearState = serializeCookie(STATE_COOKIE, "", { maxAge: 0, path: STATE_PATH });
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_SECRET) {
    return page(503, "Connexion pas encore configurée", "Il manque l'application GitHub ou le secret de session du hub.", home);
  }

  const cookie = readCookie(request.headers.get("cookie"), STATE_COOKIE);
  const saved = cookie ? await verifyToken<OAuthState>(cookie, env.SESSION_SECRET) : null;
  const state = url.searchParams.get("state");
  if (!saved || !state || saved.state !== state || saved.exp * 1000 <= Date.now()) {
    return page(400, "Connexion expirée", "Le retour de GitHub ne correspond pas à une connexion en cours. Recommence depuis le hub.", home, [clearState]);
  }
  const next = safeNext(saved.next, url);
  const code = url.searchParams.get("code");
  if (!code) return redirect(next, [clearState]); // Connexion refusée sur GitHub.

  let user: { id?: unknown; login?: unknown };
  try {
    const exchange = await fetchImpl("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json", "user-agent": USER_AGENT },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${url.origin}${STATE_PATH}/callback`,
      }),
    });
    const { access_token: token } = (await exchange.json()) as { access_token?: string };
    if (!token) throw new Error("GitHub n'a pas donné de jeton");
    const profile = await fetchImpl("https://api.github.com/user", {
      headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "user-agent": USER_AGENT, "x-github-api-version": "2022-11-28" },
    });
    if (!profile.ok) throw new Error(`GitHub /user : HTTP ${profile.status}`);
    user = (await profile.json()) as typeof user;
    // Le jeton n'a servi qu'à lire l'identité : on le rend à GitHub.
    const revoke = fetchImpl(`https://api.github.com/applications/${env.GITHUB_CLIENT_ID}/token`, {
      method: "DELETE",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Basic ${btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`)}`,
        "content-type": "application/json",
        "user-agent": USER_AGENT,
      },
      body: JSON.stringify({ access_token: token }),
    }).catch(() => undefined);
    if (ctx) ctx.waitUntil(revoke);
  } catch (error) {
    console.error(JSON.stringify({ auth: "callback", error: error instanceof Error ? error.message : String(error) }));
    return page(502, "GitHub n'a pas répondu", "La connexion n'a pas pu aboutir. Réessaie dans un instant.", home, [clearState]);
  }

  if (user.id !== OWNER.githubId || typeof user.login !== "string") {
    return page(403, "Accès réservé", "Cet espace ne s'ouvre qu'à son propriétaire. Les démos restent ouvertes à tous.", home, [clearState]);
  }
  const token = await createSession({ id: user.id, login: user.login }, env.SESSION_SECRET);
  return redirect(next, [
    clearState,
    serializeCookie(SESSION_COOKIE, token, { maxAge: SESSION_DAYS * 86_400, domain: cookieDomain(url.hostname, WORKERS_SUBDOMAIN) }),
  ]);
}

function logout(request: Request): Response {
  const url = new URL(request.url);
  return redirect(safeNext(url.searchParams.get("next"), url), [
    serializeCookie(SESSION_COOKIE, "", { maxAge: 0, domain: cookieDomain(url.hostname, WORKERS_SUBDOMAIN) }),
  ]);
}

/**
 * Où revenir après la connexion : une page du hub, ou d'une app du même workers.dev en https. Toute autre
 * adresse ramène à l'accueil du hub, pour ne jamais servir de redirection ouverte.
 */
export function safeNext(raw: string | null, here: URL, workersSubdomain = WORKERS_SUBDOMAIN): string {
  const home = `${here.origin}/`;
  if (!raw) return home;
  let target: URL;
  try {
    target = new URL(raw, here.origin);
  } catch {
    return home;
  }
  if (target.origin === here.origin) return target.href;
  const parent = workersSubdomain ? `.${workersSubdomain}.workers.dev` : undefined;
  const sibling = parent !== undefined && target.protocol === "https:" && target.port === "" && target.hostname.endsWith(parent);
  return sibling && !target.username && !target.password ? target.href : home;
}

function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ location, "cache-control": "no-store" });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/** Une page d'erreur sobre, pour le propriétaire (ou le curieux qui a cliqué « Connexion »). */
function page(status: number, title: string, text: string, back: string, cookies: string[] = []): Response {
  const headers = new Headers({ "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  const html = `<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} · INDEX</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px; box-sizing: border-box;
         font: 16px/1.5 system-ui, sans-serif; background: #f4efe6; color: #2b2622; }
  @media (prefers-color-scheme: dark) { body { background: #16141c; color: #ece6da; } a { color: #d9b46a; } }
  main { max-width: 32rem; }
  h1 { font-size: 1.4rem; margin: 0 0 .5rem; }
  a { color: #8a5a1c; }
</style>
<main>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(text)}</p>
  <p><a href="${escapeHtml(back)}">← Revenir</a></p>
</main>
</html>`;
  return new Response(html, { status, headers });
}
