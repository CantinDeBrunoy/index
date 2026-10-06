import type { LatLng } from './api';

export type Gym = LatLng & {
  id: string;
  name: string;
  /** Affichage seulement : le calcul et les liens Waze utilisent `lat`/`lng`. */
  address: string;
};

/**
 * Les salles comparées : quatre Fitness Park. Le point GPS sert d'arrivée au
 * calcul et à Waze : mieux vaut le poser sur l'entrée ou le parking qu'au
 * milieu du bâtiment. (Dans Google Maps, un appui long sur le lieu affiche ses
 * coordonnées.)
 *
 * Noms courts : sur un iPhone, le nom partage sa ligne avec le temps de
 * trajet. Adresses tirées de fitnesspark.fr, points GPS d'OpenStreetMap et de
 * la Base Adresse Nationale (septembre 2026).
 */
export const GYMS: readonly Gym[] = [
  // Bâtiment « Fitness Park » cartographié dans OpenStreetMap.
  { id: 'montgeron', name: 'Montgeron', address: 'ZA Maurice Garin, Montgeron', lat: 48.71721, lng: 2.4418 },
  // Officiellement « Quincy-sous-Sénart », à côté du Cora Val d'Yerres de
  // Boussy. Le bâtiment n'est pas cartographié : point de la Base Adresse
  // Nationale au milieu de la rue (300 m de long).
  {
    id: 'boussy',
    name: 'Boussy',
    address: '52 rue de la Marnière, Quincy-sous-Sénart',
    lat: 48.68335,
    lng: 2.53725,
  },
  // Bâtiment « Fitness Park » cartographié dans OpenStreetMap, ZAC de la Haie Passart.
  { id: 'brie', name: 'Brie', address: '14 bis rue Gustave Eiffel, Brie-Comte-Robert', lat: 48.70345, lng: 2.59859 },
  // Adresse officielle du centre commercial, dont la salle fait partie.
  { id: 'lieusaint', name: 'Lieusaint', address: 'Westfield Carré Sénart, Lieusaint', lat: 48.61318, lng: 2.54853 },
];
