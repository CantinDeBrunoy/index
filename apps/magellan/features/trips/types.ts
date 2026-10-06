// Modèle de données des voyages — cf. CLAUDE.md › Modèle de données.
//
// L'objet central est le Voyage (road trip) : une suite ordonnée d'étapes (villes).
// Une ville unique = un voyage à une seule étape. Un pays est « visité » dès qu'une
// étape s'y trouve.

/** Code pays ISO 3166-1 alpha-3, ex. "FRA", "JPN". */
export type CountryCode = string;

/** Budget d'une étape, en euros, par poste. */
export type Budget = {
  hotel: number;
  food: number;
  activities: number;
  transport: number;
};

/**
 * Photo d'une étape : une référence vers un fichier du dossier photos connecté
 * (ex. « iCloud Photos » synchronisé sur le PC), pas une copie de l'image.
 */
export type PhotoRef = {
  /** Chemin relatif dans le dossier connecté — sert aussi d'identifiant. */
  path: string;
  /** Date de prise de vue (ISO 8601), si on a pu la retrouver. */
  takenAt?: string;
  lat?: number;
  lng?: number;
};

/** Une étape d'un voyage : une ville positionnée par ses coordonnées. */
export type TripStop = {
  id: string;
  name: string; // ville
  country: CountryCode; // alpha-3, pour colorer le pays sur le globe
  alpha2: string; // alpha-2 minuscule, pour l'image du drapeau (flagcdn)
  countryName: string; // nom du pays (fr), pour l'affichage
  lat: number;
  lng: number;
  date?: string; // période de la visite (texte libre)
  days?: number; // durée en jours
  people?: string[]; // avec qui
  budget?: Budget; // dépenses par poste
  photos?: PhotoRef[]; // photos de l'étape (triées par date de prise de vue)
};

/** Un voyage : une suite ordonnée d'étapes, reliées par un tracé sur le globe. */
export type Trip = {
  id: string;
  name: string;
  stops: TripStop[];
  color?: string; // couleur du tracé/arc sur le globe
};

/** État complet des voyages, persisté localement. */
export type TripsState = {
  trips: Trip[];
};
