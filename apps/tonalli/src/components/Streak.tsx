import { useMemo } from 'react';

import { streakOf } from '@/lib/dates';
import { symbolOf } from '@/lib/streak';
import { useAuth } from '@/state/AuthProvider';
import { useEntries } from '@/state/EntriesProvider';
import { useI18n } from '@/state/I18nProvider';

/**
 * Les jours remplis d'affilée, avec le symbole choisi dans les réglages.
 *
 * La série se **recalcule** à chaque affichage plutôt que d'être stockée :
 * une colonne « nombre de jours » serait une vérité en double, à réconcilier
 * à chaque correction de journée. Remonter quelques dizaines de clés de date
 * ne coûte rien.
 *
 * Rien ne s'affiche tant qu'il n'y a pas de série. Un « 0 » posé en haut de
 * l'écran ne serait pas une information, seulement un reproche — et le premier
 * jour de quelqu'un n'a pas à commencer par un reproche.
 *
 * Quand la journée du jour n'est pas encore remplie, le badge reste là mais
 * pâlit : la série n'est pas perdue, elle attend.
 */
export function StreakBadge() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { mine, pending, today } = useEntries();

  const streak = useMemo(() => {
    // La journée validée hors ligne compte : de son point de vue, elle est
    // faite — c'est le réseau qui manque, pas le geste.
    const filled = new Set(Object.keys(mine));
    if (pending) filled.add(pending.date);
    return streakOf(filled, today);
  }, [mine, pending, today]);

  if (streak.length === 0) return null;

  const symbol = symbolOf(profile?.streak_symbol);
  const label = t(streak.length > 1 ? 'streak.daysPlural' : 'streak.days', { count: streak.length });

  return (
    <span
      className="streak"
      data-waiting={!streak.todayDone}
      title={streak.todayDone ? label : `${label} — ${t('streak.waiting')}`}
    >
      <span aria-hidden>{symbol}</span>
      <strong>{streak.length}</strong>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
