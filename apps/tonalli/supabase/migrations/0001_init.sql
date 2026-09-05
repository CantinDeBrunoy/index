-- Tonalli — schéma initial
-- Un binôme, une entrée par jour et par personne, réciprocité appliquée par la base.

-- ---------------------------------------------------------------------------
-- Émotions
-- Les 12 couples (clé, couleur) vivent en base pour qu'une entrée ne puisse
-- pas exister avec une couleur qui ne correspond pas à son émotion.
-- Les libellés FR/ES restent côté application (fichiers de traduction).
-- ---------------------------------------------------------------------------
create table if not exists public.emotions (
  key        text primary key,
  color      text not null,
  sort_order integer not null,
  unique (key, color)
);

insert into public.emotions (key, color, sort_order) values
  ('joy',        '#FFD93D',  1),
  ('serenity',   '#A8DADC',  2),
  ('love',       '#FF6B9D',  3),
  ('gratitude',  '#F4A261',  4),
  ('pride',      '#E76F51',  5),
  ('excitement', '#FF4D4D',  6),
  ('nostalgia',  '#B08BBB',  7),
  ('tiredness',  '#8D99AE',  8),
  ('sadness',    '#457B9D',  9),
  ('anxiety',    '#6A4C93', 10),
  ('anger',      '#9B2226', 11),
  ('neutral',    '#D8D8D8', 12)
on conflict (key) do update
  set color = excluded.color, sort_order = excluded.sort_order;

alter table public.emotions enable row level security;

create policy "emotions_readable" on public.emotions
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Profils
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  locale       text not null default 'fr' check (locale in ('fr', 'es')),
  -- Fuseau IANA, ex. 'Europe/Paris' ou 'America/Mexico_City'.
  timezone     text not null default 'UTC',
  -- `unique` : un profil ne peut être le binôme que d'une seule personne.
  partner_id   uuid unique references public.profiles(id) on delete set null,
  invite_code  text not null unique,
  push_token   text,
  reminder_hour   smallint not null default 21 check (reminder_hour between 0 and 23),
  reminder_minute smallint not null default 0  check (reminder_minute between 0 and 59),
  reminders_enabled boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Entrées
-- `date` est la date LOCALE DE L'AUTEUR, telle qu'il l'a vécue. Elle n'est
-- jamais convertie : le calendrier du binôme s'affiche à ses dates à lui.
-- ---------------------------------------------------------------------------
create table if not exists public.entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  date       date not null,
  emotion    text not null,
  color      text not null,
  photo_path text,
  note       text check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  unique (user_id, date),
  foreign key (emotion, color) references public.emotions (key, color)
);

create index if not exists entries_user_date_idx on public.entries (user_id, date desc);

-- ---------------------------------------------------------------------------
-- Fonctions utilitaires
-- ---------------------------------------------------------------------------

-- Sans `security definer`, une policy de `profiles` qui lit `profiles` part en
-- récursion infinie. Cette fonction casse la boucle.
create or replace function public.partner_of(uid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select partner_id from public.profiles where id = uid;
$$;

-- Alphabet sans caractères ambigus (ni O/0, ni I/1) : le code se dicte au
-- téléphone sans faute.
create or replace function public.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i integer;
begin
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where invite_code = candidate);
  end loop;
  return candidate;
end;
$$;

-- Création automatique du profil à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, locale, timezone, invite_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'fr'),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC'),
    public.generate_invite_code()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- `partner_id` et `invite_code` ne se modifient pas à la main : seules les
-- fonctions de liaison ci-dessous ont le droit d'y toucher.
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.allow_partner_change', true) = 'on' then
    return new;
  end if;
  if new.partner_id is distinct from old.partner_id then
    raise exception 'partner_id se modifie via link_partner() / unlink_partner()';
  end if;
  if new.invite_code is distinct from old.invite_code then
    raise exception 'invite_code est immuable';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_columns on public.profiles;
create trigger guard_profile_columns
  before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- ---------------------------------------------------------------------------
-- Liaison du binôme (relation 1-1 exclusive, appariement atomique)
-- ---------------------------------------------------------------------------
create or replace function public.link_partner(code text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  me      public.profiles;
  target  public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into me from public.profiles where id = auth.uid() for update;
  if me.partner_id is not null then
    raise exception 'already_linked';
  end if;

  select * into target
    from public.profiles
   where invite_code = upper(trim(code))
     for update;

  if target.id is null then
    raise exception 'code_not_found';
  end if;
  if target.id = me.id then
    raise exception 'cannot_link_self';
  end if;
  if target.partner_id is not null then
    raise exception 'partner_already_linked';
  end if;

  perform set_config('app.allow_partner_change', 'on', true);
  update public.profiles set partner_id = target.id where id = me.id;
  update public.profiles set partner_id = me.id where id = target.id;
  perform set_config('app.allow_partner_change', 'off', true);

  select * into target from public.profiles where id = target.id;
  return target;
end;
$$;

create or replace function public.unlink_partner()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into me from public.profiles where id = auth.uid() for update;
  if me.partner_id is null then
    return;
  end if;

  perform set_config('app.allow_partner_change', 'on', true);
  update public.profiles set partner_id = null where id in (me.id, me.partner_id);
  perform set_config('app.allow_partner_change', 'off', true);
end;
$$;

-- Dates auxquelles le binôme a posté, sans aucun contenu : de quoi afficher
-- une case masquée « il/elle a rempli ce jour-là » sans rien dévoiler.
create or replace function public.partner_entry_dates()
returns setof date
language sql
stable
security definer
set search_path = public
as $$
  select e.date
    from public.entries e
   where e.user_id = public.partner_of(auth.uid())
   order by e.date;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.entries  enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = auth.uid() or id = public.partner_of(auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated
  using (id = auth.uid());

-- « Ai-je moi-même rempli ce jour-là ? »
--
-- Cette question DOIT passer par une fonction `security definer` : une policy
-- de `entries` qui interrogerait `entries` verrait la policy réappliquée dans
-- sa propre sous-requête, et Postgres couperait sur une récursion infinie
-- (42P17), que PostgREST renvoie en 500. La fonction lit la table sans
-- repasser par la RLS, et ne révèle jamais que mes propres dates.
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

-- Réciprocité : l'entrée du binôme à la date D n'est lisible que si j'ai moi
-- même une entrée à la date D. La mécanique BeReal est appliquée par la base,
-- pas seulement masquée à l'écran.
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

drop policy if exists "entries_insert_own" on public.entries;
create policy "entries_insert_own" on public.entries
  for insert to authenticated
  with check (user_id = auth.uid());

-- Pas de policy UPDATE : une journée validée est verrouillée, définitivement.
-- La suppression reste possible pour l'effacement du compte.
drop policy if exists "entries_delete_own" on public.entries;
create policy "entries_delete_own" on public.entries
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Stockage des photos : bucket privé, URLs signées côté client.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('entries', 'entries', false)
on conflict (id) do nothing;

-- Chacun est maître de son propre dossier, nommé d'après son identifiant.
drop policy if exists "entry_photos_insert" on storage.objects;
create policy "entry_photos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'entries'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Indispensable : un envoi en mode `upsert` sur un fichier déjà présent est un
-- UPDATE. Sans cette policy, toute reprise après un échec est refusée.
drop policy if exists "entry_photos_update" on storage.objects;
create policy "entry_photos_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'entries'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'entries'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Je vois toujours mes propres fichiers — y compris entre l'envoi de la photo
-- et l'insertion de la ligne, où aucune entrée ne pointe encore dessus.
-- Le binôme, lui, ne voit un fichier que si la ligne qui le référence lui est
-- visible : la sous-requête sur `entries` est filtrée par la policy de
-- réciprocité, donc la photo hérite exactement de la même règle.
drop policy if exists "entry_photos_select" on storage.objects;
create policy "entry_photos_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'entries'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.entries e where e.photo_path = storage.objects.name)
    )
  );

drop policy if exists "entry_photos_delete" on storage.objects;
create policy "entry_photos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'entries'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
