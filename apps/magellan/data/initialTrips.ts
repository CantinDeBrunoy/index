// Voyages de démonstration — état initial de la carte pour un nouveau visiteur.
// Données fictives : les voyages saisis dans l'app restent dans le stockage local de l'appareil.
// Construit à partir d'une liste compacte ; chaque pays porte son alpha-3 (coloration),
// son alpha-2 (drapeau) et son nom français.

import type { Budget, Trip, TripStop } from '@/features/trips/types';

type CountryRef = { a3: string; a2: string; fr: string };

const C: Record<string, CountryRef> = {
  France: { a3: 'FRA', a2: 'fr', fr: 'France' },
  Japan: { a3: 'JPN', a2: 'jp', fr: 'Japon' },
  Iceland: { a3: 'ISL', a2: 'is', fr: 'Islande' },
  Peru: { a3: 'PER', a2: 'pe', fr: 'Pérou' },
  'United Kingdom': { a3: 'GBR', a2: 'gb', fr: 'Royaume-Uni' },
  Spain: { a3: 'ESP', a2: 'es', fr: 'Espagne' },
  Netherlands: { a3: 'NLD', a2: 'nl', fr: 'Pays-Bas' },
  Morocco: { a3: 'MAR', a2: 'ma', fr: 'Maroc' },
  'South Africa': { a3: 'ZAF', a2: 'za', fr: 'Afrique du Sud' },
  Australia: { a3: 'AUS', a2: 'au', fr: 'Australie' },
  Italy: { a3: 'ITA', a2: 'it', fr: 'Italie' },
  Czechia: { a3: 'CZE', a2: 'cz', fr: 'Tchéquie' },
  Norway: { a3: 'NOR', a2: 'no', fr: 'Norvège' },
};

const PALETTE = [
  '#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#f78c6b',
  '#b388eb', '#ff9f1c', '#2ec4b6', '#e71d36', '#8ac926',
];

const b = (hotel: number, food: number, activities: number, transport: number): Budget => ({
  hotel,
  food,
  activities,
  transport,
});

// Détails par ville (durée en jours, personnes, budget), pour montrer les fiches étape.
// Le budget n'est renseigné que lorsqu'il y a eu des dépenses notées.
const D: Record<string, { days?: number; people?: string[]; budget?: Budget }> = {
  Tokyo: { days: 5, people: ['Alex', 'Sam'], budget: b(520, 260, 180, 90) },
  Kyoto: { days: 3, people: ['Alex', 'Sam'], budget: b(300, 140, 120, 40) },
  Osaka: { days: 2, people: ['Alex', 'Sam'], budget: b(190, 120, 60, 30) },
  Reykjavik: { days: 2, people: ['Camille'], budget: b(240, 110, 60, 0) },
  Vík: { days: 2, people: ['Camille'], budget: b(180, 70, 0, 160) },
  Höfn: { days: 1, people: ['Camille'], budget: b(120, 45, 90, 0) },
  Cusco: { days: 4, people: ['Noa', 'Jules'], budget: b(160, 90, 210, 70) },
  Barcelone: { days: 3, people: ['family'] },
  Annecy: { days: 7, people: ['family'] },
  Marrakech: { days: 4, people: ['Alex'], budget: b(200, 80, 60, 140) },
};

let stopSeq = 0;
let tripSeq = 0;

function stop(name: string, country: string, lat: number, lng: number, date?: string): TripStop {
  const c = C[country];
  const s: TripStop = {
    id: `s${++stopSeq}`,
    name,
    country: c.a3,
    alpha2: c.a2,
    countryName: c.fr,
    lat,
    lng,
  };
  if (date && date !== 'none') s.date = date;
  const extra = D[name];
  if (extra) {
    if (extra.days != null) s.days = extra.days;
    if (extra.people) s.people = extra.people;
    if (extra.budget) s.budget = extra.budget;
  }
  return s;
}

function trip(name: string, stops: TripStop[]): Trip {
  tripSeq += 1;
  return { id: `t${tripSeq}`, name, color: PALETTE[tripSeq % PALETTE.length], stops };
}

export const INITIAL_TRIPS: Trip[] = [
  // — Road trips (étapes reliées) —
  trip('Japon', [
    stop('Tokyo', 'Japan', 35.6895, 139.69171, 'April 2025'),
    stop('Kyoto', 'Japan', 35.02107, 135.75385, 'April 2025'),
    stop('Osaka', 'Japan', 34.69374, 135.50218, 'April 2025'),
  ]),
  trip('Islande', [
    stop('Reykjavik', 'Iceland', 64.13548, -21.89541, 'July 2024'),
    stop('Vík', 'Iceland', 63.41866, -19.00602, 'July 2024'),
    stop('Höfn', 'Iceland', 64.25386, -15.21225, 'July 2024'),
  ]),
  trip('Pérou', [
    stop('Lima', 'Peru', -12.04318, -77.02824, 'October 2023'),
    stop('Cusco', 'Peru', -13.52264, -71.96734, 'October 2023'),
    stop('Arequipa', 'Peru', -16.39889, -71.535, 'October 2023'),
  ]),
  trip('Écosse', [
    stop('Édimbourg', 'United Kingdom', 55.95206, -3.19648, 'May 2023'),
    stop('Inverness', 'United Kingdom', 57.47908, -4.22398, 'May 2023'),
    stop('Portree', 'United Kingdom', 57.41267, -6.19581, 'May 2023'),
  ]),

  // — Voyages à une étape —
  trip('Barcelone', [stop('Barcelone', 'Spain', 41.38879, 2.15899, 'June 2022')]),
  trip('Amsterdam', [stop('Amsterdam', 'Netherlands', 52.37403, 4.88969, 'March 2022')]),
  trip('Marrakech', [stop('Marrakech', 'Morocco', 31.63416, -7.99994, 'February 2024')]),
  trip('Le Cap', [stop('Le Cap', 'South Africa', -33.92584, 18.42322, 'December 2024')]),
  trip('Sydney', [stop('Sydney', 'Australia', -33.86785, 151.20732, 'January 2025')]),
  trip('Annecy', [stop('Annecy', 'France', 45.90878, 6.12565, 'August 2021')]),
  trip('Bordeaux', [stop('Bordeaux', 'France', 44.84044, -0.5805, 'September 2022')]),
  trip('Naples', [stop('Naples', 'Italy', 40.85216, 14.26811, 'May 2024')]),
  trip('Prague', [stop('Prague', 'Czechia', 50.08804, 14.42076, 'November 2023')]),
  trip('Oslo', [stop('Oslo', 'Norway', 59.91273, 10.74609, 'September 2025')]),
];
