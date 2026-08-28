import { EMOTIONS } from '@/lib/emotions';
import type { Entry } from '@/lib/types';
import { useI18n } from '@/state/I18nProvider';

/** Répartition des émotions d'un mois, la plus fréquente en tête. */
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

  const max = Math.max(...rows.map((row) => row.count));

  return (
    <div className="breakdown">
      {rows.map((row) => (
        <div className="breakdown-row" key={row.key}>
          <span className="muted">{t(`emotions.${row.key}`)}</span>
          <span className="breakdown-bar">
            <span
              className="breakdown-fill"
              style={{ width: `${(row.count / max) * 100}%`, background: row.color }}
            />
          </span>
          <span className="faint" style={{ textAlign: 'right' }}>
            {row.count}
          </span>
        </div>
      ))}
    </div>
  );
}
