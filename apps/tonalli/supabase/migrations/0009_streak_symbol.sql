-- Le symbole de la série : celui qui s'affiche à côté du nombre de jours
-- d'affilée, et que chacun choisit dans ses réglages.
--
-- On stocke la **clé**, pas le caractère : si le glyphe de la flamme changeait
-- un jour, aucun profil n'aurait à être réécrit. Une contrainte `check`
-- suffit là où les réactions ont une clé étrangère — ce symbole est cosmétique
-- et personnel, rien d'autre ne le référence, et il ne traverse jamais le
-- binôme.
--
-- La série elle-même n'est pas stockée : elle se recalcule à l'affichage en
-- remontant les entrées. Une colonne « nombre de jours » serait une vérité en
-- double, à réconcilier à chaque correction de journée.
--
-- Rejouer ce fichier est sans risque.

alter table public.profiles
  add column if not exists streak_symbol text not null default 'flame';

alter table public.profiles
  drop constraint if exists profiles_streak_symbol_check;

alter table public.profiles
  add constraint profiles_streak_symbol_check
  check (streak_symbol in ('flame', 'cherry', 'heart', 'star', 'leaf', 'sun'));
