import type { ImageMetadata } from "astro";

/**
 * Les écrans « En images » des fiches, pris par scripts/fiche-screens.ts : src/assets/screens/<slug>/<nom>.jpg.
 */
const files = import.meta.glob<{ default: ImageMetadata }>("../assets/screens/*/*.{jpg,png}", { eager: true });

export function getScreen(slug: string, name: string): ImageMetadata | undefined {
  return (files[`../assets/screens/${slug}/${name}.jpg`] ?? files[`../assets/screens/${slug}/${name}.png`])?.default;
}
