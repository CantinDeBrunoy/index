import type { CheckResult, Health, ProjectCheck } from "./check.ts";
import type { Project } from "./types.ts";

/**
 * Alertes du keep-alive sous forme d'issues GitHub : une issue ouverte par problème,
 * fermée automatiquement quand le service répond de nouveau. Utilisé par
 * scripts/keep-alive.ts (GitHub Actions) et par le cron du Worker du portfolio.
 */

export const REPOSITORY = "CantinDeBrunoy/index";

/**
 * Workflows planifiés du monorepo. GitHub désactive les crons d'un dépôt public après
 * 60 jours sans activité : le Worker le détecte et ouvre une issue pour les réactiver
 * à la main (aucun commit factice, aucune réactivation automatique).
 */
export const SCHEDULED_WORKFLOWS = ["keep-alive.yml", "hublot-check.yml"] as const;

export const ALERT_LABEL = "keep-alive";

export interface Alert {
  /** Identifiant stable : une seule issue ouverte par clé. */
  key: string;
  title: string;
  body: string;
}

export interface AlertBatch {
  alerts: Alert[];
  /** Clés effectivement vérifiées : seules leurs issues peuvent être fermées. */
  checkedKeys: string[];
}

const HEALTH_FR: Record<Health, string> = { online: "en ligne", asleep: "en veille", offline: "hors ligne" };

const marker = (key: string) => `<!-- keep-alive:${key} -->`;
const MARKER_PATTERN = /<!-- keep-alive:(\S+) -->/;

function advice(result: CheckResult): string | null {
  if (result.health === "online") return null;
  const { monitor } = result;
  if (monitor.kind === "supabase") {
    return result.httpStatus === 540
      ? "La base Supabase est en pause : la restaurer depuis le dashboard Supabase (bouton « Restore project »)."
      : "La base Supabase ne répond pas normalement : vérifier le projet et la clé anon (secret TONALLI_SUPABASE_ANON_KEY).";
  }
  if (monitor.kind === "freshness") {
    return "Le cron qui produit ces données ne tourne plus : vérifier ses dernières exécutions dans l'onglet Actions et le réactiver si GitHub l'a désactivé.";
  }
  return "La démo ne répond pas normalement : vérifier le dernier déploiement et l'état de l'hébergeur.";
}

/** Une alerte par projet qui n'est pas en ligne. */
export function projectAlerts(projects: readonly Project[], checks: readonly ProjectCheck[], now = new Date()): AlertBatch {
  const alerts: Alert[] = [];
  const checkedKeys: string[] = [];

  for (const check of checks) {
    const project = projects.find((p) => p.slug === check.slug);
    if (!project || check.health === null) continue;
    const key = `project:${project.slug}`;
    checkedKeys.push(key);
    if (check.health === "online") continue;

    const rows = check.results.map(
      (r) => `| ${r.monitor.kind} | ${r.monitor.url} | ${HEALTH_FR[r.health]} | ${r.detail} |`,
    );
    const todo = [...new Set(check.results.map(advice).filter((a): a is string => a !== null))];
    alerts.push({
      key,
      title: `[keep-alive] ${project.number} ${project.name} : ${HEALTH_FR[check.health]}`,
      body: [
        `**${project.number} ${project.name}** est **${HEALTH_FR[check.health]}** (sondé le ${now.toISOString().slice(0, 16).replace("T", " ")} UTC).`,
        "",
        "| Sonde | Cible | État | Détail |",
        "|---|---|---|---|",
        ...rows,
        "",
        "**Que faire ?**",
        ...todo.map((t) => `- ${t}`),
        "",
        "Cette issue se fermera d'elle-même quand le service répondra de nouveau.",
        marker(key),
      ].join("\n"),
    });
  }

  return { alerts, checkedKeys };
}

// ---- API GitHub (fetch seul : marche dans Node comme dans un Worker) ----

export interface GitHubOptions {
  repository?: string;
  token: string;
  fetch?: typeof fetch;
}

export class GitHubApiError extends Error {
  // Champ explicite plutôt qu'une « parameter property » : Node exécute ce fichier sans transpiler.
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

export function createGitHubClient({ repository = REPOSITORY, token, fetch: fetchImpl }: GitHubOptions) {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);
  const base = `https://api.github.com/repos/${repository}`;

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await doFetch(`${base}${path}`, {
      method,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "user-agent": "INDEX-keep-alive",
        "x-github-api-version": "2022-11-28",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? null : JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = (await response.json().catch(() => ({}))) as { message?: string };
      throw new GitHubApiError(response.status, `${method} ${path} : HTTP ${response.status} ${detail.message ?? ""}`.trim());
    }
    return (response.status === 204 ? null : await response.json()) as T;
  }

  return { repository, request };
}

export type GitHubClient = ReturnType<typeof createGitHubClient>;

interface IssueSummary {
  number: number;
  title: string;
  body: string | null;
  pull_request?: unknown;
}

interface WorkflowSummary {
  path: string;
  state: string;
  html_url: string;
}

/** Une alerte par workflow planifié que GitHub a désactivé pour inactivité. */
export async function workflowAlerts(github: GitHubClient): Promise<AlertBatch> {
  const { workflows } = await github.request<{ workflows: WorkflowSummary[] }>("GET", "/actions/workflows?per_page=100");
  const alerts: Alert[] = [];
  const checkedKeys: string[] = [];

  for (const file of SCHEDULED_WORKFLOWS) {
    const workflow = workflows.find((w) => w.path.endsWith(`/${file}`));
    if (!workflow) continue;
    const key = `workflow:${file}`;
    checkedKeys.push(key);
    if (workflow.state !== "disabled_inactivity") continue;
    alerts.push({
      key,
      title: `[keep-alive] Le workflow ${file} a été désactivé par GitHub`,
      body: [
        `GitHub a désactivé le cron de **${file}** : le dépôt est resté 60 jours sans activité.`,
        "",
        `Pour le relancer : ouvrir ${workflow.html_url} puis cliquer sur **Enable workflow**.`,
        "",
        "Le Worker du portfolio continue de sonder les services (et de garder Supabase éveillé) en attendant.",
        "Cette issue se fermera d'elle-même une fois le workflow réactivé.",
        marker(key),
      ].join("\n"),
    });
  }

  return { alerts, checkedKeys };
}

async function ensureLabel(github: GitHubClient) {
  try {
    await github.request("GET", `/labels/${ALERT_LABEL}`);
  } catch (error) {
    if (!(error instanceof GitHubApiError) || error.status !== 404) throw error;
    await github.request("POST", "/labels", {
      name: ALERT_LABEL,
      color: "ff1a1a",
      description: "Service ou cron signalé par le keep-alive d'INDEX",
    });
  }
}

export interface SyncReport {
  opened: string[];
  updated: string[];
  closed: string[];
}

/**
 * Aligne les issues sur les alertes : ouvre celles qui manquent, met à jour le titre quand
 * l'état change, ferme celles dont le problème a disparu (parmi les clés vérifiées).
 */
export async function syncIssues(github: GitHubClient, batches: readonly AlertBatch[], now = new Date()): Promise<SyncReport> {
  const alerts = batches.flatMap((b) => b.alerts);
  const checked = new Set(batches.flatMap((b) => b.checkedKeys));
  const report: SyncReport = { opened: [], updated: [], closed: [] };

  const open = await github.request<IssueSummary[]>("GET", `/issues?state=open&labels=${ALERT_LABEL}&per_page=100`);
  const byKey = new Map<string, IssueSummary>();
  for (const issue of open) {
    const key = issue.pull_request ? undefined : MARKER_PATTERN.exec(issue.body ?? "")?.[1];
    if (key) byKey.set(key, issue);
  }

  if (alerts.some((a) => !byKey.has(a.key))) await ensureLabel(github);

  for (const alert of alerts) {
    const issue = byKey.get(alert.key);
    if (!issue) {
      await github.request("POST", "/issues", { title: alert.title, body: alert.body, labels: [ALERT_LABEL] });
      report.opened.push(alert.key);
    } else if (issue.title !== alert.title) {
      await github.request("PATCH", `/issues/${issue.number}`, { title: alert.title, body: alert.body });
      await github.request("POST", `/issues/${issue.number}/comments`, { body: `Nouvel état : ${alert.title}` });
      report.updated.push(alert.key);
    }
  }

  const stillFailing = new Set(alerts.map((a) => a.key));
  for (const [key, issue] of byKey) {
    if (!checked.has(key) || stillFailing.has(key)) continue;
    await github.request("POST", `/issues/${issue.number}/comments`, {
      body: `Rétabli : de nouveau en ordre au sondage du ${now.toISOString().slice(0, 16).replace("T", " ")} UTC.`,
    });
    await github.request("PATCH", `/issues/${issue.number}`, { state: "closed", state_reason: "completed" });
    report.closed.push(key);
  }

  return report;
}
