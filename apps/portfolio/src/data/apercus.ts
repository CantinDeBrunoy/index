/**
 * Les aperçus de partage, l'image qui accompagne un lien collé sur LinkedIn, Slack ou WhatsApp (1200 × 630) :
 * celui du site (le passeport ouvert, le nom en grand) et celui de chaque fiche (la scène de son escale, son
 * cartel), dans les deux langues. Les images sont dans public/og/ : design/renders/og.mjs les photographie
 * depuis les pages /apercu/<carte> du serveur de développement. À refaire quand les textes changent.
 */

import { getProject } from "@index/projects";
import type { Lang } from "../i18n/voyage";
import { STOPS } from "./voyage";

/** La ligne du bas de l'aperçu du site. */
export const OG_LINE: Record<Lang, string> = {
  fr: "Un voyage en dix escales · onze projets",
  en: "A journey in ten stops · eleven projects",
};

export type Card =
  | { id: string; lang: Lang; kind: "site" }
  | { id: string; lang: Lang; kind: "fiche"; slug: string; n: number; entry: string; side: "left" | "right" };

const sfx = (lang: Lang) => (lang === "fr" ? "" : "-en");

/** Le cartel passe à droite quand l'objet de la scène est à gauche : la planète de Galaxy Escape. */
const CARTEL_RIGHT = new Set(["galaxy-escape"]);

/** Toutes les cartes : le site, puis une par fiche, chaque fois en français et en anglais. */
export const CARDS: Card[] = (["fr", "en"] as const).flatMap((lang): Card[] => [
  { id: `site${sfx(lang)}`, lang, kind: "site" },
  ...STOPS.map((stop, i) => {
    const entry = getProject(stop.slug)!.path.slice(1);
    const side = CARTEL_RIGHT.has(stop.slug) ? ("right" as const) : ("left" as const);
    return { id: `${entry}${sfx(lang)}`, lang, kind: "fiche" as const, slug: stop.slug, n: i + 1, entry, side };
  }),
]);

/** L'aperçu d'une page : celui de sa fiche si c'en est une (/005-magellan, /en/005-magellan), sinon celui du site. */
export function ogImageFor(pathname: string, lang: Lang): string {
  const entry = pathname.replace(/^\/en(?=\/|$)/, "").replace(/^\//, "").replace(/\.html$/, "");
  const fiche = CARDS.find((card) => card.kind === "fiche" && card.lang === lang && card.entry === entry);
  return `/og/${fiche?.id ?? `site${sfx(lang)}`}.jpg`;
}
