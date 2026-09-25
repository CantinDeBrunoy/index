// Contrat entre la page et le Worker. Types et fonctions purs uniquement :
// ce dossier est compilé à la fois avec les types du navigateur et du Worker.

/** Point GPS en degrés décimaux (WGS84). C'est aussi le corps de POST /api/etas. */
export type LatLng = { lat: number; lng: number };

/** Trajet en voiture avec le trafic du moment. */
export type Leg = {
  durationSec: number;
  /** Part de `durationSec` due au trafic, par rapport à une route dégagée. */
  trafficDelaySec: number;
  distanceM: number;
};

/** `leg` vaut `null` quand aucun itinéraire n'a été trouvé vers cette salle. */
export type GymEta = { gymId: string; leg: Leg | null };

/** Réponse de POST /api/etas : de la salle la plus rapide à la plus lente. */
export type EtaResponse = {
  etas: GymEta[];
  computedAt: string;
};

export type ApiError = { error: string };

export function isLatLng(value: unknown): value is LatLng {
  if (typeof value !== 'object' || value === null) return false;
  const { lat, lng } = value as Record<string, unknown>;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}
