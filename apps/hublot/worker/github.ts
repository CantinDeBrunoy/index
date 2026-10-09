/**
 * Ce que le Worker laisse passer vers l'API GitHub : les seuls appels de la page (docs/app.js), sur le seul
 * dépôt des données. Le reste est refusé, même pour le propriétaire connecté.
 */

/** Le dépôt des surveillances et des relevés, où tourne le cron : l'ancien dépôt Hublot (comme REPOSITORY dans docs/app.js). */
export const DATA_REPOSITORY = { owner: "CantinDeBrunoy", repo: "Hublot", branch: "main", workflow: "check.yml" } as const;

const READABLE = new Set(["config.json", "data/latest.json"]);
const WRITABLE = "config.json";

export type Allowed = { ok: true; body?: string } | { ok: false; reason: string };

/**
 * L'appel est-il l'un de ceux de la page : lire config.json ou data/latest.json, écrire config.json, lancer
 * la vérification des prix ? Toujours sur la branche des données. `path` suit /repos/<owner>/<repo>.
 */
export function allowCall(method: string, path: string, search: URLSearchParams, body: string | undefined): Allowed {
  const { branch, workflow } = DATA_REPOSITORY;
  const file = path.startsWith("/contents/") ? path.slice("/contents/".length) : undefined;
  const params = [...search.keys()];

  if (method === "GET") {
    if (file === undefined || !READABLE.has(file)) return { ok: false, reason: "Lecture non prévue" };
    const ref = search.get("ref");
    const onlyRef = params.every((key) => key === "ref");
    return onlyRef && (ref === null || ref === branch) ? { ok: true } : { ok: false, reason: `Seule la branche ${branch} se lit` };
  }

  const isWrite = method === "PUT" && file === WRITABLE;
  const isCheck = method === "POST" && path === `/actions/workflows/${workflow}/dispatches`;
  if ((!isWrite && !isCheck) || params.length > 0) return { ok: false, reason: "Appel non prévu" };

  let payload: unknown;
  try {
    payload = JSON.parse(body ?? "");
  } catch {
    return { ok: false, reason: "JSON attendu" };
  }
  if (typeof payload !== "object" || payload === null) return { ok: false, reason: "JSON attendu" };
  const fields = payload as Record<string, unknown>;

  if (isWrite) {
    return fields.branch === branch ? { ok: true, body } : { ok: false, reason: `Seule la branche ${branch} s'écrit` };
  }
  return fields.ref === branch && Object.keys(fields).length === 1 ? { ok: true, body } : { ok: false, reason: `Seul ${workflow} sur ${branch}` };
}
