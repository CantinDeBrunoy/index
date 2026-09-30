-- Notifier aussi quand quelqu'un réagit à une journée.
--
-- La notification « a rempli sa journée » passe par un trigger maison
-- (`notify_partner_of_entry`) qui appelle l'Edge Function `notify-partner`
-- avec `pg_net`. Il lui faut une jumelle sur `reactions` — la table n'a pas de
-- colonne `user_id`, donc la fonction d'origine ne peut pas être réutilisée
-- telle quelle.
--
-- L'URL et le secret ne sont **pas écrits ici** : ils sont relus dans le corps
-- de la fonction existante, au moment de jouer la migration. C'est ce qui
-- permet de versionner cette étape sans publier le secret dans le dépôt — et
-- ça garantit au passage que les deux webhooks parlent toujours à la même
-- adresse avec la même clé.
--
-- Rejouer ce fichier est sans risque.

do $migration$
declare
  source_def text;
  target_url text;
  secret     text;
begin
  select pg_get_functiondef(p.oid)
    into source_def
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
   where t.tgrelid = 'public.entries'::regclass
     and t.tgname = 'notify_partner_of_entry';

  if source_def is null then
    raise exception
      'Trigger « notify_partner_of_entry » introuvable sur public.entries : '
      'créer d''abord le webhook de la journée, celui de la réaction s''en déduit.';
  end if;

  target_url := (regexp_match(source_def, '(https://[^'']*notify-partner)'))[1];

  -- Deux écritures possibles selon la façon dont les en-têtes ont été montés :
  -- `jsonb_build_object('x-webhook-secret', '…')` ou un littéral JSON.
  secret := coalesce(
    (regexp_match(source_def, 'x-webhook-secret''\s*,\s*''([^'']*)'''))[1],
    (regexp_match(source_def, '"x-webhook-secret"\s*:\s*"([^"]*)"'))[1]
  );

  if target_url is null or secret is null then
    raise exception
      'URL ou secret introuvables dans « notify_partner_of_entry » : '
      'la forme du corps a changé, il faut reprendre cette migration.';
  end if;

  -- `format(%L)` échappe les deux valeurs : elles passent de la fonction
  -- d'origine à la nouvelle sans jamais transiter par un fichier ni un écran.
  execute format($generated$
    create or replace function public.notify_partner_of_reaction()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $body$
    begin
      -- Le corps envoyé est celui qu'un Database Webhook enverrait : la
      -- fonction `notify-partner` route sur `table` et remonte au
      -- destinataire par `entry_id`.
      perform net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-secret', %L
        ),
        body := jsonb_build_object(
          'type', 'INSERT',
          'table', 'reactions',
          'record', jsonb_build_object(
            'entry_id', new.entry_id,
            'author_id', new.author_id,
            'key', new.key,
            'emoji', new.emoji
          )
        )
      );
      return new;
    end
    $body$;
  $generated$, target_url, secret);
end
$migration$;

-- `after insert` seulement : changer d'avis sur une réaction est un UPDATE,
-- et repinguer à chaque virage ferait d'un geste une conversation.
drop trigger if exists notify_partner_of_reaction on public.reactions;
create trigger notify_partner_of_reaction
  after insert on public.reactions
  for each row execute function public.notify_partner_of_reaction();
