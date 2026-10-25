// Qui ouvre la page ? Le propriétaire voit ses vraies salles, un visiteur la
// démo (demo.ts). Le propriétaire, c'est :
// - l'app installée sur l'écran d'accueil, celle de son iPhone. La connexion
//   du hub n'y tiendrait pas : iOS donne à une web app installée ses propres
//   cookies, et fait le détour par GitHub dans un navigateur à part ;
// - dans un navigateur, la session du hub INDEX (GET /api/session, que le
//   Worker vérifie auprès du hub).
// Sans réponse claire du Worker, la page reste en démo : les vraies salles ne
// s'affichent qu'à coup sûr.

/** Au-delà, la page s'affiche en démo plutôt que de faire attendre. */
const SESSION_TIMEOUT_MS = 3_000;

export type Probe = {
  /** La page tourne dans l'app installée sur l'écran d'accueil. */
  installed: () => boolean;
  /** Le corps de GET /api/session. */
  session: (signal: AbortSignal) => Promise<unknown>;
};

const BROWSER: Probe = {
  installed: () =>
    matchMedia('(display-mode: standalone)').matches ||
    // Propre à Safari sur iPhone et iPad.
    (navigator as Navigator & { standalone?: boolean }).standalone === true,
  session: async (signal) => (await fetch('/api/session', { signal, cache: 'no-store' })).json(),
};

export async function isOwner({ installed, session }: Probe = BROWSER): Promise<boolean> {
  if (installed()) return true;
  try {
    const body = await session(AbortSignal.timeout(SESSION_TIMEOUT_MS));
    return typeof body === 'object' && body !== null && (body as { owner?: unknown }).owner === true;
  } catch {
    return false;
  }
}
