/** Une entrée = une journée colorée. La date est toujours une date locale. */
export type Entry = {
  /** Jour local au format `YYYY-MM-DD`. */
  date: string;
  /** Couleur en hexadécimal, `#RRGGBB`. */
  color: string;
  /** Note libre, une ligne. Absente si vide. */
  note?: string;
  /** Millisecondes epoch de la dernière modification, sert à départager un import. */
  updatedAt: number;
};

/** Toutes les entrées, indexées par leur date. */
export type EntryMap = Record<string, Entry>;

export type Settings = {
  remindersEnabled: boolean;
  /** Heure locale du rappel, 0-23. */
  hour: number;
  /** Minute locale du rappel, 0-59. */
  minute: number;
};

export const DEFAULT_SETTINGS: Settings = {
  remindersEnabled: false,
  hour: 21,
  minute: 0,
};
