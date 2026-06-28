import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { flagEmoji } from '@/data/isoCodes';
import {
  budgetTotal,
  peopleLabel,
  tripBudget,
  tripCountries,
  tripDays,
  tripPeople,
} from '@/features/trips/aggregates';
import { CardLabel, CardText, Corkboard, PinnedCard } from '@/features/corkboard/Corkboard';
import { useTrips } from '@/features/trips/store';

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { trips } = useTrips();

  const trip = trips.find((t) => t.id === id);
  if (!trip) {
    return (
      <Corkboard title="Voyage">
        <PinnedCard>
          <CardText>Voyage introuvable.</CardText>
        </PinnedCard>
      </Corkboard>
    );
  }

  const budget = tripBudget(trip);
  const total = budgetTotal(budget);
  const days = tripDays(trip);
  const people = tripPeople(trip);
  const countries = tripCountries(trip);

  return (
    <Corkboard title={trip.name}>
      <PinnedCard rotate="-1.2deg" pin={trip.color || '#e63946'}>
        <CardText big>{trip.name}</CardText>
        <CardText>
          {trip.stops.length} étape{trip.stops.length > 1 ? 's' : ''} · {countries.length} pays
          {days ? ` · ${days} jours` : ''}
        </CardText>
      </PinnedCard>

      <PinnedCard rotate="1deg" tint="#eef3ff" pin="#1565c0">
        <CardLabel>Itinéraire</CardLabel>
        {trip.stops.map((s, i) => (
          <Pressable key={s.id} onPress={() => router.push(`/stop/${s.id}`)}>
            <CardText>
              {i + 1}. {flagEmoji(s.alpha2)}  {s.name} ›
            </CardText>
          </Pressable>
        ))}
      </PinnedCard>

      {total > 0 ? (
        <PinnedCard rotate="-0.8deg" tint="#fffef0" pin="#c0a000">
          <CardLabel>Budget total</CardLabel>
          <CardText>Hôtel · {budget.hotel} €</CardText>
          <CardText>Nourriture · {budget.food} €</CardText>
          <CardText>Activités · {budget.activities} €</CardText>
          <CardText>Transport · {budget.transport} €</CardText>
          <CardText big>💶 {total} €</CardText>
        </PinnedCard>
      ) : null}

      {people.length > 0 ? (
        <PinnedCard rotate="1.4deg" tint="#eef7ee" pin="#2e7d32">
          <CardLabel>Avec qui</CardLabel>
          <CardText>👥 {peopleLabel(people)}</CardText>
        </PinnedCard>
      ) : null}

      <PinnedCard rotate="-1deg" tint="#fbeff7" pin="#8e24aa">
        <CardLabel>Pays</CardLabel>
        <CardText>{countries.map((c) => `${flagEmoji(c.alpha2)} ${c.countryName}`).join('   ·   ')}</CardText>
      </PinnedCard>
    </Corkboard>
  );
}
