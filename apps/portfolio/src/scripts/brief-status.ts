/**
 * Le statut en direct de l'app, sur la carte d'embarquement de la fiche : son point et son texte, d'après /api/status
 * (le Worker sonde les apps et garde le résultat 5 minutes). Sans réponse, le texte de la page reste, sans point.
 * Une carte se vérifie quand elle arrive à l'écran, et toutes d'une seule requête : le voyage en porte dix, une par
 * fiche, cachées sous leurs escales.
 */

type Health = "online" | "asleep" | "offline";

interface StatusPayload {
  projects: Record<string, { health: Health | null } | undefined>;
}

let request: Promise<StatusPayload> | undefined;
const liveStatus = () =>
  (request ??= fetch("/api/status", { headers: { accept: "application/json" } }).then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json() as Promise<StatusPayload>;
  }));

async function check(box: HTMLElement) {
  const dot = box.querySelector<HTMLElement>(".live-dot");
  const text = box.querySelector<HTMLElement>("[data-live-text]");
  if (!dot || !text) return;
  const states = JSON.parse(box.dataset.states ?? "{}") as Record<Health, string>;
  dot.hidden = false;
  try {
    const data = await liveStatus();
    const health = data.projects[box.dataset.briefLive ?? ""]?.health;
    if (!health) throw new Error("statut inconnu");
    dot.dataset.state = health;
    text.textContent = states[health];
  } catch {
    dot.hidden = true;
  }
}

const seen = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    seen.unobserve(entry.target);
    void check(entry.target as HTMLElement);
  }
});
/** Les cartes de la page, ou d'une fiche posée sous son escale au voyage (scripts/voyage-fiche.ts). */
export function watchStatus(scope: Document | Element = document) {
  for (const box of scope.querySelectorAll<HTMLElement>("[data-brief-live]")) seen.observe(box);
}

watchStatus();
