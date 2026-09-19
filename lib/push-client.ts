"use client";

import { subscribeToPushAction, unsubscribeFromPushAction } from "@/lib/actions/notifications";
import { usePushNotificationStore } from "@/lib/stores/push-notifications";

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// Serialize reconciliation, user clicks, and logout across tabs in this browser.
export async function withPushLock<T>(work: () => Promise<T>): Promise<T> {
  return navigator.locks ? await navigator.locks.request("push-subscription", work) : await work();
}

async function registration() {
  return await navigator.serviceWorker.getRegistration("/") ??
    await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

export async function syncPushSubscription() {
  return withPushLock(async () => {
    const store = usePushNotificationStore.getState();
    store.setSubscribed(false);
    if (!pushSupported()) return;
    const reg = await registration();
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    if (Notification.permission !== "granted") {
      const result = await unsubscribeFromPushAction(sub.endpoint);
      if (result.error) throw new Error(result.error);
      await sub.unsubscribe();
      return;
    }
    await saveSubscription(sub);
    store.setSubscribed(true);
  });
}

async function saveSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("Invalid browser subscription");
  let result;
  try {
    result = await subscribeToPushAction({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
  } catch {
    throw new Error("Could not save notification settings. Please try again.");
  }
  if (result.error) throw new Error(result.error);
}

export async function enablePush() {
  // Request permission directly from the user gesture, before awaiting registration.
  if (!pushSupported()) throw new Error("Push notifications are not supported in this browser.");
  const permission = await Notification.requestPermission();
  if (permission === "denied") {
    throw new Error("Notifications are blocked. Allow notifications in your browser's site settings, then try again.");
  }
  if (permission !== "granted") throw new Error("Notification permission was not granted. Click Enable Notifications and choose Allow.");
  return withPushLock(async () => {
    await registration();
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("Push notifications are not configured");
      const base64 = key.replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")), c => c.charCodeAt(0));
      try {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
      } catch (error) {
        const name = (error as { name?: string }).name;
        if (name === "NotAllowedError") {
          throw new Error("Notifications are blocked. Allow notifications in your browser's site settings, then try again.");
        }
        if (name === "AbortError") {
          throw new Error("Your browser could not connect to its push service. Check your connection and browser notification settings, then try again.");
        }
        throw new Error("Your browser could not register for notifications. Reload the page and try again.");
      }
    }
    await saveSubscription(sub);
    usePushNotificationStore.getState().setSubscribed(true);
  });
}

export async function disablePush(afterDisable?: () => Promise<void>) {
  return withPushLock(async () => {
    if (pushSupported()) {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        // Remove server ownership first so an interrupted operation is safe to retry.
        const result = await unsubscribeFromPushAction(sub.endpoint);
        if (result.error) throw new Error(result.error);
        await sub.unsubscribe();
        if (await reg!.pushManager.getSubscription()) throw new Error("Browser subscription could not be removed");
      }
    }
    usePushNotificationStore.getState().setSubscribed(false);
    await afterDisable?.();
  });
}
