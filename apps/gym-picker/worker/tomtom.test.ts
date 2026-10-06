import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMatrix, toLegs, type MatrixCell } from './tomtom';

const summary = (seconds: number, delay = 0, meters = 1000) => ({
  lengthInMeters: meters,
  travelTimeInSeconds: seconds,
  trafficDelayInSeconds: delay,
});

describe('toLegs', () => {
  it('range chaque case à l’index de sa destination', () => {
    const cells: MatrixCell[] = [
      { originIndex: 0, destinationIndex: 1, routeSummary: summary(540, 60, 4200) },
      { originIndex: 0, destinationIndex: 0, routeSummary: summary(420) },
    ];
    expect(toLegs(cells, 2)).toEqual([
      { durationSec: 420, trafficDelaySec: 0, distanceM: 1000 },
      { durationSec: 540, trafficDelaySec: 60, distanceM: 4200 },
    ]);
  });

  it('met null pour une case en échec ou absente', () => {
    const cells: MatrixCell[] = [
      { originIndex: 0, destinationIndex: 0, detailedError: { code: 'NO_ROUTE_FOUND' } },
    ];
    expect(toLegs(cells, 2)).toEqual([null, null]);
  });

  it('ignore une case dont l’index sort de la liste', () => {
    const cells: MatrixCell[] = [{ originIndex: 0, destinationIndex: 5, routeSummary: summary(60) }];
    expect(toLegs(cells, 1)).toEqual([null]);
  });
});

describe('fetchMatrix', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('demande un trajet en voiture, départ maintenant, trafic en temps réel', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ data: [{ originIndex: 0, destinationIndex: 0, routeSummary: summary(300) }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const legs = await fetchMatrix('clé/secrète', { lat: 48.85, lng: 2.35 }, [{ lat: 48.86, lng: 2.36 }]);

    expect(legs).toEqual([{ durationSec: 300, trafficDelaySec: 0, distanceM: 1000 }]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.tomtom.com/routing/matrix/2?key=cl%C3%A9%2Fsecr%C3%A8te');
    expect(JSON.parse(init?.body as string)).toEqual({
      origins: [{ point: { latitude: 48.85, longitude: 2.35 } }],
      destinations: [{ point: { latitude: 48.86, longitude: 2.36 } }],
      options: { departAt: 'now', traffic: 'live', travelMode: 'car', routeType: 'fastest' },
    });
  });

  it('lève une TomTomError qui porte le statut HTTP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => new Response('quota', { status: 429 })),
    );
    await expect(fetchMatrix('k', { lat: 0, lng: 0 }, [])).rejects.toMatchObject({
      name: 'TomTomError',
      status: 429,
    });
  });
});
