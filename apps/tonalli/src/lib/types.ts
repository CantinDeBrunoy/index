export type Locale = 'fr' | 'es';

export type Profile = {
  id: string;
  display_name: string;
  locale: Locale;
  timezone: string;
  partner_id: string | null;
  invite_code: string;
  push_token: string | null;
  reminder_hour: number;
  reminder_minute: number;
  reminders_enabled: boolean;
  /** Clé du symbole de la série (voir `lib/streak.ts`). */
  streak_symbol: string;
};

export type Entry = {
  id: string;
  user_id: string;
  /** Date locale de l'auteur, `YYYY-MM-DD`. Jamais convertie. */
  date: string;
  emotion: string;
  color: string;
  photo_path: string | null;
  /** Caméra frontale, prise dans la foulée de la première. Absente si l'appareil n'a qu'une caméra. */
  selfie_path: string | null;
  note: string | null;
  created_at: string;
};

/** Entrées indexées par date. */
export type EntryMap = Record<string, Entry>;

/** Une journée du binôme qu'on sait exister sans avoir le droit de la lire. */
export type PartnerDay = { date: string; hidden: true };

/**
 * Un emoji posé sur la journée de l'autre. Une seule par personne et par
 * journée : la clé primaire en base est (entry_id, author_id).
 */
export type Reaction = {
  entry_id: string;
  author_id: string;
  key: string;
  emoji: string;
  created_at: string;
};

/** Réactions indexées par identifiant d'entrée. */
export type ReactionMap = Record<string, Reaction>;
