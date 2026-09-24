-- La tenue du personnage : un accessoire au plus par catégorie (tête, corps,
-- visage, motif), choisi dans « Mon personnage ».
--
-- Une colonne par catégorie plutôt qu'un objet JSON : chacune a sa liste
-- fermée, tenue par une contrainte `check` comme le symbole de la série, et
-- `null` veut dire « rien ». Les listes doivent rester égales à celles de
-- src/lib/character.ts — `npm run checks` le vérifie : un accessoire ajouté
-- d'un seul côté serait refusé à l'écriture.
--
-- Contrairement au symbole de la série, la tenue **traverse le binôme** : le
-- personnage paraît aussi chez l'autre. La policy de lecture de `profiles`
-- le permet déjà (le binôme lit la ligne de l'autre), rien n'est à ouvrir.
--
-- Elle vit au profil, pas dans la journée : changer de chapeau change aussi
-- l'apparence des jours passés. Le personnage, c'est la personne maintenant,
-- pas un témoignage du jour — la recopier dans chaque entrée ne servirait à
-- rien.
--
-- Rejouer ce fichier est sans risque.

alter table public.profiles
  add column if not exists character_head  text,
  add column if not exists character_body  text,
  add column if not exists character_face  text,
  add column if not exists character_motif text;

alter table public.profiles drop constraint if exists profiles_character_head_check;
alter table public.profiles drop constraint if exists profiles_character_body_check;
alter table public.profiles drop constraint if exists profiles_character_face_check;
alter table public.profiles drop constraint if exists profiles_character_motif_check;

alter table public.profiles
  add constraint profiles_character_head_check
  check (character_head in ('beanie', 'flower', 'ears', 'lock', 'cap', 'bow', 'antennae'));

alter table public.profiles
  add constraint profiles_character_body_check
  check (character_body in ('scarf', 'satchel', 'cape', 'bowtie', 'necklace'));

alter table public.profiles
  add constraint profiles_character_face_check
  check (character_face in ('glasses', 'freckles', 'blush', 'lashes', 'mole', 'bandage'));

alter table public.profiles
  add constraint profiles_character_motif_check
  check (character_motif in ('stripes', 'dots', 'checks', 'stars'));
