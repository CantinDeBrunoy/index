export type IndexBarCorner = "bottom-left" | "bottom-right" | "top-left" | "top-right";

export interface IndexBarOptions {
  /** URL de la fiche du projet sur le portfolio. Sans URL, rien n'est affiché. */
  href: string | undefined;
  /** Numéro d'entrée affiché à côté de « ← Index » (ex. "008"). */
  entry?: string | undefined;
  /** Coin de l'écran, choisi pour ne masquer aucun contrôle de l'app. */
  corner?: IndexBarCorner | undefined;
}

/** Ajoute (ou met à jour) l'onglet « ← Index ». Renvoie null hors navigateur ou en PWA installée. */
export function mountIndexBar(options: IndexBarOptions): HTMLElement | null;
