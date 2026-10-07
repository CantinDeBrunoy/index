/**
 * Le statut en direct du hub : interroge /api/status (le Worker sonde les apps côté serveur, résultat
 * gardé 5 minutes) et met à jour chaque ligne sondée [data-live] et l'heure de la vérification.
 * Les textes viennent de la page (attributs data-* du tableau), dans sa langue.
 */

type Health = "online" | "asleep" | "offline";
type State = Health | "unknown";

interface StatusPayload {
  checkedAt: string;
  projects: Record<string, { health: Health | null } | undefined>;
}

async function refresh(board: HTMLElement) {
  const states = JSON.parse(board.dataset.states ?? "{}") as Record<State, string>;
  const cells = board.querySelectorAll<HTMLElement>("[data-live]");
  const checked = board.querySelector<HTMLElement>("[data-checked]");

  const show = (el: HTMLElement, state: State) => {
    el.dataset.state = state;
    el.textContent = states[state] ?? "";
  };
  const since = (iso: string) => {
    const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
    return minutes < 1 ? board.dataset.checkedNow : board.dataset.checkedAgo?.replace("{n}", String(minutes));
  };

  try {
    const response = await fetch("/api/status", { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as StatusPayload;
    for (const el of cells) show(el, data.projects[el.dataset.live ?? ""]?.health ?? "unknown");
    if (checked) checked.textContent = since(data.checkedAt) ?? "";
  } catch {
    for (const el of cells) show(el, "unknown");
    if (checked) checked.textContent = board.dataset.unavailable ?? "";
  }
}

const board = document.querySelector<HTMLElement>("[data-board]");
if (board) void refresh(board);
