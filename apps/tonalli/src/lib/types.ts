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
};

export type Entry = {
  id: string;
  user_id: string;
  /** Date locale de l'auteur, `YYYY-MM-DD`. Jamais convertie. */
  date: string;
  emotion: string;
  color: string;
  photo_path: string | null;
  note: string | null;
  created_at: string;
};

/** Entrées indexées par date. */
export type EntryMap = Record<string, Entry>;

/** Une journée du binôme qu'on sait exister sans avoir le droit de la lire. */
export type PartnerDay = { date: string; hidden: true };
