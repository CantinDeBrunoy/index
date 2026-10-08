/**
 * Le carnet de voyage, « Les projets » : le sommaire du voyage, de nuit, une carte postale par escale.
 * La carte ouvre la fiche du projet ; le lien du dessous rouvre son escale. Brouillons, à relire.
 */

import type { Lang } from "../i18n/voyage";

export const CARNET: Record<
  Lang,
  {
    pageTitle: string;
    description: string;
    label: string;
    /** En HTML : l'italique du mot clé. */
    title: string;
    intro: string;
    revisit: string;
    /** Pour les lecteurs d'écran : {n} l'escale, {place} son lieu. */
    revisitAria: string;
    /** {list} : les projets racontés sur la fiche de l'escale. */
    shelf: string;
  }
> = {
  fr: {
    pageTitle: "Le carnet de voyage",
    description: "Les onze projets de Cantin Roquier, escale par escale : chaque carte ouvre la fiche du projet.",
    label: "Fin du voyage",
    title: "Le carnet de <em>voyage</em>",
    intro: "Les onze projets, escale par escale. Chaque carte ouvre la fiche du projet ; son escale reste à un clic.",
    revisit: "Revoir l'escale →",
    revisitAria: "Revoir l'escale {n} : {place}",
    shelf: "Sur l'étagère aussi : {list}",
  },
  en: {
    pageTitle: "The travel journal",
    description: "Cantin Roquier's eleven projects, stop by stop: each card opens the project page.",
    label: "End of the journey",
    title: "The travel <em>journal</em>",
    intro: "All eleven projects, stop by stop. Each card opens the project page; its stop is one click away.",
    revisit: "Back to the stop →",
    revisitAria: "Back to stop {n}: {place}",
    shelf: "Also on the shelf: {list}",
  },
};
