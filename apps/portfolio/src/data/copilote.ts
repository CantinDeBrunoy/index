/**
 * Le copilote du voyage : un petit bonhomme d'argile qui accueille le visiteur à la première escale, en
 * combinaison spatiale, avec le tuto (les deux façons de visiter). Sur chaque fiche, il attend en bas à
 * droite, habillé pour l'escale du projet (sa tenue se voit), et ramène au voyage. Ici, ce qu'il dit à
 * l'accueil, en français et en anglais ; sur la fiche, ses mots sont dans data/fiches.ts.
 * Les boucles animées sont dans /voyage/copilote/ (design/renders/copilote-site.mjs).
 * Les textes sont des brouillons, à réécrire.
 */

import type { Lang } from "../i18n/voyage";

/** Les scènes d'escale (Stop.scene) pour lesquelles il a une tenue : /voyage/copilote/<scène>.webp (et -fixe.webp). */
export const TENUES = ["espace", "terre", "avion", "paris", "monuments", "route", "maison", "salon", "calendrier", "dossiers"];

/** Ce qu'il dit : l'accueil, puis les deux façons de visiter, le voyage (l'objet entouré d'or) et le détail (la fiche, « Les projets »). */
const fr = {
  who: "Ton copilote",
  hello: "Salut, voyageur !",
  intro: "Ici, chaque escale est l'un de mes projets. Deux façons de les visiter :",
  voyage: "Le voyage.",
  voyageText: "Clique sur l'objet entouré d'or : il t'emmène au projet suivant.",
  voyageTextPhone: "Touche l'anneau doré ou le bouton du bas : il t'emmène au projet suivant.",
  detail: "Le détail.",
  detailText: "« La fiche du projet », sous le nom de chaque escale, le raconte en détail. « Les projets » les montre tous.",
  detailTextPhone: "Chaque projet a sa fiche, ouverte depuis son escale. Le sommaire les montre tous.",
  go: "Faire le voyage →",
  projects: "Voir les projets",
  lost: "Perdu en route ? Le sommaire, en haut, montre toutes les escales.",
  close: "Fermer",
};

const en: { [K in keyof typeof fr]: string } = {
  who: "Your co-pilot",
  hello: "Hi, traveller!",
  intro: "Each stop here is one of my projects. Two ways to visit them:",
  voyage: "The journey.",
  voyageText: "Click the object circled in gold: it takes you to the next project.",
  voyageTextPhone: "Tap the golden ring or the bottom button: it takes you to the next project.",
  detail: "The details.",
  detailText: "“Project page”, under each stop's name, tells its whole story. “Projects” shows them all.",
  detailTextPhone: "Each project has its own page, opened from its stop. The contents show them all.",
  go: "Start the journey →",
  projects: "See the projects",
  lost: "Lost along the way? The contents, at the top, show every stop.",
  close: "Close",
};

export const COPILOTE: Record<Lang, typeof en> = { fr, en };
