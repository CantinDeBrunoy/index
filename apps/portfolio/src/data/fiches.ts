/**
 * Les fiches projet : une par escale du voyage, en français et en anglais. Ici l'interface de la fiche. Les
 * textes de chaque projet sont dans la collection de contenu (src/content/projets/<langue>/<slug>.yaml) ; le
 * décor et l'accroche de son escale, dans data/voyage.ts. Brouillons, à relire.
 */

import { projects, type Project } from "@index/projects";
import type { Lang } from "../i18n/voyage";
import { STOPS } from "./voyage";

export const FICHE: Record<
  Lang,
  {
    /** Le bouton de l'en-tête vers une app web (le voyage et le carnet disent « Ouvrir l'app »). */
    tryApp: string;
    /** Le bouton du bas de la fiche, qui reprend le voyage à l'escale du projet. */
    resume: string;
    /** Le copilote, qui suit la lecture en bas à droite et ramène au voyage, lui aussi. */
    copilot: string;
    /**
     * Son accueil, à la première fiche ouverte : il dit où l'on est, et que c'est lui qui ramène au voyage.
     * {name} : le projet. « tap » remplace « click » sur téléphone.
     */
    welcome: { title: string; text: string; back: string; click: string; tap: string; go: string };
    /** La ligne de vol : le pourquoi, ce que ça fait et comment c'est fait, un point à la fois. */
    pointsAria: string;
    prevPoint: string;
    nextPoint: string;
    depart: string;
    /** La vidéo de démo, quand le projet en a une (sinon, la capture « En images »). */
    demo: string;
    stop: string;
    why: string;
    what: string;
    how: string;
    /**
     * La carte d'embarquement, à côté de la démo : ce que l'en-tête ne dit pas (avec quoi c'est fait, où ça
     * tourne) ; son talon, le statut en direct de l'app, ou pourquoi il n'y en a pas.
     */
    pass: {
      title: string;
      status: string;
      madeWith: string;
      host: string;
      states: Record<"online" | "asleep" | "offline", string>;
    };
    pictures: string;
    /** {name} : le projet. */
    question: string;
  }
> = {
  fr: {
    tryApp: "Essayer l'app ↗",
    resume: "Reprendre le voyage",
    copilot: "Reprends ton voyage",
    welcome: {
      title: "Ici, c'est la fiche du projet {name}.",
      text: "Tu vas pouvoir voir tous les détails de ce projet.",
      back: "Et si tu veux reprendre ton voyage,",
      click: "clique sur moi !",
      tap: "touche-moi !",
      go: "Voir les détails →",
    },
    pointsAria: "Le projet, point par point",
    prevPoint: "Point précédent",
    nextPoint: "Point suivant",
    depart: "Le départ",
    demo: "La démo",
    stop: "Escale",
    why: "Pourquoi je l'ai fabriqué",
    what: "Ce que ça fait",
    how: "Comment c'est fait",
    pass: {
      title: "Carte d'embarquement",
      status: "Statut",
      madeWith: "Fait avec",
      host: "Hébergé sur",
      states: { online: "En ligne", asleep: "Se réveille", offline: "Hors ligne" },
    },
    pictures: "En images",
    question: "Une question sur {name} ?",
  },
  en: {
    tryApp: "Try the app ↗",
    resume: "Resume the journey",
    copilot: "Back to your journey",
    welcome: {
      title: "This is the {name} project page.",
      text: "Here you can see all the details of this project.",
      back: "And if you want to get back to your journey,",
      click: "click me!",
      tap: "tap me!",
      go: "See the details →",
    },
    pointsAria: "The project, point by point",
    prevPoint: "Previous point",
    nextPoint: "Next point",
    depart: "The departure",
    demo: "The demo",
    stop: "Stop",
    why: "Why I built it",
    what: "What it does",
    how: "How it's made",
    pass: {
      title: "Boarding pass",
      status: "Status",
      madeWith: "Built with",
      host: "Hosted on",
      states: { online: "Live", asleep: "Waking up", offline: "Offline" },
    },
    pictures: "In pictures",
    question: "A question about {name}?",
  },
};

/** Le nom anglais de l'API REST .NET ; les autres noms ne se traduisent pas. */
const NAMES_EN: Record<string, string> = { "api-rest-dotnet": ".NET REST API" };

export const nameOf = (project: Project, lang: Lang) => (lang === "en" ? (NAMES_EN[project.slug] ?? project.name) : project.name);

/**
 * Les pages des fiches, dans chaque langue (pages/[entry].astro, pages/en/[entry].astro) : une par escale, à
 * l'adresse du projet (/005-magellan).
 */
export function fichePaths() {
  return projects
    .filter((p) => STOPS.some((s) => s.slug === p.slug))
    .map((p) => ({ params: { entry: p.path.slice(1) }, props: { slug: p.slug } }));
}
