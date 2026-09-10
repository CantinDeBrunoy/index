/**
 * Ouverture de la caméra, tolérante aux appareils d'entrée de gamme.
 *
 * Ce module existe à cause d'un symptôme précis : sur un Samsung Galaxy A03,
 * la caméra frontale ne s'ouvrait jamais. Un simple
 * `getUserMedia({ video: { facingMode: 'user', width, height } })` échoue là où
 * il marche sur un téléphone récent, pour trois raisons distinctes, toutes
 * rencontrées sur cette gamme d'Android :
 *
 * 1. `facingMode` sans `exact` n'est qu'une *préférence*. Le navigateur note
 *    chaque caméra sur l'ensemble des contraintes : quand la résolution
 *    demandée colle mieux au capteur arrière, il renvoie l'arrière — et la
 *    bascule ne bascule rien.
 * 2. Le capteur frontal de ces appareils est petit (souvent 640×480). Une
 *    contrainte de taille, même « idéale », suffit à le faire perdre ce calcul,
 *    et certains pilotes refusent carrément l'ouverture.
 * 3. Le pilote ne relâche pas la caméra instantanément. Ouvrir la seconde juste
 *    après avoir coupé la première échoue en `NotReadableError` : le matériel ne
 *    dit pas « impossible », il dit « pas encore ».
 *
 * La parade tient en trois gestes : demander explicitement le `deviceId` dès
 * qu'on le connaît, dégrader les contraintes une par une plutôt que d'échouer
 * d'un bloc, et réessayer après une pause quand l'erreur est un « pas encore ».
 */

export type Facing = 'environment' | 'user';

/** Résolution souhaitée, jamais exigée : un capteur VGA doit rester acceptable. */
const IDEAL_SIZE: MediaTrackConstraints = {
  width: { ideal: 1440 },
  height: { ideal: 1920 },
};

/** Pauses de reprise quand le pilote n'a pas encore relâché la caméra. */
const RETRY_DELAYS_MS = [200, 500, 1000];

/** `setTimeout` global et non `window.setTimeout` : ce module est aussi exécuté
 *  par Node dans `npm run checks`, où `window` n'existe pas. */
export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Caméra réellement obtenue — `null` quand l'appareil ne le dit pas. */
export type Opened = {
  stream: MediaStream;
  facing: Facing | null;
  deviceId: string | null;
};

const nameOf = (error: unknown): string => (error as { name?: string }).name ?? '';

/** Refus de l'utilisateur ou du navigateur : insister ne sert à rien. */
export const isDenial = (error: unknown): boolean => {
  const name = nameOf(error);
  return name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError';
};

/** « Pas encore » du matériel, par opposition à « jamais » : ça vaut une reprise. */
const isBusy = (error: unknown): boolean => {
  const name = nameOf(error);
  return name === 'NotReadableError' || name === 'AbortError' || name === 'TrackStartError';
};

const notFound = () => new DOMException('no camera', 'NotFoundError');

export function readSettings(stream: MediaStream | null): {
  facing: Facing | null;
  deviceId: string | null;
} {
  const settings = stream?.getVideoTracks()[0]?.getSettings();
  const mode = settings?.facingMode;
  return {
    facing: mode === 'user' || mode === 'environment' ? mode : null,
    deviceId: settings?.deviceId || null,
  };
}

/**
 * Nombre de caméras visibles — `0` quand le navigateur ne les énumère pas.
 * Avant l'autorisation, Chrome annonce une entrée générique ; le chiffre n'est
 * donc fiable qu'une fois un premier flux ouvert.
 */
export async function countCameras(): Promise<number> {
  if (!navigator.mediaDevices?.enumerateDevices) return 0;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === 'videoinput').length;
  } catch {
    return 0;
  }
}

const FRONT = /front|frontal|avant|user|self/i;
const BACK = /back|rear|arri|environment|world/i;

/**
 * Identifiants des caméras du côté demandé, du plus sûr au plus supposé.
 *
 * Les libellés ne sont lisibles qu'une fois l'autorisation accordée : avant, la
 * liste revient vide et l'appel retombe sur `facingMode`, ce qui suffit pour la
 * première ouverture. Pour la seconde, l'autorisation est acquise — c'est
 * précisément là que le `deviceId` explicite sauve la mise.
 */
async function deviceIdsFacing(facing: Facing, avoid: string | null): Promise<string[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  let devices: MediaDeviceInfo[];
  try {
    devices = await navigator.mediaDevices.enumerateDevices();
  } catch {
    return [];
  }

  const cameras = devices.filter(
    (device) => device.kind === 'videoinput' && device.deviceId && device.deviceId !== avoid,
  );
  const wanted = facing === 'user' ? FRONT : BACK;
  const other = facing === 'user' ? BACK : FRONT;

  const named = cameras.filter((device) => wanted.test(device.label));
  if (named.length > 0) return named.map((device) => device.deviceId);

  // Sans libellé exploitable, on ne devine pas — sauf s'il ne reste qu'une
  // caméra qui n'est pas explicitement de l'autre côté. C'est le cas courant du
  // téléphone à deux caméras dont on vient d'écarter celle déjà utilisée.
  const plausible = cameras.filter((device) => !other.test(device.label));
  return plausible.length === 1 ? plausible.map((device) => device.deviceId) : [];
}

/**
 * Contraintes à essayer dans l'ordre : d'abord l'appareil nommément désigné,
 * puis le côté exigé, puis le côté souhaité, et seulement en dernier recours
 * n'importe quelle caméra. Chaque niveau est décliné avec puis sans résolution,
 * parce que c'est la taille qui écarte les petits capteurs.
 */
function attemptsFor(facing: Facing, ids: string[], allowAny: boolean): MediaTrackConstraints[] {
  const attempts: MediaTrackConstraints[] = [];
  for (const id of ids) {
    attempts.push({ deviceId: { exact: id }, ...IDEAL_SIZE });
    attempts.push({ deviceId: { exact: id } });
  }
  attempts.push({ facingMode: { exact: facing }, ...IDEAL_SIZE });
  attempts.push({ facingMode: { exact: facing } });
  attempts.push({ facingMode: facing, ...IDEAL_SIZE });
  attempts.push({ facingMode: facing });
  if (allowAny) attempts.push({ ...IDEAL_SIZE }, {});
  return attempts;
}

export type OpenOptions = {
  /** Caméra déjà utilisée pour la première photo : la reprendre ne vaut rien. */
  avoidDeviceId?: string | null;
  avoidFacing?: Facing | null;
  /** Autorise n'importe quelle caméra si le côté demandé n'existe pas. */
  allowAny?: boolean;
};

/**
 * Ouvre une caméra du côté demandé. Lève l'erreur d'origine si aucune ne
 * convient — le refus d'autorisation coupe court, le reste est réessayé.
 */
export async function openCamera(facing: Facing, options: OpenOptions = {}): Promise<Opened> {
  if (!navigator.mediaDevices?.getUserMedia) throw notFound();

  const avoidDeviceId = options.avoidDeviceId ?? null;
  const avoidFacing = options.avoidFacing ?? null;
  const ids = await deviceIdsFacing(facing, avoidDeviceId);
  const attempts = attemptsFor(facing, ids, options.allowAny ?? false);

  let last: unknown = notFound();

  for (let round = 0; round <= RETRY_DELAYS_MS.length; round += 1) {
    if (round > 0) await wait(RETRY_DELAYS_MS[round - 1]);
    let retryable = false;

    for (const video of attempts) {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      } catch (error) {
        if (isDenial(error)) throw error;
        last = error;
        retryable = retryable || isBusy(error);
        continue;
      }

      const opened: Opened = { stream, ...readSettings(stream) };
      // La caméra rendue est celle qu'on voulait éviter : `facingMode` a été
      // ignoré, ou l'appareil n'a qu'un capteur. On la rend et on continue.
      const sameDevice = avoidDeviceId !== null && opened.deviceId === avoidDeviceId;
      const sameSide = avoidFacing !== null && opened.facing === avoidFacing;
      if (sameDevice || sameSide) {
        stream.getTracks().forEach((track) => track.stop());
        last = notFound();
        continue;
      }
      return opened;
    }

    // Une contrainte impossible le restera : seule une caméra occupée mérite
    // qu'on repasse, le temps que le pilote la relâche.
    if (!retryable) break;
  }

  throw last;
}
