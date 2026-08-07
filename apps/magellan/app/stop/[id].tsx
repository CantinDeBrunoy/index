import { useLocalSearchParams } from 'expo-router';

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
  TotalRow,
  euros,
} from '@/features/detail/DetailKit';
import { budgetTotal, peopleLabel } from '@/features/trips/aggregates';
import { useTrips } from '@/features/trips/store';

export default function StopDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips } = useTrips();

  // On remonte au voyage parent : il porte la couleur d'accent et le fil du périple.
  const parent = trips.find((t) => t.stops.some((s) => s.id === id));
  const stop = parent?.stops.find((s) => s.id === id);

  if (!stop || !parent) {
    return (
      <DetailPage>
        <Hero title="Étape introuvable" />
        <Section title="Oups">
          <Card>
            <Muted>Cette étape n’existe plus. Reviens en arrière pour choisir une autre étape.</Muted>
          </Card>
        </Section>
      </DetailPage>
    );
  }

  const color = parent.color || '#ffd166';
  const rank = parent.stops.findIndex((s) => s.id === stop.id) + 1;
  const budget = stop.budget;
  const total = budgetTotal(budget);
  const maxPost = budget
    ? Math.max(budget.hotel, budget.food, budget.activities, budget.transport)
    : 0;

  const stats: { value: string; label: string }[] = [];
  if (stop.days) stats.push({ value: String(stop.days), label: stop.days > 1 ? 'jours' : 'jour' });
  if (total) stats.push({ value: euros(total), label: 'budget' });
  if (stop.people?.length) stats.push({ value: String(stop.people.length), label: 'personnes' });

  return (
    <DetailPage>
      <Hero
        color={color}
        eyebrow={`${parent.name}  ·  étape ${rank}/${parent.stops.length}`}
        title={stop.name}
        subtitle={stop.date}
        chips={[`${flagEmoji(stop.alpha2)}  ${stop.countryName}`]}
      />

      {stats.length > 0 ? <StatRow items={stats} /> : null}

      {budget && total > 0 ? (
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

      {stop.people && stop.people.length > 0 ? (
        <Section title="Avec qui">
          <Chips items={stop.people.map((p) => peopleLabel([p]))} />
        </Section>
      ) : null}

      <Section title="Position">
        <Card>
          <Muted>
            📍  {stop.lat.toFixed(3)}, {stop.lng.toFixed(3)}
          </Muted>
        </Card>
      </Section>

      <Section title="Photos">
        <Card>
          <Muted>📷  Bientôt — les photos de l’étape s’afficheront ici.</Muted>
        </Card>
      </Section>
    </DetailPage>
  );
}
