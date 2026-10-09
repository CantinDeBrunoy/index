import { fromOwnPage, handleAppAuth, ownerSession } from "@index/auth/app";
import { json } from "@index/auth";

/**
 * Worker de Magellan : l'app (export web d'Expo) est servie telle quelle ; passent par ici :
 * - GET /api/session, /api/auth/login, /api/auth/logout : la connexion, vérifiée auprès du hub ;
 * - GET /api/trips : les voyages du propriétaire connecté, { state, rev } (state null avant le premier envoi) ;
 * - PUT /api/trips { state, baseRev } : les remplace, si personne ne les a changés depuis baseRev (sinon 409).
 *
 * Un visiteur n'a jamais accès à ces données : l'app lui montre les voyages de démo, gardés dans son navigateur.
 */

/** Une seule ligne : les voyages du propriétaire. `rev` compte les versions, pour ne pas écraser un autre appareil. */
const SCHEMA = `CREATE TABLE IF NOT EXISTS trips_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  rev INTEGER NOT NULL,
  updated_at TEXT NOT NULL
)`;

/** Bien au-delà de ce qu'occupent des centaines de voyages (les photos ne sont que des chemins). */
const MAX_BYTES = 2_000_000;

let schemaReady: Promise<unknown> | undefined;

function ensureSchema(db: D1Database): Promise<unknown> {
  schemaReady ??= db.prepare(SCHEMA).run().catch((error: unknown) => {
    schemaReady = undefined;
    throw error;
  });
  return schemaReady;
}

async function readTrips(db: D1Database): Promise<Response> {
  await ensureSchema(db);
  const row = await db.prepare("SELECT data, rev FROM trips_state WHERE id = 1").first<{ data: string; rev: number }>();
  return json({ state: row ? (JSON.parse(row.data) as unknown) : null, rev: row?.rev ?? 0 });
}

async function writeTrips(request: Request, db: D1Database): Promise<Response> {
  if (!fromOwnPage(request)) return json({ error: "Origine refusée" }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "JSON attendu" }, 415);
  const text = await request.text();
  if (text.length > MAX_BYTES) return json({ error: "Trop volumineux" }, 413);

  let body: { state?: { trips?: unknown }; baseRev?: unknown };
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    return json({ error: "JSON illisible" }, 400);
  }
  const { state, baseRev } = body;
  if (!state || !Array.isArray(state.trips) || typeof baseRev !== "number" || !Number.isInteger(baseRev) || baseRev < 0) {
    return json({ error: "Attendu : { state: { trips: [...] }, baseRev }" }, 400);
  }

  await ensureSchema(db);
  const data = JSON.stringify({ trips: state.trips });
  const now = new Date().toISOString();
  // La première version s'insère ; les suivantes ne remplacent que la version attendue.
  const result =
    baseRev === 0
      ? await db.prepare("INSERT INTO trips_state (id, data, rev, updated_at) VALUES (1, ?, 1, ?) ON CONFLICT (id) DO NOTHING").bind(data, now).run()
      : await db.prepare("UPDATE trips_state SET data = ?, rev = rev + 1, updated_at = ? WHERE id = 1 AND rev = ?").bind(data, now, baseRev).run();
  if (result.meta.changes === 0) {
    const current = await db.prepare("SELECT rev FROM trips_state WHERE id = 1").first<{ rev: number }>();
    return json({ error: "Modifiés ailleurs entre-temps", rev: current?.rev ?? 0 }, 409);
  }
  return json({ rev: baseRev + 1 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const auth = await handleAppAuth(request, env.HUB);
    if (auth) return auth;

    if (url.pathname === "/api/trips") {
      if (!(await ownerSession(request, env.HUB))) return json({ error: "Connexion requise" }, 401);
      if (request.method === "GET") return readTrips(env.DB);
      if (request.method === "PUT") return writeTrips(request, env.DB);
      return new Response("Méthode non autorisée", { status: 405, headers: { allow: "GET, PUT" } });
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "Introuvable" }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
