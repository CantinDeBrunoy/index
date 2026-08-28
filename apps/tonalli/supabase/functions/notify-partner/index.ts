/**
 * Notifie le binôme quand quelqu'un enregistre sa journée.
 *
 * Déclenchée par un Database Webhook Supabase sur `INSERT` dans `entries`
 * (voir README). Le webhook envoie l'en-tête `x-webhook-secret`, comparé à la
 * variable d'environnement du même nom : sans lui, n'importe qui pourrait
 * déclencher des notifications.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

import { MESSAGES, localeOf } from '../_shared/push.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contact@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

type Payload = {
  type?: string;
  record?: { user_id?: string; date?: string };
};

Deno.serve(async (request) => {
  const expected = Deno.env.get('WEBHOOK_SECRET');
  if (expected && request.headers.get('x-webhook-secret') !== expected) {
    return new Response('forbidden', { status: 403 });
  }

  const payload = (await request.json()) as Payload;
  const authorId = payload.record?.user_id;
  if (payload.type !== 'INSERT' || !authorId) {
    return new Response('ignored', { status: 200 });
  }

  const { data: author } = await supabase
    .from('profiles')
    .select('display_name, partner_id')
    .eq('id', authorId)
    .maybeSingle();

  if (!author?.partner_id) return new Response('no partner', { status: 200 });

  const { data: partner } = await supabase
    .from('profiles')
    .select('push_token, locale')
    .eq('id', author.partner_id)
    .maybeSingle();

  if (!partner?.push_token) return new Response('no subscription', { status: 200 });

  const messages = MESSAGES[localeOf(partner.locale)];
  const body = JSON.stringify({
    title: messages.partnerTitle,
    body: messages.partnerBody(author.display_name || '…'),
    tag: 'partner-posted',
    url: '/',
  });

  try {
    await webpush.sendNotification(JSON.parse(partner.push_token), body);
  } catch (error) {
    // 404/410 : l'abonnement n'existe plus côté navigateur, on le nettoie.
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await supabase.from('profiles').update({ push_token: null }).eq('id', author.partner_id);
    }
    return new Response('push failed', { status: 200 });
  }

  return new Response('sent', { status: 200 });
});
