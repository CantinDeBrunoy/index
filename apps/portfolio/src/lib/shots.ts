import type { ImageMetadata } from "astro";

/**
 * Captures d'écran des projets, générées par scripts/screenshots.ts :
 * src/assets/shots/<slug>-desktop.jpg et <slug>-mobile.jpg.
 */
const files = import.meta.glob<{ default: ImageMetadata }>("../assets/shots/*.{jpg,png}", { eager: true });

export type ShotVariant = "desktop" | "mobile";

export function getShot(slug: string, variant: ShotVariant = "desktop"): ImageMetadata | undefined {
  return (files[`../assets/shots/${slug}-${variant}.jpg`] ?? files[`../assets/shots/${slug}-${variant}.png`])?.default;
}
