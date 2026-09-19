"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { syncPushSubscription } from "@/lib/push-client";
import { usePushNotificationStore } from "@/lib/stores/push-notifications";

export function PushSubscriptionSync() {
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;
  useEffect(() => {
    if (isPending) return;
    if (!userId) {
      usePushNotificationStore.getState().setSubscribed(false);
      return;
    }
    const sync = () => {
      if (document.visibilityState === "visible") {
        void syncPushSubscription().catch(() => {
          usePushNotificationStore.getState().setSubscribed(false);
        });
      }
    };
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [userId, isPending]);
  return null;
}
