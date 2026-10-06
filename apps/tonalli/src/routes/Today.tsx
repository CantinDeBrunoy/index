import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Camera } from '@/components/Camera';
import { Character } from '@/components/Character';
import { DuoScene } from '@/components/DuoScene';
import { EmotionGrid } from '@/components/EmotionGrid';
import { EntryPhotos, PhotoPair } from '@/components/PhotoPair';
import { InkReveal } from '@/components/InkReveal';
import { QuickReactions, ReceivedReaction } from '@/components/Reactions';
import { SaveBloom } from '@/components/SaveBloom';
import type { Origin } from '@/components/SaveBloom';
import { ErrorBanner, OfflineBanner } from '@/components/States';
import { Tip } from '@/components/Tip';
import { readCache, writeCache } from '@/lib/cache';
import { outfitOf } from '@/lib/character';
import type { Outfit } from '@/lib/character';
import { formatDayLabel, formatTimeIn, offsetBetween, todayInTimeZone } from '@/lib/dates';
import {
  DEFAULT_INTENSITY,
  INTENSITIES,
  intensityOf,
  isEmotionKey,
  readableTextOn,
  shadeOf,
} from '@/lib/emotions';
import { gestureOf } from '@/lib/ink';
import type { Intensity } from '@/lib/emotions';
import type { Gesture } from '@/lib/ink';
import type { Shot } from '@/lib/photo';
import type { Entry } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useEntries } from '@/state/EntriesProvider';
import { useI18n } from '@/state/I18nProvider';

type Step = 'emotion' | 'photo';

/** « Gratitude · franche » : l'émotion et son cran, sur sa propre couleur. */
function ChosenPill({ emotion, intensity, color }: { emotion: string; intensity: Intensity | null; color: string }) {
  const { t } = useI18n();
  return (
    <span className="chosen-pill" style={{ background: color, color: readableTextOn(color) }}>
      {t('today.chosenLabel', {
        emotion: t(`emotions.${emotion}`),
        intensity: intensity ? t(`today.intensities.${intensity}`).toLowerCase() : '',
      })}
    </span>
  );
}

/** Le haut d'une étape : le retour, et le titre. */
function StepHeader({
  title,
  subtitle,
  onBack,
  backLabel,
  aside,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="step-header">
      <button type="button" className="btn btn--icon back-button" onClick={onBack} aria-label={backLabel}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 5 L8 12 L15 19" />
        </svg>
      </button>
      {subtitle ? (
        // Avec un sous-titre, la pastille passe sur sa ligne : le retour, le
        // titre et la pastille ne tiennent pas côte à côte sur un téléphone.
        <div className="step-header__text">
          <h1 className="step-header__title">{title}</h1>
          <div className="step-header__sub">
            <p className="step-header__subtitle capitalize">{subtitle}</p>
            {aside}
          </div>
        </div>
      ) : (
        <>
          <h1 className="step-header__title">{title}</h1>
          {aside}
        </>
      )}
    </div>
  );
}

/**
 * Ma journée, ouverte depuis la page Aujourd'hui, en trois temps comme sur
 * les maquettes : l'émotion (et son cran), la photo, puis la journée
 * enregistrée. Une fois validée, on peut encore la reprendre jusqu'à minuit
 * — le passé, lui, ne se réécrit pas (voir la policy UPDATE de `entries`).
 */
export function MyDayScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { today, mine, submitToday, pending, online } = useEntries();
  const { profile } = useAuth();
  const outfit = outfitOf(profile);

  const [step, setStep] = useState<Step>('emotion');
  const [editing, setEditing] = useState(false);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<Intensity>(DEFAULT_INTENSITY);
  const [shot, setShot] = useState<Shot | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // En correction, la photo déjà enregistrée fait foi tant qu'on n'en reprend
  // pas une autre : on n'oblige pas à tout refaire pour changer une émotion.
  const [retaking, setRetaking] = useState(false);
  /** Couleur et point de départ de l'encre, après une validation. */
  const [bloom, setBloom] = useState<{ color: string; from: Origin; gesture: Gesture } | null>(null);
  // Référence stable : un nouveau rendu du parent relancerait sinon le
  // compte à rebours, et la couleur ne se retirerait jamais.
  const endBloom = useCallback(() => setBloom(null), []);

  const myEntry = mine[today] ?? null;
  const done = Boolean(myEntry) || Boolean(pending);
  const composing = !done || editing;
  const keepsExistingPhoto = editing && !shot && !retaking && Boolean(myEntry?.photo_path);

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

  // Une nouvelle journée : le parcours repart de zéro.
  useEffect(() => {
    setEditing(false);
    setStep('emotion');
    setEmotion(null);
    setIntensity(DEFAULT_INTENSITY);
    setShot(null);
    setNote('');
    setBloom(null);
  }, [today]);

  const startEditing = () => {
    const previous = myEntry ?? pending;
    setEmotion(previous?.emotion ?? null);
    // Le cran se relit de la couleur enregistrée : une correction repart de ce
    // qui avait été choisi, pas du cran par défaut.
    setIntensity((previous ? intensityOf(previous.emotion, previous.color) : null) ?? DEFAULT_INTENSITY);
    setNote(myEntry?.note ?? pending?.note ?? '');
    setShot(null);
    setRetaking(false);
    setStep('emotion');
    setEditing(true);
    setError(null);
  };

  const cancelEditing = () => {
    setEditing(false);
    setShot(null);
    setError(null);
  };

  // Le point de départ est relevé **au moment de l'appui** : le bouton
  // disparaît avec le parcours dès que la journée est enregistrée, et sa
  // position ne serait plus lisible après.
  const submit = async (origin: Origin) => {
    if (!emotion) return;
    setBusy(true);
    setError(null);
    try {
      await submitToday({ emotion, intensity, shot, note });
      // La couleur ne s'épanouit qu'à la première validation. Une correction
      // est une correction : lui donner la même cérémonie userait le geste.
      const color = shadeOf(emotion, intensity);
      if (!editing && color) setBloom({ color, from: origin, gesture: gestureOf(emotion) });
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

  const color = emotion ? shadeOf(emotion, intensity) : null;
  // Le personnage qui parle dans les bulles : moi, dans l'émotion choisie.
  const speaker =
    emotion && isEmotionKey(emotion) ? <Character emotion={emotion} color={color} outfit={outfit} size={50} still /> : null;

  return (
    <div className="stack day-flow">
      {bloom ? (
        <SaveBloom color={bloom.color} from={bloom.from} gesture={bloom.gesture} message={t('today.sealed')} onDone={endBloom} />
      ) : null}
      {!online ? <OfflineBanner /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {!composing ? (
        <ValidatedDay onResume={startEditing} />
      ) : step === 'emotion' || !emotion ? (
        <>
          <StepHeader
            title={t('today.feelTitle')}
            backLabel={t('today.overview.back')}
            onBack={() => (editing ? cancelEditing() : navigate('/'))}
          />
          {/* Le personnage répond au choix : il prend l'émotion, et le cran change sa teinte sous les yeux. */}
          <div className="day-flow__character">
            {emotion && isEmotionKey(emotion) ? (
              <Character emotion={emotion} color={color} outfit={outfit} size={132} />
            ) : (
              <Character emotion={null} state="waiting" outfit={outfit} size={132} />
            )}
          </div>
          <EmotionGrid value={emotion} onChange={setEmotion} />
          <div className="stack-sm">
            <span className="day-flow__label" id="intensity-label">
              {t('today.intensityStep')}
            </span>
            <div className="intensities" role="radiogroup" aria-labelledby="intensity-label">
              {INTENSITIES.map((level) => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  className="intensity"
                  aria-checked={intensity === level}
                  onClick={() => setIntensity(level)}
                >
                  {t(`today.intensities.${level}`)}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--block btn--tall day-flow__next"
            disabled={!emotion}
            onClick={() => setStep('photo')}
          >
            {t('today.continue')}
          </button>
        </>
      ) : (
        <>
          <StepHeader title={t('today.photoStep')} backLabel={t('today.backToEmotion')} onBack={() => setStep('emotion')} />
          <StepProgress current={shot || keepsExistingPhoto ? 3 : 2} color={color ?? 'var(--text)'}>
            <ChosenPill emotion={emotion} intensity={intensity} color={color ?? '#D8D8D8'} />
          </StepProgress>

          {previewUrls.main ? (
            <PhotoPair
              main={<img className="photo" src={previewUrls.main} alt={t('today.photoStep')} />}
              inset={previewUrls.selfie ? <img className="photo" src={previewUrls.selfie} alt={t('today.selfieStep')} /> : null}
            />
          ) : keepsExistingPhoto ? (
            <EntryPhotos entry={myEntry} />
          ) : (
            <Camera onCapture={setShot} color={color} speaker={speaker} />
          )}

          {previewUrls.main || keepsExistingPhoto ? (
            <>
              <div className="note-card">
                <label htmlFor="note">{t('today.noteLabel')}</label>
                <input
                  id="note"
                  maxLength={140}
                  placeholder={t('today.notePlaceholder')}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
              <div className="day-flow__actions">
                <button
                  type="button"
                  className="btn btn--outline btn--tall"
                  onClick={() => (keepsExistingPhoto ? setRetaking(true) : setShot(null))}
                  disabled={busy}
                >
                  {keepsExistingPhoto ? t('today.retakePhoto') : t('today.retake')}
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--tall grow"
                  disabled={busy}
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    void submit({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                  }}
                >
                  {busy ? t('today.submitting') : editing ? t('today.save') : t('today.submit')}
                </button>
              </div>
              <Tip speaker={speaker}>
                <span>{keepsExistingPhoto ? t('today.keptPhoto') : t('today.insetHint')}</span>
              </Tip>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Les trois étapes en trois traits : faites dans la teinte du jour, en cours à l'encre. */
function StepProgress({ current, color, children }: { current: 1 | 2 | 3; color: string; children?: React.ReactNode }) {
  const { t } = useI18n();
  const names = ['emotion', 'photo', 'check'] as const;
  return (
    <div className="step-progress">
      <div
        className="step-progress__bars"
        role="img"
        aria-label={t('today.step', { current, name: t(`today.stepNames.${names[current - 1]}`) })}
      >
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className="step-progress__bar"
            data-state={n < current ? 'done' : n === current ? 'current' : 'todo'}
            style={n < current ? { background: color } : undefined}
          />
        ))}
      </div>
      {children}
    </div>
  );
}

/** Ma journée enregistrée : l'émotion, les photos, la note, et de quoi la reprendre. */
function ValidatedDay({ onResume }: { onResume: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { today, mine, pending } = useEntries();
  const entry = mine[today] ?? null;
  const color = entry?.color ?? pending?.color ?? '#D8D8D8';
  const emotion = entry?.emotion ?? pending?.emotion ?? null;
  const note = entry?.note ?? pending?.note ?? null;
  const isPending = Boolean(pending) && !entry;

  return (
    <>
      <StepHeader
        title={t('today.mine')}
        backLabel={t('today.overview.back')}
        onBack={() => navigate('/')}
        aside={emotion ? <ChosenPill emotion={emotion} intensity={intensityOf(emotion, color)} color={color} /> : null}
      />
      <div className="day-flow__character day-flow__character--small">
        <Character emotion={isEmotionKey(emotion) ? emotion : null} color={color} outfit={outfitOf(profile)} size={84} />
      </div>
      {entry?.photo_path ? (
        <div className="photo-with-pill">
          <EntryPhotos entry={entry} />
          <ReceivedReaction entry={entry} />
        </div>
      ) : null}
      {note ? <p className="note-quote">« {note} »</p> : null}
      {isPending ? (
        <p className="faint small">{t('today.pending')}</p>
      ) : (
        <div className="resume-row">
          <span className="faint small">{t('today.resumeHint')}</span>
          <button type="button" className="btn btn--primary" onClick={onResume}>
            {t('today.resume')}
          </button>
        </div>
      )}
    </>
  );
}

/**
 * La journée du binôme, ouverte depuis la page Aujourd'hui, comme sur la
 * maquette : son titre et l'heure de son fuseau, la carte de sa journée — photos,
 * bandeau de sa couleur avec son personnage —, sa note, et les réactions.
 *
 * Réciprocité : elle n'apparaît qu'une fois ma journée validée, et elle est
 * cherchée à SA date locale — si je suis à Paris et lui à Mexico, ce n'est
 * pas le même jour au même instant, et c'est normal. Elle arrive sous sa
 * couleur et se découvre au toucher (`InkReveal`) ; la pastille de son
 * émotion, en tête, attend la découverte pour paraître.
 */
export function TheirDayScreen() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { partner, user, profile } = useAuth();
  const { today, mine, pending, partnerEntries, online } = useEntries();
  const name = partner?.display_name || t('calendar.partner');
  const done = Boolean(mine[today]) || Boolean(pending);
  const theirToday = partner ? todayInTimeZone(partner.timezone) : today;
  const entry = partner && done ? (partnerEntries[theirToday] ?? null) : null;

  // Une journée du binôme ne se découvre qu'une fois : revenir sur l'écran,
  // ou le voir se rafraîchir, ne rejoue pas la cérémonie. Le souvenir est
  // gardé sur l'appareil, par journée — c'est un confort d'affichage, pas une
  // vérité à partager, et la base n'a pas à le savoir.
  const [revealedNow, setRevealedNow] = useState<string | null>(null);
  const seen = entry && user ? readCache<string[]>('revealed', user.id, []).includes(entry.id) : false;
  const shown = Boolean(entry) && (seen || revealedNow === entry?.id);
  const remember = () => {
    if (!user || !entry) return;
    const kept = readCache<string[]>('revealed', user.id, []).filter((id) => id !== entry.id);
    // Deux semaines suffisent : on ne revient pas découvrir une journée
    // passée, et la liste ne doit pas grossir sans fin.
    writeCache('revealed', user.id, [entry.id, ...kept].slice(0, 14));
    setRevealedNow(entry.id);
  };

  // L'heure à laquelle sa journée a été posée, dans son fuseau, en coin de
  // photo : elle ne se montre qu'une fois la journée découverte, avec le reste.
  const time = shown && entry && partner ? formatTimeIn(entry.created_at, partner.timezone, locale) : null;
  // « heure de Léa » seulement si son heure n'est pas la mienne.
  const elsewhere = partner && profile ? offsetBetween(partner.timezone, profile.timezone) !== 0 : false;
  const when = time ? (elsewhere ? t('today.theirTime', { time, name }) : time) : null;

  return (
    <div className="stack their-day">
      <StepHeader
        title={t('today.theirDayTitle', { name })}
        subtitle={formatDayLabel(theirToday, locale)}
        backLabel={t('today.overview.back')}
        onBack={() => navigate('/')}
        aside={
          shown && entry ? (
            <ChosenPill emotion={entry.emotion} intensity={intensityOf(entry.emotion, entry.color)} color={entry.color} />
          ) : null
        }
      />
      {!online ? <OfflineBanner /> : null}

      {!partner ? (
        <div className="hero hero--empty">{t('today.partnerNoLink')}</div>
      ) : !done ? (
        <div className="hero hero--empty">{t('today.partnerHidden')}</div>
      ) : !entry ? (
        <div className="hero hero--empty">
          <div className="stack-sm center">
            {/* Sa journée n'a pas encore de teinte : son personnage attend. */}
            <Character emotion={null} state="waiting" outfit={outfitOf(partner)} size={80} className="character--centered" />
            <span>{t('today.partnerWaiting', { name })}</span>
          </div>
        </div>
      ) : (
        <InkReveal
          key={entry.id}
          color={entry.color}
          gesture={gestureOf(entry.emotion)}
          label={t('today.reveal', { name })}
          hint={t('today.revealHint')}
          initiallyOpen={seen}
          onReveal={remember}
        >
          <TheirDay entry={entry} when={when} />
        </InkReveal>
      )}
    </div>
  );
}

/** Sa journée découverte : la carte (photos et bandeau), sa note, les réactions. */
function TheirDay({ entry, when }: { entry: Entry; when: string | null }) {
  const { t } = useI18n();
  const { partner } = useAuth();
  const { myReactions } = useEntries();
  const mine = myReactions[entry.id];
  const ink = readableTextOn(entry.color);

  return (
    <div className="stack their-day__body">
      <div className="their-card">
        <div className="their-card__photo">
          <EntryPhotos entry={entry} alt={t(`emotions.${entry.emotion}`)} />
          {when ? <span className="their-card__time">{when}</span> : null}
        </div>
        {/* Sa couleur, son personnage et ce qu'il fait. Le bandeau était sous
            la nappe avec le reste : il garde sa couleur une fois découvert. */}
        <div className="their-band" style={{ background: entry.color, color: ink }}>
          {isEmotionKey(entry.emotion) ? (
            <Character emotion={entry.emotion} color={entry.color} outfit={outfitOf(partner)} size={66} className="their-band__character" />
          ) : null}
          <span className="their-band__text">
            <strong className="their-band__emotion">{t(`emotions.${entry.emotion}`)}</strong>
            {isEmotionKey(entry.emotion) ? <span className="their-band__gesture">{t(`today.gestures.${entry.emotion}`)}</span> : null}
          </span>
          {/* Ma réaction, rappelée sur sa carte. Les boutons plus bas disent
              déjà laquelle est choisie : ici, elle est muette. */}
          {mine ? (
            <span className="their-band__reaction" aria-hidden>
              {mine.emoji}
            </span>
          ) : null}
        </div>
      </div>
      {entry.note ? <p className="note-quote">« {entry.note} »</p> : null}
      <QuickReactions entry={entry} tint={shadeOf(entry.emotion, 'light')} />
    </div>
  );
}

/**
 * Nos deux personnages dans la même scène. Elle vit sous la nappe de couleur
 * de sa journée : elle montre son émotion, donc elle se découvre avec elle,
 * au toucher, jamais avant.
 */
export function PairScene({
  mine,
  pending,
  theirs,
  name,
  profileOutfit,
  partnerOutfit,
}: {
  mine: Entry | null;
  pending: { emotion: string; color: string } | null;
  theirs: Entry;
  name: string;
  profileOutfit: Outfit;
  partnerOutfit: Outfit;
}) {
  const { t } = useI18n();
  const myEmotion = mine?.emotion ?? pending?.emotion ?? null;
  const myColor = mine?.color ?? pending?.color ?? null;
  if (!isEmotionKey(myEmotion) || !myColor || !isEmotionKey(theirs.emotion)) return null;
  const sides = {
    me: { emotion: myEmotion, color: myColor, outfit: profileOutfit },
    partner: { emotion: theirs.emotion, color: theirs.color, outfit: partnerOutfit },
  };
  const scripted = sides.me.emotion !== 'neutral' && sides.partner.emotion !== 'neutral';
  const label = t(scripted ? 'duo.together' : 'duo.apart', {
    mine: t(`emotions.${sides.me.emotion}`),
    theirs: t(`emotions.${sides.partner.emotion}`),
    name,
  });
  return <DuoScene me={sides.me} partner={sides.partner} label={label} />;
}

