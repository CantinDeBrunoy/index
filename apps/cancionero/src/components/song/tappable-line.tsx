import { Text, type TextStyle } from 'react-native';

import { cleanWord, translateEsToFr } from '@/features/translate';
import { useTroublesome } from '@/features/vocab/troublesome';

const RED = '#FF3B30';

/**
 * Une ligne de paroles dont chaque mot est cliquable. Toucher un mot le marque
 * en rouge et l'AJOUTE au vocabulaire à réviser (traduction récupérée en tâche
 * de fond). L'ajout est idempotent : un mot déjà présent le reste, même si le
 * tap tactile se déclenche deux fois. Le retrait se fait depuis la révision.
 */
export function TappableLyricLine({
  text,
  songTitle,
  color,
  size,
  weight = '700',
  center,
}: {
  text: string;
  songTitle?: string;
  color: string;
  size: number;
  weight?: TextStyle['fontWeight'];
  center?: boolean;
}) {
  const { has, add, setTranslation } = useTroublesome();
  const tokens = text.split(/(\s+)/); // garde les espaces comme tokens

  return (
    <Text
      style={{
        color,
        fontSize: size,
        fontWeight: weight,
        lineHeight: size * 1.35,
        textAlign: center ? 'center' : 'left',
      }}>
      {tokens.map((tok, i) => {
        if (/^\s*$/.test(tok) || !cleanWord(tok)) return tok; // espace / ponctuation
        const marked = has(tok);
        return (
          <Text
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Ajouter « ${cleanWord(tok)} » au vocabulaire à réviser`}
            onPress={async () => {
              const added = add(tok, songTitle);
              if (added) {
                const fr = await translateEsToFr(cleanWord(tok));
                if (fr) setTranslation(tok, fr);
              }
            }}
            style={marked ? { color: RED, fontWeight: '800' } : undefined}>
            {tok}
          </Text>
        );
      })}
    </Text>
  );
}
