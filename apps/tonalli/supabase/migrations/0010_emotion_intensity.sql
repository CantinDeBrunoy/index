-- Trois crans d'intensité par émotion : la même couleur, plus pâle ou plus
-- dense. Trente-six couples au lieu de douze.
--
-- **L'invariant ne bouge pas.** « Une couleur qui ne correspond pas à son
-- émotion ne peut pas être écrite » reste garanti par une clé étrangère : elle
-- pointe simplement vers la table des nuances au lieu de la table des
-- émotions. La palette grandit, elle reste fermée.
--
-- Le cran « franc » vaut **exactement** la couleur d'origine. C'est ce qui
-- permet d'ajouter les nuances sans toucher aux journées déjà écrites : elles
-- restent valides, et deviennent rétroactivement des « franches ». La
-- nouvelle contrainte se valide donc sans rien réécrire.
--
-- L'intensité n'est pas stockée dans `entries` : le couple (émotion, couleur)
-- la détermine, et une colonne de plus serait une vérité en double. Elle se
-- relit avec `intensityOf()` côté application.
--
-- Les couleurs sont dérivées des douze couleurs d'origine par mélange vers les
-- encres du châssis (crème à 0,40 ; brun-encre à 0,55) — le même calcul que
-- `shadeOf()`. `npm run checks` compare les deux listes et échoue si elles
-- divergent.
--
-- Rejouer ce fichier est sans risque.

create table if not exists public.emotion_shades (
  emotion   text not null references public.emotions(key) on delete cascade,
  intensity text not null check (intensity in ('light', 'plain', 'deep')),
  color     text not null,
  primary key (emotion, intensity),
  -- C'est cette unicité que référence `entries` : un couple (émotion,
  -- couleur) désigne un seul cran, donc l'intensité se relit sans ambiguïté.
  unique (emotion, color)
);

insert into public.emotion_shades (emotion, intensity, color) values
  ('joy', 'light', '#FFE583'),
  ('joy', 'plain', '#FFD93D'),
  ('joy', 'deep', '#8A7329'),
  ('serenity', 'light', '#CBE6E2'),
  ('serenity', 'plain', '#A8DADC'),
  ('serenity', 'deep', '#637471'),
  ('love', 'light', '#FFA3BC'),
  ('love', 'plain', '#FF6B9D'),
  ('love', 'deep', '#8A4254'),
  ('gratitude', 'light', '#F8C498'),
  ('gratitude', 'plain', '#F4A261'),
  ('gratitude', 'deep', '#855B39'),
  ('pride', 'light', '#F1A58F'),
  ('pride', 'plain', '#E76F51'),
  ('pride', 'deep', '#7F4432'),
  ('excitement', 'light', '#FF918C'),
  ('excitement', 'plain', '#FF4D4D'),
  ('excitement', 'deep', '#8A3430'),
  ('nostalgia', 'light', '#D0B6CE'),
  ('nostalgia', 'plain', '#B08BBB'),
  ('nostalgia', 'deep', '#665062'),
  ('tiredness', 'light', '#BBBFC6'),
  ('tiredness', 'plain', '#8D99AE'),
  ('tiredness', 'deep', '#57565C'),
  ('sadness', 'light', '#8FADBC'),
  ('sadness', 'plain', '#457B9D'),
  ('sadness', 'deep', '#364954'),
  ('anxiety', 'light', '#A690B6'),
  ('anxiety', 'plain', '#6A4C93'),
  ('anxiety', 'deep', '#473450'),
  ('anger', 'light', '#C37775'),
  ('anger', 'plain', '#9B2226'),
  ('anger', 'deep', '#5D211F'),
  ('neutral', 'light', '#E8E4E0'),
  ('neutral', 'plain', '#D8D8D8'),
  ('neutral', 'deep', '#78736F')
on conflict (emotion, intensity) do update set color = excluded.color;

alter table public.emotion_shades enable row level security;

drop policy if exists "emotion_shades_readable" on public.emotion_shades;
create policy "emotion_shades_readable" on public.emotion_shades
  for select to authenticated using (true);

-- La clé étrangère passe des douze couples aux trente-six. L'ancienne est
-- nommée par Postgres d'après ses colonnes ; on la retire avant de poser la
-- nouvelle, sinon les deux coexisteraient et la plus stricte gagnerait.
alter table public.entries drop constraint if exists entries_emotion_color_fkey;
alter table public.entries drop constraint if exists entries_emotion_fkey;

alter table public.entries
  add constraint entries_emotion_color_fkey
  foreign key (emotion, color) references public.emotion_shades (emotion, color);
