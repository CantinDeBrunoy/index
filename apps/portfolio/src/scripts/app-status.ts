/**
 * Les raccourcis du carnet, en direct : le statut des apps sondées (/api/status ; le Worker les sonde
 * côté serveur, résultat gardé 5 minutes, redemandé toutes les 5 minutes tant que la page est visible),
 * le point de chaque pastille, le résumé dessous et l'âge du statut.
 * Les textes viennent de la page (data-strings de la rangée), dans sa langue.
 */

import type { CarnetStrings, LiveState } from "../data/carnet";

type Health = "online" | "asleep" | "offline";

interface StatusPayload {
  checkedAt: string;
  projects: Record<string, { health: Health | null } | undefined>;
}

type Strings = Pick<CarnetStrings, "states" | "checking" | "online" | "asleep" | "offline" | "checkedNow" | "checkedAgo" | "unavailable">;

const REFRESH_MS = 5 * 60_000;
/** Le point du résumé prend l'état le plus grave. */
const WORST: LiveState[] = ["offline", "asleep", "online"];

const count = (text: { one: string; other: string }, n: number) => (n === 1 ? text.one : text.other).replace("{n}", String(n));

function start(row: HTMLElement) {
  const s = JSON.parse(row.dataset.strings ?? "{}") as Strings;
  const dots = [...row.querySelectorAll<HTMLElement>("[data-live]")];
  const status = row.querySelector<HTMLElement>(".quick__status");
  const lead = row.querySelector<HTMLElement>("[data-summary-dot]");
  const summary = row.querySelector<HTMLElement>("[data-summary]");
  const checked = row.querySelector<HTMLElement>("[data-checked]");

  let checkedAt: number | undefined;
  let lastFetch = 0;
  let announced = false;

  const show = (dot: HTMLElement, state: LiveState) => {
    dot.dataset.state = state;
    const text = dot.parentElement?.querySelector("[data-live-text]");
    if (text) text.textContent = `, ${s.states[state]}`;
  };

  const showSummary = (states: LiveState[]) => {
    const n = (state: LiveState) => states.filter((x) => x === state).length;
    const parts = [
      n("online") ? count(s.online, n("online")) : "",
      n("asleep") ? count(s.asleep, n("asleep")) : "",
      n("offline") ? count(s.offline, n("offline")) : "",
    ].filter(Boolean);
    if (summary) summary.textContent = parts.length > 0 ? parts.join(", ") : s.unavailable;
    if (lead) lead.dataset.state = WORST.find((state) => states.includes(state)) ?? "unknown";
  };

  const showChecked = () => {
    if (!checked || checkedAt === undefined) return;
    const age = Math.max(0, Math.round((Date.now() - checkedAt) / 60_000));
    checked.textContent = age < 1 ? s.checkedNow : s.checkedAgo.replace("{n}", String(age));
  };

  async function refresh() {
    lastFetch = Date.now();
    // La première vérification s'annonce ; les suivantes (« il y a 3 min ») ne se lisent pas à voix haute.
    if (announced) status?.removeAttribute("aria-live");
    try {
      const response = await fetch("/api/status", { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as StatusPayload;
      const states = dots.map((dot) => {
        const state: LiveState = data.projects[dot.dataset.live ?? ""]?.health ?? "unknown";
        show(dot, state);
        return state;
      });
      checkedAt = Date.parse(data.checkedAt);
      showSummary(states);
      showChecked();
    } catch {
      // Une panne passagère laisse le dernier statut connu ; sans statut du tout, on le dit.
      if (checkedAt !== undefined) return;
      for (const dot of dots) show(dot, "unknown");
      if (summary) summary.textContent = s.unavailable;
      if (lead) lead.dataset.state = "unknown";
    } finally {
      announced = true;
    }
  }

  const maybeRefresh = () => {
    if (document.visibilityState === "visible" && Date.now() - lastFetch >= REFRESH_MS) void refresh();
  };
  document.addEventListener("visibilitychange", maybeRefresh);

  // Chaque minute, l'âge du statut ; s'il a vieilli, une nouvelle vérification.
  setInterval(() => {
    showChecked();
    maybeRefresh();
  }, 60_000);
  void refresh();
}

const row = document.querySelector<HTMLElement>("[data-quick]");
if (row) start(row);
