/**
 * Textes de l'interface. Le français est la langue de référence ; une clé absente en
 * anglais retombe sur le français, ce qui permet de traduire le site au fil de l'eau.
 */

export const LOCALES = ["fr", "en"] as const;
export type Lang = (typeof LOCALES)[number];
export const DEFAULT_LANG: Lang = "fr";

const fr = {
  "site.title": "INDEX — Cantin Roquier",
  "site.description":
    "Le catalogue numéroté des projets de Cantin Roquier, développeur fullstack et mobile : démos, code et statut en direct.",
  "site.skip": "Aller au contenu",

  "hero.name": "Cantin Roquier",
  "hero.role": "Développeur fullstack & mobile",
  "hero.place": "Brunoy, Île-de-France",
  "hero.intro": "Je construis des interfaces qui comptent.",
  "hero.entries": "entrées",
  "hero.scroll": "Parcourir l'index",

  "index.title": "Index des projets",
  "index.entry": "entrée",
  "index.entries": "entrées",

  "entry.year": "Année",
  "entry.status": "Statut",
  "entry.stack": "Stack",
  "entry.host": "Hébergement",
  "entry.demo": "Démo",
  "entry.code": "Code",
  "entry.download": "Télécharger",
  "entry.open": "Ouvrir la fiche",
  "entry.shot": "Capture d'écran de",
  "entry.noDemo": "Pas de démo en ligne",

  "status.pending": "Sondage…",
  "status.online": "En ligne",
  "status.asleep": "En veille",
  "status.offline": "Hors ligne",
  "status.unknown": "Non sondé",
  "status.archive": "Archive",
  "status.desktop": "Bureau",

  "detail.back": "Retour à l'index",
  "detail.prev": "Entrée précédente",
  "detail.next": "Entrée suivante",
  "detail.shots": "Captures",
  "detail.desktop": "Ordinateur",
  "detail.mobile": "Mobile",

  "footer.contact": "Contact",
  "footer.source": "Code source d'INDEX",
  "footer.styleguide": "Charte graphique",
  "footer.status": "Statuts sondés toutes les 5 minutes, côté serveur.",

  "notFound.title": "Entrée introuvable",
  "notFound.text": "Cette page ne figure pas dans l'index.",
} as const;

export type UiKey = keyof typeof fr;

const en: Partial<Record<UiKey, string>> = {
  "hero.role": "Fullstack & mobile developer",
  "hero.intro": "I build interfaces that matter.",
};

export const ui: Record<Lang, Partial<Record<UiKey, string>>> = { fr, en };

export function useTranslations(lang: Lang) {
  return (key: UiKey): string => ui[lang][key] ?? fr[key];
}

export function langFromUrl(url: URL): Lang {
  const [, first] = url.pathname.split("/");
  return LOCALES.includes(first as Lang) ? (first as Lang) : DEFAULT_LANG;
}
