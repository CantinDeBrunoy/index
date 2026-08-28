import { dayOfKey, formatMonthShort, makeKey, daysInMonth, monthGrid, weekdayInitials } from '@/lib/dates';
import type { YearMonth } from '@/lib/dates';
import { readableTextOn } from '@/lib/emotions';
import { useI18n } from '@/state/I18nProvider';

/** Ce qu'il faut savoir pour peindre une case, sans en dire plus. */
export type CellState =
  | { kind: 'entry'; color: string }
  /** Le binôme a posté, mais je n'ai pas rempli ce jour-là : rien à montrer. */
  | { kind: 'hidden' }
  | { kind: 'empty' };

type CellProps = {
  date: string;
  state: CellState;
  isToday: boolean;
  isFuture: boolean;
  showNumber: boolean;
  label: string;
  onSelect: (date: string) => void;
};

function Cell({ date, state, isToday, isFuture, showNumber, label, onSelect }: CellProps) {
  const classes = ['cell'];
  if (isToday) classes.push('cell--today');
  if (isFuture) classes.push('cell--future');
  if (state.kind === 'hidden') classes.push('cell--hidden');

  const interactive = state.kind !== 'empty';

  return (
    <button
      type="button"
      className={classes.join(' ')}
      style={
        state.kind === 'entry'
          ? { background: state.color, color: readableTextOn(state.color) }
          : undefined
      }
      disabled={!interactive}
      aria-label={label}
      onClick={interactive ? () => onSelect(date) : undefined}
    >
      {showNumber ? dayOfKey(date) : ''}
    </button>
  );
}

type MonthProps = {
  month: YearMonth;
  today: string;
  getCell: (date: string) => CellState;
  labelFor: (date: string, state: CellState) => string;
  onSelect: (date: string) => void;
};

export function MonthGrid({ month, today, getCell, labelFor, onSelect }: MonthProps) {
  const { locale } = useI18n();
  const cells = monthGrid(month.year, month.month);

  return (
    <div>
      <div className="weekdays" aria-hidden>
        {weekdayInitials(locale).map((initial, index) => (
          <span key={`${initial}-${index}`}>{initial}</span>
        ))}
      </div>
      <div className="month-grid">
        {cells.map((date, index) =>
          date ? (
            <Cell
              key={date}
              date={date}
              state={getCell(date)}
              isToday={date === today}
              isFuture={date > today}
              showNumber
              label={labelFor(date, getCell(date))}
              onSelect={onSelect}
            />
          ) : (
            <span key={`empty-${index}`} className="cell cell--empty" />
          ),
        )}
      </div>
    </div>
  );
}

type YearProps = {
  year: number;
  today: string;
  getCell: (date: string) => CellState;
  labelFor: (date: string, state: CellState) => string;
  onSelect: (date: string) => void;
};

/** L'année entière : une ligne par mois, une case par jour. */
export function YearMosaic({ year, today, getCell, labelFor, onSelect }: YearProps) {
  const { locale } = useI18n();

  return (
    <div className="mosaic">
      {Array.from({ length: 12 }, (_, month) => {
        const total = daysInMonth(year, month);
        return (
          <div className="mosaic-row" key={month}>
            <span className="mosaic-label">{formatMonthShort(month, locale)}</span>
            <div className="mosaic-days">
              {Array.from({ length: 31 }, (_, index) => {
                if (index >= total) return <span key={index} className="cell cell--empty" />;
                const date = makeKey(year, month, index + 1);
                const state = getCell(date);
                return (
                  <Cell
                    key={date}
                    date={date}
                    state={state}
                    isToday={date === today}
                    isFuture={date > today}
                    showNumber={false}
                    label={labelFor(date, state)}
                    onSelect={onSelect}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
