import { describe, expect, it } from 'vitest';
import { GYMS } from '../shared/gyms';
import { DEMO, DEMO_GYMS, DEMO_POSITION, demoEtas } from './demo';

const winner = (search: number) => demoEtas(DEMO_POSITION, DEMO_GYMS, search)[0]?.gymId;

it('reste éteint sans adresse (sous Node)', () => {
  expect(DEMO).toBeNull();
});

describe('DEMO_GYMS', () => {
  it('ne reprend aucune vraie salle', () => {
    for (const fake of DEMO_GYMS) {
      for (const real of GYMS) {
        expect(fake.id).not.toBe(real.id);
        expect(fake.name).not.toBe(real.name);
        expect(Math.hypot(fake.lat - real.lat, fake.lng - real.lng)).toBeGreaterThan(0.1);
      }
    }
  });

  it('reste dans Paris intra-muros', () => {
    for (const { lat, lng } of [...DEMO_GYMS, DEMO_POSITION]) {
      expect(lat).toBeGreaterThan(48.815);
      expect(lat).toBeLessThan(48.902);
      expect(lng).toBeGreaterThan(2.224);
      expect(lng).toBeLessThan(2.47);
    }
  });
});

describe('demoEtas', () => {
  it('donne un trajet plausible par salle, du plus court au plus long', () => {
    const etas = demoEtas(DEMO_POSITION, DEMO_GYMS, 0);
    expect(etas.map(({ gymId }) => gymId).toSorted()).toEqual(DEMO_GYMS.map(({ id }) => id).toSorted());
    const durations = etas.map(({ leg }) => leg?.durationSec ?? Number.NaN);
    expect(durations).toEqual(durations.toSorted((a, b) => a - b));
    for (const { leg } of etas) {
      expect(leg?.durationSec).toBeGreaterThan(3 * 60);
      expect(leg?.durationSec).toBeLessThan(30 * 60);
      expect(leg?.trafficDelaySec).toBeLessThan(leg?.durationSec ?? 0);
    }
  });

  it('change de gagnante d’une actualisation à l’autre', () => {
    for (const search of [0, 1, 2, 3]) {
      expect(winner(search + 1)).not.toBe(winner(search));
    }
  });

  it('rejoue les mêmes temps pour la même recherche', () => {
    expect(demoEtas(DEMO_POSITION, DEMO_GYMS, 5)).toEqual(demoEtas(DEMO_POSITION, DEMO_GYMS, 5));
  });
});
