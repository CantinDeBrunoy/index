-- Deux photos par journée : la scène (caméra arrière) et le visage (caméra
-- frontale), prises coup sur coup au même appui.
--
-- La seconde photo est facultative en base, et pas seulement par prudence :
-- un ordinateur portable n'a qu'une caméra, et le navigateur peut refuser la
-- seconde ouverture. Une journée avec une seule photo reste une journée
-- valide — sinon la contrainte punirait l'appareil, pas la personne.
--
-- Rejouer ce fichier est sans risque.

alter table public.entries add column if not exists selfie_path text;

-- La lecture des objets du bucket suit la même règle qu'avant : je vois mon
-- dossier, le binôme ne voit un fichier que si une ligne `entries` visible
-- (donc réciproque) le référence. Il faut simplement que la nouvelle colonne
-- soit prise en compte, sinon la vignette du binôme resterait éternellement
-- grise.
drop policy if exists "entry_photos_select" on storage.objects;
create policy "entry_photos_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'entries'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.entries e
         where e.photo_path = storage.objects.name
            or e.selfie_path = storage.objects.name
      )
    )
  );
