import type { GymEta } from '../shared/api';

/** Du trajet le plus court au plus long ; les salles sans itinéraire en dernier. */
export function rankEtas(etas: readonly GymEta[]): GymEta[] {
  return etas.toSorted((a, b) => {
    if (!a.leg || !b.leg) return Number(!a.leg) - Number(!b.leg);
    return a.leg.durationSec - b.leg.durationSec;
  });
}
