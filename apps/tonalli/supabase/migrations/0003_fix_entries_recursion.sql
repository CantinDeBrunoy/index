-- Correctif pour les projets créés avant la révision de 0001_init.sql.
--
-- La policy de lecture de `entries` interrogeait `entries` : Postgres
-- réapplique la policy à l'intérieur de sa propre sous-requête, détecte la
-- boucle et échoue avec « infinite recursion detected in policy for relation
-- entries » (42P17). PostgREST traduit ça en 500 sur toute lecture d'entrées.
--
-- La condition de réciprocité passe désormais par une fonction
-- `security definer`, qui lit la table sans repasser par la RLS. Elle ne
-- répond qu'à propos de MES propres journées : elle ne divulgue rien.
--
-- Rejouer ce fichier est sans risque.

create or replace function public.has_own_entry(day date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.entries e
     where e.user_id = auth.uid()
       and e.date = day
  );
$$;

revoke execute on function public.has_own_entry(date) from public, anon;
grant execute on function public.has_own_entry(date) to authenticated, service_role;

drop policy if exists "entries_select" on public.entries;
create policy "entries_select" on public.entries
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      user_id = public.partner_of(auth.uid())
      and public.has_own_entry(entries.date)
    )
  );
