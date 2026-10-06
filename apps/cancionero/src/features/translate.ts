// Traduction à la demande ES → FR via MyMemory (gratuit, sans clé).
// On ne traduit QUE ce que l'utilisateur demande (un mot, une ligne) : plus
// fiable qu'une traduction automatique en masse. Les résultats sont mis en
// cache (mémoire + AsyncStorage) pour être instantanés et économiser le quota.

import AsyncStorage from '@react-native-async-storage/async-storage';

// v2 : l'ancien cache contient des traductions corrompues (« Chaud%20quand… »)
// produites avant la correction du double encodage — on repart proprement.
const CACHE_KEY = '@cancionero/translate-cache-v2';
const LEGACY_CACHE_KEY = '@cancionero/translate-cache';
const memoryCache: Record<string, string> = {};
let loaded = false;

async function loadCache() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) Object.assign(memoryCache, JSON.parse(raw));
    AsyncStorage.removeItem(LEGACY_CACHE_KEY).catch(() => {});
  } catch {
    // cache illisible : on repart à vide, sans bloquer
  }
}

async function persist() {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
  } catch {
    // best-effort
  }
}

/** Nettoie un mot des signes de ponctuation pour le traduire seul. */
export function cleanWord(w: string): string {
  return w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

/**
 * Filet de sécurité : si une réponse revient percent-encodée (« Chaud%20quand »),
 * on la décode plutôt que d'afficher l'encodage brut.
 */
function decodeIfEncoded(s: string): string {
  if (!/%[0-9A-Fa-f]{2}/.test(s)) return s;
  try {
    return decodeURIComponent(s);
  } catch {
    return s.replace(/%20/g, ' ');
  }
}

/**
 * Traduit un texte espagnol en français. Renvoie la traduction, ou `null` si
 * l'appel échoue (hors-ligne, quota). Résultat mis en cache.
 */
export async function translateEsToFr(text: string): Promise<string | null> {
  const key = text.trim().toLowerCase();
  if (!key) return '';
  await loadCache();
  if (memoryCache[key] !== undefined) return memoryCache[key];

  try {
    // Le « | » de langpair est illégal dans une URL : sur iOS, NSURL ré-encode
    // alors TOUTE l'URL, ce qui double-encode le texte et fait revenir des
    // « %20 » dans la traduction. On encode donc chaque paramètre.
    const url =
      'https://api.mymemory.translated.net/get' +
      `?q=${encodeURIComponent(text.trim())}` +
      `&langpair=${encodeURIComponent('es|fr')}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const raw: string | undefined = data?.responseData?.translatedText;
    if (!raw) return null;
    const translated = decodeIfEncoded(raw);
    memoryCache[key] = translated;
    persist();
    return translated;
  } catch {
    return null;
  }
}
