/**
 * Keep-alive d'INDEX, lancé par .github/workflows/keep-alive.yml (et à la main).
 *
 * - sonde chaque démo listée dans @index/projects (même code que le statut live du portfolio) ;
 * - fait une vraie requête sur les bases qui se mettent en pause (Supabase de Tonalli) ;
 * - ouvre une issue GitHub quand un service ne répond plus, la ferme quand il revient.
 *
 * Usage :
 *   node scripts/keep-alive.ts            # sonde + issues (GITHUB_TOKEN et GITHUB_REPOSITORY requis)
 *   node scripts/keep-alive.ts --dry-run  # sonde seulement, affiche le résultat
 *
 * Aucune dépendance à installer : Node 24 exécute directement le TypeScript des packages.
 */

import { appendFile } from "node:fs/promises";
import { createGitHubClient, projectAlerts, syncIssues, workflowAlerts, type AlertBatch } from "../packages/projects/src/alerts.ts";
import { checkProject, type Health } from "../packages/projects/src/check.ts";
import { projects } from "../packages/projects/src/index.ts";

const dryRun = process.argv.includes("--dry-run");
const LABEL: Record<Health, string> = { online: "🟢 en ligne", asleep: "🟡 en veille", offline: "🔴 hors ligne" };

const monitored = projects.filter((p) => p.monitors.length > 0);
const checks = await Promise.all(
  monitored.map((p) => checkProject(p, { env: process.env, retryDelayMs: dryRun ? 0 : 30_000 })),
);

const lines = ["| Entrée | État | Sondes |", "|---|---|---|"];
for (const check of checks) {
  const project = monitored.find((p) => p.slug === check.slug)!;
  const state = check.health ? LABEL[check.health] : "non sondé";
  const detail = check.results.map((r) => `${r.monitor.kind} : ${r.detail}`).join("<br>") || "clé absente";
  lines.push(`| ${project.number} ${project.name} | ${state} | ${detail} |`);
  console.log(`${project.number} ${project.name.padEnd(12)} ${state.padEnd(14)} ${check.results.map((r) => r.detail).join(" · ")}`);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Keep-alive\n\n${lines.join("\n")}\n`);
}

const token = process.env.GITHUB_TOKEN;
if (dryRun || !token) {
  if (!dryRun) console.log("GITHUB_TOKEN absent : issues non synchronisées.");
} else {
  const github = createGitHubClient({ token, repository: process.env.GITHUB_REPOSITORY });
  const batches: AlertBatch[] = [projectAlerts(projects, checks)];
  try {
    batches.push(await workflowAlerts(github));
  } catch (error) {
    // Sans la permission actions: read, on se passe de l'état des crons.
    console.warn(`État des workflows indisponible : ${String(error)}`);
  }
  const report = await syncIssues(github, batches);
  console.log(
    `Issues : ${report.opened.length} ouverte(s), ${report.updated.length} mise(s) à jour, ${report.closed.length} fermée(s).`,
  );
}
