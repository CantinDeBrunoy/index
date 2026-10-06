export type Locale = "fr" | "en";

/** Texte traduit : le français est obligatoire, l'anglais viendra plus tard. */
export type Localized = { fr: string } & Partial<Record<Exclude<Locale, "fr">, string>>;

/**
 * - `web` : app en ligne, avec un statut live.
 * - `desktop` : logiciel à télécharger, sans statut live.
 * - `archive` : projet ancien, sans démo surveillée.
 */
export type ProjectKind = "web" | "desktop" | "archive";

/** Ce que le portfolio (statut live) et keep-alive.yml vérifient pour une entrée. */
export type Monitor =
  /** L'URL répond (2xx ou 3xx). */
  | { kind: "http"; url: string }
  /**
   * Vraie requête PostgREST sur une base Supabase : elle compte comme activité et empêche
   * la mise en pause du projet gratuit après 7 jours d'inactivité.
   */
  | { kind: "supabase"; url: string; table: string; anonKeyEnv: string }
  /** Un JSON produit par un cron contient une date récente : le cron tourne toujours. */
  | { kind: "freshness"; url: string; field: string; maxAgeHours: number };

export interface ProjectInput {
  /** Identifiant d'URL : /005-magellan. */
  slug: string;
  name: string;
  /** Début du projet (AAAA-MM) : il fixe l'ordre chronologique, donc le numéro. */
  started: `${number}-${number}`;
  kind: ProjectKind;
  pitch: Localized;
  stack: readonly string[];
  links: {
    demo?: string | undefined;
    code?: string | undefined;
    download?: string | undefined;
  };
  /** Dossier dans apps/ quand le projet vit dans le monorepo. */
  app?: string;
  /** Hébergement de la démo, pour la doc et la fiche. */
  host?: string;
  monitors?: readonly Monitor[];
}

export interface Project extends ProjectInput {
  /** Numéro d'entrée sur 3 chiffres, attribué d'après la position dans la liste. */
  number: string;
  /** Chemin de la fiche sur le portfolio, ex. /005-magellan. */
  path: string;
  year: number;
  monitors: readonly Monitor[];
}
