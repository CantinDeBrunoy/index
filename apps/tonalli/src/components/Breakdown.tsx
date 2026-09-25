import { EMOTIONS } from '@/lib/emotions';
import type { Entry } from '@/lib/types';
import { useI18n } from '@/state/I18nProvider';

/**
 * Répartition des émotions d'un mois : une seule barre partagée entre elles,
 * la plus fréquente en tête, puis leurs noms et leurs comptes. Chaque émotion
 * y prend sa couleur franche — les crans parleraient du jour, pas du mois.
 *
 * La barre est muette pour un lecteur d'écran : les pastilles en dessous
 * disent la même chose avec des mots.
 */
export function Breakdown({ entries }: { entries: Entry[] }) {
  const { t } = useI18n();

  if (entries.length === 0) {
    return <p className="muted small">{t('calendar.breakdownEmpty')}</p>;
  }

  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.emotion, (counts.get(entry.emotion) ?? 0) + 1);
  }

  const rows = EMOTIONS.filter((emotion) => counts.has(emotion.key))
    .map((emotion) => ({ ...emotion, count: counts.get(emotion.key) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <div className="breakdown-bar" aria-hidden>
        {rows.map((row) => (
          <span key={row.key} style={{ flexGrow: row.count, background: row.color }} />
        ))}
      </div>
      <ul className="breakdown-list">
        {rows.map((row) => (
          <li key={row.key}>
            <span className="breakdown-dot" style={{ background: row.color }} aria-hidden />
            {t(`emotions.${row.key}`)} <span className="faint">{row.count}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
