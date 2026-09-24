/**
 * Les scènes à deux, du point de vue de l'app : les clés d'émotion de l'app,
 * la teinte du jour et la tenue de chacun. Le livre de scènes lui-même est
 * dans `model.js`, les animations dans `scenes/`.
 *
 * Module sans dépendance (il est exécuté par Node dans les vérifications).
 */
import { outfitLayers } from '../character.ts';
import type { Outfit } from '../character.ts';
import type { EmotionKey } from '../emotions.ts';
import { duoScene } from './model.js';
import type { DuoPerson, DuoSceneModel } from './model.js';

export type { DuoActor, DuoPart, DuoSceneModel } from './model.js';

/** Les noms du canevas, où les scènes ont été écrites. */
const CANVAS_KEY: Record<EmotionKey, string> = {
  joy: 'joie',
  serenity: 'serenite',
  love: 'amour',
  gratitude: 'gratitude',
  pride: 'fierte',
  excitement: 'excitation',
  nostalgia: 'nostalgie',
  tiredness: 'fatigue',
  sadness: 'tristesse',
  anxiety: 'anxiete',
  anger: 'colere',
  neutral: 'neutre',
};

export type DuoSide = { emotion: EmotionKey; color: string; outfit: Outfit };

function person(side: DuoSide): DuoPerson {
  return { tint: side.color, layers: outfitLayers(side.outfit), motif: side.outfit.motif ?? null, head: side.outfit.head ?? null, face: side.outfit.face ?? null };
}

/** La scène de la paire : moi à gauche, le binôme à droite (la scène se retourne s'il le faut). */
export function sceneFor(me: DuoSide, partner: DuoSide): DuoSceneModel {
  return duoScene({ a: CANVAS_KEY[me.emotion], b: CANVAS_KEY[partner.emotion], me: person(me), partner: person(partner) });
}

/**
 * Les feuilles d'animation que la scène nomme : son préfixe (`du-jj-…` →
 * `jj`), et parfois celui d'une scène voisine dont elle reprend un mouvement.
 * Les classes du socle (`du-bounce`, `du-motion-only`…) n'en demandent pas.
 */
export function sheetsOf(scene: DuoSceneModel): string[] {
  const names = new Set<string>();
  const add = (classes: string) => {
    for (const cls of classes.split(' ')) {
      const parts = cls.split('-');
      if (parts.length > 2 && cls !== 'du-motion-only') names.add(parts[1]);
    }
  };
  for (const actor of scene.actors) {
    add(actor.c1);
    add(actor.c2);
    add(actor.c3);
    for (const part of actor.parts) add(part.c);
  }
  return [...names].sort();
}
