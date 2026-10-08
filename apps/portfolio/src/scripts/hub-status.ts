/**
 * Le tableau des départs, en direct : le statut des apps sondées (/api/status ; le Worker les sonde
 * côté serveur, résultat gardé 5 minutes, redemandé toutes les 5 minutes tant que la page est visible),
 * l'heure de l'écran et le bandeau d'infos voyageurs. Les textes viennent de la page (attributs data-*
 * du tableau), dans sa langue.
 */

import type { TickerStrings } from "../data/hub";
import type { Lang } from "../i18n/voyage";
import { tickerText, type TickerApp } from "./hub-ticker";

type Health = "online" | "asleep" | "offline";
type State = Health | "unknown";

interface StatusPayload {
  checkedAt: string;
  projects: Record<string, { health: Health | null } | undefined>;
}

const REFRESH_MS = 5 * 60_000;
/** Le bandeau défile à vitesse constante (px/s), quelle que soit la longueur du texte. */
const TICKER_SPEED = 100;

function start(board: HTMLElement) {
  const lang: Lang = board.dataset.lang === "en" ? "en" : "fr";
  const states = JSON.parse(board.dataset.states ?? "{}") as Record<State, string>;
  const { apps, ...strings } = JSON.parse(board.dataset.ticker ?? "{}") as TickerStrings & { apps: TickerApp[] };
  const cells = [...board.querySelectorAll<HTMLElement>("[data-live]")];
  const checked = board.querySelector<HTMLElement>("[data-checked]");
  const hours = board.querySelector<HTMLElement>("[data-clock-h]");
  const minutes = board.querySelector<HTMLElement>("[data-clock-m]");
  const ticker = board.querySelector<HTMLElement>("[data-ticker-text]");

  let checkedAt: number | undefined;
  let lastFetch = 0;

  const show = (el: HTMLElement, state: State) => {
    el.dataset.state = state;
    el.textContent = states[state] ?? "";
  };

  const showChecked = () => {
    if (!checked || checkedAt === undefined) return;
    const age = Math.max(0, Math.round((Date.now() - checkedAt) / 60_000));
    checked.textContent = (age < 1 ? board.dataset.checkedNow : board.dataset.checkedAgo?.replace("{n}", String(age))) ?? "";
  };

  // Le texte change quand le bandeau est vide : avant son premier passage (il démarre après un court
  // délai), ou entre deux passages ; jamais sous les yeux. Sans animation (mouvement réduit), tout de suite.
  let pending: string | undefined;
  const swapTicker = () => {
    if (!ticker || pending === undefined) return;
    ticker.textContent = pending;
    pending = undefined;
  };
  ticker?.addEventListener("animationiteration", swapTicker);
  const setTicker = (text: string) => {
    if (!ticker || text === (pending ?? ticker.textContent)) return;
    pending = text;
    const animation = ticker.getAnimations()[0];
    const delay = parseFloat(getComputedStyle(ticker).animationDelay) * 1000;
    const elapsed = animation?.currentTime;
    if (animation && !(typeof elapsed === "number" && elapsed < delay)) return;
    swapTicker();
    ticker.style.animationDuration = `${Math.round(ticker.scrollWidth / TICKER_SPEED)}s`;
  };

  const showTicker = () => {
    const now = apps.map((app) => {
      if (app.state !== "live") return app;
      const cell = cells.find((el) => el.dataset.live === app.slug);
      return { ...app, state: cell?.dataset.state ?? "unknown" };
    });
    setTicker(tickerText(strings, now, lang));
  };

  async function refresh() {
    lastFetch = Date.now();
    try {
      const response = await fetch("/api/status", { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as StatusPayload;
      for (const el of cells) show(el, data.projects[el.dataset.live ?? ""]?.health ?? "unknown");
      checkedAt = Date.parse(data.checkedAt);
      showChecked();
    } catch {
      // Une panne passagère laisse le dernier statut connu ; sans statut du tout, on le dit.
      if (checkedAt !== undefined) return;
      for (const el of cells) show(el, "unknown");
      if (checked) checked.textContent = board.dataset.unavailable ?? "";
    } finally {
      // L'annonce de la première vérification suffit : la suite (« il y a 3 min ») ne se lit pas à voix haute.
      checked?.removeAttribute("aria-live");
      showTicker();
    }
  }

  const maybeRefresh = () => {
    if (document.visibilityState === "visible" && Date.now() - lastFetch >= REFRESH_MS) void refresh();
  };
  document.addEventListener("visibilitychange", maybeRefresh);

  // L'heure, à chaque minute pile ; avec elle, l'âge du statut et, s'il a vieilli, une nouvelle vérification.
  const tick = () => {
    const now = new Date();
    if (hours) hours.textContent = String(now.getHours()).padStart(2, "0");
    if (minutes) minutes.textContent = String(now.getMinutes()).padStart(2, "0");
    showChecked();
    maybeRefresh();
    setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
  };
  tick();
}

const board = document.querySelector<HTMLElement>("[data-board]");
if (board) start(board);
