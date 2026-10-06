import type { LatLng } from '../shared/api';

// Depuis une web app installée sur l'écran d'accueil d'un iPhone, les liens
// https « universels » (waze.com/ul, google.com/maps) s'ouvrent dans un
// navigateur intégré au lieu de l'app. Les schémas `waze://` et
// `comgooglemaps://` ouvrent l'app directement — mais ne font rien si elle
// n'est pas installée, d'où les liens https partout ailleurs.

/** iPhone, ou iPad (iPadOS se présente comme un Mac tactile). */
export function isIos(nav: Pick<Navigator, 'userAgent' | 'maxTouchPoints'> = navigator): boolean {
  return /iPhone|iPad|iPod/.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1);
}

/** Lance la navigation Waze vers ce point. */
export function wazeUrl({ lat, lng }: LatLng, ios = isIos()): string {
  const query = `ll=${lat},${lng}&navigate=yes`;
  return ios ? `waze://?${query}` : `https://waze.com/ul?${query}`;
}

/** Itinéraire en voiture vers ce point dans Google Maps. */
export function googleMapsUrl({ lat, lng }: LatLng, ios = isIos()): string {
  return ios
    ? `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}
