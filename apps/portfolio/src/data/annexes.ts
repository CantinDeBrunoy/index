/**
 * Les pages annexes du voyage : pour l'instant la 404, « Bagage égaré », une escale hors itinéraire.
 * De nuit, un tapis à bagages tourne à vide sous le panneau du tapis 404 ; à côté, une valise attend
 * seule. La valise ramène au départ ; le cartel mène aux projets. Brouillons, à relire.
 */

import type { Lang } from "../i18n/voyage";

/** La scène de la 404 : le fond du terminal de nuit et la valise à cliquer, en % de chaque rendu. */
export const NOT_FOUND_SCENE = {
  scene: "bagage",
  bg: "#121522",
  spot: [66.6, 54.8] as [number, number],
  spotMobile: [73.8, 50] as [number, number],
};

interface NotFoundStrings {
  pageTitle: string;
  description: string;
  label: string;
  caption: string;
  /** Le titre, en HTML (l'italique du mot clé). */
  title: string;
  text: string;
  spot: string;
  alt: string;
  projects: string;
  about: string;
}

export const NOT_FOUND: Record<Lang, NotFoundStrings> = {
  fr: {
    pageTitle: "Escale introuvable",
    description: "Cette page n'existe pas, ou plus. Le reste du voyage, lui, est bien arrivé.",
    label: "Escale 404 · Introuvable",
    caption: "Hors itinéraire",
    title: "Bagage <em>égaré</em>.",
    text: "Cette page n'existe pas, ou plus : elle a dû se perdre en correspondance. Le reste du voyage, lui, est bien arrivé.",
    spot: "Reprendre le voyage",
    alt: "Un tapis à bagages tourne à vide dans un terminal de nuit, sous le panneau du tapis 404 ; à côté, une valise terre cuite attend seule, l'étiquette « 404 » pendue à sa poignée.",
    projects: "Voir les onze projets →",
    about: "À propos →",
  },
  en: {
    pageTitle: "Stop not found",
    description: "This page doesn't exist, or no longer does. The rest of the journey arrived safely.",
    label: "Stop 404 · Not found",
    caption: "Off the route",
    title: "Lost <em>luggage</em>.",
    text: "This page doesn't exist, or no longer does: it must have gone astray on a connection. The rest of the journey arrived safely.",
    spot: "Resume the journey",
    alt: "A baggage carousel turns empty in a terminal at night, under the sign for belt 404; beside it, a terracotta suitcase waits alone, a “404” tag hanging from its handle.",
    projects: "See all eleven projects →",
    about: "About →",
  },
};
