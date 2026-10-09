import { fromOwnPage, handleAppAuth, ownerSession } from "@index/auth/app";
import { json } from "@index/auth";
import { DATA_REPOSITORY, allowCall } from "./github.ts";

/**
 * Worker de la page Hublot : la page (docs/, préparée dans dist/page) est servie telle quelle ; passent par ici :
 * - GET /api/session, /api/auth/login, /api/auth/logout : la connexion, vérifiée auprès du hub ;
 * - /api/github/* : les appels de la page à l'API GitHub, pour le propriétaire connecté seulement. Le Worker
 *   y ajoute sa clé (secret HUBLOT_GITHUB_TOKEN : jeton à grain fin limité au dépôt des données, Contents et
 *   Actions en écriture), qui ne quitte jamais le serveur. Seuls passent les appels de la page (github.ts).
 */

interface Secrets {
  HUBLOT_GITHUB_TOKEN?: string;
}

async function proxy(request: Request, token: string | undefined): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.slice("/api/github".length);
  const writes = request.method !== "GET";
  if (writes && !fromOwnPage(request)) return json({ message: "Origine refusée" }, 403);

  const body = writes ? await request.text() : undefined;
  const allowed = allowCall(request.method, path, url.searchParams, body);
  if (!allowed.ok) return json({ message: allowed.reason }, 403);
  if (!token) return json({ message: "Clé GitHub du serveur pas encore configurée" }, 503);

  const { owner, repo } = DATA_REPOSITORY;
  const upstream = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}${url.search}`, {
    method: request.method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "user-agent": "index-hublot",
      "x-github-api-version": "2022-11-28",
      ...(allowed.body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: allowed.body,
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const auth = await handleAppAuth(request, env.HUB);
    if (auth) return auth;

    if (url.pathname.startsWith("/api/github/")) {
      if (!(await ownerSession(request, env.HUB))) return json({ message: "Connexion requise" }, 401);
      return proxy(request, (env as unknown as Secrets).HUBLOT_GITHUB_TOKEN);
    }
    if (url.pathname.startsWith("/api/")) return json({ message: "Introuvable" }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
