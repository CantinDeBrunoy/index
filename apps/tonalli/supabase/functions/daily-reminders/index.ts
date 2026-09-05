/**
 * Rappel quotidien, à l'heure locale de chacun.
 *
 * Un site web ne peut pas programmer de notification récurrente : c'est le
 * serveur qui pousse. Cette fonction est appelée toutes les 15 minutes par un
 * cron ; la base sélectionne les personnes dont c'est l'heure choisie *chez
 * elles* et dont la journée locale n'est pas encore remplie.
 *
 * Ce fichier est volontairement autonome (aucun import local) pour pouvoir
 * être collé tel quel dans l'éditeur du tableau de bord Supabase.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

// Textes dans la langue du destinataire.
const MESSAGES = {
  fr: { title: 'Tonalli', body: 'Quelle est la couleur de ta journée ?' },
  es: { title: 'Tonalli', body: '¿De qué color es tu día?' },
} as const;

const localeOf = (value: unknown) => (value === 'es' ? 'es' : 'fr');

/** Fenêtre en minutes : doit couvrir l'intervalle du cron. */
const WINDOW_MINUTES = 15;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contact@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

type Recipient = { id: string; push_token: string; locale: string };

Deno.serve(async (request) => {
  const expected = Deno.env.get('WEBHOOK_SECRET');
  if (expected && request.headers.get('x-webhook-secret') !== expected) {
    return new Response('forbidden', { status: 403 });
  }

  // `force_user_id` envoie le rappel à une personne précise, sans regarder ni
  // l'heure ni sa journée : c'est le seul moyen de vérifier la chaîne complète
  // sans attendre l'heure dite. Protégé par le même secret que le reste.
  const input = (await request.json().catch(() => ({}))) as { force_user_id?: string };

  let due: Recipient[] = [];
  if (input.force_user_id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, push_token, locale')
      .eq('id', input.force_user_id)
      .not('push_token', 'is', null)
      .returns<Recipient[]>();
    if (error) return new Response(error.message, { status: 500 });
    due = data ?? [];
    if (due.length === 0) {
      return Response.json({ sent: 0, reason: 'aucun abonnement pour cette personne' });
    }
  } else {
    const { data, error } = await supabase.rpc('due_reminders', {
      window_minutes: WINDOW_MINUTES,
    });
    if (error) return new Response(error.message, { status: 500 });
    due = (data ?? []) as Recipient[];
  }

  let sent = 0;
  for (const row of due) {
    const messages = MESSAGES[localeOf(row.locale)];
    const payload = JSON.stringify({
      title: messages.title,
      body: messages.body,
      tag: 'daily-reminder',
      url: '/',
    });

    try {
      await webpush.sendNotification(JSON.parse(row.push_token), payload);
      sent += 1;
    } catch (pushError) {
      // 404 / 410 : l'abonnement n'existe plus côté navigateur, on le nettoie.
      const status = (pushError as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from('profiles').update({ push_token: null }).eq('id', row.id);
      }
    }
  }

  return Response.json({ sent, candidates: due.length });
});
