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

type Recipient = { id: string; push_token: string; locale: string };

Deno.serve(async (request) => {
  const expected = env('WEBHOOK_SECRET');
  if (expected && request.headers.get('x-webhook-secret') !== expected) {
    return new Response('forbidden', { status: 403 });
  }

  const vapidError = configureVapid();
  if (vapidError) return Response.json({ error: vapidError }, { status: 500 });

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
