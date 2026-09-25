import { describe, expect, it } from 'vitest';
import type { GymEta } from '../shared/api';
import { rankEtas } from './rank';

const eta = (gymId: string, durationSec: number | null): GymEta => ({
  gymId,
  leg: durationSec === null ? null : { durationSec, trafficDelaySec: 0, distanceM: 0 },
});

const ids = (etas: GymEta[]) => etas.map(({ gymId }) => gymId);

describe('rankEtas', () => {
  it('classe du trajet le plus court au plus long', () => {
    expect(ids(rankEtas([eta('a', 540), eta('b', 420), eta('c', 600)]))).toEqual(['b', 'a', 'c']);
  });

  it('met les salles sans itinéraire en dernier, dans leur ordre d’origine', () => {
    const etas = [eta('a', null), eta('b', 600), eta('c', null), eta('d', 300)];
    expect(ids(rankEtas(etas))).toEqual(['d', 'b', 'a', 'c']);
  });

  it('ne modifie pas le tableau reçu', () => {
    const etas = [eta('a', 600), eta('b', 300)];
    rankEtas(etas);
    expect(ids(etas)).toEqual(['a', 'b']);
  });
});
