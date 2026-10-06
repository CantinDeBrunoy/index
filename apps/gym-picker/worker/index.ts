import { isLatLng, type ApiError, type EtaResponse } from '../shared/api';
import { GYMS } from '../shared/gyms';
import { rankEtas } from './rank';
import { fetchMatrix, TomTomError } from './tomtom';

// Seul /api/* arrive ici (voir `run_worker_first` dans wrangler.jsonc) : le
// reste est servi comme fichiers statiques par Cloudflare.
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname !== '/api/etas') return fail(404, 'Route inconnue.');
    if (request.method !== 'POST') return fail(405, 'Utilise POST.');
    return handleEtas(request, env);
  },
} satisfies ExportedHandler<Env>;

/**
 * POST /api/etas, corps `{ lat, lng }` : le point de départ. Il est envoyé
 * dans le corps plutôt que dans l'URL pour ne pas finir dans les logs.
 */
async function handleEtas(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  const { success } = await env.RATE_LIMITER.limit({ key: ip });
  if (!success) return fail(429, 'Trop de requêtes. Réessaie dans une minute.');

  const origin: unknown = await request.json().catch(() => null);
  if (!isLatLng(origin)) return fail(400, 'Position de départ invalide.');

  if (!env.TOMTOM_API_KEY) return fail(500, 'Clé TomTom absente côté serveur (TOMTOM_API_KEY).');

  try {
    const legs = await fetchMatrix(env.TOMTOM_API_KEY, origin, GYMS);
    const body: EtaResponse = {
      etas: rankEtas(GYMS.map((gym, i) => ({ gymId: gym.id, leg: legs[i] ?? null }))),
      computedAt: new Date().toISOString(),
    };
    return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return tomtomFailure(error);
  }
}

function tomtomFailure(error: unknown): Response {
  if (error instanceof TomTomError) {
    if (error.status === 403) return fail(502, 'Clé TomTom refusée.');
    if (error.status === 429) return fail(503, 'Quota TomTom du jour épuisé.');
    return fail(502, `TomTom a répondu une erreur ${error.status}.`);
  }
  if (error instanceof Error && error.name === 'TimeoutError') {
    return fail(504, 'TomTom ne répond pas. Réessaie.');
  }
  console.error('Échec inattendu du calcul', error);
  return fail(500, 'Erreur inattendue du serveur.');
}

function fail(status: number, message: string): Response {
  const body: ApiError = { error: message };
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
