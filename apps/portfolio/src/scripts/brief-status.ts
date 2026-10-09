/**
 * Le statut en direct de l'app, dans « En bref » de la fiche : son point et son texte, d'après /api/status
 * (le Worker sonde les apps et garde le résultat 5 minutes). Sans réponse, le texte de la page reste, sans point.
 */

type Health = "online" | "asleep" | "offline";

interface StatusPayload {
  projects: Record<string, { health: Health | null } | undefined>;
}

async function check(box: HTMLElement) {
  const dot = box.querySelector<HTMLElement>(".live-dot");
  const text = box.querySelector<HTMLElement>("[data-live-text]");
  if (!dot || !text) return;
  const states = JSON.parse(box.dataset.states ?? "{}") as Record<Health, string>;
  dot.hidden = false;
  try {
    const response = await fetch("/api/status", { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as StatusPayload;
    const health = data.projects[box.dataset.briefLive ?? ""]?.health;
    if (!health) throw new Error("statut inconnu");
    dot.dataset.state = health;
    text.textContent = states[health];
  } catch {
    dot.hidden = true;
  }
}

for (const box of document.querySelectorAll<HTMLElement>("[data-brief-live]")) void check(box);
