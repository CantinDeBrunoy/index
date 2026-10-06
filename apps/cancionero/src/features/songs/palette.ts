import { SongPalette, type SongColor, type SongColorKey } from '@/constants/theme';

const ORDER: SongColorKey[] = ['rosa', 'turquesa', 'amarillo', 'verde', 'naranja', 'morado'];

/** Couleur d'une chanson : celle qu'elle déclare, sinon une couleur stable tirée de son id. */
export function songColorKey(song: { id: string; color?: SongColorKey }): SongColorKey {
  if (song.color) return song.color;
  let h = 0;
  for (let i = 0; i < song.id.length; i++) h = (h * 31 + song.id.charCodeAt(i)) >>> 0;
  return ORDER[h % ORDER.length];
}

export function songColor(song: { id: string; color?: SongColorKey }): SongColor {
  return SongPalette[songColorKey(song)];
}
