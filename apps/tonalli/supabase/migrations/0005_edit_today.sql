-- Permettre de corriger SA journée du jour, et elle seule.
--
-- Jusqu'ici `entries` n'avait aucune policy UPDATE : une journée validée était
-- définitive. On ouvre la modification, mais strictement à la date locale de
-- l'auteur : un jour passé reste impossible à repeindre, sinon le calendrier
-- perdrait sa valeur de témoignage.

-- La date du jour telle que la vit une personne, dans son propre fuseau.
create or replace function public.local_today(uid uuid)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select (now() at time zone p.timezone)::date
    from public.profiles p
   where p.id = uid;
$$;

revoke execute on function public.local_today(uuid) from public, anon;
grant execute on function public.local_today(uuid) to authenticated, service_role;

drop policy if exists "entries_update_today" on public.entries;
create policy "entries_update_today" on public.entries
  for update to authenticated
  using (
    user_id = auth.uid()
    and date = public.local_today(auth.uid())
  )
  with check (
    -- Le `with check` interdit aussi de déplacer une entrée vers une autre
    -- date, ce qui reviendrait à réécrire le passé par la bande.
    user_id = auth.uid()
    and date = public.local_today(auth.uid())
  );
