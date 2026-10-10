/**
 * Le copilote du voyage : un petit bonhomme d'argile qui accueille le visiteur à la première escale,
 * puis se range au bout de la barre des escales. Dans l'espace, il porte la combinaison ; dès la Terre, il la
 * laisse et s'habille pour chaque escale (sans le dire : sa tenue se voit). Un clic sur lui rouvre le tuto :
 * les deux façons de visiter. Sur chaque fiche, il attend en bas à droite et ramène au voyage (ses
 * mots y sont dans data/fiches.ts). Ici, tout ce qu'il dit au voyage, en français et en anglais.
 * Les boucles animées sont dans /voyage/copilote/ (design/renders/copilote-site.mjs).
 * Les textes sont des brouillons, à réécrire.
 */

import type { Lang } from "../i18n/voyage";

/** Les scènes d'escale (Stop.scene) pour lesquelles il a une tenue : /voyage/copilote/<scène>.webp. */
export const TENUES = ["espace", "terre", "avion", "paris", "monuments", "route", "maison", "salon", "calendrier", "dossiers"];

/**
 * Ce qu'il dit. L'accueil (hello) et le tuto qu'il rouvre en cours de route (again) partagent les deux
 * façons de visiter : le voyage (l'objet entouré d'or) et le détail (la fiche, « Les projets »).
 */
const fr = {
  who: "Ton copilote",
  hello: "Salut, voyageur !",
  intro: "Ici, chaque escale est l'un de mes projets. Deux façons de les visiter :",
  again: "Deux façons de visiter",
  againIntro: "Chaque escale est l'un de mes projets.",
  voyage: "Le voyage.",
  voyageText: "Clique sur l'objet entouré d'or : il t'emmène au projet suivant.",
  voyageTextPhone: "Touche l'anneau doré ou le bouton du bas : il t'emmène au projet suivant.",
  detail: "Le détail.",
  detailText: "« La fiche du projet », sous le nom de chaque escale, le raconte en détail. « Les projets » les montre tous.",
  detailTextPhone: "Chaque projet a sa fiche, ouverte depuis son escale. Le menu les montre tous.",
  go: "Faire le voyage →",
  goOn: "Continuer le voyage →",
  projects: "Voir les projets",
  lost: "Perdu en route ? Je me range dans le coin.",
  lostPhone: "Perdu ? Je me range en bas : touche-moi.",
  close: "Fermer",
  dock: "Ton copilote : comment visiter ?",
};

const en: { [K in keyof typeof fr]: string } = {
  who: "Your co-pilot",
  hello: "Hi, traveller!",
  intro: "Each stop here is one of my projects. Two ways to visit them:",
  again: "Two ways to visit",
  againIntro: "Each stop is one of my projects.",
  voyage: "The journey.",
  voyageText: "Click the object circled in gold: it takes you to the next project.",
  voyageTextPhone: "Tap the golden ring or the bottom button: it takes you to the next project.",
  detail: "The details.",
  detailText: "“Project page”, under each stop's name, tells its whole story. “Projects” shows them all.",
  detailTextPhone: "Each project has its own page, opened from its stop. The menu shows them all.",
  go: "Start the journey →",
  goOn: "Carry on →",
  projects: "See the projects",
  lost: "Lost along the way? I'll wait in the corner.",
  lostPhone: "Lost? I'll wait at the bottom: tap me.",
  close: "Close",
  dock: "Your co-pilot: how to visit?",
};

export const COPILOTE: Record<Lang, typeof en> = { fr, en };
