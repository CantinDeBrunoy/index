// Textes des notifications, dans la langue du destinataire.
// Ils sont dupliqués ici volontairement : une Edge Function ne partage pas le
// bundle du navigateur, et une notification dans la mauvaise langue est pire
// qu'un doublon de chaîne.
export const MESSAGES = {
  fr: {
    reminderTitle: 'Tonalli',
    reminderBody: 'Quelle est la couleur de ta journée ?',
    partnerTitle: 'Tonalli',
    partnerBody: (name: string) => `${name} a rempli sa journée.`,
  },
  es: {
    reminderTitle: 'Tonalli',
    reminderBody: '¿De qué color es tu día?',
    partnerTitle: 'Tonalli',
    partnerBody: (name: string) => `${name} ha registrado su día.`,
  },
} as const;

export type Locale = keyof typeof MESSAGES;

export function localeOf(value: unknown): Locale {
  return value === 'es' ? 'es' : 'fr';
}
