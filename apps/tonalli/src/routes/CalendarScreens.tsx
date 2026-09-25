import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';

import { Breakdown } from '@/components/Breakdown';
import { MonthGrid } from '@/components/calendar';
import type { CellState } from '@/components/calendar';
import { DayDetail } from '@/components/DayDetail';
import { ErrorBanner, Loading, OfflineBanner } from '@/components/States';
import {
  formatLongDate,
  formatMonthLabel,
  monthDays,
  shiftMonth,
  todayInTimeZone,
  yearMonthOfKey,
} from '@/lib/dates';
import type { YearMonth } from '@/lib/dates';
import { EMOTIONS, INTENSITIES, intensityOf, shadeOf } from '@/lib/emotions';
import { emojiOf, REACTIONS } from '@/lib/reactions';
import type { Entry, EntryMap, ReactionMap } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useEntries } from '@/state/EntriesProvider';
import { useI18n } from '@/state/I18nProvider';

type ViewProps = {
  entries: EntryMap;
  /**
   * La réaction posée sur chaque journée, par identifiant d'entrée : celle du
   * binôme sur les miennes, la mienne sur les siennes.
   */
  reactions: ReactionMap;
  /** Dates où le binôme a posté sans que j'aie le droit de lire : cases hachurées. */
  hiddenDates?: Set<string>;
  /** Aujourd'hui *pour la personne dont c'est le calendrier*. */
  today: string;
  /** Son prénom, quand c'est le calendrier du binôme. */
  partnerName?: string;
};

function CalendarView({ entries, reactions, hiddenDates, today, partnerName }: ViewProps) {
  const { t, locale } = useI18n();
  const { loading, error, online, refresh } = useEntries();
  const partner = partnerName !== undefined;

  const [month, setMonth] = useState<YearMonth>(() => yearMonthOfKey(today));
  const [selected, setSelected] = useState<string | null>(null);

  const limit = yearMonthOfKey(today);
  const atLimit = month.year === limit.year && month.month === limit.month;

  // Les jours écoulés du mois : un mois en cours ne se juge pas sur ses jours
  // à venir.
  const elapsed = useMemo(() => monthDays(month.year, month.month).filter((date) => date <= today), [month, today]);
  const monthEntries = useMemo(
    () => elapsed.map((date) => entries[date]).filter((entry): entry is Entry => Boolean(entry)),
    [entries, elapsed],
  );
  // Chez l'autre, un jour masqué compte aussi : la base en connaît la date,
  // jamais le contenu.
  const filled = elapsed.filter((date) => entries[date] || hiddenDates?.has(date)).length;
  const hasHidden = elapsed.some((date) => hiddenDates?.has(date) && !entries[date]);

  // Avant la toute première journée, un jour vide n'est pas un jour manqué :
  // hachurer les mois d'avant l'inscription ne serait qu'un reproche.
  const first = useMemo(() => {
    const dates = [...Object.keys(entries), ...(hiddenDates ?? [])].sort();
    return dates[0] ?? today;
  }, [entries, hiddenDates, today]);

  const getCell = (date: string): CellState => {
    const entry = entries[date];
    if (entry) {
      const reaction = reactions[entry.id];
      return { kind: 'entry', color: entry.color, reaction: reaction ? emojiOf(reaction.key) : null };
    }
    if (hiddenDates?.has(date)) return { kind: 'hidden' };
    // Aujourd'hui n'est pas fini : pas encore rempli n'est pas manqué.
    if (date >= first && date < today) return { kind: 'missed' };
    return { kind: 'empty' };
  };

  const labelFor = (date: string, state: CellState) => {
    const day = formatLongDate(date, locale);
    if (state.kind === 'entry') {
      const entry = entries[date];
      const intensity = intensityOf(entry.emotion, entry.color);
      const parts = [t(`emotions.${entry.emotion}`)];
      if (intensity) parts.push(t(`today.intensities.${intensity}`).toLowerCase());
      const reaction = reactions[entry.id];
      if (reaction) parts.push(t('calendar.reactionAria', { name: t(`reactions.names.${reaction.key}`) }));
      return `${day} — ${parts.join(', ')}`;
    }
    if (state.kind === 'hidden') return `${day} — ${t('calendar.hiddenDay')}`;
    if (state.kind === 'missed') return `${day} — ${t('calendar.missedDay')}`;
    return day;
  };

  const counter = { count: filled, total: elapsed.length, name: partnerName };
  const counterKey = partner
    ? filled > 1 ? 'calendar.filledByPlural' : 'calendar.filledBy'
    : filled > 1 ? 'calendar.filledPlural' : 'calendar.filled';

  return (
    <div className="stack calendar">
      <header className="calendar__head">
        <button
          type="button"
          className="calendar__arrow"
          aria-label={t('calendar.previous')}
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <Chevron direction="left" />
        </button>
        <h1 className="calendar__month capitalize">{formatMonthLabel(month, locale)}</h1>
        <button
          type="button"
          className="calendar__arrow"
          aria-label={t('calendar.next')}
          disabled={atLimit}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <Chevron direction="right" />
        </button>
      </header>

      <CalendarSwitch />

      {!online ? <OfflineBanner /> : null}
      {error ? <ErrorBanner message={t('common.networkError')} onRetry={() => void refresh()} /> : null}

      <p className="calendar__count">{t(counterKey, counter)}</p>

      {loading && Object.keys(entries).length === 0 ? (
        <Loading />
      ) : (
        <MonthGrid month={month} today={today} getCell={getCell} labelFor={labelFor} onSelect={setSelected} />
      )}

      <Legend partner={partner} />
      {partner && hasHidden ? <p className="calendar__hint">{t('calendar.hiddenHintMonth')}</p> : null}

      <section className="card breakdown-card">
        <h2 className="breakdown-card__title">{t('calendar.breakdown')}</h2>
        <Breakdown entries={monthEntries} />
      </section>

      {selected ? (
        <DayDetail
          date={selected}
          entry={entries[selected] ?? null}
          hidden={Boolean(hiddenDates?.has(selected)) && !entries[selected]}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={direction === 'left' ? 'M15,4 L7,12 L15,20' : 'M9,4 L17,12 L9,20'} />
    </svg>
  );
}

// L'exemple des crans : une seule émotion, pour que seule l'intensité change
// d'une pastille à l'autre.
const SAMPLE = EMOTIONS.find((emotion) => emotion.key === 'serenity') ?? EMOTIONS[0];

/** Ce que veulent dire les cases : les crans, les hachures, la réaction. */
function Legend({ partner }: { partner: boolean }) {
  const { t } = useI18n();
  return (
    <ul className="calendar-legend">
      <li>
        <span className="calendar-legend__shades" aria-hidden>
          {INTENSITIES.map((intensity) => (
            <span key={intensity} className="calendar-legend__swatch" style={{ background: shadeOf(SAMPLE.key, intensity) ?? undefined }} />
          ))}
        </span>
        {INTENSITIES.map((intensity) => t(`today.intensities.${intensity}`).toLowerCase()).join(' · ')}
      </li>
      <li>
        <span className="calendar-legend__swatch cell--hatched" aria-hidden />
        {partner ? t('calendar.legendHidden') : t('calendar.legendMissed')}
      </li>
      {partner ? (
        <li>
          <span className="calendar-legend__swatch calendar-legend__swatch--empty" aria-hidden />
          {t('calendar.legendMissed')}
        </li>
      ) : null}
      <li>
        <span aria-hidden>{REACTIONS[1].emoji}</span>
        {partner ? t('calendar.legendMyReaction') : t('calendar.legendReceived')}
      </li>
    </ul>
  );
}

/**
 * Mon calendrier ou le sien : une bascule en tête d'écran, puisque la barre
 * du bas n'a qu'un onglet « Calendrier ».
 */
function CalendarSwitch() {
  const { t } = useI18n();
  return (
    <nav className="segmented" aria-label={t('calendar.title')}>
      <NavLink to="/me" className="segmented__link">
        {t('calendar.mine')}
      </NavLink>
      <NavLink to="/partner" className="segmented__link">
        {t('calendar.partner')}
      </NavLink>
    </nav>
  );
}

export function MyCalendarScreen() {
  const { mine, today, pending, theirReactions } = useEntries();
  // Une journée validée hors ligne est faite, de son point de vue : sa case
  // prend sa couleur sans attendre le réseau.
  const entries = useMemo<EntryMap>(() => {
    if (!pending || mine[pending.date]) return mine;
    const waiting: Entry = {
      id: 'pending',
      user_id: '',
      date: pending.date,
      emotion: pending.emotion,
      color: pending.color,
      photo_path: null,
      selfie_path: null,
      note: pending.note,
      created_at: '',
    };
    return { ...mine, [pending.date]: waiting };
  }, [mine, pending]);
  return <CalendarView entries={entries} reactions={theirReactions} today={today} />;
}

export function PartnerCalendarScreen() {
  const { t } = useI18n();
  const { partner } = useAuth();
  const { partnerEntries, partnerDates, myReactions } = useEntries();

  if (!partner) {
    return (
      <div className="stack calendar">
        <CalendarSwitch />
        <p className="muted">{t('calendar.noPartner')}</p>
      </div>
    );
  }

  // Le calendrier du binôme se lit à SES dates : rien n'est reconverti dans
  // mon fuseau, sinon ses journées glisseraient d'une case.
  return (
    <CalendarView
      entries={partnerEntries}
      reactions={myReactions}
      hiddenDates={partnerDates}
      today={todayInTimeZone(partner.timezone)}
      partnerName={partner.display_name || t('calendar.partner')}
    />
  );
}
