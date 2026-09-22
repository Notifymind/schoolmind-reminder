"use client";
import { useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import { useOfflineState } from "./store";

// Cached identity enables local viewing only. Every sync authenticates on the server.
export function useAppSession() {
  const live = authClient.useSession();
  const offline = useOfflineState();
  const cached = useMemo(
    () => (offline.snapshot ? { user: offline.snapshot.user } : null),
    [offline.snapshot],
  );
  if (
    (offline.offline || offline.authenticated) &&
    offline.snapshot &&
    (!live.data || live.data.user.id === offline.snapshot.user.id)
  ) {
    return { data: cached, isPending: false };
  }
  return { data: live.data, isPending: live.isPending || !offline.ready };
}
