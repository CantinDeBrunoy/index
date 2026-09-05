-- Notifications : sélection des rappels dus, à l'heure locale de chacun.

-- Un rappel est dû quand, DANS LE FUSEAU DE LA PERSONNE, l'heure courante
-- correspond à l'heure choisie, et que sa journée locale n'est pas déjà
-- remplie. Tout se calcule côté serveur en `now() at time zone p.timezone` :
-- personne n'a besoin que son navigateur soit ouvert.
create or replace function public.due_reminders(window_minutes integer default 15)
returns table (id uuid, push_token text, locale text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.push_token, p.locale
    from public.profiles p
   where p.reminders_enabled
     and p.push_token is not null
     and extract(hour from (now() at time zone p.timezone)) = p.reminder_hour
     and extract(minute from (now() at time zone p.timezone))
           between p.reminder_minute and p.reminder_minute + window_minutes
     and not exists (
       select 1
         from public.entries e
        where e.user_id = p.id
          and e.date = (now() at time zone p.timezone)::date
     );
$$;

-- Cette fonction renvoie des jetons de notification : elle n'est appelable que
-- par le rôle de service, jamais depuis le navigateur.
revoke execute on function public.due_reminders(integer) from public, anon, authenticated;
grant execute on function public.due_reminders(integer) to service_role;

-- Idem pour la lecture des profils par la fonction de notification du binôme :
-- l'Edge Function utilise la clé de service, qui contourne la RLS.
