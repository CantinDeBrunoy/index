import { Link } from 'react-router-dom';

import { Character } from '@/components/Character';
import { StreakBadge } from '@/components/Streak';
import { OfflineBanner } from '@/components/States';
import { readCache } from '@/lib/cache';
import { outfitOf } from '@/lib/character';
import { formatLongDate, todayInTimeZone } from '@/lib/dates';
import { sceneNoteKey } from '@/lib/duo';
import { intensityOf, isEmotionKey, readableTextOn } from '@/lib/emotions';
import type { EmotionKey } from '@/lib/emotions';
import { useAuth } from '@/state/AuthProvider';
import { useEntries } from '@/state/EntriesProvider';
import { useI18n } from '@/state/I18nProvider';
import { PairScene } from '@/routes/Today';

const Chevron = () => (
  <svg className="tile__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 5 L16 12 L9 19" />
  </svg>
);

/**
 * La page Aujourd'hui : nos deux personnages, une phrase qui dit où on en est,
 * et les portes vers ma journée et la sienne.
 *
 * Sa journée garde sa surprise. Tant qu'elle n'est pas découverte, on ne voit
 * que sa couleur : son personnage en porte la teinte mais se tient immobile,
 * sans le geste qui dirait son émotion, et sa carte invite à la découvrir. Une
 * fois découverte (au toucher, une seule fois — voir `TheirDay`), la page
 * montre la scène à deux, et la phrase qui la raconte.
 *
 * Tant que je n'ai pas rempli la mienne, la base ne me rend pas la sienne :
 * tout au plus sa date, qui suffit à dire qu'elle est faite, jamais ce
 * qu'elle contient.
 */
export function TodayOverview() {
  const { t, locale } = useI18n();
  const { profile, partner, user } = useAuth();
  const { today, mine, pending, partnerEntries, partnerDates, online } = useEntries();

  const name = partner?.display_name || t('calendar.partner');
  const myEntry = mine[today] ?? null;
  const done = Boolean(myEntry) || Boolean(pending);
  const myEmotion = myEntry?.emotion ?? pending?.emotion ?? null;
  const myColor = myEntry?.color ?? pending?.color ?? null;

  const partnerToday = partner ? todayInTimeZone(partner.timezone) : null;
  const theirEntry = partnerToday ? (partnerEntries[partnerToday] ?? null) : null;
  const theirDone = Boolean(theirEntry) || (partnerToday ? partnerDates.has(partnerToday) : false);
  // Le souvenir de la découverte vit sur l'appareil, écrit par `TheirDay`.
  const revealed = Boolean(theirEntry && user && readCache<string[]>('revealed', user.id, []).includes(theirEntry.id));
  const together = done && revealed && theirEntry && isEmotionKey(myEmotion) && isEmotionKey(theirEntry.emotion);

  const note = !done
    ? theirDone
      ? t('today.overview.partnerFirst', { name })
      : t('today.overview.nobody')
    : !theirEntry
      ? t('today.overview.mineOnly', { name })
      : t('today.overview.bothHidden', { name });

  const intensity = myEmotion && myColor ? intensityOf(myEmotion, myColor) : null;

  return (
    <div className="stack overview">
      <div className="row-between overview__head">
        <div className="stack-sm">
          <h1>{t('today.title')}</h1>
          <p className="faint small capitalize">{formatLongDate(today, locale)}</p>
        </div>
        <StreakBadge captioned />
      </div>

      {!online ? <OfflineBanner /> : null}

      {together && theirEntry ? (
        <div className="overview__stage">
          <PairScene
            mine={myEntry}
            pending={pending}
            theirs={theirEntry}
            name={name}
            profileOutfit={outfitOf(profile)}
            partnerOutfit={outfitOf(partner)}
          />
          <div className="overview__legend">
            <span className="overview__who">
              <span className="overview__dot" style={{ background: myColor ?? undefined }} />
              {t('today.overview.me')} · {t(`emotions.${myEmotion}`)}
            </span>
            <span className="overview__who">
              {name} · {t(`emotions.${theirEntry.emotion}`)}
              <span className="overview__dot" style={{ background: theirEntry.color }} />
            </span>
          </div>
          <p className="muted small center overview__note">
            {t(sceneNoteKey(myEmotion as EmotionKey, theirEntry.emotion as EmotionKey))}
          </p>
        </div>
      ) : (
        <div className="overview__stage">
          <div className="overview__pair">
            <figure className="overview__side">
              {done && isEmotionKey(myEmotion) ? (
                <Character emotion={myEmotion} color={myColor} outfit={outfitOf(profile)} size={146} />
              ) : (
                <Character emotion={null} state="waiting" outfit={outfitOf(profile)} size={146} />
              )}
              <figcaption>{t('today.overview.me')}</figcaption>
            </figure>
            <span className="overview__divider" aria-hidden />
            <figure className="overview__side">
              {done && theirEntry ? (
                // Sa couleur, pas encore son geste : la pose neutre ne dit rien de son émotion.
                <Character emotion="neutral" color={theirEntry.color} outfit={outfitOf(partner)} size={146} still />
              ) : (
                <Character emotion={null} state="waiting" outfit={outfitOf(partner)} size={146} />
              )}
              <figcaption>{name}</figcaption>
            </figure>
          </div>
          <p className="muted small center overview__note">{note}</p>
        </div>
      )}

      <div className="overview__cards">
        {!done ? (
          <div className="card overview__prompt">
            <h2 className="overview__prompt-title">{t('today.overview.promptTitle')}</h2>
            <p className="muted small">{t('today.overview.promptBody')}</p>
            <Link to="/day" className="btn btn--primary">
              {t('today.overview.promptAction')}
            </Link>
          </div>
        ) : (
          <Link to="/day" className="tile">
            <span className="tile__dot" style={{ background: myColor ?? undefined }} aria-hidden />
            <span className="tile__text">
              <strong className="tile__title">{t('today.mine')}</strong>
              <span className="tile__detail">
                {pending && !myEntry
                  ? t('today.pending')
                  : t('today.overview.myTileDetail', {
                      emotion: myEmotion ? t(`emotions.${myEmotion}`) : '',
                      intensity: intensity ? t(`today.intensities.${intensity}`).toLowerCase() : '',
                    })}
              </span>
            </span>
            <Chevron />
          </Link>
        )}

        {done && !theirEntry && partner ? (
          <div className="tile tile--waiting">
            <Character emotion={null} state="waiting" outfit={outfitOf(partner)} size={46} still />
            <span className="muted small">{t('today.overview.partnerWaiting', { name })}</span>
          </div>
        ) : null}

        {done && theirEntry ? (
          <Link
            to="/day/theirs"
            className="tile tile--partner"
            style={{ background: theirEntry.color, color: readableTextOn(theirEntry.color) }}
          >
            <svg className="tile__drop" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
              <path d="M12,3 C12,3 5.5,10.5 5.5,14.5 C5.5,18.1 8.4,21 12,21 C15.6,21 18.5,18.1 18.5,14.5 C18.5,10.5 12,3 12,3 Z" />
            </svg>
            <span className="tile__text">
              <strong className="tile__title">{t('today.overview.partnerTile', { name })}</strong>
              <span className="tile__detail">
                {revealed
                  ? t('today.overview.partnerSeen', { emotion: t(`emotions.${theirEntry.emotion}`) })
                  : t('today.overview.partnerDiscover')}
              </span>
            </span>
            <Chevron />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
