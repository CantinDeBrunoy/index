import { dayOfKey, monthGrid, weekdayInitials } from '@/lib/dates';
import type { YearMonth } from '@/lib/dates';
import { readableTextOn } from '@/lib/emotions';
import { useI18n } from '@/state/I18nProvider';

/** Ce qu'il faut savoir pour peindre une case, sans en dire plus. */
export type CellState =
  /** Une journée lisible, et la réaction posée dessus s'il y en a une. */
  | { kind: 'entry'; color: string; reaction: string | null }
  /** Le binôme a posté, mais je n'ai pas rempli ce jour-là : rien à montrer. */
  | { kind: 'hidden' }
  /** Un jour passé que la personne n'a pas rempli. */
  | { kind: 'missed' }
  /** Rien à dire : avant la première journée, ou aujourd'hui pas encore rempli. */
  | { kind: 'empty' };

type CellProps = {
  date: string;
  state: CellState;
  isToday: boolean;
  isFuture: boolean;
  label: string;
  onSelect: (date: string) => void;
};

function Cell({ date, state, isToday, isFuture, label, onSelect }: CellProps) {
  const classes = ['cell'];
  if (isToday) classes.push('cell--today');
  if (isFuture) classes.push('cell--future');
  // Masquée chez l'autre, manquée chez moi : la même hachure, deux légendes.
  if (state.kind === 'hidden' || state.kind === 'missed') classes.push('cell--hatched');

  const interactive = !isFuture && (state.kind === 'entry' || state.kind === 'hidden');

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
      {dayOfKey(date)}
      {state.kind === 'entry' && state.reaction ? (
        <span className="cell__reaction" aria-hidden>
          {state.reaction}
        </span>
      ) : null}
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
        {cells.map((date, index) => {
          if (!date) return <span key={`blank-${index}`} className="cell cell--blank" />;
          const state = getCell(date);
          return (
            <Cell
              key={date}
              date={date}
              state={state}
              isToday={date === today}
              isFuture={date > today}
              label={labelFor(date, state)}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}
