import { outfitOf } from '@/lib/character';
import type { CharacterState, Outfit } from '@/lib/character';
import { isEmotionKey } from '@/lib/emotions';
import type { EmotionKey } from '@/lib/emotions';
import { useAuth } from '@/state/AuthProvider';
import { useEntries } from '@/state/EntriesProvider';

export type Look = { emotion: EmotionKey | null; color: string | null; state: CharacterState; outfit: Outfit };

/**
 * Mon personnage tel qu'il se montre aujourd'hui : dans la teinte du jour si
 * la journée est remplie, incolore sinon — les accessoires se voient quand
 * même, au trait.
 */
export function useMyLook(): Look {
  const { profile } = useAuth();
  const { mine, pending, today } = useEntries();
  const entry = mine[today] ?? null;
  const emotion = entry?.emotion ?? pending?.emotion ?? null;
  const color = entry?.color ?? pending?.color ?? null;
  // Allongée, la Fatigue cache ce que le personnage porte à la tête et au
  // corps : pour choisir une tenue, il se tient debout, dans la même teinte.
  const key = isEmotionKey(emotion) ? (emotion === 'tiredness' ? 'neutral' : emotion) : null;
  return { emotion: key, color, state: key ? 'scene' : 'waiting', outfit: outfitOf(profile) };
}

