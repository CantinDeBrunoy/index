/**
 * Le site « le voyage », en français et en anglais : les adresses de chaque page dans les deux
 * langues, et les textes communs à toutes les pages (en-tête, menu, pied de page).
 * Le français est à la racine, l'anglais sous /en.
 */

import type { Project } from "@index/projects";

export const LANGS = ["fr", "en"] as const;
export type Lang = (typeof LANGS)[number];

/** Les pages du site. Une fiche a son adresse à part : celle du projet (/005-magellan). */
export type PageKey = "voyage" | "projets" | "apropos" | "mentions";

export const ROUTES: Record<PageKey, Record<Lang, string>> = {
  voyage: { fr: "/", en: "/en" },
  projets: { fr: "/projets", en: "/en/projects" },
  apropos: { fr: "/a-propos", en: "/en/about" },
  mentions: { fr: "/mentions-legales", en: "/en/legal-notice" },
};

export const fichePath = (lang: Lang, project: Pick<Project, "path">): string =>
  lang === "fr" ? project.path : `/en${project.path}`;

/** L'adresse où m'écrire, au pied des pages. */
export const EMAIL = "cantin.roquier@gmail.com";

/** L'espace insécable. */
export const NBSP = String.fromCharCode(0xa0);

/**
 * La typographie française : une espace insécable avant « : ; ? ! » et à l'intérieur des guillemets, pour
 * qu'aucun de ces signes n'ouvre une ligne. Appliquée au rendu : les textes s'écrivent avec des espaces simples.
 */
export const typo = (lang: Lang, text: string): string =>
  lang === "fr" ? text.replace(/ ([:;?!»])/g, `${NBSP}$1`).replace(/« /g, `«${NBSP}`) : text;

const WORDS: Record<Lang, readonly string[]> = {
  fr: ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf", "vingt"],
  en: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"],
};

/** Un nombre en toutes lettres (dix escales, onze projets) ; au-delà de vingt, en chiffres. `upper` : la majuscule. */
export function inWords(lang: Lang, n: number, upper = false): string {
  const word = WORDS[lang][n] ?? String(n);
  return upper ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

/**
 * Les onglets de l'en-tête, dans l'ordre : le voyage, les projets, à propos. « Les projets » est aussi le
 * hub : chaque app s'ouvre de sa rangée de raccourcis (l'ancienne page « Les apps » y redirige).
 */
export const TABS = ["voyage", "projets", "apropos"] as const satisfies readonly PageKey[];
export type TabKey = (typeof TABS)[number];

const fr = {
  siteTitle: "INDEX — Cantin Roquier",
  siteDescription:
    "Le portfolio et le hub de Cantin Roquier, ingénieur développeur : chaque app s'ouvre d'ici, chaque projet a sa fiche.",
  skip: "Aller au contenu",
  tabsAria: "Le site",
  tabs: { voyage: "Le voyage", projets: "Les projets", apropos: "À propos" },
  langAria: "Langue",
  langNames: { fr: "Français", en: "English" },
  menu: "Ouvrir le menu",
  legal: "Mentions légales",
  /** Au pied du carnet et d'« À propos », avant l'adresse où m'écrire. En HTML : l'italique. */
  nextIdea: "Une idée pour la prochaine <em>escale</em> ?",
  /** Les pastilles d'un projet (Badge de @index/projects), et leur explication au survol. */
  badges: { ecole: "École", ia: "Assisté par IA", "ia-refonte": "Refonte assistée par IA" },
  badgeTitles: {
    ecole: "Un projet de cours",
    ia: "Codé avec un assistant de code IA (Claude)",
    "ia-refonte": "Une première version sans IA, puis une refonte avec un assistant de code IA (Claude)",
  },
} as const;

type Strings = { [K in keyof typeof fr]: (typeof fr)[K] extends string ? string : { [P in keyof (typeof fr)[K]]: string } };

const en: Strings = {
  siteTitle: "INDEX — Cantin Roquier",
  siteDescription:
    "Cantin Roquier's portfolio and hub, a software engineer: every app opens from here, every project has its page.",
  skip: "Skip to content",
  tabsAria: "Site",
  tabs: { voyage: "The journey", projets: "Projects", apropos: "About" },
  langAria: "Language",
  langNames: { fr: "Français", en: "English" },
  menu: "Open the menu",
  legal: "Legal notice",
  nextIdea: "An idea for the next <em>stop</em>?",
  badges: { ecole: "School", ia: "AI-assisted", "ia-refonte": "AI-assisted rebuild" },
  badgeTitles: {
    ecole: "A school project",
    ia: "Built with an AI coding assistant (Claude)",
    "ia-refonte": "A first version without AI, then a rebuild with an AI coding assistant (Claude)",
  },
};

export const STRINGS: Record<Lang, Strings> = { fr, en };

export function langFromPath(pathname: string): Lang {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "fr";
}
