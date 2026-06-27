// Modèle de données des voyages — cf. CLAUDE.md › Modèle de données.
//
// L'objet central est le Voyage (road trip) : une suite ordonnée d'étapes (villes).
// Une ville unique = un voyage à une seule étape. Un pays est « visité » dès qu'une
// étape s'y trouve.

/** Code pays ISO 3166-1 alpha-3, ex. "FRA", "JPN". */
export type CountryCode = string;

/** Une étape d'un voyage : une ville positionnée par ses coordonnées. */
export type TripStop = {
  id: string;
  name: string;
  country: CountryCode; // ISO3 du pays
  lat: number;
  lng: number;
  date?: string; // ISO 8601, optionnel
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
