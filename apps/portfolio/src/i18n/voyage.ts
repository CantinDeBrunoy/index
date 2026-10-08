/**
 * Le site « le voyage », en français et en anglais : les adresses de chaque page dans les deux
 * langues, et les textes communs à toutes les pages (en-tête, menu, pied de page).
 * Le français est à la racine, l'anglais sous /en.
 */

import type { Project } from "@index/projects";

export const LANGS = ["fr", "en"] as const;
export type Lang = (typeof LANGS)[number];

/** Les pages du site. Une fiche a son adresse à part : celle du projet (/005-magellan). */
export type PageKey = "voyage" | "apps" | "projets" | "apropos" | "mentions";

export const ROUTES: Record<PageKey, Record<Lang, string>> = {
  voyage: { fr: "/", en: "/en" },
  apps: { fr: "/apps", en: "/en/apps" },
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

/** Les onglets de l'en-tête, dans l'ordre : le voyage, le hub, les projets, à propos. */
export const TABS = ["voyage", "apps", "projets", "apropos"] as const satisfies readonly PageKey[];
export type TabKey = (typeof TABS)[number];

const fr = {
  siteTitle: "INDEX — Cantin Roquier",
  siteDescription:
    "Le portfolio et le hub de Cantin Roquier, ingénieur développeur : chaque app s'ouvre d'ici, chaque projet a sa fiche.",
  skip: "Aller au contenu",
  tabsAria: "Le site",
  tabs: { voyage: "Le voyage", apps: "Les apps", projets: "Les projets", apropos: "À propos" },
  langAria: "Langue",
  langNames: { fr: "Français", en: "English" },
  menu: "Ouvrir le menu",
  legal: "Mentions légales",
  /** Au pied du carnet et d'« À propos », avant l'adresse où m'écrire. En HTML : l'italique. */
  nextIdea: "Une idée pour la prochaine <em>escale</em> ?",
} as const;

type Strings = { [K in keyof typeof fr]: (typeof fr)[K] extends string ? string : { [P in keyof (typeof fr)[K]]: string } };

const en: Strings = {
  siteTitle: "INDEX — Cantin Roquier",
  siteDescription:
    "Cantin Roquier's portfolio and hub, a software engineer: every app opens from here, every project has its page.",
  skip: "Skip to content",
  tabsAria: "Site",
  tabs: { voyage: "The journey", apps: "Apps", projets: "Projects", apropos: "About" },
  langAria: "Language",
  langNames: { fr: "Français", en: "English" },
  menu: "Open the menu",
  legal: "Legal notice",
  nextIdea: "An idea for the next <em>stop</em>?",
};

export const STRINGS: Record<Lang, Strings> = { fr, en };

export function langFromPath(pathname: string): Lang {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "fr";
}
