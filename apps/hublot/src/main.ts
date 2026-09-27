// Entry point: `node dist/main.js [--dry-run]`
//   default:   checks prices, notifies the new deals, updates data/*.json
//   --dry-run: prints the table of best prices, without notifying nor writing anything

import { purgeNotified } from "./alerts.js";
import { loadConfig } from "./config.js";
import { toIsoDate } from "./dates.js";
import { formatDeal } from "./notifiers/notifier.js";
import { NtfyNotifier } from "./notifiers/ntfy.js";
import { describeWatch, renderReport } from "./report.js";
import { collectErrors, collectObservations, collectPrices, errorMessage, planAlerts, sendAlerts } from "./run.js";
import { buildSnapshot, pagesUrl } from "./snapshot.js";
import { loadHistory, loadNotified, saveHistory, saveNotified, saveSnapshot } from "./store.js";
import { createTravelpayoutsClient } from "./travelpayouts.js";

async function main(): Promise<number> {
  const dryRun = process.argv.slice(2).includes("--dry-run");
  loadDotEnv();
  const token = requireEnv("TRAVELPAYOUTS_TOKEN");
  const topic = dryRun ? "" : requireEnv("NTFY_TOPIC");
  const config = await loadConfig();
  const now = new Date();
  const notified = purgeNotified(await loadNotified(), now);
  const overviewUrl = pagesUrl(process.env.GITHUB_REPOSITORY);

  console.log(`fare-radar · ${now.toISOString()}${dryRun ? " · --dry-run" : ""}`);
  const results = await collectPrices(config, createTravelpayoutsClient(token), toIsoDate(now), (result) =>
    console.log(describeWatch(result)),
  );
  const planned = planAlerts(results, notified);
  console.log(`\n${renderReport(results, planned, config.currency)}\n`);

  const errors = collectErrors(results);
  if (dryRun) {
    for (const alert of planned) {
      const message = formatDeal(alert.send, alert.watch);
      console.log(`🔔 ${message.title} · ${message.body}\n   ${message.url}`);
    }
    console.log(`--dry-run : ${planned.length} notification(s) auraient été envoyées ; rien n'a été envoyé ni écrit.`);
  } else {
    const history = await loadHistory();
    const observations = collectObservations(results, now);
    history.observations.push(...observations);
    const notifier = new NtfyNotifier(topic);
    const notificationErrors = await sendAlerts(planned, notifier, notified, now, { overviewUrl, log: console.log });
    errors.push(...notificationErrors);
    await saveHistory(history);
    await saveNotified(notified);
    await saveSnapshot(buildSnapshot(config, results, now));
    const sent = planned.length - notificationErrors.length;
    console.log(`${observations.length} relevé(s) ajouté(s) à l'historique, ${sent}/${planned.length} notification(s) envoyée(s).`);
  }

  for (const error of errors) console.error(`⚠️ ${error}`);
  return errors.length > 0 ? 1 : 0;
}

/** Loads .env when present (local runs); in GitHub Actions the variables come from the secrets. */
function loadDotEnv(): void {
  try {
    process.loadEnvFile(".env");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`variable d'environnement ${name} manquante (fichier .env en local, secret GitHub en CI)`);
  return value;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(`❌ ${errorMessage(error)}`);
    process.exitCode = 1;
  },
);
