import { projects } from "@index/projects";
import { checkProject, type Health } from "@index/projects/check";

/**
 * Worker du portfolio : sert le site statique (build Astro) et une seule route dynamique,
 * GET /api/status, qui sonde côté serveur les démos de chaque entrée (statut live).
 *
 * Les sondes ne tournent qu'une fois toutes les 5 minutes au plus : résultat gardé en
 * mémoire de l'isolate (marche aussi sur workers.dev, où le Cache API est inopérant)
 * et dans le cache Cloudflare quand le site est sur un domaine personnalisé.
 */

const TTL_SECONDS = 300;

export interface StatusPayload {
  checkedAt: string;
  projects: Record<string, { health: Health | null }>;
}

let memo: { at: number; body: string } | undefined;

async function computeStatus(env: Env): Promise<string> {
  const monitored = projects.filter((p) => p.monitors.length > 0);
  const checks = await Promise.all(
    monitored.map((p) => checkProject(p, { env: env as unknown as Record<string, string | undefined> })),
  );
  const payload: StatusPayload = {
    checkedAt: new Date().toISOString(),
    projects: Object.fromEntries(checks.map((c) => [c.slug, { health: c.health }])),
  };
  return JSON.stringify(payload);
}

async function status(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Méthode non autorisée", { status: 405, headers: { allow: "GET, HEAD" } });
  }

  const cacheKey = new Request(new URL("/api/status", request.url));
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  if (!memo || Date.now() - memo.at > TTL_SECONDS * 1000) {
    memo = { at: Date.now(), body: await computeStatus(env) };
  }

  const response = new Response(memo.body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${TTL_SECONDS}`,
    },
  });
  ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/status") return status(request, env, ctx);
    if (pathname.startsWith("/api/")) return new Response("Introuvable", { status: 404 });
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
