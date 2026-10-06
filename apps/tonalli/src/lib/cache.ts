/**
 * Cache local : l'app doit rester consultable hors ligne, et se resynchroniser
 * à la reconnexion. On ne stocke que ce qui est déjà autorisé par la RLS —
 * ce que le serveur a bien voulu renvoyer.
 */
function key(name: string, userId: string): string {
  return `tonalli.cache.${name}.${userId}`;
}

export function readCache<T>(name: string, userId: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key(name, userId));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeCache(name: string, userId: string, value: unknown): void {
  try {
    localStorage.setItem(key(name, userId), JSON.stringify(value));
  } catch {
    // Quota plein ou stockage refusé : le cache est un confort, pas une
    // dépendance.
  }
}

export function clearCache(userId: string): void {
  try {
    for (const name of ['entries', 'partnerEntries', 'partnerDates', 'pending', 'myReactions', 'theirReactions', 'revealed']) {
      localStorage.removeItem(key(name, userId));
    }
  } catch {
    // idem
  }
}
