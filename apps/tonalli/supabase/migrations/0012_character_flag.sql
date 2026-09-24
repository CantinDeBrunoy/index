-- Le drapeau du personnage : une cinquième catégorie de tenue, à côté de la
-- tête, du corps, du visage et du motif. Un fanion planté derrière lui, qui
-- se cumule avec le reste — d'où une colonne à lui plutôt qu'une place dans
-- la tête, qui l'aurait mis en concurrence avec les chapeaux.
--
-- Même règle que 0011 : une liste fermée tenue par une contrainte `check`,
-- `null` pour rien, et la liste doit rester égale à FLAGS dans
-- src/lib/character.ts — `npm run checks` le vérifie. Le binôme le voit,
-- comme le reste de la tenue ; la policy de lecture de `profiles` le permet
-- déjà.
--
-- Rejouer ce fichier est sans risque.

alter table public.profiles
  add column if not exists character_flag text;

alter table public.profiles drop constraint if exists profiles_character_flag_check;

alter table public.profiles
  add constraint profiles_character_flag_check
  check (character_flag in ('france', 'mexico', 'spain', 'italy', 'brazil'));
