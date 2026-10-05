import { Fiesta } from '@/constants/theme';

/** Dégradés « fiesta » lisibles avec du texte blanc, choisis par chanson. */
export const HERO_GRADIENTS: [string, string][] = [
  [Fiesta.rosa, Fiesta.naranja],
  [Fiesta.turquesa, Fiesta.azul],
  [Fiesta.verde, Fiesta.turquesa],
  [Fiesta.morado, Fiesta.rosa],
  [Fiesta.naranja, Fiesta.rojo],
  [Fiesta.rojo, Fiesta.morado],
];

/** Dégradé déterministe pour un identifiant de chanson. */
export function gradientFor(id: string): [string, string] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % HERO_GRADIENTS.length;
  return HERO_GRADIENTS[h];
}
