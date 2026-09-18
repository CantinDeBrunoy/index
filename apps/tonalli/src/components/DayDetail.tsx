import { useEffect } from 'react';

import { EntryPhotos } from '@/components/PhotoPair';
import { DayReactions } from '@/components/Reactions';
import { formatLongDate } from '@/lib/dates';
import { readableTextOn } from '@/lib/emotions';
import type { Entry } from '@/lib/types';
import { useI18n } from '@/state/I18nProvider';

type Props = {
  date: string;
  entry: Entry | null;
  /** Le binôme a posté ce jour-là, mais je n'avais pas rempli le mien. */
  hidden: boolean;
  onClose: () => void;
};

export function DayDetail({ date, entry, hidden, onClose }: Props) {
  const { t, locale } = useI18n();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fullscreen" role="dialog" aria-modal="true">
      <div className="fullscreen-inner stack">
        <div className="row-between">
          <h1 className="capitalize" style={{ fontSize: 20 }}>
            {formatLongDate(date, locale)}
          </h1>
          <button type="button" className="btn" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>

        {entry ? (
          <>
            <div
              className="hero"
              style={{ background: entry.color, color: readableTextOn(entry.color), minHeight: 96 }}
            >
              <strong style={{ fontSize: 22 }}>{t(`emotions.${entry.emotion}`)}</strong>
            </div>
            <EntryPhotos entry={entry} alt={t(`emotions.${entry.emotion}`)} />
            {entry.note ? <p>{entry.note}</p> : null}
            <DayReactions entry={entry} />
          </>
        ) : hidden ? (
          <div className="hero hero--empty stack-sm">
            <strong>{t('calendar.hiddenDay')}</strong>
            <span className="small">{t('calendar.hiddenHint')}</span>
          </div>
        ) : (
          <div className="hero hero--empty">{t('calendar.noEntry')}</div>
        )}
      </div>
    </div>
  );
}
