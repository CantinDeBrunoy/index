import { useMemo, useState } from 'react';

import { Breakdown } from '@/components/Breakdown';
import { MonthGrid, YearMosaic } from '@/components/calendar';
import type { CellState } from '@/components/calendar';
import { DayDetail } from '@/components/DayDetail';
import { Segmented } from '@/components/Segmented';
import { ErrorBanner, Loading, OfflineBanner } from '@/components/States';
import {
  daysInYear,
  formatLongDate,
  formatMonthLabel,
  monthDays,
  shiftMonth,
  todayInTimeZone,
  yearMonthOfKey,
} from '@/lib/dates';
import type { YearMonth } from '@/lib/dates';
import type { Entry, EntryMap } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useEntries } from '@/state/EntriesProvider';
import { useI18n } from '@/state/I18nProvider';

type Mode = 'month' | 'year';

type ViewProps = {
  title: string;
  entries: EntryMap;
  /** Dates où le binôme a posté sans que j'aie le droit de lire : cases hachurées. */
  hiddenDates?: Set<string>;
  /** Aujourd'hui *pour la personne dont c'est le calendrier*. */
  today: string;
};

function CalendarView({ title, entries, hiddenDates, today }: ViewProps) {
  const { t, locale } = useI18n();
  const { loading, error, online, refresh } = useEntries();

  const [mode, setMode] = useState<Mode>('month');
  const [month, setMonth] = useState<YearMonth>(() => yearMonthOfKey(today));
  const [year, setYear] = useState(() => yearMonthOfKey(today).year);
  const [selected, setSelected] = useState<string | null>(null);

  const limit = yearMonthOfKey(today);
  const atMonthLimit = month.year === limit.year && month.month === limit.month;
  const atYearLimit = year >= limit.year;

  const monthEntries = useMemo(
    () =>
      monthDays(month.year, month.month)
        .map((date) => entries[date])
        .filter((entry): entry is Entry => Boolean(entry)),
    [entries, month],
  );

  const counted = useMemo(() => {
    if (mode === 'month') {
      return { count: monthEntries.length, total: monthDays(month.year, month.month).length };
    }
    const prefix = `${year}-`;
    const count = Object.keys(entries).filter((date) => date.startsWith(prefix)).length;
    return { count, total: daysInYear(year) };
  }, [mode, monthEntries.length, month, year, entries]);

  const getCell = (date: string): CellState => {
    const entry = entries[date];
    if (entry) return { kind: 'entry', color: entry.color };
    if (hiddenDates?.has(date)) return { kind: 'hidden' };
    return { kind: 'empty' };
  };

  const labelFor = (date: string, state: CellState) => {
    const day = formatLongDate(date, locale);
    if (state.kind === 'entry') {
      const entry = entries[date];
      return `${day} — ${t(`emotions.${entry.emotion}`)}`;
    }
    if (state.kind === 'hidden') return `${day} — ${t('calendar.hiddenDay')}`;
    return day;
  };

  return (
    <div className="stack">
      <h1>{title}</h1>

      {!online ? <OfflineBanner /> : null}
      {error ? <ErrorBanner message={t('common.networkError')} onRetry={() => void refresh()} /> : null}

      <Segmented<Mode>
        label={title}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'month', label: t('calendar.month') },
          { value: 'year', label: t('calendar.year') },
        ]}
      />

      <div className="row-between">
        <button
          type="button"
          className="btn btn--icon"
          aria-label={t('calendar.previous')}
          onClick={() => (mode === 'month' ? setMonth(shiftMonth(month, -1)) : setYear(year - 1))}
        >
          ‹
        </button>
        <strong className="capitalize">
          {mode === 'month' ? formatMonthLabel(month, locale) : year}
        </strong>
        <button
          type="button"
          className="btn btn--icon"
          aria-label={t('calendar.next')}
          disabled={mode === 'month' ? atMonthLimit : atYearLimit}
          onClick={() => (mode === 'month' ? setMonth(shiftMonth(month, 1)) : setYear(year + 1))}
        >
          ›
        </button>
      </div>

      <p className="faint small center">
        {t(counted.count > 1 ? 'calendar.filledPlural' : 'calendar.filled', counted)}
      </p>

      {loading && Object.keys(entries).length === 0 ? (
        <Loading />
      ) : mode === 'month' ? (
        <MonthGrid
          month={month}
          today={today}
          getCell={getCell}
          labelFor={labelFor}
          onSelect={setSelected}
        />
      ) : (
        <YearMosaic
          year={year}
          today={today}
          getCell={getCell}
          labelFor={labelFor}
          onSelect={setSelected}
        />
      )}

      {mode === 'month' ? (
        <>
          <span className="section-title">{t('calendar.breakdown')}</span>
          <Breakdown entries={monthEntries} />
        </>
      ) : null}

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

export function MyCalendarScreen() {
  const { t } = useI18n();
  const { mine, today } = useEntries();
  return <CalendarView title={t('calendar.mine')} entries={mine} today={today} />;
}

export function PartnerCalendarScreen() {
  const { t } = useI18n();
  const { partner } = useAuth();
  const { partnerEntries, partnerDates } = useEntries();

  if (!partner) {
    return (
      <div className="stack">
        <h1>{t('calendar.partner')}</h1>
        <p className="muted">{t('calendar.noPartner')}</p>
      </div>
    );
  }

  // Le calendrier du binôme se lit à SES dates : rien n'est reconverti dans
  // mon fuseau, sinon ses journées glisseraient d'une case.
  return (
    <CalendarView
      title={partner.display_name || t('calendar.partner')}
      entries={partnerEntries}
      hiddenDates={partnerDates}
      today={todayInTimeZone(partner.timezone)}
    />
  );
}
