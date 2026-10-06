-- Réactions rapides : un emoji posé sur la journée du binôme, en un appui.
--
-- Ce n'est pas un commentaire et ce n'est pas un « like » : la palette est
-- fermée (six couples clé/emoji, comme les douze couples émotion/couleur), une
-- seule réaction par personne et par journée, et on ne réagit qu'à la journée
-- de l'autre — jamais à la sienne.
--
-- La réciprocité n'a rien de neuf à faire ici : une réaction ne peut viser
-- qu'une entrée que la policy de `entries` me laisse déjà lire, donc une
-- journée que j'avais moi-même remplie. Le droit de réagir hérite du droit de
-- voir, il ne l'élargit pas.
--
-- Rejouer ce fichier est sans risque. Son contenu est déjà intégré à 0001 :
-- ce fichier est un rattrapage pour une base créée avant lui.

-- ---------------------------------------------------------------------------
-- Palette fermée
-- ---------------------------------------------------------------------------
create table if not exists public.reaction_emojis (
  key        text primary key,
  emoji      text not null,
  sort_order integer not null,
  unique (key, emoji)
);

insert into public.reaction_emojis (key, emoji, sort_order) values
  ('heart',    '❤️', 1),
  ('hug',      '🤗', 2),
  ('laugh',    '😂', 3),
  ('wow',      '😮', 4),
  ('tender',   '🥺', 5),
  ('strength', '💪', 6)
on conflict (key) do update
  set emoji = excluded.emoji, sort_order = excluded.sort_order;

alter table public.reaction_emojis enable row level security;

drop policy if exists "reaction_emojis_readable" on public.reaction_emojis;
create policy "reaction_emojis_readable" on public.reaction_emojis
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Réactions
-- La clé primaire (entry_id, author_id) dit tout : une personne, une journée,
-- une réaction. Changer d'avis, c'est écraser la précédente ; la retirer,
-- c'est supprimer la ligne.
-- ---------------------------------------------------------------------------
create table if not exists public.reactions (
  entry_id   uuid not null references public.entries(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  key        text not null,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (entry_id, author_id),
  foreign key (key, emoji) references public.reaction_emojis (key, emoji)
);

create index if not exists reactions_entry_idx on public.reactions (entry_id);

alter table public.reactions enable row level security;

-- Lecture : les réactions posées sur une entrée que j'ai le droit de lire.
-- La sous-requête sur `entries` repasse par la RLS de `entries` — c'est
-- exactement ce qu'on veut : elle porte déjà la réciprocité, et la réaction
-- en hérite sans la réécrire. Pas de récursion à craindre ici, la policy de
-- `reactions` n'interroge pas `reactions`.
drop policy if exists "reactions_select" on public.reactions;
create policy "reactions_select" on public.reactions
  for select to authenticated
  using (exists (select 1 from public.entries e where e.id = reactions.entry_id));

-- Écriture : uniquement mes réactions, et uniquement sur une journée du
-- binôme. Le `exists` est doublement filtrant — par la RLS de `entries`
-- (donc par la réciprocité) et par `partner_of`, qui interdit de réagir à sa
-- propre journée.
drop policy if exists "reactions_insert" on public.reactions;
create policy "reactions_insert" on public.reactions
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.entries e
       where e.id = reactions.entry_id
         and e.user_id = public.partner_of(auth.uid())
    )
  );

drop policy if exists "reactions_update_own" on public.reactions;
create policy "reactions_update_own" on public.reactions
  for update to authenticated
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.entries e
       where e.id = reactions.entry_id
         and e.user_id = public.partner_of(auth.uid())
    )
  );

drop policy if exists "reactions_delete_own" on public.reactions;
create policy "reactions_delete_own" on public.reactions
  for delete to authenticated
  using (author_id = auth.uid());
