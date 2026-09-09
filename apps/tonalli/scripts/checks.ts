/**
 * Vérifications des fonctions pures (dates, fuseaux, émotions).
 * Lancement : npm run checks
 *
 * Le cas France / Mexique est testé explicitement : c'est là que se cachent
 * les bugs de « jour » dans une app à deux bouts du monde.
 */
import {
  clockInTimeZone,
  dateKeyInTimeZone,
  daysInMonth,
  daysInYear,
  formatLongDate,
  formatOffset,
  isValidKey,
  monthGrid,
  offsetBetween,
  offsetMinutes,
  shiftMonth,
  weekdayInitials,
  yearMonthOfKey,
} from '../src/lib/dates.ts';
import { EMOTIONS, colorOf, isEmotionKey, readableTextOn } from '../src/lib/emotions.ts';

let failures = 0;
function check(label: string, condition: boolean, detail = '') {
  if (!condition) {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const PARIS = 'Europe/Paris';
const MEXICO = 'America/Mexico_City';

console.log('Fuseaux — France / Mexique');
{
  // 28 août 2026, 05 h 30 UTC : 07 h 30 à Paris (déjà le 28), 23 h 30 à
  // Mexico la veille (encore le 27). Deux cases de calendrier différentes,
  // et c'est correct : chacun voit sa propre journée.
  const instant = new Date('2026-08-28T05:30:00Z');
  check('Paris est le 28', dateKeyInTimeZone(instant, PARIS) === '2026-08-28', dateKeyInTimeZone(instant, PARIS));
  check('Mexico est le 27', dateKeyInTimeZone(instant, MEXICO) === '2026-08-27', dateKeyInTimeZone(instant, MEXICO));
  check('heure de Paris', clockInTimeZone(PARIS, instant) === '07:30', clockInTimeZone(PARIS, instant));
  check('heure de Mexico', clockInTimeZone(MEXICO, instant) === '23:30', clockInTimeZone(MEXICO, instant));

  // Le Mexique n'applique plus l'heure d'été depuis 2022 : le décalage avec
  // la France vaut donc 8 h l'été et 7 h l'hiver.
  const summer = offsetBetween(PARIS, MEXICO, new Date('2026-08-28T05:30:00Z'));
  const winter = offsetBetween(PARIS, MEXICO, new Date('2026-01-15T05:30:00Z'));
  check('décalage estival = 8 h', summer === 480, String(summer));
  check('décalage hivernal = 7 h', winter === 420, String(winter));
  check('libellé de décalage', formatOffset(summer, 'même heure') === '+8 h', formatOffset(summer, 'x'));
  check('libellé décalage nul', formatOffset(0, 'même heure') === 'même heure');
  check('libellé décalage à minutes', formatOffset(-330, 'x') === '−5 h 30', formatOffset(-330, 'x'));

  // Minuit pile : le moment où un `toISOString()` se tromperait de jour.
  const midnightParis = new Date('2026-08-27T22:00:00Z');
  check('minuit à Paris bascule au 28', dateKeyInTimeZone(midnightParis, PARIS) === '2026-08-28', dateKeyInTimeZone(midnightParis, PARIS));
  check('minuit à Paris = 00:00', clockInTimeZone(PARIS, midnightParis) === '00:00', clockInTimeZone(PARIS, midnightParis));
  check('au même instant Mexico est le 27', dateKeyInTimeZone(midnightParis, MEXICO) === '2026-08-27');

  check('offset Paris été', offsetMinutes(PARIS, new Date('2026-08-28T05:30:00Z')) === 120);
  check('offset Mexico', offsetMinutes(MEXICO, new Date('2026-08-28T05:30:00Z')) === -360);
  check('offset UTC', offsetMinutes('UTC', new Date()) === 0);
}

console.log('Calendrier');
{
  check('29 février 2026 invalide', !isValidKey('2026-02-29'));
  check('29 février 2024 valide', isValidKey('2024-02-29'));
  check('mois 13 invalide', !isValidKey('2026-13-01'));
  check('format court invalide', !isValidKey('26-01-01'));
  check('février 2026 = 28 jours', daysInMonth(2026, 1) === 28);
  check('février 2024 = 29 jours', daysInMonth(2024, 1) === 29);
  check('2024 = 366 jours', daysInYear(2024) === 366);
  check('2026 = 365 jours', daysInYear(2026) === 365);

  // 1er août 2026 = samedi -> 5 cases vides avant, lundi en première colonne.
  const grid = monthGrid(2026, 7);
  check('grille alignée lundi', grid.slice(0, 5).every((cell) => cell === null) && grid[5] === '2026-08-01');
  check('grille rectangulaire', grid.length % 7 === 0);
  check('31 jours en août', grid.filter(Boolean).length === 31);

  const next = shiftMonth({ year: 2026, month: 11 }, 1);
  check('passage d’année', next.year === 2027 && next.month === 0);
  check('clé -> année/mois', yearMonthOfKey('2026-08-28').month === 7);

  check('initiales FR', weekdayInitials('fr').length === 7);
  check('date longue FR', formatLongDate('2026-08-28', 'fr').includes('août'), formatLongDate('2026-08-28', 'fr'));
  check('date longue ES', formatLongDate('2026-08-28', 'es').includes('agosto'), formatLongDate('2026-08-28', 'es'));
}

console.log('Émotions');
{
  check('12 émotions', EMOTIONS.length === 12);
  check('clés uniques', new Set(EMOTIONS.map((e) => e.key)).size === 12);
  check('couleurs uniques', new Set(EMOTIONS.map((e) => e.color)).size === 12);
  check('hexadécimal valide', EMOTIONS.every((e) => /^#[0-9A-F]{6}$/.test(e.color)));
  check('couleur de la joie', colorOf('joy') === '#FFD93D');
  check('clé inconnue', colorOf('banana') === null && !isEmotionKey('banana'));
  check('texte sombre sur jaune', readableTextOn('#FFD93D') === '#2A2019');
  check('texte clair sur bordeaux', readableTextOn('#9B2226') === '#FFF7EB');
  check('texte sombre sur gris clair', readableTextOn('#D8D8D8') === '#2A2019');
}

if (failures > 0) {
  console.error(`\n${failures} vérification(s) en échec.`);
  process.exit(1);
}
console.log('\nToutes les vérifications passent.');
