import { expect, it } from 'vitest';
import { isOwner, type Probe } from './owner';

const browser = (session: Probe['session']): Probe => ({ installed: () => false, session });
const answers = (body: unknown) => browser(async () => body);

it('reconnaît l’app installée sans rien demander au Worker', async () => {
  let asked = false;
  const probe: Probe = {
    installed: () => true,
    session: async () => {
      asked = true;
      return { owner: false };
    },
  };
  expect(await isOwner(probe)).toBe(true);
  expect(asked).toBe(false);
});

it('suit la session du hub dans un navigateur', async () => {
  expect(await isOwner(answers({ owner: true, login: 'CantinDeBrunoy' }))).toBe(true);
  expect(await isOwner(answers({ owner: false, login: null }))).toBe(false);
});

it('reste en démo sans réponse claire du Worker', async () => {
  const offline = browser(async () => {
    throw new TypeError('Failed to fetch');
  });
  expect(await isOwner(offline)).toBe(false);
  // Une page servie seule (sans Worker), ou une réponse inattendue.
  expect(await isOwner(answers({ error: 'Route inconnue.' }))).toBe(false);
  expect(await isOwner(answers(null))).toBe(false);
  expect(await isOwner(answers({ owner: 'true' }))).toBe(false);
});
