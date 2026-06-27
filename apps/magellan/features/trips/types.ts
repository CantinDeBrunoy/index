// Modèle de données des voyages — cf. CLAUDE.md › Modèle de données.

/** Code pays ISO 3166-1 alpha-3, ex. "FRA", "JPN". */
export type CountryCode = string;

/** Une ville visitée, positionnée par ses coordonnées. */
export type VisitedCity = {
  id: string;
  name: string;
  country: CountryCode; // ISO3 du pays
  lat: number;
  lng: number;
  date?: string; // ISO 8601, optionnel
};

/** État complet des voyages, persisté localement. */
export type TripsState = {
  visitedCountries: CountryCode[];
  cities: VisitedCity[];
};
