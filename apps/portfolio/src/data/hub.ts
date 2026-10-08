/**
 * Le hub, « Les apps » : un écran de départs ambré, à points lumineux. Une ligne par app, son statut
 * vérifié en direct (/api/status), le bouton pour embarquer ; les archives en arrivées ; un bandeau
 * d'infos voyageurs qui défile. La liste, les liens et les sondes viennent de @index/projects ;
 * ici, seulement les textes. Brouillons, à relire.
 */

import type { Lang } from "../i18n/voyage";

/** Les états d'une ligne : en direct (sondés) ou fixes (logiciel, archive, ce site, adresse pas encore connue). */
export type LiveState = "pending" | "online" | "asleep" | "offline" | "unknown";
export type FixedState = "download" | "here" | "archive" | "soon";

interface HubStrings {
  pageTitle: string;
  description: string;
  board: string;
  /** Le titre dans l'autre langue, comme sur les écrans d'aéroport (masqué sur téléphone). */
  boardAlt: string;
  boardSub: string;
  arrivals: string;
  arrivalsSub: string;
  /** Sous l'écran : comment ça marche. */
  intro: string;
  checking: string;
  checkedNow: string;
  /** {n} : le nombre de minutes. */
  checkedAgo: string;
  unavailable: string;
  cols: { year: string; num: string; dest: string; gate: string; status: string; action: string };
  states: Record<LiveState | FixedState, string>;
  open: string;
  download: string;
  code: string;
  fiche: string;
  arrivalsShort: string;
  legend: [LiveState | FixedState, string, string][];
  ticker: TickerStrings;
  /** Ce que fait chaque app, en quelques mots, par slug (lecteurs d'écran et info-bulle). */
  dest: Record<string, string>;
}

/**
 * Le bandeau d'infos voyageurs : {name} une app, {names} une liste d'apps (scripts/hub-ticker.ts).
 * Style télégraphique, sans deux-points : celui de Doto, en graisse 800, ressemble à deux croix.
 */
export interface TickerStrings {
  lead: string;
  onTime: string;
  asleep: string;
  offline: string;
  soon: string;
  download: string;
  back: string;
  end: string;
}

export const HUB: Record<Lang, HubStrings> = {
  fr: {
    pageTitle: "Les apps",
    description: "Toutes les apps de Cantin Roquier, à ouvrir d'ici, avec leur statut vérifié en direct.",
    board: "Départs",
    boardAlt: "Departures",
    boardSub: "Toutes mes apps",
    arrivals: "Arrivées",
    arrivalsSub: "· les archives",
    intro: "Mes apps tournent pour de vrai : embarquez d'ici. Dans chacune, l'onglet « ← Index » vous ramène. Le statut est vérifié en direct, au plus toutes les cinq minutes.",
    checking: "Vérification du statut…",
    checkedNow: "Statut vérifié à l'instant",
    checkedAgo: "Statut vérifié il y a {n} min",
    unavailable: "Statut indisponible",
    cols: { year: "Depuis", num: "Vol", dest: "Destination", gate: "Porte", status: "Remarque", action: "Embarquer" },
    states: {
      pending: "Vérification",
      online: "À l'heure",
      asleep: "Retardé",
      offline: "Annulé",
      unknown: "Non vérifié",
      download: "À télécharger",
      here: "Vous y êtes",
      archive: "Atterri",
      soon: "Bientôt",
    },
    open: "Embarquer →",
    download: "Télécharger ↓",
    code: "Le code ↗",
    fiche: "La fiche →",
    arrivalsShort: "Arrivées : Métro Pathfinder, API REST .NET, Visit Match, Galaxy Escape →",
    legend: [
      ["online", "À l'heure", "l'app répond"],
      ["asleep", "Retardé", "elle se réveille, quelques secondes"],
      ["offline", "Annulé", "hors ligne, je suis prévenu"],
      ["archive", "Atterri", "une archive, sa fiche raconte le voyage"],
    ],
    ticker: {
      lead: "Info voyageurs",
      onTime: "{names} à l'heure",
      asleep: "{name} retardé, l'app se réveille",
      offline: "{name} annulé, je suis prévenu",
      soon: "{names} bientôt au départ",
      download: "{names} à télécharger, porte GitHub",
      back: "Dans chaque app, l'onglet ← Index vous ramène ici",
      end: "Bon voyage",
    },
    dest: {
      magellan: "Le globe de mes voyages",
      cancionero: "L'espagnol en chansons",
      mithril: "Le coffre à mots de passe, sous Windows",
      tonalli: "Un rituel à deux, chaque jour",
      "gym-picker": "La salle la moins embouteillée",
      hublot: "Le guet des prix des vols",
      index: "Ce site, et le dépôt qui réunit tout",
      "metro-pathfinder": "Le plus court chemin dans le métro",
      "api-rest-dotnet": "Des microservices C#, tests d'abord",
      "visit-match": "Des voyageurs solo qui se trouvent",
      "galaxy-escape": "Une course sans fin dans l'espace",
    },
  },
  en: {
    pageTitle: "Apps",
    description: "All of Cantin Roquier's apps, ready to open from here, with their status checked live.",
    board: "Departures",
    boardAlt: "Départs",
    boardSub: "All my apps",
    arrivals: "Arrivals",
    arrivalsSub: "· the archives",
    intro: "My apps run for real: board from here. In each, the “← Index” tab brings you back. Status is checked live, at most every five minutes.",
    checking: "Checking status…",
    checkedNow: "Status checked just now",
    checkedAgo: "Status checked {n} min ago",
    unavailable: "Status unavailable",
    cols: { year: "Since", num: "Flight", dest: "Destination", gate: "Gate", status: "Remarks", action: "Board" },
    states: {
      pending: "Checking",
      online: "On time",
      asleep: "Delayed",
      offline: "Cancelled",
      unknown: "Unchecked",
      download: "Download",
      here: "You are here",
      archive: "Landed",
      soon: "Soon",
    },
    open: "Board →",
    download: "Download ↓",
    code: "Code ↗",
    fiche: "Project →",
    arrivalsShort: "Arrivals: Métro Pathfinder, .NET REST API, Visit Match, Galaxy Escape →",
    legend: [
      ["online", "On time", "the app responds"],
      ["asleep", "Delayed", "it's waking up, a few seconds"],
      ["offline", "Cancelled", "down, I get alerted"],
      ["archive", "Landed", "an archive, its page tells the story"],
    ],
    ticker: {
      lead: "Passenger information",
      onTime: "{names} on time",
      asleep: "{name} delayed, the app is waking up",
      offline: "{name} cancelled, I get alerted",
      soon: "{names} departing soon",
      download: "{names} to download at gate GitHub",
      back: "In every app, the ← Index tab brings you back here",
      end: "Have a good trip",
    },
    dest: {
      magellan: "My travels on a globe",
      cancionero: "Spanish through songs",
      mithril: "A password safe for Windows",
      tonalli: "A daily ritual for two",
      "gym-picker": "The least jammed gym",
      hublot: "A lookout for flight prices",
      index: "This site, and the repo behind it all",
      "metro-pathfinder": "The shortest route on the metro",
      "api-rest-dotnet": "C# microservices, test-first",
      "visit-match": "Solo travellers finding each other",
      "galaxy-escape": "An endless run through space",
    },
  },
};

/** Les portes (hébergeurs) en court, par slug : la fiche de chaque app donne le détail. */
export const GATES: Record<string, string> = {
  magellan: "Cloudflare",
  cancionero: "Vercel",
  mithril: "GitHub",
  tonalli: "Vercel",
  "gym-picker": "Cloudflare",
  hublot: "GitHub",
  index: "Cloudflare",
};
