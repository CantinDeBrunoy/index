-- N'écrire une journée qu'aujourd'hui, ou hier pour la file d'attente hors ligne.
--
-- La policy INSERT de `entries` ne vérifiait que l'auteur : depuis la console
-- du navigateur, on pouvait créer une journée à n'importe quelle date. Or la
-- réciprocité ne regarde que l'existence de ma ligne à la même date : remplir
-- après coup un jour manqué débloquait la journée du binôme ce jour-là, que
-- l'invariant veut masquée pour toujours. Et un jour futur n'a pas de sens.
--
-- Hier reste permis : une journée validée sans réseau à 23 h 50 part au
-- retour de la connexion, parfois après minuit, et elle doit passer. Au-delà,
-- elle est refusée. La correction, elle, reste limitée au jour même
-- (`entries_update_today`, 0005) : hier peut être écrit une fois, pas repeint.
--
-- `local_today` vient de 0005. Idempotente, comme les autres.
drop policy if exists "entries_insert_own" on public.entries;
create policy "entries_insert_own" on public.entries
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and date between public.local_today(auth.uid()) - 1 and public.local_today(auth.uid())
  );
