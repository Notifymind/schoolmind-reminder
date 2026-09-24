"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import {
  discardPendingChanges,
  initializeOffline,
  setOffline,
  synchronizeOffline,
  useOfflineState,
  getOfflineState,
} from "@/lib/offline/store";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function OfflineManager() {
  const { data: session, isPending } = authClient.useSession();
  useEffect(() => {
    setOffline(!navigator.onLine);
    void initializeOffline().then(() => synchronizeOffline());
    const navigateOffline = (event: MouseEvent) => {
      if (
        (!getOfflineState().offline && navigator.onLine) ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const url = new URL(anchor.href);
      if (
        url.origin === window.location.origin &&
        (url.pathname === "/app" || url.pathname.startsWith("/app/"))
      ) {
        event.preventDefault();
        event.stopPropagation();
        window.location.assign(url.href);
      }
    };
    document.addEventListener("click", navigateOffline, true);
    const sync = () => {
      if (document.visibilityState === "visible") void synchronizeOffline();
    };
    const offline = () => setOffline(true);
    const networkMessage = (event: MessageEvent) => {
      if (event.data?.type === "NETWORK_UNAVAILABLE") offline();
    };
    navigator.serviceWorker?.addEventListener("message", networkMessage);
    const online = () => {
      sync();
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    const timer = window.setInterval(sync, 30_000);
    return () => {
      clearInterval(timer);
      navigator.serviceWorker?.removeEventListener("message", networkMessage);
      document.removeEventListener("click", navigateOffline, true);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  useEffect(() => {
    if (session?.user.id) void synchronizeOffline();
    // Do not erase pending edits on session expiry; the banner asks for sign-in.
  }, [session?.user.id, isPending]);
  return null;
}

export function OfflineBanner() {
  const state = useOfflineState();
  if (!state.offline && !state.pending && !state.error) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"
    >
      {state.offline
        ? "Notifications are unavailable while offline. Changes will apply once you're back online."
        : state.error
          ? `Changes haven't synchronized: ${state.error}`
          : `Synchronizing ${state.pending} pending change${state.pending === 1 ? "" : "s"}…`}
      {state.offline && state.pending > 0 && (
        <span className="ml-1">
          {state.pending} {state.pending === 1 ? "change" : "changes"} saved on
          this device.
        </span>
      )}
      {state.error && !state.offline && (
        <span className="ml-2 inline-flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void synchronizeOffline()}
            disabled={state.syncing}
          >
            Retry
          </Button>
          {state.pending > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline">
                  Discard pending changes
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Discard unsynchronized changes?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the changes saved on this device and restores
                    the last settings received from the server.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void discardPendingChanges()}
                  >
                    Discard changes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </span>
      )}
    </div>
  );
}
