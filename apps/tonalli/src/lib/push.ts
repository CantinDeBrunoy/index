/**
 * Notifications web (push serveur).
 *
 * Un site ne peut pas programmer de notification locale récurrente : c'est le
 * serveur qui pousse. Le navigateur reçoit le message dans son service worker,
 * même onglet fermé — à condition d'avoir accordé la permission.
 *
 * Limite connue d'iOS : Safari n'autorise le push que si le site a été ajouté
 * à l'écran d'accueil. Les réglages l'expliquent à l'utilisateur.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function permissionState(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
}

/** iOS n'autorise le push que depuis une app ajoutée à l'écran d'accueil. */
export function isIosWithoutStandalone(): boolean {
  if (typeof navigator === 'undefined') return false;
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIos && !standalone && !window.matchMedia('(display-mode: standalone)').matches;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Demande la permission puis renvoie l'abonnement sérialisé, à stocker dans
 * le profil. `null` si refusé ou impossible.
 */
export async function subscribeToPush(): Promise<string | null> {
  if (!pushSupported() || !VAPID_PUBLIC_KEY) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const registration = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  if (!registration) return null;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }));

  return JSON.stringify(subscription.toJSON());
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  await subscription?.unsubscribe();
}
