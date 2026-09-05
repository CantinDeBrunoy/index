import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Faux si les variables d'environnement manquent : l'app affiche alors un
 * écran d'explication plutôt que d'échouer à l'import.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'anon', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'tonalli.auth',
  },
});

/** Message d'erreur exploitable, quelle que soit la forme de l'erreur reçue. */
export function errorCode(error: unknown): string {
  if (!error) return 'unknown';
  if (typeof error === 'string') return error;
  const message = (error as { message?: string }).message ?? '';
  const match = /([a-z_]+)$/.exec(message.trim());
  return match ? match[1] : message || 'unknown';
}
