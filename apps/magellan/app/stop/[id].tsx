import { Redirect, useLocalSearchParams } from 'expo-router';

import { CitySheet } from '@/features/detail/CitySheet';
import { KraftLabel, WoodPage, euros, postitColor } from '@/features/detail/WoodKit';
import { budgetTotal, peopleLabel, tripCountries } from '@/features/trips/aggregates';
import { useTrips } from '@/features/trips/store';

export default function StopDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips } = useTrips();

  // On remonte au voyage parent : il porte la couleur d'accent et le fil du périple.
  const parent = trips.find((t) => t.stops.some((s) => s.id === id));
  const stop = parent?.stops.find((s) => s.id === id);

  if (!stop || !parent) {
    return (
      <WoodPage>
        <KraftLabel
          eyebrow="Oups"
          title="Étape introuvable"
          subtitle="Cette étape n’existe plus. Reviens en arrière pour en choisir une autre."
        />
      </WoodPage>
    );
  }

  // Voyage à une seule ville : l'étape EST le voyage, sa fiche fait foi (drapeau du
  // globe, lien direct…) plutôt qu'une « étape 1/1 ».
  if (parent.stops.length === 1) return <Redirect href={`/trip/${parent.id}`} />;

  const rank = parent.stops.findIndex((s) => s.id === stop.id) + 1;
  const total = budgetTotal(stop.budget);
  const names = (stop.people ?? []).map((p) => peopleLabel([p]));
  // Même couleur de pays que sur le tableau d'itinéraire du voyage.
  const countryIndex = tripCountries(parent).findIndex((c) => c.country === stop.country);

  const stats: { value: string; label: string }[] = [];
  if (stop.days) stats.push({ value: String(stop.days), label: stop.days > 1 ? 'jours' : 'jour' });
  if (total) stats.push({ value: euros(total), label: 'budget' });
  if (names.length) stats.push({ value: String(names.length), label: 'personnes' });

  return (
    <WoodPage>
      <CitySheet
        eyebrow={`${parent.name} · étape ${rank}/${parent.stops.length}`}
        title={stop.name}
        subtitle={stop.date}
        stamps={[{ label: stop.countryName || stop.country, ink: postitColor(countryIndex).ink }]}
        city={stop.name}
        color={parent.color || '#ffd166'}
        stats={stats}
        budget={stop.budget}
        names={names}
        position={stop}
        photos={stop.photos}
      />
    </WoodPage>
  );
}
