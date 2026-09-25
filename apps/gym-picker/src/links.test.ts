import { describe, expect, it } from 'vitest';
import { googleMapsUrl, isIos, wazeUrl } from './links';

const gym = { lat: 48.8674, lng: 2.3636 };

describe('wazeUrl', () => {
  it('ouvre l’app par son schéma sur iOS', () => {
    expect(wazeUrl(gym, true)).toBe('waze://?ll=48.8674,2.3636&navigate=yes');
  });

  it('passe par le lien universel ailleurs', () => {
    expect(wazeUrl(gym, false)).toBe('https://waze.com/ul?ll=48.8674,2.3636&navigate=yes');
  });
});

describe('googleMapsUrl', () => {
  it('ouvre l’app par son schéma sur iOS', () => {
    expect(googleMapsUrl(gym, true)).toBe('comgooglemaps://?daddr=48.8674,2.3636&directionsmode=driving');
  });

  it('passe par l’URL Maps universelle ailleurs', () => {
    expect(googleMapsUrl(gym, false)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=48.8674,2.3636&travelmode=driving',
    );
  });
});

describe('isIos', () => {
  const macUserAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';

  it.each([
    {
      device: 'un iPhone',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
      maxTouchPoints: 5,
      expected: true,
    },
    { device: 'un iPad, qui se présente comme un Mac tactile', userAgent: macUserAgent, maxTouchPoints: 5, expected: true },
    { device: 'un Mac', userAgent: macUserAgent, maxTouchPoints: 0, expected: false },
    {
      device: 'un Android',
      userAgent:
        'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
      maxTouchPoints: 5,
      expected: false,
    },
  ])('reconnaît $device', ({ userAgent, maxTouchPoints, expected }) => {
    expect(isIos({ userAgent, maxTouchPoints })).toBe(expected);
  });
});
