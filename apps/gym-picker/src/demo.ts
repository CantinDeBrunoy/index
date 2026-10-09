import type { EtaResponse, GymEta, LatLng } from '../shared/api';
import type { Gym } from '../shared/gyms';

// Mode démo, pour filmer l'app sans montrer de vraies données : les vraies
// salles, et plus encore le domicile, diraient où l'on habite. Il s'active par
// l'adresse (`/?demo`) et tient le temps de l'onglet (sessionStorage), même
// après un rechargement. Tout y est inventé, au centre de Paris : la position
// ne vient jamais du GPS, les temps ne viennent jamais du Worker (une page
// servie seule, sans API, suffit), et le vrai domicile n'est ni lu ni écrasé.
//
// `?demo=domicile` joue le GPS en panne : les trajets partent du domicile de
// secours, déjà enregistré.

export type DemoMode = 'gps' | 'domicile';

const STORAGE_KEY = 'gym-picker:demo';

export const DEMO: DemoMode | null = readDemoMode();

/** Point de départ inventé : le parvis de l'Hôtel de Ville. Sert aussi de domicile. */
export const DEMO_POSITION: LatLng = { lat: 48.8566, lng: 2.3522 };

/**
 * Quatre salles fictives sur des places publiques, à des distances voisines
 * du départ : comme pour les vraies, c'est le trafic qui les départage.
 */
export const DEMO_GYMS: readonly Gym[] = [
  { id: 'demo-republique', name: 'République', address: 'Place de la République, Paris', lat: 48.8674, lng: 2.3636 },
  { id: 'demo-bastille', name: 'Bastille', address: 'Place de la Bastille, Paris', lat: 48.8532, lng: 2.3692 },
  { id: 'demo-odeon', name: 'Odéon', address: 'Carrefour de l’Odéon, Paris', lat: 48.852, lng: 2.339 },
  { id: 'demo-palais-royal', name: 'Palais-Royal', address: 'Place du Palais-Royal, Paris', lat: 48.8638, lng: 2.3364 },
];

// La route fait un détour par rapport au vol d'oiseau, et Paris roule lentement
// même dégagé.
const DETOUR = 1.5;
const FREE_FLOW_MPS = 18 / 3.6;
// Au pire, les bouchons ajoutent 120 % du temps à vide.
const MAX_CONGESTION = 1.2;

/**
 * Les temps de la `search`-ième recherche de la page (0, 1, 2…), triés comme
 * ceux du Worker. Chaque salle suit sa propre vague de bouchons, décalée de
 * celle des autres : d'une actualisation à l'autre, les minutes changent et la
 * gagnante aussi. Même recherche, mêmes temps : le film se rejoue à l'identique.
 */
export function demoEtas(origin: LatLng, gyms: readonly Gym[], search: number): GymEta[] {
  const etas = gyms.map((gym, i) => {
    const distanceM = Math.round(crowFlightM(origin, gym) * DETOUR);
    const freeFlowSec = distanceM / FREE_FLOW_MPS;
    const congestion = (1 + Math.sin(search * 2.2 + i * 1.7)) / 2;
    const trafficDelaySec = Math.round(freeFlowSec * MAX_CONGESTION * congestion);
    const leg = { durationSec: Math.round(freeFlowSec) + trafficDelaySec, trafficDelaySec, distanceM };
    return { gymId: gym.id, leg };
  });
  return etas.toSorted((a, b) => a.leg.durationSec - b.leg.durationSec);
}

let searches = 0;

/** Ce que répondrait POST /api/etas, après le temps d'un aller-retour. */
export async function demoEtaResponse(origin: LatLng, signal: AbortSignal): Promise<EtaResponse> {
  await pause(700, signal);
  return { etas: demoEtas(origin, DEMO_GYMS, searches++), computedAt: new Date().toISOString() };
}

/** Attend `ms`, ou lâche tout si la recherche est annulée. */
export function pause(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

/** Distance à vol d'oiseau (haversine), en mètres. */
function crowFlightM(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

function readDemoMode(): DemoMode | null {
  // Sous Node (tests), pas d'adresse : pas de démo.
  if (typeof location === 'undefined') return null;
  const asked = new URLSearchParams(location.search).get('demo');
  try {
    if (asked !== null) sessionStorage.setItem(STORAGE_KEY, asked);
    return toMode(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    // Stockage indisponible : la démo ne tient qu'à l'adresse.
    return toMode(asked);
  }
}

function toMode(value: string | null): DemoMode | null {
  if (value === null) return null;
  return value === 'domicile' ? 'domicile' : 'gps';
}
