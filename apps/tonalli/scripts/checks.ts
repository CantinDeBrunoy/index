/**
 * Vérifications des fonctions pures (dates, fuseaux, émotions).
 * Lancement : npm run checks
 *
 * Le cas France / Mexique est testé explicitement : c'est là que se cachent
 * les bugs de « jour » dans une app à deux bouts du monde.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  clockInTimeZone,
  dateKeyInTimeZone,
  daysInMonth,
  daysInYear,
  formatInstant,
  formatLongDate,
  formatOffset,
  isValidKey,
  monthGrid,
  offsetBetween,
  offsetMinutes,
  shiftDay,
  shiftMonth,
  streakOf,
  weekdayInitials,
  yearMonthOfKey,
} from '../src/lib/dates.ts';
import { coverCrop, isDenial, openCamera } from '../src/lib/camera.ts';
import { BUBBLE_COUNT, BURST_MS, REACTIONS, bubbles, emojiOf, isReactionKey } from '../src/lib/reactions.ts';
import { DEFAULT_STREAK_SYMBOL, STREAK_SYMBOLS, isStreakSymbolKey, symbolOf } from '../src/lib/streak.ts';
import {
  BLOB_SLOTS,
  BLOOM_MS,
  DROP_SLOT,
  DROPLET,
  PHASES,
  REVEAL,
  REVEAL_MS,
  RINGS,
  SEED,
  gestureOf,
  inkFrame,
  inkPlan,
  revealFrame,
  revealPlan,
} from '../src/lib/ink.ts';
import { INSET_MARGIN, NUDGE, asFraction, clampToFrame, nudgeOffset } from '../src/lib/inset.ts';
import { BODY_PATH, LOGO_SIZE, MASKABLE_FIT, faviconSvg, logoGeometry, type LogoVariant } from '../src/lib/logo.ts';
import { sceneFor, sheetsOf } from '../src/lib/duo/index.ts';
import {
  ACCESSORY_PIECES,
  BODY_ACCESSORIES,
  FACE_ACCESSORIES,
  HEAD_ACCESSORIES,
  MOTIFS,
  OUTFIT_CATEGORIES,
  POSES,
  isLying,
  mouthPath,
  outfitOf,
  poseOf,
} from '../src/lib/character.ts';
import { fr } from '../src/locales/fr.ts';
import { es } from '../src/locales/es.ts';
import {
  DEFAULT_INTENSITY,
  EMOTIONS,
  INTENSITIES,
  MIN_TEXT_CONTRAST,
  colorOf,
  intensityOf,
  isEmotionKey,
  isIntensity,
  readableTextOn,
  shadeOf,
  textContrastOn,
} from '../src/lib/emotions.ts';

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

console.log('Repère de build');
{
  // Un instant réel, pas une journée : c'est le seul endroit de l'app où une
  // conversion vers l'heure de qui regarde est la bonne réponse.
  const stamped = formatInstant('2026-09-18T21:15:00Z', 'fr');
  check('un horodatage se formate', typeof stamped === 'string' && stamped.length > 0, String(stamped));

  // Le repère sert à diagnostiquer : il ne doit jamais devenir le bug qu'il
  // aide à traquer. « Invalid Date » affiché en bas des réglages serait pire
  // que rien.
  check('une chaîne illisible rend null', formatInstant('pas une date', 'fr') === null);
  check('une chaîne vide rend null', formatInstant('', 'fr') === null);
}

console.log('Émotions — crans d’intensité');
{
  // Le cran « franc » vaut EXACTEMENT la couleur d'origine : c'est ce qui rend
  // les nuances rétrocompatibles. Une journée écrite avant ce changement reste
  // valide, et devient rétroactivement une « franche ». Si cette égalité
  // tombait, la nouvelle clé étrangère rejetterait des lignes existantes.
  for (const emotion of EMOTIONS) {
    check(
      `« ${emotion.key} » franc est la couleur d'origine`,
      shadeOf(emotion.key, 'plain') === colorOf(emotion.key),
      `${shadeOf(emotion.key, 'plain')} ≠ ${colorOf(emotion.key)}`,
    );
  }

  check('le cran par défaut est le franc', DEFAULT_INTENSITY === 'plain');
  check('isIntensity reconnaît les trois crans', INTENSITIES.every(isIntensity));
  check('isIntensity rejette le reste', !isIntensity('moyen') && !isIntensity(null));
  check('une émotion inconnue ne rend rien', shadeOf('licorne', 'light') === null);

  // Trente-six couleurs, toutes distinctes : deux crans qui rendraient le même
  // code rendraient l'intensité impossible à relire depuis une entrée.
  const all = EMOTIONS.flatMap((e) => INTENSITIES.map((i) => shadeOf(e.key, i)!));
  check('36 couleurs', all.length === 36, String(all.length));
  check('toutes distinctes', new Set(all).size === 36, String(new Set(all).size));

  // L'intensité n'est pas stockée : elle se relit du couple (émotion, couleur).
  // L'aller-retour doit donc être exact pour les 36.
  for (const emotion of EMOTIONS) {
    for (const level of INTENSITIES) {
      check(
        `aller-retour ${emotion.key}/${level}`,
        intensityOf(emotion.key, shadeOf(emotion.key, level)!) === level,
      );
    }
  }
  check('une couleur étrangère ne rend aucun cran', intensityOf('joy', '#123456') === null);

  // Le plancher de contraste ne doit pas descendre : c'est la garantie que les
  // libellés restent lisibles sur toute la palette, nuances comprises. Des
  // mélanges plus timides faisaient tomber les crans denses dans le creux où
  // une couleur ne tranche ni sur le crème ni sur le brun.
  let floor = Infinity;
  let worst = '';
  for (const emotion of EMOTIONS) {
    for (const level of INTENSITIES) {
      const color = shadeOf(emotion.key, level)!;
      const contrast = textContrastOn(color);
      if (contrast < floor) {
        floor = contrast;
        worst = `${emotion.key}/${level} ${color}`;
      }
      check(`${emotion.key}/${level} a une encre`, Boolean(readableTextOn(color)));
    }
  }
  check(
    'le plancher de contraste tient sur les 36 couleurs',
    floor >= MIN_TEXT_CONTRAST,
    `${floor.toFixed(2)} < ${MIN_TEXT_CONTRAST} (${worst})`,
  );

  // La base doit connaître exactement les mêmes couples. Une nuance retouchée
  // ici et pas en migration serait refusée à l'écriture par la clé étrangère,
  // sans que rien ne le dise avant la production.
  const sql = readFileSync(new URL('../supabase/migrations/0010_emotion_intensity.sql', import.meta.url), 'utf8');
  const init = readFileSync(new URL('../supabase/migrations/0001_init.sql', import.meta.url), 'utf8');
  for (const emotion of EMOTIONS) {
    for (const level of INTENSITIES) {
      const row = `('${emotion.key}', '${level}', '${shadeOf(emotion.key, level)}')`;
      check(`la migration connaît ${emotion.key}/${level}`, sql.includes(row), row);
      check(`le schéma initial connaît ${emotion.key}/${level}`, init.includes(row), row);
    }
  }
}

console.log('Série — jours d’affilée');
{
  // Le pas d'un jour se fait sur la clé, à midi UTC : les nuits de changement
  // d'heure durent 23 ou 25 heures, et un pas posé sur un instant réel
  // tomberait à côté.
  check('jour suivant', shiftDay('2026-09-21', 1) === '2026-09-22', shiftDay('2026-09-21', 1));
  check('jour précédent', shiftDay('2026-09-21', -1) === '2026-09-20', shiftDay('2026-09-21', -1));
  check('passage de mois', shiftDay('2026-09-01', -1) === '2026-08-31', shiftDay('2026-09-01', -1));
  check('passage d’année', shiftDay('2026-01-01', -1) === '2025-12-31', shiftDay('2026-01-01', -1));
  check('29 février existe en 2028', shiftDay('2028-02-28', 1) === '2028-02-29', shiftDay('2028-02-28', 1));
  check('et pas en 2027', shiftDay('2027-02-28', 1) === '2027-03-01', shiftDay('2027-02-28', 1));

  // Le dimanche 25 octobre 2026, la France recule d'une heure : la journée
  // dure 25 heures. Le pas doit rester un pas.
  check('nuit de changement d’heure', shiftDay('2026-10-25', -1) === '2026-10-24', shiftDay('2026-10-25', -1));

  const today = '2026-09-21';
  const set = (...days: string[]) => new Set(days);

  const run = streakOf(set('2026-09-21', '2026-09-20', '2026-09-19'), today);
  check('trois jours d’affilée', run.length === 3, String(run.length));
  check('la journée du jour est faite', run.todayDone);

  // Aujourd'hui pas encore rempli ne casse pas la série : la journée n'est pas
  // finie, et remettre le compteur à zéro au réveil punirait quelqu'un qui n'a
  // encore rien fait de mal.
  const waiting = streakOf(set('2026-09-20', '2026-09-19'), today);
  check('la série survit à une journée en cours', waiting.length === 2, String(waiting.length));
  check('mais elle est signalée en attente', !waiting.todayDone);

  // Un jour manquant avant-hier, lui, coupe pour de bon.
  const broken = streakOf(set('2026-09-21', '2026-09-19', '2026-09-18'), today);
  check('un trou coupe la série', broken.length === 1, String(broken.length));

  check('rien ne donne zéro', streakOf(set(), today).length === 0);
  check('hier seul mais avant-hier vide', streakOf(set('2026-09-20'), today).length === 1);
  check('avant-hier seul ne compte pas', streakOf(set('2026-09-19'), today).length === 0);

  // Une série qui traverse un mois et une année ne doit pas se briser sur la
  // frontière : c'est exactement ce qu'un calcul naïf raterait.
  const across = streakOf(set('2026-01-01', '2025-12-31', '2025-12-30'), '2026-01-01');
  check('la série traverse le 1er janvier', across.length === 3, String(across.length));

  // Des journées futures ne gonflent pas le compteur.
  const future = streakOf(set('2026-09-22', '2026-09-21'), today);
  check('demain ne compte pas', future.length === 1, String(future.length));
}

console.log('Série — symboles');
{
  const keys = STREAK_SYMBOLS.map((item) => item.key);
  const symbols = STREAK_SYMBOLS.map((item) => item.symbol);
  check('les clés sont uniques', new Set(keys).size === keys.length);
  check('les symboles sont uniques', new Set(symbols).size === symbols.length);
  check('la palette tient sur une rangée', STREAK_SYMBOLS.length <= 6, String(STREAK_SYMBOLS.length));
  check('le repli fait partie de la palette', isStreakSymbolKey(DEFAULT_STREAK_SYMBOL));

  check('symbolOf rend le bon caractère', symbolOf('cherry') === '🍒', symbolOf('cherry'));
  // Un badge doit toujours s'afficher : une donnée abîmée ne doit pas laisser
  // un trou à la place du compteur.
  check('une clé inconnue retombe sur la flamme', symbolOf('licorne') === '🔥', symbolOf('licorne'));
  check('une clé absente aussi', symbolOf(null) === '🔥' && symbolOf(undefined) === '🔥');

  for (const key of keys) {
    check(`« ${key} » a un libellé français`, Boolean((fr.streak.names as Record<string, string>)[key]), key);
    check(`« ${key} » a un libellé espagnol`, Boolean((es.streak.names as Record<string, string>)[key]), key);
  }

  // La contrainte `check` de la migration doit couvrir exactement la palette :
  // un symbole ajouté ici et pas en base serait refusé à l'écriture.
  const sql = readFileSync(new URL('../supabase/migrations/0009_streak_symbol.sql', import.meta.url), 'utf8');
  for (const key of keys) {
    check(`« ${key} » est accepté par la base`, sql.includes(`'${key}'`), key);
  }
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

  // Trois couleurs choisies à la main ne disent rien des neuf autres : c'est
  // ainsi qu'un changement d'encre a fait passer la tristesse sous AA sans
  // rien faire rougir. On mesure donc les douze, et on fige le plancher.
  const worst = EMOTIONS.reduce(
    (acc, e) => (textContrastOn(e.color) < acc.ratio ? { key: e.key, ratio: textContrastOn(e.color) } : acc),
    { key: '', ratio: Infinity },
  );
  check(
    `contraste minimal sur les 12 couleurs >= ${MIN_TEXT_CONTRAST}:1`,
    worst.ratio >= MIN_TEXT_CONTRAST,
    `${worst.key} à ${worst.ratio.toFixed(2)}:1`,
  );
  // Onze doivent tenir le vrai seuil AA ; seule la tristesse est en dessous,
  // et si une deuxième couleur la rejoignait il faudrait le savoir.
  check(
    'onze couleurs sur douze tiennent AA (4.5:1)',
    EMOTIONS.filter((e) => textContrastOn(e.color) >= 4.5).length === 11,
    `${EMOTIONS.filter((e) => textContrastOn(e.color) >= 4.5).length} couleur(s) au-dessus de 4.5:1`,
  );
}

console.log('\nCaméra — choix de l’objectif');
{
  /**
   * Faux `navigator.mediaDevices` reproduisant un Android d'entrée de gamme.
   * Le Galaxy A03 en est le cas type : `facingMode` exact échoue, `facingMode`
   * souhaité renvoie toujours l'arrière, et la caméra reste occupée un instant
   * après la coupure du flux précédent. Seul le `deviceId` explicite ouvre
   * vraiment l'objectif frontal.
   */
  type Cam = { deviceId: string; label: string; facing: 'user' | 'environment' };
  type Quirks = {
    exactFacingWorks?: boolean;
    idealFacingAlways?: 'user' | 'environment';
    busyCalls?: number;
    denied?: boolean;
    hideLabels?: boolean;
    hideFacing?: boolean;
    hideDeviceId?: boolean;
  };

  function fakeDevices(cams: Cam[], quirks: Quirks = {}) {
    let calls = 0;
    let busy = quirks.busyCalls ?? 0;

    const streamOf = (cam: Cam) => {
      const track = {
        stop() {},
        getSettings: () => ({
          deviceId: quirks.hideDeviceId ? undefined : cam.deviceId,
          facingMode: quirks.hideFacing ? undefined : cam.facing,
        }),
      };
      return { getVideoTracks: () => [track], getTracks: () => [track] };
    };

    const fail = (name: string) => {
      throw Object.assign(new Error(name), { name });
    };

    return {
      calls: () => calls,
      enumerateDevices: async () =>
        cams.map((cam) => ({
          kind: 'videoinput',
          deviceId: cam.deviceId,
          label: quirks.hideLabels ? '' : cam.label,
        })),
      getUserMedia: async (constraints: { video: Record<string, unknown> }) => {
        calls += 1;
        if (quirks.denied) fail('NotAllowedError');
        if (busy > 0) {
          busy -= 1;
          fail('NotReadableError');
        }

        const video = constraints.video ?? {};
        const wantedId = (video.deviceId as { exact?: string } | undefined)?.exact;
        if (wantedId) {
          const cam = cams.find((c) => c.deviceId === wantedId);
          if (!cam) fail('OverconstrainedError');
          return streamOf(cam!);
        }

        const mode = video.facingMode as string | { exact?: string } | undefined;
        if (mode && typeof mode === 'object' && mode.exact) {
          if (!quirks.exactFacingWorks) fail('OverconstrainedError');
          const cam = cams.find((c) => c.facing === mode.exact);
          if (!cam) fail('OverconstrainedError');
          return streamOf(cam!);
        }
        if (typeof mode === 'string') {
          // Souhait, pas exigence : l'appareil rend ce qu'il veut.
          const side = quirks.idealFacingAlways ?? mode;
          return streamOf(cams.find((c) => c.facing === side) ?? cams[0]);
        }
        return streamOf(cams[0]);
      },
    };
  }

  const install = (devices: unknown) => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { mediaDevices: devices },
      configurable: true,
      writable: true,
    });
  };

  const BACK: Cam = { deviceId: 'back-0', label: 'camera2 0, facing back', facing: 'environment' };
  const FRONT: Cam = { deviceId: 'front-1', label: 'camera2 1, facing front', facing: 'user' };

  // Le cas Galaxy A03, celui qui a motivé tout ce module.
  {
    const devices = fakeDevices([BACK, FRONT], { idealFacingAlways: 'environment', busyCalls: 1 });
    install(devices);
    const main = await openCamera('environment', { allowAny: true });
    check('la caméra arrière s’ouvre malgré un premier refus du pilote', main.deviceId === 'back-0', String(main.deviceId));

    const second = await openCamera('user', { avoidDeviceId: 'back-0', avoidFacing: 'environment' });
    check('la frontale est trouvée par deviceId là où facingMode échoue', second.deviceId === 'front-1', String(second.deviceId));
  }

  // Même appareil, mais le navigateur masque les libellés : il ne reste qu'une
  // caméra une fois écartée celle déjà utilisée, et c'est la bonne.
  {
    install(fakeDevices([BACK, FRONT], { idealFacingAlways: 'environment', hideLabels: true }));
    const second = await openCamera('user', { avoidDeviceId: 'back-0', avoidFacing: 'environment' });
    check('sans libellé, la caméra restante est retenue', second.deviceId === 'front-1', String(second.deviceId));
  }

  // Un appareil qui honore `facingMode: {exact}` doit marcher aussi, sans
  // dépendre des libellés.
  {
    install(fakeDevices([BACK, FRONT], { exactFacingWorks: true, hideLabels: true, hideDeviceId: true }));
    const second = await openCamera('user', { avoidFacing: 'environment' });
    check('facingMode exact suffit quand il est honoré', second.facing === 'user', String(second.facing));
  }

  // Un ordinateur portable : pas de caméra arrière. La première ouverture doit
  // quand même réussir, et la seconde prise doit renoncer plutôt que de rendre
  // deux fois la même image.
  {
    install(fakeDevices([FRONT], { idealFacingAlways: 'user' }));
    const main = await openCamera('environment', { allowAny: true });
    check('une seule caméra suffit à démarrer', main.deviceId === 'front-1', String(main.deviceId));

    let refused = false;
    try {
      await openCamera('environment', { avoidDeviceId: 'front-1', avoidFacing: 'user' });
    } catch {
      refused = true;
    }
    check('la même caméra n’est jamais rendue deux fois', refused);
  }

  // Une caméra occupée n'est pas une caméra absente : la reprise doit aboutir.
  {
    install(fakeDevices([BACK, FRONT], { exactFacingWorks: true, busyCalls: 8 }));
    const main = await openCamera('environment', { allowAny: true });
    check('le pilote lent finit par répondre', main.deviceId === 'back-0', String(main.deviceId));
  }

  // Un refus d'autorisation coupe court : réessayer ne ferait que multiplier
  // les demandes sans jamais aboutir.
  {
    const devices = fakeDevices([BACK, FRONT], { denied: true });
    install(devices);
    let denied = false;
    try {
      await openCamera('user', { allowAny: true });
    } catch (error) {
      denied = isDenial(error);
    }
    check('un refus est reconnu comme tel', denied);
    check('un refus n’est pas réessayé', devices.calls() === 1, `${devices.calls()} appel(s)`);
  }

  Object.defineProperty(globalThis, 'navigator', { value: undefined, configurable: true, writable: true });
}

console.log('\nCaméra — cadrage de la prise');
{
  // Le cadre de l'app est un portrait 3/4. Le flux, lui, arrive dans la forme
  // du capteur : c'est à la prise qu'on décide ce qu'on garde, et jamais à
  // l'affichage, qui rognerait une image que personne n'a vue.
  const wide = coverCrop(1280, 720);
  check('un flux 16/9 est rogné sur les côtés', wide.width === 540 && wide.height === 720, JSON.stringify(wide));
  check('le rognage est centré', wide.x === 370 && wide.y === 0, JSON.stringify(wide));

  // Un capteur 4/3 tenu en portrait donne exactement le cadre : ne rien rogner
  // du tout est la bonne réponse, pas un arrondi à un pixel près.
  const exact = coverCrop(480, 640);
  check(
    'un flux déjà en 3/4 est gardé entier',
    exact.x === 0 && exact.y === 0 && exact.width === 480 && exact.height === 640,
    JSON.stringify(exact),
  );

  const tall = coverCrop(1080, 1920);
  check('un flux 9/16 est rogné en haut et en bas', tall.width === 1080 && tall.height === 1440, JSON.stringify(tall));
  check('et lui aussi au centre', tall.y === 240, String(tall.y));

  const square = coverCrop(1000, 1000);
  check('un flux carré perd de la largeur', square.width === 750 && square.height === 1000, JSON.stringify(square));

  const empty = coverCrop(0, 0);
  check('une vidéo sans image ne casse pas le calcul', empty.width === 0 && empty.height === 0);

  // Le rapport obtenu doit être celui du cadre, à un pixel près — c'est ce qui
  // garantit que l'affichage n'a plus rien à rogner.
  for (const [w, h] of [[1280, 720], [640, 480], [1920, 1080], [720, 1280], [1440, 1080]]) {
    const crop = coverCrop(w, h);
    check(
      `${w}×${h} donne bien un portrait 3/4`,
      Math.abs(crop.width / crop.height - 3 / 4) < 0.002,
      (crop.width / crop.height).toFixed(4),
    );
  }
}

console.log('Réactions rapides — palette fermée');
{
  // La palette vit aussi en base, derrière une clé étrangère (key, emoji).
  // Ajouter un emoji ici sans jouer la migration donnerait une réaction que le
  // serveur refuse : c'est le genre d'écart qu'on veut voir tôt.
  const keys = REACTIONS.map((reaction) => reaction.key);
  const emojis = REACTIONS.map((reaction) => reaction.emoji);
  check('les clés sont uniques', new Set(keys).size === keys.length);
  check('les emoji sont uniques', new Set(emojis).size === emojis.length);
  check('la palette tient sur une rangée', REACTIONS.length <= 6, String(REACTIONS.length));

  check('emojiOf rend l\'emoji de la clé', emojiOf('heart') === '❤️', String(emojiOf('heart')));
  check('une clé inconnue ne rend rien', emojiOf('shrug') === null);
  check('isReactionKey reconnaît la palette', keys.every(isReactionKey));
  check('isReactionKey rejette le reste', !isReactionKey('shrug') && !isReactionKey(null));

  // Un emoji sans libellé, c'est un bouton que rien n'annonce au lecteur
  // d'écran. Le typage garantit que fr et es ont les mêmes clés, pas qu'elles
  // couvrent la palette.
  for (const key of keys) {
    check(`« ${key} » a un libellé français`, Boolean((fr.reactions.names as Record<string, string>)[key]), key);
    check(`« ${key} » a un libellé espagnol`, Boolean((es.reactions.names as Record<string, string>)[key]), key);
  }
}

console.log('Réactions — la pluie de bulles');
{
  // Un faux hasard déterministe : on veut vérifier les bornes, pas jouer aux dés.
  let seed = 0;
  const sequence = [0, 0.25, 0.5, 0.75, 0.999];
  const fake = () => sequence[seed++ % sequence.length];

  const field = bubbles(BUBBLE_COUNT, fake);
  check('autant de bulles que demandé', field.length === BUBBLE_COUNT, String(field.length));

  // Une bulle hors écran ne se voit jamais ; une bulle sans durée reste
  // plantée en bas, bien visible. Les deux se repèrent ici, pas à l'œil.
  for (const bubble of field) {
    check('départ dans l’écran', bubble.left >= 0 && bubble.left <= 100, String(bubble.left));
    check('retard raisonnable', bubble.delay >= 0 && bubble.delay <= 1, String(bubble.delay));
    check('durée non nulle', bubble.duration >= 1.8 && bubble.duration <= 2.8, String(bubble.duration));
    check('taille lisible', bubble.size >= 22 && bubble.size <= 48, String(bubble.size));
    check('dérive contenue', Math.abs(bubble.drift) <= 60, String(bubble.drift));

    // La fête s'efface toute seule au bout de BURST_MS : une bulle qui finirait
    // après serait coupée en plein vol, et ça se verrait.
    check(
      'la bulle a fini avant la fin de la fête',
      (bubble.delay + bubble.duration) * 1000 <= BURST_MS,
      `${bubble.delay} + ${bubble.duration} > ${BURST_MS / 1000}`,
    );
  }

  // Le pire cas EXACT, pas un échantillon : un hasard qui rend toujours 1 donne
  // la bulle la plus tardive possible. En tirant au sort, cette vérification
  // passait neuf fois sur dix — une vérification instable est pire qu'absente,
  // elle apprend à ignorer les échecs.
  const [latest] = bubbles(1, () => 1);
  const end = (latest.delay + latest.duration) * 1000;
  check('la dernière bulle finit pile avec la fête', end === BURST_MS, `${end} ≠ ${BURST_MS}`);

  // Toutes identiques, la pluie monterait en rang d'oignons.
  const varied = bubbles(12, Math.random);
  check('les bulles ne partent pas toutes du même endroit', new Set(varied.map((b) => b.left)).size > 1);

  check('un champ vide reste vide', bubbles(0, Math.random).length === 0);
}

console.log('Vignette — déplacement libre');
{
  // Cadre d'une photo en portrait 3/4 sur un téléphone, vignette à 30 %.
  const frame = { width: 360, height: 480 };
  const size = { width: 108, height: 144 };

  // La vignette reste où le doigt l'a laissée : aucune position valable n'est
  // corrigée, pas même celle du milieu — c'est tout le sujet.
  const middle = clampToFrame(126, 168, size, frame);
  check('le milieu est une position comme une autre', middle.x === 126 && middle.y === 168, JSON.stringify(middle));
  const offCentre = clampToFrame(80, 200, size, frame);
  check('une position valable est laissée telle quelle', offCentre.x === 80 && offCentre.y === 200, JSON.stringify(offCentre));

  // Le doigt sort de la photo : la vignette reste dedans, marge comprise.
  const farOut = clampToFrame(-500, -500, size, frame);
  check('bornée en haut à gauche', farOut.x === INSET_MARGIN && farOut.y === INSET_MARGIN, JSON.stringify(farOut));
  const farAway = clampToFrame(9999, 9999, size, frame);
  check(
    'bornée en bas à droite',
    farAway.x === frame.width - size.width - INSET_MARGIN && farAway.y === frame.height - size.height - INSET_MARGIN,
    JSON.stringify(farAway),
  );

  // Cas dégénéré : une vignette plus grande que son cadre ne doit pas produire
  // de borne croisée, sinon la position partirait à l'envers.
  const tight = clampToFrame(0, 0, { width: 400, height: 600 }, frame);
  check('un cadre trop petit ne croise pas ses bornes', tight.x === INSET_MARGIN && tight.y === INSET_MARGIN, JSON.stringify(tight));

  // La position est gardée en fraction du cadre : une rotation d'écran change
  // la taille de la photo, des pixels d'hier n'y voudraient plus rien dire.
  const spot = asFraction(90, 240, frame);
  check('fraction horizontale', Math.abs(spot.x - 0.25) < 1e-9, String(spot.x));
  check('fraction verticale', Math.abs(spot.y - 0.5) < 1e-9, String(spot.y));
  const unmeasured = asFraction(90, 240, { width: 0, height: 0 });
  check('un cadre pas encore mesuré ne rend pas NaN', unmeasured.x === 0 && unmeasured.y === 0, JSON.stringify(unmeasured));

  // Au clavier, une flèche ne déplace que sur son axe.
  const right = nudgeOffset('right', frame);
  check('flèche droite', right.dx === NUDGE * frame.width && right.dy === 0, JSON.stringify(right));
  const up = nudgeOffset('up', frame);
  check('flèche haut', up.dy === -NUDGE * frame.height && up.dx === 0, JSON.stringify(up));
  check('le pas reste petit', NUDGE > 0 && NUDGE <= 0.1, String(NUDGE));
}

console.log('Encre de validation');
{
  // Un téléphone en portrait, le bouton en bas.
  const viewport = { width: 390, height: 844 };
  const from = { x: 195, y: 760 };
  const center = { x: 195, y: 422 };
  const plan = inkPlan(from, viewport, Math.random);
  const at = (t: number) => inkFrame(plan, t);
  const corners = [[0, 0], [viewport.width, 0], [0, viewport.height], [viewport.width, viewport.height]];
  const centerOf = (blob: { x: number; y: number; width: number; height: number }) => ({
    x: blob.x + blob.width / 2,
    y: blob.y + blob.height / 2,
  });
  // Le cœur couvre-t-il l'écran entier, turbulence comprise ? Le creux d'une
  // volute déplace le bord d'au plus la moitié de la force du déplacement.
  const covers = (image: ReturnType<typeof at>) => {
    const [core] = image.blobs;
    const c = centerOf(core);
    const reach = Math.max(...corners.map(([x, y]) => Math.hypot(x - c.x, y - c.y)));
    return core.width / 2 - image.swirl / 2 >= reach;
  };

  for (const t of [0.3, 0.9]) {
    check(`le cœur, les panaches et les gouttes à ${t}`, at(t).blobs.length === BLOB_SLOTS, String(at(t).blobs.length));
    check(`les ronds dans l'eau à ${t}`, at(t).rings.length === RINGS.length, String(at(t).rings.length));
  }
  check('la durée reste un geste, pas une attente', BLOOM_MS >= 1000 && BLOOM_MS <= 3600, String(BLOOM_MS));
  check('les jalons sont dans l\'ordre',
    0 < PHASES.drop && PHASES.drop < PHASES.full && PHASES.full < PHASES.shown && PHASES.shown < PHASES.fall
      && PHASES.fall < PHASES.impact && PHASES.impact < PHASES.clearDrop && PHASES.clearDrop < 1 && PHASES.impact < PHASES.gone);

  // Au départ, rien : un rectangle qui clignoterait avant la première frame
  // se verrait dans le coin de l'écran.
  check('rien au départ', at(0).opacity === 0, String(at(0).opacity));

  // La goutte d'encre perle sur le bouton, centrée sur lui : décentrée, elle
  // semblerait jaillir d'à côté du geste.
  const drop = at(PHASES.drop);
  const dropCenter = centerOf(drop.blobs[0]);
  check('l\'encre part du bouton', drop.phase === 'ink' && Math.abs(dropCenter.x - from.x) < 1e-6 && Math.abs(dropCenter.y - from.y) < 1e-6,
    JSON.stringify(dropCenter));
  check('la goutte a sa taille', Math.abs(drop.blobs[0].width - SEED) < 1e-6, String(drop.blobs[0].width));
  check('un soupçon de turbulence seulement sur la goutte', drop.swirl <= plan.swirl * 0.1, String(drop.swirl));
  check('la turbulence est vive pendant la diffusion', at(0.25).swirl > plan.swirl * 0.5, String(at(0.25).swirl));

  // Au plus plein, l'écran est entièrement couvert — et il le reste jusqu'à
  // la bascule vers l'eau claire : c'est là que les filtres changent, et le
  // raccord ne peut passer inaperçu que sur un écran uni.
  for (const t of [PHASES.full, (PHASES.full + PHASES.fall) / 2, PHASES.fall - 1e-6]) {
    const image = at(t);
    check(`écran couvert à ${t.toFixed(3)}`, image.phase === 'ink' && image.opacity === 1 && covers(image));
  }
  // À la bascule, rien n'est ouvert : l'eau claire n'a pas commencé, et la
  // goutte est encore au-dessus de l'écran.
  const turn = at(PHASES.fall);
  const turnDroplet = turn.blobs[DROP_SLOT];
  check('à la bascule, rien n\'est ouvert',
    turn.phase === 'clear' && turn.opacity === 1 && turn.veilOpacity === 0
      && turn.blobs.slice(0, DROP_SLOT).every((blob) => blob.width === 0)
      && turnDroplet.y + turnDroplet.height <= 0
      && turn.rings.every((ring) => ring.opacity === 0),
    JSON.stringify(turnDroplet));

  // La goutte tombe en accélérant, nette — la turbulence n'a pas commencé —
  // et touche l'eau au centre, à l'impact.
  const heights = [0.25, 0.5, 0.75].map((f) => centerOf(at(PHASES.fall + f * (PHASES.impact - PHASES.fall)).blobs[DROP_SLOT]).y);
  const falling = at((PHASES.fall + PHASES.impact) / 2);
  check('la goutte accélère', heights[2] - heights[1] > heights[1] - heights[0], heights.map((h) => h.toFixed(1)).join(' → '));
  check('la goutte tombe nette', falling.swirl === 0 && falling.blur === 0, `${falling.swirl} / ${falling.blur}`);
  check('la vitesse l\'étire', falling.blobs[DROP_SLOT].height > DROPLET, String(falling.blobs[DROP_SLOT].height));
  const hit = centerOf(at(PHASES.impact).blobs[DROP_SLOT]);
  check('elle touche l\'eau au centre', Math.abs(hit.x - center.x) < 1e-6 && Math.abs(hit.y - center.y) < 1e-6, JSON.stringify(hit));
  // Pas de saut à l'impact : la goutte écrasée part de la forme de la chute.
  const before = at(PHASES.impact - 1e-6).blobs[DROP_SLOT];
  const after = at(PHASES.impact + 1e-6).blobs[DROP_SLOT];
  check('pas de saut à l\'impact', Math.abs(before.height - after.height) < 1 && Math.abs(before.width - after.width) < 1,
    `${before.width}×${before.height} → ${after.width}×${after.height}`);
  check('le message se dissout sous la goutte', at(PHASES.impact).message.opacity === 1 && at(PHASES.impact + 0.01).message.opacity < 1);

  // Les ronds dans l'eau partent de l'impact et s'éteignent. Leur opacité ne
  // descend pas sous le tiers : en dessous, le seuil du filtre les couperait
  // net à mi-course.
  check('aucun rond avant l\'impact', at(PHASES.impact - 1e-6).rings.every((ring) => ring.opacity === 0));
  const ripple = at(PHASES.impact + 0.05).rings[0];
  check('un rond après l\'impact', ripple.opacity > 0 && ripple.stroke > 0 && Math.abs(centerOf(ripple.blob).x - center.x) < 1e-6,
    JSON.stringify(ripple));
  let ringsFade = true;
  for (let step = 0; step <= 400; step += 1) {
    for (const ring of at(step / 400).rings) if (ring.opacity !== 0 && ring.opacity < 0.34 - 1e-9) ringsFade = false;
  }
  check('les ronds s\'éteignent sans être coupés', ringsFade);
  check('les ronds sont éteints à la fin', at(1).rings.every((ring) => ring.opacity === 0));

  // Le message ne se lit que sur la couleur : posé sur le papier, il serait
  // illisible dans sa propre teinte. Il paraît quand l'écran est couvert, et
  // il est parti avant que la goutte claire ait perlé.
  let messageSafe = true;
  for (let step = 0; step <= 800; step += 1) {
    const t = step / 800;
    const image = at(t);
    if (image.message.opacity <= 0) continue;
    // Après l'impact, le trou grandit sous le message : il doit être parti
    // avant que ce trou soit plus grand que la goutte d'encre.
    const onColor = image.phase === 'ink' ? covers(image) : t <= PHASES.gone;
    if (!onColor) messageSafe = false;
  }
  check('le message ne paraît que sur un écran couvert', messageSafe);
  check('rien à lire avant que l\'écran soit plein', at(PHASES.full - 1e-6).message.opacity === 0);
  for (const t of [PHASES.shown, (PHASES.shown + PHASES.impact) / 2, PHASES.impact]) {
    const { message } = at(t);
    check(`message net et lisible à ${t.toFixed(3)}`, message.opacity === 1 && message.blur === 0 && message.rise === 0, JSON.stringify(message));
  }
  check('le message a disparu avant que l\'eau claire grandisse',
    at(PHASES.gone).message.opacity === 0 && at(PHASES.gone).blobs[0].width <= 2.5 * SEED, String(at(PHASES.gone).blobs[0].width));
  // Assez longtemps pour être lu : une phrase courte se lit en une seconde.
  check('le message tient au moins une seconde', (PHASES.impact - PHASES.shown) * BLOOM_MS >= 700 && (PHASES.gone - PHASES.full) * BLOOM_MS >= 1000,
    `${(PHASES.impact - PHASES.shown) * BLOOM_MS} ms`);

  // L'eau claire se diffuse depuis le cœur de l'écran, là où la goutte est tombée.
  const clearDrop = at(PHASES.clearDrop);
  const clearCenter = centerOf(clearDrop.blobs[0]);
  check('l\'eau claire part du cœur de l\'écran',
    clearDrop.phase === 'clear' && Math.abs(clearCenter.x - center.x) < 1e-6 && Math.abs(clearCenter.y - center.y) < 1e-6,
    JSON.stringify(clearCenter));
  check('la goutte claire a sa taille', Math.abs(clearDrop.blobs[0].width - SEED) < 1e-6, String(clearDrop.blobs[0].width));

  // À la fin, le trou couvre tout l'écran, turbulence comprise : il ne reste
  // plus un coin d'encre, et le démontage ne fait rien disparaître d'un coup.
  check('l\'app est entièrement rendue à la fin', at(1).phase === 'clear' && covers(at(1)));
  check('au-delà de la fin, rien ne revient', JSON.stringify(at(1.4)) === JSON.stringify(at(1)));

  // La turbulence reste bornée sur un grand écran : au-delà, l'encre se
  // déchire au lieu d'onduler.
  const wide = inkPlan(from, { width: 2560, height: 1440 }, Math.random);
  check('turbulence bornée', wide.swirl <= 150, String(wide.swirl));

  // Le plan est tiré une fois : la même ouverture rend la même image.
  check('une frame ne tire rien au hasard', JSON.stringify(at(0.37)) === JSON.stringify(at(0.37)));

  // Rien ne doit rendre NaN, à aucun instant — un attribut SVG « NaN » fait
  // disparaître la forme sans la moindre erreur en console.
  let finite = true;
  for (let step = 0; step <= 400; step += 1) {
    const image = at(step / 400);
    const numbers = [image.opacity, image.swirl, image.blur, image.veilOpacity, image.drift.x, image.drift.y,
      image.message.opacity, image.message.blur, image.message.rise,
      ...image.rings.flatMap((ring) => [ring.stroke, ring.opacity, ring.blob.x, ring.blob.width]),
      ...[image.veil, ...image.blobs].flatMap((blob) => [blob.x, blob.y, blob.width, blob.height, blob.rx])];
    if (!numbers.every(Number.isFinite) || image.blobs.some((blob) => blob.width < 0 || blob.height < 0)) finite = false;
  }
  check('aucune valeur impossible sur tout le trajet', finite);
}

console.log('Dévoilement de la journée du binôme');
{
  // Une carte de la journée de l'autre, touchée un peu à gauche du centre.
  const card = { width: 358, height: 620 };
  const touch = { x: 120, y: 300 };
  const plan = revealPlan(card, touch, Math.random);
  const at = (t: number) => revealFrame(plan, t);
  const corners = [[0, 0], [card.width, 0], [0, card.height], [card.width, card.height]];
  const centerOf = (blob: { x: number; y: number; width: number; height: number }) => ({
    x: blob.x + blob.width / 2,
    y: blob.y + blob.height / 2,
  });

  check('plus court que la validation', REVEAL_MS < BLOOM_MS && REVEAL_MS >= 1000, String(REVEAL_MS));
  check('les jalons sont dans l\'ordre', 0 <= REVEAL.fall && REVEAL.fall < REVEAL.impact && REVEAL.impact < REVEAL.clearDrop && REVEAL.clearDrop < 1);

  // Au toucher, la carte est encore entièrement couverte : la goutte est
  // au-dessus, rien n'est ouvert, l'invitation est lisible. C'est ce qui rend
  // invisible le passage du bouton couvert à l'encre.
  const first = at(0);
  const firstDroplet = first.blobs[DROP_SLOT];
  check('au toucher, rien n\'est ouvert',
    first.phase === 'clear' && first.opacity === 1 && first.veilOpacity === 0
      && first.blobs.slice(0, DROP_SLOT).every((blob) => blob.width === 0)
      && firstDroplet.y + firstDroplet.height <= 0
      && first.rings.every((ring) => ring.opacity === 0),
    JSON.stringify(firstDroplet));
  check('l\'invitation est lisible au toucher', first.message.opacity === 1 && first.message.blur === 0);

  // La goutte tombe là où le doigt s'est posé.
  const hit = centerOf(at(REVEAL.impact).blobs[DROP_SLOT]);
  check('la goutte tombe sous le doigt', Math.abs(hit.x - touch.x) < 1e-6 && Math.abs(hit.y - touch.y) < 1e-6, JSON.stringify(hit));
  check('elle tombe nette', at(REVEAL.impact / 2).swirl === 0, String(at(REVEAL.impact / 2).swirl));
  check('et étirée par la vitesse', at(REVEAL.impact * 0.9).blobs[DROP_SLOT].height > DROPLET);

  // L'invitation se dissout sous la goutte, et a disparu avant que le trou
  // grandisse : posée sur les photos, elle serait illisible.
  check('l\'invitation se dissout à l\'impact', at(REVEAL.impact + 0.02).message.opacity < 1);
  const gone = at(REVEAL.clearDrop);
  check('l\'invitation est partie avant que l\'eau grandisse',
    gone.message.opacity === 0 && gone.blobs[0].width <= 1.01 * SEED, String(gone.blobs[0].width));

  // Les ronds durent autant, en temps réel, que ceux de la validation, et
  // s'éteignent sans être coupés par le seuil du filtre.
  let ringsFade = true;
  let ringSeen = false;
  for (let step = 0; step <= 400; step += 1) {
    for (const ring of at(step / 400).rings) {
      if (ring.opacity > 0) ringSeen = true;
      if (ring.opacity !== 0 && ring.opacity < 0.34 - 1e-9) ringsFade = false;
    }
  }
  check('des ronds dans l\'eau', ringSeen);
  check('les ronds s\'éteignent sans être coupés', ringsFade);

  // À la fin, toute la carte est découverte, turbulence comprise : rien ne
  // disparaît d'un coup quand l'encre se démonte.
  const end = at(1);
  const [core] = end.blobs;
  const c = centerOf(core);
  const reach = Math.max(...corners.map(([x, y]) => Math.hypot(x - c.x, y - c.y)));
  check('la carte est entièrement découverte à la fin', core.width / 2 - end.swirl / 2 >= reach, `${core.width / 2} < ${reach}`);
  check('plus aucun rond à la fin', end.rings.every((ring) => ring.opacity === 0));

  // Un toucher dans un coin ne doit pas laisser l'autre coin couvert.
  const corner = revealPlan(card, { x: 4, y: card.height - 4 }, Math.random);
  const cornerEnd = revealFrame(corner, 1).blobs[0];
  const far = Math.hypot(card.width - 4, card.height - 4);
  check('touchée dans un coin, elle se découvre jusqu\'à l\'autre', cornerEnd.width / 2 - revealFrame(corner, 1).swirl / 2 >= far);

  let finite = true;
  for (let step = 0; step <= 400; step += 1) {
    const image = at(step / 400);
    const numbers = [image.opacity, image.swirl, image.blur, image.veilOpacity, image.drift.x, image.drift.y,
      image.message.opacity, image.message.blur, image.message.rise,
      ...image.rings.flatMap((ring) => [ring.stroke, ring.opacity, ring.blob.x, ring.blob.width]),
      ...[image.veil, ...image.blobs].flatMap((blob) => [blob.x, blob.y, blob.width, blob.height, blob.rx])];
    if (!numbers.every(Number.isFinite)) finite = false;
  }
  check('aucune valeur impossible sur tout le dévoilement', finite);
}

console.log('Gestes des émotions');
{
  check('l\'Amour : deux gouttes', gestureOf('love') === 'pair');
  check('la Joie : le rebond', gestureOf('joy') === 'bounce');
  for (const key of ['serenity', 'sadness', 'anger', 'neutral', 'inconnue', null, undefined]) {
    check(`${String(key)} : la goutte simple`, gestureOf(key) === 'drop');
  }

  const viewport = { width: 390, height: 844 };
  const from = { x: 195, y: 760 };
  const center = { x: 195, y: 422 };
  const centerOf = (blob: { x: number; y: number; width: number; height: number }) => ({
    x: blob.x + blob.width / 2,
    y: blob.y + blob.height / 2,
  });
  const covers = (image: ReturnType<typeof inkFrame>, frame = viewport) => {
    const [core] = image.blobs;
    const c = centerOf(core);
    const edges = [[0, 0], [frame.width, 0], [0, frame.height], [frame.width, frame.height]];
    const reach = Math.max(...edges.map(([x, y]) => Math.hypot(x - c.x, y - c.y)));
    return core.width / 2 - image.swirl / 2 >= reach;
  };

  // Quel que soit le geste, le récit tient : l'écran est couvert quand le
  // message se lève et à la bascule vers l'eau claire, rien n'est ouvert à
  // cet instant, l'app est entièrement rendue à la fin, et le message ne
  // paraît jamais sur le papier.
  for (const gesture of ['drop', 'pair', 'bounce'] as const) {
    const plan = inkPlan(from, viewport, Math.random, gesture);
    const at = (t: number) => inkFrame(plan, t);
    check(`${gesture} : autant de taches que de places`, [0.05, 0.3, 0.7, 1].every((t) => at(t).blobs.length === BLOB_SLOTS));
    check(`${gesture} : rien au départ`, at(0).opacity === 0);
    for (const t of [PHASES.full, (PHASES.full + PHASES.fall) / 2, PHASES.fall - 1e-6]) {
      check(`${gesture} : écran couvert à ${t.toFixed(3)}`, at(t).phase === 'ink' && at(t).opacity === 1 && covers(at(t)));
    }
    const turn = at(PHASES.fall);
    check(`${gesture} : à la bascule, rien n'est ouvert`,
      turn.blobs.every((blob) => blob.width === 0 || blob.y + blob.height <= 0) && turn.rings.every((ring) => ring.opacity === 0));
    check(`${gesture} : l'app est rendue à la fin`, covers(at(1)));
    let safe = true;
    let finite = true;
    for (let step = 0; step <= 800; step += 1) {
      const t = step / 800;
      const image = at(t);
      if (image.message.opacity > 0 && !(image.phase === 'ink' ? covers(image) : t <= PHASES.gone)) safe = false;
      const numbers = [image.opacity, image.swirl, image.blur, ...image.blobs.flatMap((b) => [b.x, b.y, b.width, b.height, b.rx])];
      if (!numbers.every(Number.isFinite) || image.blobs.some((b) => b.width < 0 || b.height < 0)) finite = false;
    }
    check(`${gesture} : le message ne paraît que sur la couleur`, safe);
    check(`${gesture} : aucune valeur impossible`, finite);
    check(`${gesture} : le message a disparu avant que l'eau grandisse`,
      at(PHASES.gone).message.opacity === 0 && at(PHASES.gone).blobs[0].width <= 1.01 * SEED, String(at(PHASES.gone).blobs[0].width));

    // Le dévoilement aussi : rien d'ouvert au toucher, tout découvert à la fin.
    const card = { width: 358, height: 620 };
    const reveal = revealPlan(card, { x: 120, y: 300 }, Math.random, gesture);
    const first = revealFrame(reveal, 0);
    check(`${gesture} : au toucher, rien n'est ouvert`, first.blobs.every((blob) => blob.width === 0 || blob.y + blob.height <= 0));
    check(`${gesture} : la carte est découverte à la fin`, covers(revealFrame(reveal, 1), card));
  }

  // L'Amour : deux gouttes perlent de part et d'autre du bouton, la seconde
  // après la première, puis se rejoignent sur lui.
  {
    const plan = inkPlan(from, viewport, Math.random, 'pair');
    const [a, b] = [DROP_SLOT, DROP_SLOT + 1];
    const early = inkFrame(plan, 0.02);
    check('Amour : la première goutte perle seule', early.blobs[a].width > 0 && early.blobs[b].width === 0);
    const apart = inkFrame(plan, 0.08);
    const gap = centerOf(apart.blobs[b]).x - centerOf(apart.blobs[a]).x;
    check('Amour : deux gouttes bien séparées', gap > 0.2 * viewport.width, String(gap));
    const joined = inkFrame(plan, 0.16);
    check('Amour : elles se rejoignent sur le bouton',
      Math.abs(centerOf(joined.blobs[a]).x - from.x) < 1e-6 && Math.abs(centerOf(joined.blobs[b]).x - from.x) < 1e-6);
    check('Amour : le flou tend un pont entre elles', inkFrame(plan, 0.13).blur >= 5, String(inkFrame(plan, 0.13).blur));

    // Côté eau : deux gouttes tombent côte à côte, et leurs ronds partent
    // chacun de sa goutte.
    const water = inkFrame(plan, PHASES.impact + 0.05);
    const left = centerOf(water.blobs[a]);
    const right = centerOf(water.blobs[b]);
    check('Amour : deux gouttes d\'eau de part et d\'autre du centre', left.x < center.x && right.x > center.x && left.y === center.y);
    const r0 = centerOf(water.rings[0].blob);
    const r1 = centerOf(water.rings[1].blob);
    check('Amour : leurs ronds se croisent', r0.x < center.x && r1.x > center.x && water.rings.every((ring) => ring.opacity > 0));
  }

  // La Joie : une gouttelette rebondit, et la couleur n'éclot qu'à la
  // seconde touche.
  {
    const plan = inkPlan(from, viewport, Math.random, 'bounce');
    const hop = DROP_SLOT + 1;
    check('Joie : pas de rebond avant que la goutte ait perlé', inkFrame(plan, 0.02).blobs[hop].width === 0);
    const high = inkFrame(plan, 0.08);
    check('Joie : la gouttelette monte au-dessus de la goutte', high.blobs[hop].width > 0 && centerOf(high.blobs[hop]).y < from.y - 0.8 * plan.hop,
      String(centerOf(high.blobs[hop]).y));
    check('Joie : l\'encre attend la seconde touche', inkFrame(plan, 0.1).blobs[0].width === 0);
    check('Joie : elle éclot après', inkFrame(plan, 0.17).blobs[0].width > SEED);

    const up = inkFrame(plan, PHASES.impact + 0.035);
    check('Joie : la goutte d\'eau rebondit aussi', up.blobs[hop].width > 0 && centerOf(up.blobs[hop]).y < center.y - 0.8 * plan.hop);
    check('Joie : l\'eau claire attend la seconde touche', up.blobs[0].width === 0 && up.swirl === 0);
    const second = inkFrame(plan, PHASES.impact + 0.07 + 0.02);
    check('Joie : un rond à chaque touche', second.rings[1].opacity > 0, JSON.stringify(second.rings[1]));
  }
}

console.log('\nPersonnage');
{
  check('une pose par émotion', EMOTIONS.every((e) => POSES[e.key] !== undefined) && Object.keys(POSES).length === EMOTIONS.length);
  // La Joie rebondit, la Colère se gonfle : tout le corps fait le geste, des
  // bras en ajouteraient un second.
  check('la Joie n\'a pas de bras', POSES.joy.arm === 'none');
  check('la Colère n\'a pas de bras', POSES.anger.arm === 'none');
  // Elle se frotte l'œil : la Tristesse ne pleure jamais.
  check('la Tristesse se frotte l\'œil', POSES.sadness.arm === 'rubEyes');
  check('sans émotion, il attend', poseOf('scene', null).motion === 'tc-idle' && poseOf('waiting', 'joy').motion === 'tc-idle');
  check('la Fatigue dort allongée', isLying('scene', 'tiredness') && isLying('sleeping', null) && !isLying('scene', 'joy'));
  check('la bouche sourit vers le bas du repère', mouthPath(1) === 'M86,138 Q100,154 114,138' && mouthPath(-0.5) === 'M86,138 Q100,130 114,138');
  // Chaque pose nomme une animation qui existe dans la feuille de style : une
  // faute de frappe laisserait le personnage figé sans rien dire.
  const css = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');
  for (const [key, pose] of Object.entries(POSES)) {
    check(`« ${key} » a son mouvement dans app.css`, css.includes(`.${pose.motion}{`), pose.motion);
  }
  const lists = { tête: HEAD_ACCESSORIES, corps: BODY_ACCESSORIES, visage: FACE_ACCESSORIES, motif: MOTIFS };
  for (const [name, list] of Object.entries(lists)) {
    check(`accessoires (${name}) : clés uniques`, new Set(list).size === list.length);
  }

  // La base tient la même liste fermée que le code, catégorie par catégorie :
  // un accessoire ajouté d'un seul côté serait refusé à l'écriture, et on ne
  // le découvrirait qu'en production. On compare la liste exacte de chaque
  // contrainte, pas seulement la présence des clés.
  const migrations = {
    '0001': readFileSync(new URL('../supabase/migrations/0001_init.sql', import.meta.url), 'utf8'),
    '0011': readFileSync(new URL('../supabase/migrations/0011_character_outfit.sql', import.meta.url), 'utf8'),
  };
  for (const [file, sql] of Object.entries(migrations)) {
    for (const category of OUTFIT_CATEGORIES) {
      const match = new RegExp(`check \\(${category.column} in \\(([^)]*)\\)\\)`).exec(sql);
      const inBase = match ? [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
      check(
        `${file} : la liste de ${category.column} est celle du code`,
        inBase.join(',') === category.items.join(','),
        inBase.join(','),
      );
    }
  }

  // Chaque accessoire de la liste fermée a son dessin, et aucun dessin n'est orphelin.
  const drawn = Object.keys(ACCESSORY_PIECES).sort().join(',');
  const listed = [...HEAD_ACCESSORIES, ...BODY_ACCESSORIES, ...FACE_ACCESSORIES].sort().join(',');
  check('chaque accessoire a son dessin', drawn === listed, drawn);

  // Une clé inconnue ne casse pas le dessin : elle vaut « rien ».
  const read = outfitOf({ character_head: 'cap', character_body: 'jetpack', character_face: null });
  check('tenue : clé connue gardée, inconnue ignorée', read.head === 'cap' && read.body === null && read.face === null && read.motif === null);
  check('tenue : pas de profil, pas de tenue', Object.keys(outfitOf(null)).length === 0);
}

console.log('\nScènes à deux');
{
  // Chaque paire d'émotions trouve ses feuilles d'animation : une classe
  // nommée par le livre de scènes sans sa feuille laisserait des pièces
  // cachées s'afficher toutes à la fois.
  const sheetDir = new URL('../src/lib/duo/scenes/', import.meta.url);
  const exists = (name: string) => {
    try {
      readFileSync(new URL(`${name}.css`, sheetDir));
      return true;
    } catch {
      return false;
    }
  };
  const base = readFileSync(new URL('base.css', sheetDir), 'utf8');
  let scripted = 0;
  for (const a of EMOTIONS) {
    for (const b of EMOTIONS) {
      const me = { emotion: a.key, color: a.color, outfit: {} };
      const partner = { emotion: b.key, color: b.color, outfit: { head: 'flower' as const, motif: 'dots' as const } };
      const scene = sceneFor(me, partner);
      if (scene.scripted) scripted += 1;
      const missing = sheetsOf(scene).filter((name) => !exists(name));
      check(`${a.key} + ${b.key} : feuilles présentes`, missing.length === 0, missing.join(','));
      // Toutes les classes du socle qu'elle nomme existent dans base.css.
      const baseClasses = new Set<string>();
      for (const actor of scene.actors) {
        for (const cls of [actor.c1, actor.c2, actor.c3, ...actor.parts.map((p) => p.c)]) {
          for (const c of cls.split(' ')) if (c && (c.split('-').length <= 2 || c === 'du-motion-only')) baseClasses.add(c);
        }
      }
      const absent = [...baseClasses].filter((c) => !base.includes(`.${c}{`) && !base.includes(`.${c} `) && !base.includes(`.${c},`));
      check(`${a.key} + ${b.key} : classes du socle présentes`, absent.length === 0, absent.join(','));
      // Moi à gauche, le binôme à droite : chacun garde sa teinte.
      const fills = new Set(scene.actors.flatMap((actor) => actor.parts.map((p) => p.fill)));
      check(`${a.key} + ${b.key} : ma teinte est dans la scène`, fills.has(a.color), a.color);
    }
  }
  // Neutre ne joue avec personne : 11 × 11 paires écrites.
  check('121 paires scénarisées', scripted === 121, String(scripted));

  // Les feuilles sont écrites par `npm run duo` depuis les livres de
  // scripts/duo/scenes : un livre retouché sans régénérer, ou une feuille
  // retouchée à la main, et l'app ne jouerait pas ce que dit le livre.
  const build = fileURLToPath(new URL('./duo/build.ts', import.meta.url));
  const duo = spawnSync(process.execPath, ['--experimental-strip-types', build, '--check'], { encoding: 'utf8' });
  check('les feuilles sont à jour (npm run duo)', duo.status === 0, (duo.stderr || duo.stdout).trim().split('\n').at(-1));
}

console.log('\nLogo');
{
  // Le corps du personnage, échantillonné le long de ses courbes (M puis des C).
  const numbers = (BODY_PATH.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  const body: [number, number][] = [];
  let start: [number, number] = [numbers[0], numbers[1]];
  for (let i = 2; i + 5 < numbers.length; i += 6) {
    const [c1x, c1y, c2x, c2y, ex, ey] = numbers.slice(i, i + 6);
    for (let s = 0; s <= 64; s += 1) {
      const t = s / 64;
      const u = 1 - t;
      body.push([
        u * u * u * start[0] + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex,
        u * u * u * start[1] + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey,
      ]);
    }
    start = [ex, ey];
  }

  for (const variant of ['full', 'small'] as LogoVariant[]) {
    const g = logoGeometry(variant);
    const center = LOGO_SIZE / 2;
    check(`${variant} : un rayon par émotion`, g.rays.length === EMOTIONS.length);
    check(`${variant} : les rayons suivent la palette`, g.rays.every((ray, i) => ray.color === EMOTIONS[i].color));
    check(`${variant} : Joie à midi`, g.rays[0].x1 === center && g.rays[0].y2 < g.rays[0].y1);
    // Le quatrième rayon (Gratitude) est à 3 h : on tourne bien dans le sens des aiguilles d'une montre.
    check(`${variant} : sens des aiguilles d'une montre`, g.rays[3].x2 > g.rays[3].x1 && g.rays[3].y1 === center);

    // Rien ne sort du carré, bouts arrondis compris.
    const reach = Math.max(...g.rays.map((ray) => Math.hypot(ray.x2 - center, ray.y2 - center))) + g.rayWidth / 2;
    check(`${variant} : les rayons restent dans le carré`, reach <= center, reach.toFixed(2));

    // Les rayons ne mordent pas sur le personnage : son contour, trait compris,
    // reste en deçà du départ des rayons.
    const { scale, tx, ty, strokeWidth } = g.body;
    const bodyReach = Math.max(...body.map(([x, y]) => Math.hypot(tx + scale * x - center, ty + scale * y - center))) + strokeWidth / 2;
    const rayStart = Math.min(...g.rays.map((ray) => Math.hypot(ray.x1 - center, ray.y1 - center))) - g.rayWidth / 2;
    check(`${variant} : les rayons ne touchent pas le personnage`, bodyReach + 1 <= rayStart, `${bodyReach.toFixed(2)} / ${rayStart.toFixed(2)}`);

    if (variant === 'full') {
      // L'icône « maskable » peut être découpée en cercle : tout doit tenir dans
      // la zone de sécurité, 40 % du côté en rayon.
      check('l\'icône maskable tient dans la zone de sécurité', reach * MASKABLE_FIT <= 0.4 * LOGO_SIZE, (reach * MASKABLE_FIT).toFixed(2));
    }
  }

  // Le favicon est écrit par `npm run icons` : une géométrie retouchée ici et
  // pas régénérée laisserait l'ancien logo dans l'onglet sans que rien ne le dise.
  const favicon = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
  check('public/favicon.svg est à jour (npm run icons)', favicon === faviconSvg());
}

if (failures > 0) {
  console.error(`\n${failures} vérification(s) en échec.`);
  process.exit(1);
}
console.log('\nToutes les vérifications passent.');
