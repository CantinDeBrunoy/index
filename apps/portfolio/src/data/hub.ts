/**
 * Le hub, « Les apps » : un tableau des départs, une ligne par app, son statut vérifié en direct
 * (/api/status) et le bouton pour l'ouvrir. La liste, les liens et les sondes viennent de
 * @index/projects ; ici, seulement les textes. Brouillons, à relire.
 */

import type { Lang } from "../i18n/voyage";

/** Les états d'une ligne : en direct (sondés) ou fixes (logiciel, archive, ce site, adresse pas encore connue). */
export type LiveState = "pending" | "online" | "asleep" | "offline" | "unknown";
export type FixedState = "download" | "here" | "archive" | "soon";

interface HubStrings {
  pageTitle: string;
  description: string;
  label: string;
  /** Le titre, en HTML (l'italique du mot clé). */
  title: string;
  intro: string;
  introShort: string;
  board: string;
  checking: string;
  checkedNow: string;
  /** {n} : le nombre de minutes. */
  checkedAgo: string;
  unavailable: string;
  cols: { num: string; app: string; dest: string; gate: string; status: string; action: string };
  states: Record<LiveState | FixedState, string>;
  open: string;
  download: string;
  code: string;
  fiche: string;
  archives: string;
  archivesShort: string;
  legend: [LiveState, string][];
  /** Ce que fait chaque app, en quelques mots, par slug. */
  dest: Record<string, string>;
}

export const HUB: Record<Lang, HubStrings> = {
  fr: {
    pageTitle: "Les apps",
    description: "Toutes les apps de Cantin Roquier, à ouvrir d'ici, avec leur statut vérifié en direct.",
    label: "Index · le hub",
    title: "Les <em>départs</em>",
    intro:
      "Mes apps tournent pour de vrai : ouvrez-en une d'ici. Dans chacune, l'onglet « ← Index » vous ramène. Le statut est vérifié toutes les heures.",
    introShort: "Mes apps tournent pour de vrai : ouvrez-en une d'ici, l'onglet « ← Index » vous ramène.",
    board: "Départs",
    checking: "Vérification du statut…",
    checkedNow: "Statut vérifié à l'instant",
    checkedAgo: "Statut vérifié il y a {n} min",
    unavailable: "Statut indisponible",
    cols: { num: "N°", app: "App", dest: "Destination", gate: "Porte", status: "Statut", action: "Ouvrir" },
    states: {
      pending: "Vérification",
      online: "En ligne",
      asleep: "En veille",
      offline: "Hors ligne",
      unknown: "Non vérifié",
      download: "À télécharger",
      here: "Vous y êtes",
      archive: "Archive",
      soon: "Bientôt",
    },
    open: "Ouvrir →",
    download: "Télécharger ↓",
    code: "Le code ↗",
    fiche: "La fiche →",
    archives: "Archives · sans départ",
    archivesShort: "Les archives : Métro Pathfinder, API REST .NET, Visit Match, Galaxy Escape →",
    legend: [
      ["online", "En ligne : l'app répond"],
      ["asleep", "En veille : elle se réveille en quelques secondes"],
      ["offline", "Hors ligne : je suis prévenu"],
    ],
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
    label: "Index · the hub",
    title: "<em>Departures</em>",
    intro: "My apps run for real: open one from here. In each, the “← Index” tab brings you back. Status is checked every hour.",
    introShort: "My apps run for real: open one from here, the “← Index” tab brings you back.",
    board: "Departures",
    checking: "Checking status…",
    checkedNow: "Status checked just now",
    checkedAgo: "Status checked {n} min ago",
    unavailable: "Status unavailable",
    cols: { num: "No.", app: "App", dest: "Destination", gate: "Gate", status: "Status", action: "Open" },
    states: {
      pending: "Checking",
      online: "Live",
      asleep: "Asleep",
      offline: "Down",
      unknown: "Unchecked",
      download: "Download",
      here: "You are here",
      archive: "Archive",
      soon: "Soon",
    },
    open: "Open →",
    download: "Download ↓",
    code: "Code ↗",
    fiche: "Project page →",
    archives: "Archives · no departures",
    archivesShort: "The archives: Métro Pathfinder, .NET REST API, Visit Match, Galaxy Escape →",
    legend: [
      ["online", "Live: the app responds"],
      ["asleep", "Asleep: it wakes up in a few seconds"],
      ["offline", "Down: I get alerted"],
    ],
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

/** Le nom anglais de l'API REST .NET ; les autres noms ne se traduisent pas. */
export const NAMES_EN: Record<string, string> = { "api-rest-dotnet": ".NET REST API" };

/** Les projets sans fiche à eux : l'API REST .NET est racontée sur l'étagère de Mithril. */
export const FICHE_OF: Record<string, string> = { "api-rest-dotnet": "mithril" };
