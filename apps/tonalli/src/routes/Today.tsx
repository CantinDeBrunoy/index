import { useEffect, useMemo, useState } from 'react';

import { Camera } from '@/components/Camera';
import { EmotionGrid } from '@/components/EmotionGrid';
import { PhotoImage } from '@/components/PhotoImage';
import { ErrorBanner, OfflineBanner } from '@/components/States';
import { formatLongDate, todayInTimeZone } from '@/lib/dates';
import { colorOf, readableTextOn } from '@/lib/emotions';
import type { Entry } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useEntries } from '@/state/EntriesProvider';
import { useI18n } from '@/state/I18nProvider';

export function TodayScreen() {
  const { t, locale } = useI18n();
  const { partner } = useAuth();
  const { today, mine, partnerEntries, submitToday, pending, online } = useEntries();

  const [emotion, setEmotion] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myEntry = mine[today] ?? null;
  const previewUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Une nouvelle journée : le composeur repart de zéro.
  useEffect(() => {
    setEmotion(null);
    setPhoto(null);
    setNote('');
  }, [today]);

  const submit = async () => {
    if (!emotion) return;
    setBusy(true);
    setError(null);
    try {
      await submitToday({ emotion, photo, note });
    } catch (caught) {
      // On affiche le message brut du serveur : sur un envoi de photo ou une
      // écriture refusée, c'est lui qui dit ce qui ne va pas, pas nous.
      const detail = (caught as { message?: string })?.message;
      setError(detail ? `${t('common.unknownError')} — ${detail}` : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  const done = Boolean(myEntry) || Boolean(pending);

  return (
    <div className="stack">
      <div className="stack-sm">
        <h1>{t('today.title')}</h1>
        <p className="faint small capitalize">{formatLongDate(today, locale)}</p>
      </div>

      {!online ? <OfflineBanner /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {done ? (
        <LockedDay entry={myEntry} pendingColor={pending?.color ?? null} pendingEmotion={pending?.emotion ?? null} pendingNote={pending?.note ?? null} isPending={Boolean(pending)} />
      ) : (
        <div className="stack">
          {emotion ? (
            <div className="card row-between">
              <span className="row">
                <span
                  className="emotion-dot"
                  style={{ background: colorOf(emotion) ?? undefined, width: 26, height: 26 }}
                  aria-hidden
                />
                <span>{t(`emotions.${emotion}`)}</span>
              </span>
              <button type="button" className="btn" onClick={() => setEmotion(null)}>
                {t('today.change')}
              </button>
            </div>
          ) : (
            <>
              <p className="muted">{t('today.chooseEmotion')}</p>
              <EmotionGrid value={emotion} onChange={setEmotion} />
            </>
          )}

          {emotion ? (
            <>
              <div className="stack-sm">
                <span className="section-title" style={{ marginBottom: 0 }}>
                  {t('today.photoStep')}
                </span>
                <p className="faint small">{t('today.photoHint')}</p>
              </div>

              {previewUrl ? (
                <div className="stack">
                  <img className="photo" src={previewUrl} alt={t('today.photoStep')} />
                  <button type="button" className="btn" onClick={() => setPhoto(null)}>
                    {t('today.retake')}
                  </button>
                </div>
              ) : (
                <Camera onCapture={setPhoto} />
              )}

              <div className="field">
                <label htmlFor="note">{t('today.noteLabel')}</label>
                <input
                  id="note"
                  className="input"
                  maxLength={140}
                  placeholder={t('today.notePlaceholder')}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>

              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={() => void submit()}
                disabled={busy || !photo}
              >
                {busy ? t('today.submitting') : t('today.submit')}
              </button>
            </>
          ) : null}
        </div>
      )}

      <PartnerReveal unlocked={done} partnerEntry={partner ? partnerEntries : null} />
    </div>
  );
}

type LockedProps = {
  entry: Entry | null;
  isPending: boolean;
  pendingColor: string | null;
  pendingEmotion: string | null;
  pendingNote: string | null;
};

function LockedDay({ entry, isPending, pendingColor, pendingEmotion, pendingNote }: LockedProps) {
  const { t } = useI18n();
  const color = entry?.color ?? pendingColor ?? '#D8D8D8';
  const emotion = entry?.emotion ?? pendingEmotion;
  const note = entry?.note ?? pendingNote;

  return (
    <div className="stack">
      <div className="hero" style={{ background: color, color: readableTextOn(color) }}>
        <div className="stack-sm">
          <strong style={{ fontSize: 22 }}>{emotion ? t(`emotions.${emotion}`) : ''}</strong>
          <span className="small">{t('today.lockedTitle')}</span>
        </div>
      </div>
      {entry?.photo_path ? <PhotoImage path={entry.photo_path} alt={t('today.photoStep')} /> : null}
      {note ? <p>{note}</p> : null}
      <p className="faint small">{isPending ? t('today.pending') : t('today.lockedHint')}</p>
    </div>
  );
}

/**
 * Réciprocité : la journée du binôme n'apparaît qu'une fois la mienne validée.
 * Elle est cherchée à SA date locale à lui — si je suis à Paris et lui à
 * Mexico, ce n'est pas le même jour au même instant, et c'est normal.
 */
function PartnerReveal({
  unlocked,
  partnerEntry,
}: {
  unlocked: boolean;
  partnerEntry: Record<string, Entry> | null;
}) {
  const { t, locale } = useI18n();
  const { partner } = useAuth();

  if (!partner) {
    return (
      <>
        <span className="section-title">{t('today.partnerTitle')}</span>
        <p className="muted small">{t('today.partnerNoLink')}</p>
      </>
    );
  }

  const partnerToday = todayInTimeZone(partner.timezone);
  const entry = partnerEntry?.[partnerToday] ?? null;
  const name = partner.display_name || '—';

  return (
    <>
      <span className="section-title">{t('today.partnerTitle')}</span>
      {!unlocked ? (
        <div className="hero hero--empty">{t('today.partnerHidden')}</div>
      ) : entry ? (
        <div className="stack">
          <div
            className="hero"
            style={{ background: entry.color, color: readableTextOn(entry.color), minHeight: 96 }}
          >
            <strong style={{ fontSize: 20 }}>{t(`emotions.${entry.emotion}`)}</strong>
          </div>
          <p className="faint small capitalize">{formatLongDate(entry.date, locale)}</p>
          <PhotoImage path={entry.photo_path} alt={t(`emotions.${entry.emotion}`)} />
          {entry.note ? <p>{entry.note}</p> : null}
        </div>
      ) : (
        <div className="hero hero--empty">{t('today.partnerWaiting', { name })}</div>
      )}
    </>
  );
}
