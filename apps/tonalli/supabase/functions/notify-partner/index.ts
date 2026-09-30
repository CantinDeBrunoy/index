/**
 * Prévient l'autre : quand quelqu'un enregistre sa journée, et quand
 * quelqu'un réagit à celle de l'autre.
 *
 * Déclenchée par **deux** Database Webhooks sur `INSERT` — l'un dans
 * `entries`, l'autre dans `reactions` — qui pointent tous les deux ici. Une
 * seule fonction pour les deux parce que la mécanique est identique : trouver
 * le destinataire, son abonnement, sa langue. La dupliquer dans un second
 * fichier obligerait à corriger chaque piège VAPID deux fois.
 *
 * Sur `INSERT` seulement, et c'est un choix : changer d'avis sur une réaction
 * est un UPDATE (la clé primaire est `(entry_id, author_id)`), donc passer de
 * ❤️ à 😂 ne repingue personne. Une réaction est un geste, pas une
 * conversation à notifier à chaque virage.
 *
 * Le webhook envoie l'en-tête `x-webhook-secret`, comparé à la variable
 * d'environnement du même nom : sans elle, n'importe qui pourrait déclencher
 * des notifications.
 *
 * Ce fichier est volontairement autonome (aucun import local) pour pouvoir
 * être collé tel quel dans l'éditeur du tableau de bord Supabase.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const MESSAGES = {
  fr: {
    title: 'Tonalli',
    posted: (name: string) => `${name} a rempli sa journée.`,
    reacted: (name: string, emoji: string) => `${name} a réagi à ta journée ${emoji}`,
  },
  es: {
    title: 'Tonalli',
    posted: (name: string) => `${name} ha registrado su día.`,
    reacted: (name: string, emoji: string) => `${name} ha reaccionado a tu día ${emoji}`,
  },
} as const;

const localeOf = (value: unknown) => (value === 'es' ? 'es' : 'fr');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

/**
 * Les valeurs collées à la main traînent souvent une espace ou un retour à la
 * ligne, et un copier-coller trop large embarque le nom de la variable.
 * On nettoie plutôt que de planter sur un détail invisible à l'œil.
 */
function env(name: string): string {
  const raw = (Deno.env.get(name) ?? '').trim();
  return raw.startsWith(`${name}=`) ? raw.slice(name.length + 1).trim() : raw;
}

/**
 * L'initialisation VAPID se fait à l'appel, pas au chargement du module : si
 * une clé est absente ou mal formée, on renvoie un message lisible au lieu
 * d'un 500 opaque dû à une fonction qui refuse de démarrer.
 */
function configureVapid(): string | null {
  const subject = env('VAPID_SUBJECT') || 'mailto:contact@example.com';
  const publicKey = env('VAPID_PUBLIC_KEY');
  const privateKey = env('VAPID_PRIVATE_KEY');

  if (!publicKey || !privateKey) {
    return 'VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY manquante dans les secrets.';
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return null;
  } catch (error) {
    return `Clés VAPID refusées : ${(error as Error).message}`;
  }
}

type Row = Record<string, unknown>;

/** Qui prévenir, de la part de qui, et — pour une réaction — avec quel emoji. */
type Target = { actorId: string; recipientId: string; emoji: string | null };

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

async function targetOf(table: string, record: Row): Promise<Target | null> {
  if (table === 'entries') {
    const actorId = text(record.user_id);
    if (!actorId) return null;

    const { data } = await supabase
      .from('profiles')
      .select('partner_id')
      .eq('id', actorId)
      .maybeSingle();

    const recipientId = text(data?.partner_id);
    return recipientId ? { actorId, recipientId, emoji: null } : null;
  }

  if (table === 'reactions') {
    const actorId = text(record.author_id);
    const entryId = text(record.entry_id);
    if (!actorId || !entryId) return null;

    // Le destinataire est l'auteur de la journée visée — pas « le binôme de
    // qui réagit ». C'est la même personne aujourd'hui, mais passer par
    // l'entrée dit exactement ce qu'on veut, et reste juste même si la
    // relation change entre la réaction et l'envoi.
    const { data } = await supabase
      .from('entries')
      .select('user_id')
      .eq('id', entryId)
      .maybeSingle();

    const recipientId = text(data?.user_id);
    return recipientId ? { actorId, recipientId, emoji: text(record.emoji) ?? '' } : null;
  }

  return null;
}

Deno.serve(async (request) => {
  const expected = env('WEBHOOK_SECRET');
  if (expected && request.headers.get('x-webhook-secret') !== expected) {
    return new Response('forbidden', { status: 403 });
  }

  const vapidError = configureVapid();
  if (vapidError) return Response.json({ error: vapidError }, { status: 500 });

  const event = (await request.json()) as { type?: string; table?: string; record?: Row };
  if (event.type !== 'INSERT') return new Response('ignoré', { status: 200 });

  const record = event.record ?? {};
  // `table` est toujours envoyé par un Database Webhook ; le repli sur la
  // forme de la ligne évite qu'un webhook déjà en place cesse de fonctionner
  // si le tableau de bord change son gabarit.
  const table = event.table ?? ('author_id' in record ? 'reactions' : 'entries');

  const target = await targetOf(table, record);
  if (!target) return new Response('rien à notifier', { status: 200 });

  // On ne réagit pas à sa propre journée — la base l'interdit — mais une
  // notification à soi-même serait le genre de bug qu'on ne remarque qu'en
  // production, un soir, sur son propre téléphone.
  if (target.recipientId === target.actorId) {
    return new Response('pas de notification à soi-même', { status: 200 });
  }

  const { data: actor } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', target.actorId)
    .maybeSingle();

  const { data: recipient } = await supabase
    .from('profiles')
    .select('push_token, locale')
    .eq('id', target.recipientId)
    .maybeSingle();

  if (!recipient?.push_token) return new Response('pas d’abonnement', { status: 200 });

  const messages = MESSAGES[localeOf(recipient.locale)];
  const name = text(actor?.display_name) ?? '…';
  const reaction = target.emoji !== null;

  const payload = JSON.stringify({
    title: messages.title,
    body: reaction ? messages.reacted(name, target.emoji ?? '') : messages.posted(name),
    // Deux étiquettes distinctes : une réaction ne doit pas remplacer
    // l'annonce de la journée, ni l'inverse.
    tag: reaction ? 'partner-reacted' : 'partner-posted',
    url: '/',
  });

  try {
    await webpush.sendNotification(JSON.parse(recipient.push_token), payload);
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await supabase.from('profiles').update({ push_token: null }).eq('id', target.recipientId);
    }
    return new Response('échec de l’envoi', { status: 200 });
  }

  return new Response('envoyé', { status: 200 });
});
