// Modèle de données de Cancionero.
// Une chanson sert de support pour travailler l'espagnol : paroles alignées
// (ES + FR), vocabulaire, texte à trous et quiz de compréhension.

import type { SongColorKey } from '@/constants/theme';

export type Level = 'debutant' | 'intermediaire' | 'avance';

/** Une ligne de la chanson : l'espagnol et sa traduction française alignée. */
export type SongLine = {
  es: string;
  fr: string;
  /** Horodatage de début en secondes (karaoké synchronisé), si disponible. */
  time?: number;
};

export type Song = {
  id: string;
  title: string;
  /** Auteur ou origine : « Original », « Traditionnel », ou un nom. */
  artist: string;
  level: Level;
  /** Petite illustration emoji pour la carte. */
  emoji: string;
  /** Couleur de la chanson ; à défaut, tirée de son id (features/songs/palette.ts). */
  color?: SongColorKey;
  lines: SongLine[];
  /** `builtin` = fournie avec l'app, `user` = ajoutée par l'utilisateur. */
  source: 'builtin' | 'user';
  /** Durée du morceau en secondes (pour le lecteur karaoké). */
  duration?: number;
  /** Vrai si les lignes portent des horodatages (karaoké synchronisé). */
  synced?: boolean;
};

export const LEVEL_LABELS: Record<Level, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
};
