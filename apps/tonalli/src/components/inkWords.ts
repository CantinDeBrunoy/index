/**
 * Applique à une phrase posée sur l'encre l'opacité, le flou et la montée que
 * `src/lib/ink.ts` a calculés pour cette frame. Écrit droit dans le style,
 * comme l'encre elle-même : un rendu React par frame se verrait.
 *
 * À part des composants : un fichier de composant qui exporte aussi une
 * fonction casse le rechargement à chaud de Vite.
 */
export function paintWords(text: HTMLElement | null, message: { opacity: number; blur: number; rise: number }) {
  if (!text) return;
  text.style.opacity = message.opacity.toFixed(3);
  text.style.filter = message.blur > 0.05 ? `blur(${message.blur.toFixed(2)}px)` : '';
  text.style.transform = `translateY(${message.rise.toFixed(1)}px)`;
}
