import { isDeal } from "./alerts.js";
import { formatDayMonth, formatMonth, formatPrice } from "./format.js";
import type { RejectReason } from "./offers.js";
import type { MonthResult, PlannedAlert, WatchResult } from "./run.js";

const REJECT_LABELS: Record<RejectReason, string> = {
  airport: "autre aéroport",
  stay: "durée hors plage",
  window: "hors période",
  oneWay: "aller simple",
  invalid: "invalides",
};

/** "Tokyo (PAR-TYO) : 18 requêtes, 84 billets reçus, 32 retenus (écartés : 2 autre aéroport, …)" */
export function describeWatch({ watch, route, months }: WatchResult): string {
  if (months.length === 0) return `${watch.label} (${route}) : période de départ terminée, rien à chercher`;

  const sum = (pick: (month: MonthResult) => number) => months.reduce((total, month) => total + pick(month), 0);
  const rejected = Object.entries(REJECT_LABELS)
    .map(([reason, label]) => [sum((month) => month.rejected[reason as RejectReason]), label] as const)
    .filter(([count]) => count > 0)
    .map(([count, label]) => `${count} ${label}`);
  const failures = sum((month) => month.errors.length);

  return [
    `${watch.label} (${route}) : ${sum((month) => month.requests)} requêtes`,
    `${sum((month) => month.received)} billets reçus`,
    `${sum((month) => month.offers.length)} retenus${rejected.length > 0 ? ` (écartés : ${rejected.join(", ")})` : ""}`,
    ...(failures > 0 ? [`${failures} requête(s) en échec`] : []),
  ].join(", ");
}

/** Best price per watch × departure month. */
export function renderReport(results: readonly WatchResult[], planned: readonly PlannedAlert[], currency: string): string {
  const alerts = new Map(planned.map((alert) => [`${alert.watch.id}|${alert.month}`, alert]));
  const headers = ["Surveillance", "Départ", "Prix", "Seuil", "Dates", "Vol", "Escales A/R", "Offres", "Alerte"];

  const rows = results.flatMap(({ watch, months }) =>
    months.map((month) => {
      const best = month.offers[0];
      const alert = alerts.get(`${watch.id}|${month.month}`);
      const status = [
        alert ? (alert.send === best ? "à notifier" : `à notifier (${formatPrice(alert.send.price, currency)})`) : "",
        !alert && best && isDeal(best, watch.maxPrice) ? "déjà notifiée" : "",
        month.errors.length > 0 ? "erreur API" : "",
      ].filter(Boolean);

      return [
        watch.label,
        formatMonth(month.month),
        best ? formatPrice(best.price, currency) : "—",
        formatPrice(watch.maxPrice, currency),
        best ? `${formatDayMonth(best.departDate)} → ${formatDayMonth(best.returnDate)} (${best.stayDays} j)` : "",
        best ? `${best.originAirport}→${best.destinationAirport} ${best.airline}`.trim() : "",
        best ? `${best.transfers}/${best.returnTransfers}` : "",
        String(month.offers.length),
        status.join(", "),
      ];
    }),
  );
  return renderTable(headers, rows);
}

function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, column) => Math.max(header.length, ...rows.map((row) => (row[column] ?? "").length)));
  const line = (cells: string[]) => cells.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join("  ").trimEnd();
  return [line(headers), line(widths.map((width) => "─".repeat(width))), ...rows.map(line)].join("\n");
}
