import { useEffect, useMemo, useRef, useState } from 'react';

import { Camera } from '@/components/Camera';
import { EmotionGrid } from '@/components/EmotionGrid';
import { EntryPhotos, PhotoPair } from '@/components/PhotoPair';
import { DayReactions } from '@/components/Reactions';
import { ErrorBanner, OfflineBanner } from '@/components/States';
import { formatLongDate, todayInTimeZone } from '@/lib/dates';
import { colorOf, readableTextOn, veilOpacity, washGradient } from '@/lib/emotions';
import type { Shot } from '@/lib/photo';
import type { Entry } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useEntries } from '@/state/EntriesProvider';
import { useI18n } from '@/state/I18nProvider';

type Panel = 'mine' | 'theirs';

export function TodayScreen() {
  const { t, locale } = useI18n();
  const { partner } = useAuth();
  const { today, mine, partnerEntries, submitToday, pending, online } = useEntries();

  const [panel, setPanel] = useState<Panel>('mine');
  const [editing, setEditing] = useState(false);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [shot, setShot] = useState<Shot | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myEntry = mine[today] ?? null;
  const done = Boolean(myEntry) || Boolean(pending);
  const composing = !done || editing;

  const previewUrls = useMemo(
    () => ({
      main: shot ? URL.createObjectURL(shot.main) : null,
      selfie: shot?.selfie ? URL.createObjectURL(shot.selfie) : null,
    }),
    [shot],
  );
  useEffect(() => {
    return () => {
      if (previewUrls.main) URL.revokeObjectURL(previewUrls.main);
      if (previewUrls.selfie) URL.revokeObjectURL(previewUrls.selfie);
    };
  }, [previewUrls]);

  // Une nouvelle journée : le composeur repart de zéro.
  useEffect(() => {
    setEditing(false);
    setEmotion(null);
    setShot(null);
    setNote('');
  }, [today]);

  const startEditing = () => {
    setEmotion(myEntry?.emotion ?? pending?.emotion ?? null);
    setNote(myEntry?.note ?? pending?.note ?? '');
    setShot(null);
    setEditing(true);
    setError(null);
  };

  const cancelEditing = () => {
    setEditing(false);
    setShot(null);
    setError(null);
  };

  const submit = async () => {
    if (!emotion) return;
    setBusy(true);
    setError(null);
    try {
      await submitToday({ emotion, shot, note });
      setEditing(false);
      setShot(null);
    } catch (caught) {
      // On affiche le message brut du serveur : sur un envoi de photo ou une
      // écriture refusée, c'est lui qui dit ce qui ne va pas, pas nous.
      const detail = (caught as { message?: string })?.message;
      setError(detail ? `${t('common.unknownError')} — ${detail}` : t('common.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  // Un glissement horizontal fait la même chose que les flèches : sur un
  // téléphone, c'est le geste qu'on tente d'instinct.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    // On ignore les gestes trop verticaux : ce sont des défilements.
    if (Math.abs(dx) < 60 || Math.abs(touch.clientY - start.y) > Math.abs(dx)) return;
    setPanel(dx < 0 ? 'theirs' : 'mine');
  };

  const other: Panel = panel === 'mine' ? 'theirs' : 'mine';
  const partnerName = partner?.display_name || t('calendar.partner');

  // Le lavis du jour : la couleur choisie ne reste pas une pastille, elle
  // teint le haut de l'écran. Avant tout choix, le papier reste nu.
  const myColor = !composing ? (myEntry?.color ?? pending?.color ?? null) : emotion ? colorOf(emotion) : null;
  const theirEntry = partner ? (partnerEntries[todayInTimeZone(partner.timezone)] ?? null) : null;
  const theirColor = done && theirEntry ? theirEntry.color : null;
  const washColor = panel === 'mine' ? myColor : theirColor;

  return (
    <div className="stack today-screen">
      {washColor ? (
        <div
          className="wash"
          aria-hidden
          style={
            {
              '--wash-light': washGradient(washColor, false),
              '--wash-dark': washGradient(washColor, true),
            } as React.CSSProperties
          }
        />
      ) : null}
      <div className="stack-sm">
        <h1>{t('today.title')}</h1>
        <p className="faint small capitalize">{formatLongDate(today, locale)}</p>
      </div>

      {!online ? <OfflineBanner /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      <div className="switcher">
        <button
          type="button"
          className="btn btn--icon"
          aria-label={t('calendar.previous')}
          onClick={() => setPanel(other)}
        >
          ‹
        </button>
        <strong>{panel === 'mine' ? t('today.mine') : t('today.partnerTitle')}</strong>
        <button
          type="button"
          className="btn btn--icon"
          aria-label={t('calendar.next')}
          onClick={() => setPanel(other)}
        >
          ›
        </button>
      </div>

      <div className="dots" aria-hidden>
        <span className="dot-nav" data-active={panel === 'mine'} />
        <span className="dot-nav" data-active={panel === 'theirs'} />
      </div>

      <div className="panel" key={panel} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {panel === 'mine' ? (
          composing ? (
            <Composer
              editing={editing}
              entry={myEntry}
              emotion={emotion}
              onEmotion={setEmotion}
              shot={shot}
              previewUrls={previewUrls}
              onShot={setShot}
              note={note}
              onNote={setNote}
              busy={busy}
              onSubmit={() => void submit()}
              onCancel={cancelEditing}
            />
          ) : (
            <MyDay
              entry={myEntry}
              pendingColor={pending?.color ?? null}
              pendingEmotion={pending?.emotion ?? null}
              pendingNote={pending?.note ?? null}
              isPending={Boolean(pending)}
              onEdit={startEditing}
            />
          )
        ) : (
          <TheirDay unlocked={done} entries={partnerEntries} name={partnerName} />
        )}
      </div>
    </div>
  );
}

type ComposerProps = {
  editing: boolean;
  entry: Entry | null;
  emotion: string | null;
  onEmotion: (value: string | null) => void;
  shot: Shot | null;
  previewUrls: { main: string | null; selfie: string | null };
  onShot: (value: Shot | null) => void;
  note: string;
  onNote: (value: string) => void;
  busy: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

function Composer({
  editing,
  entry,
  emotion,
  onEmotion,
  shot,
  previewUrls,
  onShot,
  note,
  onNote,
  busy,
  onSubmit,
  onCancel,
}: ComposerProps) {
  const { t } = useI18n();
  // En correction, la photo déjà enregistrée fait foi tant qu'on n'en reprend
  // pas une autre : on n'oblige pas à tout refaire pour changer une émotion.
  const [retaking, setRetaking] = useState(false);
  const keepsExistingPhoto = editing && !shot && !retaking && Boolean(entry?.photo_path);

  return (
    <div className="stack">
      {emotion ? (
        <div className="card row-between">
          <span className="row">
            <span
              className="emotion-dot"
              style={{ background: colorOf(emotion) ?? undefined, width: 26, height: 26 }}
              aria-hidden
            >
              <span
                className="emotion-dot__veil"
                style={{ '--veil': veilOpacity(emotion) } as React.CSSProperties}
              />
              <span className="emotion-dot__sheen" />
            </span>
            <span>{t(`emotions.${emotion}`)}</span>
          </span>
          <button type="button" className="btn" onClick={() => onEmotion(null)}>
            {t('today.change')}
          </button>
        </div>
      ) : (
        <>
          <p className="muted">{t('today.chooseEmotion')}</p>
          <EmotionGrid value={emotion} onChange={onEmotion} />
        </>
      )}

      {emotion ? (
        <>
          <div className="stack-sm">
            <span className="section-title" style={{ marginBottom: 0 }}>
              {t('today.photoStep')}
            </span>
            <p className="faint small">
              {keepsExistingPhoto ? t('today.keptPhoto') : t('today.photoHint')}
            </p>
          </div>

          {previewUrls.main ? (
            <div className="stack">
              <PhotoPair
                main={<img className="photo" src={previewUrls.main} alt={t('today.photoStep')} />}
                inset={
                  previewUrls.selfie ? (
                    <img className="photo" src={previewUrls.selfie} alt={t('today.selfieStep')} />
                  ) : null
                }
              />
              <button type="button" className="btn" onClick={() => onShot(null)}>
                {t('today.retake')}
              </button>
            </div>
          ) : keepsExistingPhoto ? (
            <div className="stack">
              <EntryPhotos entry={entry} />
              <button type="button" className="btn" onClick={() => setRetaking(true)}>
                {t('today.retakePhoto')}
              </button>
            </div>
          ) : (
            <Camera onCapture={onShot} />
          )}

          <div className="field">
            <label htmlFor="note">{t('today.noteLabel')}</label>
            <input
              id="note"
              className="input"
              maxLength={140}
              placeholder={t('today.notePlaceholder')}
              value={note}
              onChange={(event) => onNote(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={onSubmit}
            disabled={busy || (!shot && !keepsExistingPhoto)}
          >
            {busy ? t('today.submitting') : editing ? t('today.save') : t('today.submit')}
          </button>

          {editing ? (
            <button type="button" className="btn btn--block btn--ghost" onClick={onCancel} disabled={busy}>
              {t('today.cancel')}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

type MyDayProps = {
  entry: Entry | null;
  isPending: boolean;
  pendingColor: string | null;
  pendingEmotion: string | null;
  pendingNote: string | null;
  onEdit: () => void;
};

function MyDay({ entry, isPending, pendingColor, pendingEmotion, pendingNote, onEdit }: MyDayProps) {
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
      {entry?.photo_path ? <EntryPhotos entry={entry} /> : null}
      {note ? <p>{note}</p> : null}
      <DayReactions entry={entry} />
      <p className="faint small">{isPending ? t('today.pending') : t('today.lockedHint')}</p>
      {isPending ? null : (
        <button type="button" className="btn btn--block" onClick={onEdit}>
          {t('today.edit')}
        </button>
      )}
    </div>
  );
}

/**
 * Réciprocité : la journée du binôme n'apparaît qu'une fois la mienne validée.
 * Elle est cherchée à SA date locale à lui — si je suis à Paris et lui à
 * Mexico, ce n'est pas le même jour au même instant, et c'est normal.
 */
function TheirDay({
  unlocked,
  entries,
  name,
}: {
  unlocked: boolean;
  entries: Record<string, Entry>;
  name: string;
}) {
  const { t, locale } = useI18n();
  const { partner } = useAuth();

  if (!partner) return <div className="hero hero--empty">{t('today.partnerNoLink')}</div>;
  if (!unlocked) return <div className="hero hero--empty">{t('today.partnerHidden')}</div>;

  const entry = entries[todayInTimeZone(partner.timezone)] ?? null;
  if (!entry) return <div className="hero hero--empty">{t('today.partnerWaiting', { name })}</div>;

  return (
    <div className="stack">
      <div
        className="hero"
        style={{ background: entry.color, color: readableTextOn(entry.color), minHeight: 96 }}
      >
        <strong style={{ fontSize: 20 }}>{t(`emotions.${entry.emotion}`)}</strong>
      </div>
      <p className="faint small capitalize">{formatLongDate(entry.date, locale)}</p>
      <EntryPhotos entry={entry} alt={t(`emotions.${entry.emotion}`)} />
      {entry.note ? <p>{entry.note}</p> : null}
      <DayReactions entry={entry} />
    </div>
  );
}
