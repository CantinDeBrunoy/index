/**
 * Les fiches projet : une par escale du voyage, en français et en anglais. Ici l'interface de la fiche,
 * et les projets racontés sur la fiche d'un autre. Les textes de chaque projet sont dans la collection
 * de contenu (src/content/projets/<langue>/<slug>.yaml) ; le décor et l'accroche de son escale, dans
 * data/voyage.ts. Brouillons, à relire.
 */

import { getProject, projects, type Project } from "@index/projects";
import { fichePath, inWords, type Lang } from "../i18n/voyage";
import { STOPS } from "./voyage";

export const FICHE: Record<
  Lang,
  {
    /** Le bouton qui ramène au voyage, à l'escale de la fiche, et suit la lecture. */
    resume: string;
    /** La bande des escales, sous l'en-tête : avant la première escale, le départ. */
    stripAria: string;
    departLabel: string;
    depart: string;
    /** La vidéo de démo, quand le projet en a une (sinon, la capture « En images »). */
    demo: string;
    /** {i} : l'escale de la fiche ; {n} : le nombre d'escales. */
    stopOf: string;
    stop: string;
    why: string;
    what: string;
    how: string;
    /**
     * La carte d'embarquement, d'Index vers le projet. {n} : le numéro du projet. Son talon ouvre l'app ;
     * sans app, il dit pourquoi : une archive, une app pas encore en ligne, ou ce site même.
     */
    pass: {
      title: string;
      flight: string;
      from: string;
      to: string;
      fields: { passenger: string; you: string; stop: string; type: string; year: string; status: string; gate: string; bags: string };
      readCode: string;
      gate: Record<"open" | "archive" | "soon" | "here", { kicker: string; big: string; act?: string }>;
    };
    pictures: string;
    shelf: string;
    /** {place} : le lieu de l'escale suivante. */
    next: string;
    go: string;
    end: string;
    journal: string;
    seeAll: string;
    /** {name} : le projet. */
    question: string;
  }
> = {
  fr: {
    resume: "Reprendre le voyage",
    stripAria: "Les escales voisines",
    departLabel: "Avant le décollage",
    depart: "Le départ",
    demo: "La démo",
    stopOf: "Escale {i} / {n}",
    stop: "Escale",
    why: "Pourquoi je l'ai fabriqué",
    what: "Ce que ça fait",
    how: "Comment c'est fait",
    pass: {
      title: "Carte d'embarquement",
      flight: "Vol {n}",
      from: "Départ",
      to: "Arrivée",
      fields: { passenger: "Passager", you: "Vous", stop: "Escale", type: "Type", year: "Année", status: "Statut", gate: "Porte", bags: "Bagages en soute" },
      readCode: "Lire le code ↗",
      gate: {
        open: { kicker: "Embarquement immédiat", big: "Embarquer" },
        archive: { kicker: "Vol terminé", big: "Atterri" },
        soon: { kicker: "Prochain départ", big: "Bientôt" },
        here: { kicker: "À bord", big: "Vous y êtes", act: "C'est ce site" },
      },
    },
    pictures: "En images",
    shelf: "Sur l'étagère aussi",
    next: "Escale suivante · {place}",
    go: "Continuer le voyage →",
    end: "Fin du voyage",
    journal: "Le carnet de voyage",
    seeAll: `Voir les ${inWords("fr", projects.length)} projets →`,
    question: "Une question sur {name} ?",
  },
  en: {
    resume: "Resume the journey",
    stripAria: "Neighbouring stops",
    departLabel: "Before take-off",
    depart: "The departure",
    demo: "The demo",
    stopOf: "Stop {i} / {n}",
    stop: "Stop",
    why: "Why I built it",
    what: "What it does",
    how: "How it's made",
    pass: {
      title: "Boarding pass",
      flight: "Flight {n}",
      from: "From",
      to: "To",
      fields: { passenger: "Passenger", you: "You", stop: "Stop", type: "Type", year: "Year", status: "Status", gate: "Gate", bags: "Checked baggage" },
      readCode: "Read the code ↗",
      gate: {
        open: { kicker: "Now boarding", big: "Board" },
        archive: { kicker: "Flight completed", big: "Landed" },
        soon: { kicker: "Next departure", big: "Soon" },
        here: { kicker: "On board", big: "You're here", act: "This very site" },
      },
    },
    pictures: "In pictures",
    shelf: "Also on the shelf",
    next: "Next stop · {place}",
    go: "Continue the journey →",
    end: "End of the journey",
    journal: "The travel journal",
    seeAll: `See all ${inWords("en", projects.length)} projects →`,
    question: "A question about {name}?",
  },
};

/** Les projets sans fiche à eux, et la fiche qui les raconte : l'API REST .NET est sur l'étagère de Mithril. */
export const FICHE_OF: Record<string, string> = { "api-rest-dotnet": "mithril" };

/** Le nom anglais de l'API REST .NET ; les autres noms ne se traduisent pas. */
const NAMES_EN: Record<string, string> = { "api-rest-dotnet": ".NET REST API" };

export const nameOf = (project: Project, lang: Lang) => (lang === "en" ? (NAMES_EN[project.slug] ?? project.name) : project.name);

/** L'adresse de la fiche d'un projet ; pour un projet raconté sur la fiche d'un autre, sa place sur celle-ci. */
export function ficheHref(project: Project, lang: Lang): string {
  const host = FICHE_OF[project.slug];
  const target = host ? getProject(host) : undefined;
  return target ? `${fichePath(lang, target)}#${project.slug}` : fichePath(lang, project);
}

/**
 * Les pages des fiches, dans chaque langue (pages/[entry].astro, pages/en/[entry].astro) : une par escale,
 * à l'adresse du projet (/005-magellan), et pour chaque projet raconté ailleurs, une redirection.
 */
export function fichePaths() {
  return projects
    .filter((p) => STOPS.some((s) => s.slug === p.slug) || p.slug in FICHE_OF)
    .map((p) => ({ params: { entry: p.path.slice(1) }, props: { slug: p.slug } }));
}
