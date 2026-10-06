import type { Monitor, Project } from "./types.ts";

/**
 * Sondes de statut partagées par le Worker du portfolio (statut live) et par
 * scripts/keep-alive.ts (GitHub Actions) : la même classification partout.
 *
 * - online : la cible répond normalement ;
 * - asleep : elle répond mais dort (réveil lent, base en pause, cron arrêté) ;
 * - offline : elle ne répond pas, ou répond en erreur.
 */
export type Health = "online" | "asleep" | "offline";

export interface CheckResult {
  monitor: Monitor;
  health: Health;
  /** Durée de la requête, en millisecondes. */
  ms: number;
  httpStatus?: number;
  /** Explication courte, en français, reprise dans les issues GitHub. */
  detail: string;
}

export interface ProjectCheck {
  slug: string;
  /** null quand aucune sonde n'a pu tourner (pas d'URL, clé absente…). */
  health: Health | null;
  results: CheckResult[];
}

export interface CheckOptions {
  /** Variables d'environnement (clés Supabase anon…) : process.env côté Node, env côté Worker. */
  env?: Record<string, string | undefined>;
  /** Au-delà, la réponse est considérée comme un réveil : « en veille ». */
  slowMs?: number;
  /** Au-delà, la requête est abandonnée : « hors ligne ». */
  timeoutMs?: number;
  fetch?: typeof fetch;
  now?: () => number;
}

export const SLOW_MS = 5_000;
export const TIMEOUT_MS = 15_000;
const USER_AGENT = "INDEX-status (+https://github.com/CantinDeBrunoy/index)";

/** 503 : service qui se réveille (Render, Fly…) ; 540 : projet Supabase en pause. */
const SLEEP_STATUSES = new Set([503, 540]);

const SEVERITY: Record<Health, number> = { online: 0, asleep: 1, offline: 2 };

export function worst(healths: readonly Health[]): Health | null {
  let result: Health | null = null;
  for (const h of healths) {
    if (result === null || SEVERITY[h] > SEVERITY[result]) result = h;
  }
  return result;
}

function classifyStatus(status: number, ms: number, slowMs: number): { health: Health; detail: string } {
  if (SLEEP_STATUSES.has(status)) return { health: "asleep", detail: `HTTP ${status} : service en veille` };
  if (status >= 400) return { health: "offline", detail: `HTTP ${status}` };
  if (ms > slowMs) return { health: "asleep", detail: `réponse en ${Math.round(ms)} ms : réveil probable` };
  return { health: "online", detail: `HTTP ${status} en ${Math.round(ms)} ms` };
}

function readField(data: unknown, path: string): unknown {
  let value: unknown = data;
  for (const key of path.split(".")) {
    if (value === null || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

/**
 * Lance une sonde. Renvoie null quand elle ne peut pas tourner ici
 * (clé Supabase absente de l'environnement).
 */
export async function checkMonitor(monitor: Monitor, options: CheckOptions = {}): Promise<CheckResult | null> {
  // Lier fetch à globalThis : dans un Worker, l'appeler comme méthode d'un autre objet lève « Illegal invocation ».
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const now = options.now ?? Date.now;
  const slowMs = options.slowMs ?? SLOW_MS;
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;

  let url = monitor.url;
  const headers: Record<string, string> = { "user-agent": USER_AGENT };

  if (monitor.kind === "supabase") {
    const key = options.env?.[monitor.anonKeyEnv];
    if (!key) return null;
    // select=*&limit=1 : une vraie requête Postgres, la moins chère possible.
    url = `${monitor.url.replace(/\/$/, "")}/rest/v1/${monitor.table}?select=*&limit=1`;
    headers.apikey = key;
    headers.authorization = `Bearer ${key}`;
  }

  const started = now();
  let response: Response;
  try {
    response = await doFetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    const ms = now() - started;
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      monitor,
      health: "offline",
      ms,
      detail: timedOut ? `aucune réponse en ${timeoutMs / 1000} s` : `erreur réseau : ${String(error)}`,
    };
  }
  const ms = now() - started;

  if (monitor.kind !== "freshness" || !response.ok) {
    await response.body?.cancel();
    const { health, detail } = classifyStatus(response.status, ms, slowMs);
    return { monitor, health, ms, httpStatus: response.status, detail };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { monitor, health: "offline", ms, httpStatus: response.status, detail: "JSON illisible" };
  }
  const raw = readField(data, monitor.field);
  const date = typeof raw === "string" ? Date.parse(raw) : Number.NaN;
  if (Number.isNaN(date)) {
    return { monitor, health: "offline", ms, httpStatus: response.status, detail: `champ « ${monitor.field} » absent` };
  }
  const ageHours = (now() - date) / 3_600_000;
  if (ageHours > monitor.maxAgeHours) {
    return {
      monitor,
      health: "asleep",
      ms,
      httpStatus: response.status,
      detail: `données vieilles de ${Math.round(ageHours)} h (max ${monitor.maxAgeHours} h) : le cron ne tourne plus`,
    };
  }
  return {
    monitor,
    health: "online",
    ms,
    httpStatus: response.status,
    detail: `données d'il y a ${ageHours < 1 ? "moins d'une heure" : `${Math.round(ageHours)} h`}`,
  };
}

/** Lance toutes les sondes d'un projet en parallèle ; son état est celui de la pire sonde. */
export async function checkProject(project: Project, options: CheckOptions = {}): Promise<ProjectCheck> {
  const results = (await Promise.all(project.monitors.map((m) => checkMonitor(m, options)))).filter(
    (r): r is CheckResult => r !== null,
  );
  return { slug: project.slug, health: worst(results.map((r) => r.health)), results };
}
