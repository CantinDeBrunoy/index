-- Correctif pour les projets créés avant la révision de 0001_init.sql.
--
-- Deux manques dans les règles du bucket `entries` :
--
-- 1. aucune policy UPDATE. Un envoi en mode `upsert` sur un fichier déjà
--    présent est un UPDATE côté stockage : toute reprise après un échec était
--    donc refusée (400 sur /storage/v1/object/...).
--
-- 2. la lecture exigeait qu'une ligne `entries` pointe déjà sur le fichier.
--    Or la photo part AVANT que la ligne soit créée : entre les deux, on ne
--    pouvait pas relire son propre fichier.
--
-- Nouvelle règle : chacun est maître de son dossier, le binôme n'a que la
-- lecture, et cette lecture reste soumise à la réciprocité puisque la
-- sous-requête sur `entries` est elle-même filtrée par sa policy.
--
-- Rejouer ce fichier est sans risque.

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
