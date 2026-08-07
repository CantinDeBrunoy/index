import { useLocalSearchParams, useRouter } from 'expo-router';

import { flagEmoji } from '@/data/isoCodes';
import {
  BudgetBar,
  Card,
  Chips,
  DetailPage,
  Hero,
  Muted,
  Section,
  StatRow,
  TimelineStop,
  TotalRow,
  euros,
} from '@/features/detail/DetailKit';
import {
  budgetTotal,
  peopleLabel,
  tripBudget,
  tripCountries,
  tripDays,
  tripPeople,
} from '@/features/trips/aggregates';
import { useTrips } from '@/features/trips/store';

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { trips } = useTrips();

  const trip = trips.find((t) => t.id === id);
  if (!trip) {
    return (
      <DetailPage>
        <Hero title="Voyage introuvable" />
        <Section title="Oups">
          <Card>
            <Muted>Ce voyage n’existe plus. Reviens en arrière pour choisir un autre voyage.</Muted>
          </Card>
        </Section>
      </DetailPage>
    );
  }

  const color = trip.color || '#ffd166';
  const budget = tripBudget(trip);
  const total = budgetTotal(budget);
  const days = tripDays(trip);
  const people = tripPeople(trip);
  const countries = tripCountries(trip);
  // Échelle des barres : le poste le plus lourd occupe toute la largeur.
  const maxPost = Math.max(budget.hotel, budget.food, budget.activities, budget.transport);

  // Période du voyage : dates de la première et de la dernière étape qui en portent une.
  const dated = trip.stops.filter((s) => s.date);
  const period =
    dated.length === 0
      ? undefined
      : dated.length === 1 || dated[0].date === dated[dated.length - 1].date
        ? dated[0].date
        : `${dated[0].date} → ${dated[dated.length - 1].date}`;

  const stats: { value: string; label: string }[] = [
    { value: String(trip.stops.length), label: trip.stops.length > 1 ? 'étapes' : 'étape' },
    { value: String(countries.length), label: 'pays' },
  ];
  if (days) stats.push({ value: String(days), label: 'jours' });
  if (total) stats.push({ value: euros(total), label: 'budget' });

  return (
    <DetailPage>
      <Hero
        color={color}
        eyebrow="Voyage"
        title={trip.name}
        subtitle={period}
        chips={countries.map((c) => `${flagEmoji(c.alpha2)}  ${c.countryName}`)}
      />

      <StatRow items={stats} />

      <Section title="Itinéraire">
        {trip.stops.map((s, i) => (
          <TimelineStop
            key={s.id}
            index={i + 1}
            color={color}
            title={`${flagEmoji(s.alpha2)}  ${s.name}`}
            right={s.date}
            meta={[s.days ? `${s.days} j` : null, s.budget ? euros(budgetTotal(s.budget)) : null]
              .filter(Boolean)
              .join('  ·  ')}
            last={i === trip.stops.length - 1}
            onPress={() => router.push(`/stop/${s.id}`)}
          />
        ))}
      </Section>

      {total > 0 ? (
        <Section title="Budget">
          <Card>
            <BudgetBar label="Hôtel" value={budget.hotel} max={maxPost} color={color} />
            <BudgetBar label="Nourriture" value={budget.food} max={maxPost} color={color} />
            <BudgetBar label="Activités" value={budget.activities} max={maxPost} color={color} />
            <BudgetBar label="Transport" value={budget.transport} max={maxPost} color={color} />
            <TotalRow label="Total" value={total} />
          </Card>
        </Section>
      ) : null}

      {people.length > 0 ? (
        <Section title="Avec qui">
          <Chips items={people.map((p) => peopleLabel([p]))} />
        </Section>
      ) : null}
    </DetailPage>
  );
}
