import { api } from './api';

export type GeoError = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export function currentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject('unsupported' satisfies GeoError);
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      e => reject((e.code === e.PERMISSION_DENIED ? 'denied' : e.code === e.TIMEOUT ? 'timeout' : 'unavailable') satisfies GeoError),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  });
}

/** Native share sheet where there is one; otherwise copy the link. Resolves to what happened. */
export async function shareStory(s: { id: string; title: string }): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const url = `${location.origin}/?story=${encodeURIComponent(s.id)}`;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  if (navigator.share && coarse) {
    try {
      await navigator.share({ title: s.title, text: `${s.title} — via The News`, url });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

const b64ToBytes = (b64: string) => {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(s, c => c.charCodeAt(0));
};

/**
 * Asks for notification permission and, when the server has push configured, subscribes this device.
 * Returns the resulting permission.
 */
export async function enableNotifications(signedIn: boolean): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported';
  const perm = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (perm !== 'granted' || !signedIn || !('serviceWorker' in navigator) || !('PushManager' in window)) return perm;
  try {
    const { publicKey } = await api.pushKey();
    if (!publicKey) return perm;
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
    await api.pushSubscribe(sub.toJSON());
  } catch {
    /* Permission is still granted; the subscription can be retried from settings. */
  }
  return perm;
}

export async function disableNotifications() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    await sub?.unsubscribe();
    await api.pushUnsubscribe();
  } catch { /* already off */ }
}
