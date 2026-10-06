import type { Leg } from '../shared/api';
import { GYMS, type Gym } from '../shared/gyms';
import { formatClock, formatDistance, formatDuration, formatElapsed, NBSP } from './format';
import { HomeSettings } from './HomeSettings';
import { googleMapsUrl, wazeUrl } from './links';
import { useEtas, type EtasState } from './useEtas';

const gymsById = new Map(GYMS.map((gym) => [gym.id, gym]));

/** `leg` : `undefined` tant que rien n'est calculé, `null` si aucun itinéraire. */
type Row = { gym: Gym; leg: Leg | null | undefined };

export function App() {
  const { state, refresh } = useEtas();
  const busy = state.phase === 'locating' || state.phase === 'computing';
  const { result } = state;

  const rows: Row[] = result
    ? result.etas.flatMap(({ gymId, leg }) => {
        const gym = gymsById.get(gymId);
        return gym ? [{ gym, leg }] : [];
      })
    : GYMS.map((gym) => ({ gym, leg: undefined }));

  return (
    <main className="app">
      <header>
        <h1>Quelle salle&nbsp;?</h1>
        <p className="status" aria-live="polite">
          {statusLine(state)}
        </p>
      </header>

      {result?.departure.kind === 'home' && !busy && (
        <p className="notice">GPS indisponible : trajets calculés depuis ton domicile.</p>
      )}
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}

      <ol className="gyms" aria-busy={busy}>
        {rows.map(({ gym, leg }, index) => (
          <GymRow key={gym.id} gym={gym} leg={leg} rank={index + 1} busy={busy} />
        ))}
      </ol>

      <p className="hint">Touche une salle pour lancer Waze.</p>
      <button className="button button--wide" type="button" onClick={refresh} disabled={busy}>
        {busy ? 'Calcul…' : 'Actualiser'}
      </button>

      <HomeSettings />
    </main>
  );
}

function GymRow({ gym, leg, rank, busy }: Row & { rank: number; busy: boolean }) {
  const best = rank === 1 && Boolean(leg);
  const duration = leg ? formatDuration(leg.durationSec) : null;
  // Sans résultat : animation pendant la recherche, tiret sinon.
  const time = duration ?? (leg === undefined && busy ? <span className="placeholder" /> : '—');

  return (
    <li className={best ? 'gym gym--best' : 'gym'}>
      <a className="gym__go" href={wazeUrl(gym)} aria-label={`${gym.name}${duration ? `, ${duration}` : ''} : lancer Waze`}>
        <span className="gym__rank" aria-hidden="true">
          {leg ? rank : ''}
        </span>
        <span className="gym__name">{gym.name}</span>
        <span className="gym__time">{time}</span>
        <span className="gym__meta">{describe(gym, leg)}</span>
      </a>
      <a className="gym__alt" href={googleMapsUrl(gym)} aria-label={`${gym.name} : itinéraire Google Maps`}>
        Maps
      </a>
    </li>
  );
}

function describe(gym: Gym, leg: Leg | null | undefined): string {
  if (leg === undefined) return gym.address;
  if (leg === null) return 'Pas d’itinéraire trouvé';
  const distance = formatDistance(leg.distanceM);
  if (leg.trafficDelaySec < 60) return distance;
  // Insécables : si la ligne est trop longue, la coupure tombe après le « · ».
  return `${distance} · +${formatDuration(leg.trafficDelaySec)}${NBSP}de${NBSP}bouchons`;
}

function statusLine({ phase, result }: EtasState): string {
  if (phase === 'locating') return 'Localisation…';
  if (phase === 'computing') return 'Calcul des trajets avec le trafic…';
  if (!result) return '';
  const from = result.departure.kind === 'gps' ? 'Depuis ta position' : 'Depuis ton domicile';
  return `${from} · ${formatClock(result.computedAt)} · ${formatElapsed(result.elapsedMs)}`;
}
