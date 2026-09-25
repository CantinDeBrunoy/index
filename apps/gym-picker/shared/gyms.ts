import type { LatLng } from './api';

export type Gym = LatLng & {
  id: string;
  name: string;
  /** Affichage seulement : le calcul et les liens Waze utilisent `lat`/`lng`. */
  address: string;
};

/**
 * Les salles comparées. Le point GPS sert de point d'arrivée au calcul et à
 * Waze : mieux vaut le poser sur l'entrée ou le parking qu'au milieu du
 * bâtiment. (Dans Google Maps, un appui long sur le lieu affiche ses
 * coordonnées.)
 *
 * TODO: remplacer ces exemples par les 4 vraies salles.
 */
export const GYMS: readonly Gym[] = [
  { id: 'a', name: 'Salle A', address: 'Exemple — République, Paris', lat: 48.8674, lng: 2.3636 },
  { id: 'b', name: 'Salle B', address: 'Exemple — Bastille, Paris', lat: 48.8532, lng: 2.3691 },
  { id: 'c', name: 'Salle C', address: 'Exemple — Nation, Paris', lat: 48.8484, lng: 2.3959 },
  { id: 'd', name: 'Salle D', address: 'Exemple — Gare de Lyon, Paris', lat: 48.8443, lng: 2.3743 },
];
