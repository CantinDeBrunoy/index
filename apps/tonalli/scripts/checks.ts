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
import { coverCrop, isDenial, openCamera } from '../src/lib/camera.ts';
import { REACTIONS, emojiOf, isReactionKey } from '../src/lib/reactions.ts';
import { fr } from '../src/locales/fr.ts';
import { es } from '../src/locales/es.ts';
import {
  EMOTIONS,
  MIN_TEXT_CONTRAST,
  colorOf,
  isEmotionKey,
  readableTextOn,
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

if (failures > 0) {
  console.error(`\n${failures} vérification(s) en échec.`);
  process.exit(1);
}
console.log('\nToutes les vérifications passent.');
