import { projects } from "@index/projects";
import { createGitHubClient, projectAlerts, syncIssues, workflowAlerts } from "@index/projects/alerts";
import { checkProject, type CheckOptions, type Health, type ProjectCheck } from "@index/projects/check";

/**
 * Worker du portfolio :
 * - sert le site statique (build Astro) ;
 * - GET /api/status : statut live de chaque entrée, sondé côté serveur ;
 * - cron Cloudflare (toutes les heures) : les mêmes sondes que keep-alive.yml, donc Supabase
 *   reste éveillé même si GitHub coupe ses crons, et une issue s'ouvre quand un service tombe
 *   ou quand GitHub désactive un workflow planifié (à réactiver à la main).
 *
 * Secrets (facultatifs) : TONALLI_SUPABASE_ANON_KEY pour sonder la base de Tonalli,
 * GITHUB_ALERTS_TOKEN (jeton à grain fin sur CantinDeBrunoy/index : Issues en écriture,
 * Actions en lecture) pour les issues.
 */

const TTL_SECONDS = 300;

export interface StatusPayload {
  checkedAt: string;
  projects: Record<string, { health: Health | null }>;
}

interface Secrets {
  TONALLI_SUPABASE_ANON_KEY?: string;
  GITHUB_ALERTS_TOKEN?: string;
}

let memo: { at: number; body: string } | undefined;

function secrets(env: Env): Secrets & Record<string, string | undefined> {
  return env as unknown as Secrets & Record<string, string | undefined>;
}

async function runChecks(env: Env, options: CheckOptions = {}): Promise<ProjectCheck[]> {
  const monitored = projects.filter((p) => p.monitors.length > 0);
  const checks = await Promise.all(monitored.map((p) => checkProject(p, { env: secrets(env), ...options })));
  const payload: StatusPayload = {
    checkedAt: new Date().toISOString(),
    projects: Object.fromEntries(checks.map((c) => [c.slug, { health: c.health }])),
  };
  memo = { at: Date.now(), body: JSON.stringify(payload) };
  return checks;
}

async function status(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Méthode non autorisée", { status: 405, headers: { allow: "GET, HEAD" } });
  }

  // Le résultat est gardé en mémoire de l'isolate (marche aussi sur workers.dev, où le Cache API
  // est inopérant) et dans le cache Cloudflare quand le site a un domaine personnalisé.
  const cacheKey = new Request(new URL("/api/status", request.url));
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  if (!memo || Date.now() - memo.at > TTL_SECONDS * 1000) await runChecks(env);

  const response = new Response(memo!.body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${TTL_SECONDS}`,
    },
  });
  ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
  return response;
}

/**
 * Les vidéos (scènes du voyage, démos des fiches) servies par morceaux : Safari, sur iPhone surtout, ne lit
 * une vidéo que si le serveur répond à ses requêtes Range par un 206, ce que les fichiers statiques ne font
 * pas (ils renvoient le fichier entier). Les fichiers font quelques Mo : on les découpe en mémoire.
 */
async function video(request: Request, env: Env): Promise<Response> {
  const response = await env.ASSETS.fetch(request);
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range")?.trim() ?? "");
  if (response.status !== 200 || !range || (range[1] === "" && range[2] === "")) {
    const headers = new Headers(response.headers);
    headers.set("accept-ranges", "bytes");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  const body = await response.arrayBuffer();
  const size = body.byteLength;
  // « bytes=-N » : les N derniers octets ; « bytes=A- » : de A à la fin.
  const start = range[1] === "" ? Math.max(0, size - Number(range[2])) : Number(range[1]);
  const end = range[1] !== "" && range[2] !== "" ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });

  const headers = new Headers(response.headers);
  headers.set("accept-ranges", "bytes");
  headers.set("content-range", `bytes ${start}-${end}/${size}`);
  headers.set("content-length", String(end - start + 1));
  return new Response(request.method === "HEAD" ? null : body.slice(start, end + 1), { status: 206, headers });
}

async function keepAlive(env: Env): Promise<void> {
  // Un raté isolé ne doit pas ouvrir d'issue : chaque sonde en échec est relancée après 30 s.
  const checks = await runChecks(env, { retryDelayMs: 30_000 });
  console.log(JSON.stringify({ keepAlive: Object.fromEntries(checks.map((c) => [c.slug, c.health])) }));

  const token = secrets(env).GITHUB_ALERTS_TOKEN;
  if (!token) return;
  const github = createGitHubClient({ token });
  const report = await syncIssues(github, [projectAlerts(projects, checks), await workflowAlerts(github)]);
  console.log(JSON.stringify({ issues: report }));
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/status") return status(request, env, ctx);
    if (pathname.startsWith("/api/")) return new Response("Introuvable", { status: 404 });
    if (pathname.endsWith(".mp4")) return video(request, env);
    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(keepAlive(env));
  },
} satisfies ExportedHandler<Env>;
