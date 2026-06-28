import { useLocalSearchParams } from 'expo-router';

import { flagEmoji } from '@/data/isoCodes';
import { budgetTotal, peopleLabel } from '@/features/trips/aggregates';
import { CardLabel, CardText, Corkboard, PinnedCard } from '@/features/corkboard/Corkboard';
import { useTrips } from '@/features/trips/store';
import type { Budget } from '@/features/trips/types';

function euros(n: number): string {
  return `${n} €`;
}

export default function StopDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips } = useTrips();

  const stop = trips.flatMap((t) => t.stops).find((s) => s.id === id);
  if (!stop) {
    return (
      <Corkboard title="Étape">
        <PinnedCard>
          <CardText>Étape introuvable.</CardText>
        </PinnedCard>
      </Corkboard>
    );
  }

  return (
    <Corkboard title={stop.name}>
      <PinnedCard rotate="-1.5deg">
        <CardText big>
          {flagEmoji(stop.alpha2)}  {stop.name}
        </CardText>
        <CardText>{stop.countryName}</CardText>
      </PinnedCard>

      {stop.date ? (
        <PinnedCard rotate="1.2deg" tint="#fff7e6" pin="#ef8a17">
          <CardLabel>Quand</CardLabel>
          <CardText>📅 {stop.date}</CardText>
        </PinnedCard>
      ) : null}

      {stop.days ? (
        <PinnedCard rotate="-1deg" tint="#eef7ee" pin="#2e7d32">
          <CardLabel>Durée</CardLabel>
          <CardText>⏱️ {stop.days} jour{stop.days > 1 ? 's' : ''}</CardText>
        </PinnedCard>
      ) : null}

      {stop.people && stop.people.length > 0 ? (
        <PinnedCard rotate="1.6deg" tint="#eef3ff" pin="#1565c0">
          <CardLabel>Avec qui</CardLabel>
          <CardText>👥 {peopleLabel(stop.people)}</CardText>
        </PinnedCard>
      ) : null}

      {stop.budget ? <BudgetCard budget={stop.budget} /> : null}

      <PinnedCard rotate="-1.2deg" tint="#fbeff7" pin="#8e24aa">
        <CardLabel>Photos</CardLabel>
        <CardText>📷 Bientôt</CardText>
      </PinnedCard>

      <PinnedCard rotate="0.8deg">
        <CardLabel>Position</CardLabel>
        <CardText>📍 {stop.lat.toFixed(3)}, {stop.lng.toFixed(3)}</CardText>
      </PinnedCard>
    </Corkboard>
  );
}

function BudgetCard({ budget }: { budget: Budget }) {
  const rows: [string, number][] = [
    ['Hôtel', budget.hotel],
    ['Nourriture', budget.food],
    ['Activités', budget.activities],
    ['Transport', budget.transport],
  ];
  return (
    <PinnedCard rotate="-0.6deg" tint="#fffef0" pin="#c0a000">
      <CardLabel>Budget</CardLabel>
      {rows.map(([label, value]) => (
        <CardText key={label}>
          {label} · {euros(value)}
        </CardText>
      ))}
      <CardText big>💶 {euros(budgetTotal(budget))}</CardText>
    </PinnedCard>
  );
}
