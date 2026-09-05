/**
 * Notifie le binôme quand quelqu'un enregistre sa journée.
 *
 * Déclenchée par un Database Webhook sur `INSERT` dans `entries`. Le webhook
 * envoie l'en-tête `x-webhook-secret`, comparé à la variable d'environnement
 * du même nom : sans elle, n'importe qui pourrait déclencher des notifications.
 *
 * Ce fichier est volontairement autonome (aucun import local) pour pouvoir
 * être collé tel quel dans l'éditeur du tableau de bord Supabase.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const MESSAGES = {
  fr: { title: 'Tonalli', body: (name: string) => `${name} a rempli sa journée.` },
  es: { title: 'Tonalli', body: (name: string) => `${name} ha registrado su día.` },
} as const;

const localeOf = (value: unknown) => (value === 'es' ? 'es' : 'fr');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contact@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

Deno.serve(async (request) => {
  const expected = Deno.env.get('WEBHOOK_SECRET');
  if (expected && request.headers.get('x-webhook-secret') !== expected) {
    return new Response('forbidden', { status: 403 });
  }

  const event = (await request.json()) as {
    type?: string;
    record?: { user_id?: string };
  };

  const authorId = event.record?.user_id;
  if (event.type !== 'INSERT' || !authorId) {
    return new Response('ignored', { status: 200 });
  }

  const { data: author } = await supabase
    .from('profiles')
    .select('display_name, partner_id')
    .eq('id', authorId)
    .maybeSingle();

  if (!author?.partner_id) return new Response('pas de binôme', { status: 200 });

  const { data: partner } = await supabase
    .from('profiles')
    .select('push_token, locale')
    .eq('id', author.partner_id)
    .maybeSingle();

  if (!partner?.push_token) return new Response('pas d’abonnement', { status: 200 });

  const messages = MESSAGES[localeOf(partner.locale)];
  const payload = JSON.stringify({
    title: messages.title,
    body: messages.body(author.display_name || '…'),
    tag: 'partner-posted',
    url: '/',
  });

  try {
    await webpush.sendNotification(JSON.parse(partner.push_token), payload);
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await supabase.from('profiles').update({ push_token: null }).eq('id', author.partner_id);
    }
    return new Response('échec de l’envoi', { status: 200 });
  }

  return new Response('envoyé', { status: 200 });
});
