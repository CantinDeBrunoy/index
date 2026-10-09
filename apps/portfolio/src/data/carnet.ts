/**
 * Le carnet de voyage, « Les projets » : le sommaire du voyage, de nuit, une carte postale par escale.
 * La carte ouvre la fiche du projet ; le lien du dessous rouvre son escale. En tête, la rangée des
 * raccourcis : une pastille par app, qui l'ouvre directement, avec son statut vérifié en direct. C'est
 * le hub du site (l'ancienne page « Les apps » y redirige). Brouillons, à relire.
 */

import { projects } from "@index/projects";
import { inWords, type Lang } from "../i18n/voyage";

/** L'ancre de la rangée des raccourcis : « Ouvrir une app » au départ du voyage y mène. */
export const APPS_ANCHOR = "apps";

/**
 * Le cadrage de la vignette ronde d'un raccourci, par scène : l'objet de l'escale, en % de son image fixe
 * de téléphone (public/voyage/stills/<scène>-mobile.webp), et le grossissement. À revoir après un nouveau rendu.
 */
export const CHIP_FOCUS: Record<string, { x: number; y: number; zoom: number }> = {
  espace: { x: 36, y: 44, zoom: 2 },
  terre: { x: 38, y: 47, zoom: 1.5 },
  avion: { x: 51, y: 47, zoom: 1.5 },
  route: { x: 50, y: 49, zoom: 1.4 },
  maison: { x: 44, y: 47, zoom: 2.2 },
  salon: { x: 46, y: 69, zoom: 1.8 },
  calendrier: { x: 56, y: 38, zoom: 2 },
};

/** Les états d'une pastille : en attente du statut, ou ce que /api/status en dit. */
export type LiveState = "pending" | "online" | "asleep" | "offline" | "unknown";

/** Un texte qui suit le nombre : {n}, au singulier puis au pluriel. */
type Count = { one: string; other: string };

export interface CarnetStrings {
  pageTitle: string;
  description: string;
  label: string;
  /** En HTML : l'italique du mot clé. */
  title: string;
  intro: string;
  revisit: string;
  /** Pour les lecteurs d'écran : {n} l'escale, {place} son lieu. */
  revisitAria: string;
  /** Sur grand écran, la liste des escales et la scène de celle qu'on survole. */
  listAria: string;
  previewAria: string;
  /** {list} : les projets racontés sur la fiche de l'escale. */
  shelf: string;
  /** Le titre de la rangée des raccourcis. */
  quick: string;
  /** La pastille du logiciel à télécharger, à la place du statut. */
  quickDownload: string;
  /** Pour les lecteurs d'écran, après le nom de l'app : son statut. */
  states: Record<LiveState, string>;
  /** Sous les pastilles : le résumé du statut, puis son âge. */
  checking: string;
  online: Count;
  asleep: Count;
  offline: Count;
  checkedNow: string;
  /** {n} : le nombre de minutes. */
  checkedAgo: string;
  unavailable: string;
}

export const CARNET: Record<Lang, CarnetStrings> = {
  fr: {
    pageTitle: "Le carnet de voyage",
    description: `Les ${inWords("fr", projects.length)} projets de Cantin Roquier, escale par escale : chaque carte ouvre la fiche du projet, et chaque app s'ouvre d'ici.`,
    label: "Fin du voyage",
    title: "Le carnet de <em>voyage</em>",
    intro: `Les ${inWords("fr", projects.length)} projets, escale par escale : chaque carte ouvre sa fiche.`,
    revisit: "Revoir l'escale →",
    revisitAria: "Revoir l'escale {n} : {place}",
    listAria: "Les escales du voyage",
    previewAria: "L'escale survolée, en grand",
    shelf: "Sur l'étagère aussi : {list}",
    quick: "Ouvrir une app directement",
    quickDownload: "Windows ↓",
    states: {
      pending: "vérification du statut",
      online: "en ligne",
      asleep: "se réveille",
      offline: "hors ligne",
      unknown: "statut inconnu",
    },
    checking: "Vérification du statut…",
    online: { one: "{n} app en ligne", other: "{n} apps en ligne" },
    asleep: { one: "{n} qui se réveille", other: "{n} qui se réveillent" },
    offline: { one: "{n} hors ligne", other: "{n} hors ligne" },
    checkedNow: "statut vérifié à l'instant",
    checkedAgo: "statut vérifié il y a {n} min",
    unavailable: "Statut indisponible pour le moment",
  },
  en: {
    pageTitle: "The travel journal",
    description: `Cantin Roquier's ${inWords("en", projects.length)} projects, stop by stop: each card opens the project page, and every app opens from here.`,
    label: "End of the journey",
    title: "The travel <em>journal</em>",
    intro: `All ${inWords("en", projects.length)} projects, stop by stop: each card opens its page.`,
    revisit: "Back to the stop →",
    revisitAria: "Back to stop {n}: {place}",
    listAria: "The journey's stops",
    previewAria: "The stop you're pointing at, up close",
    shelf: "Also on the shelf: {list}",
    quick: "Open an app directly",
    quickDownload: "Windows ↓",
    states: {
      pending: "checking status",
      online: "online",
      asleep: "waking up",
      offline: "offline",
      unknown: "status unknown",
    },
    checking: "Checking status…",
    online: { one: "{n} app online", other: "{n} apps online" },
    asleep: { one: "{n} waking up", other: "{n} waking up" },
    offline: { one: "{n} offline", other: "{n} offline" },
    checkedNow: "status checked just now",
    checkedAgo: "status checked {n} min ago",
    unavailable: "Status unavailable for now",
  },
};
