import { langFromUrl, useTranslations, type UiKey } from "../i18n/ui";

/**
 * Statut live : remplit les badges [data-status-slug] avec la réponse de /api/status
 * (Worker du portfolio, sondes côté serveur mises en cache 5 minutes).
 */

type Health = "online" | "asleep" | "offline";
interface StatusPayload {
  projects: Record<string, { health: Health | null } | undefined>;
}

const badges = document.querySelectorAll<HTMLElement>("[data-status-slug]");
const t = useTranslations(langFromUrl(new URL(location.href)));

function show(el: HTMLElement, health: Health | "unknown") {
  el.dataset.health = health;
  el.textContent = t(`status.${health}` as UiKey);
}

async function refresh() {
  if (badges.length === 0) return;
  try {
    const response = await fetch("/api/status", { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as StatusPayload;
    for (const el of badges) show(el, data.projects[el.dataset.statusSlug ?? ""]?.health ?? "unknown");
  } catch {
    for (const el of badges) show(el, "unknown");
  }
}

void refresh();
