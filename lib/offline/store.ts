"use client";

import { useSyncExternalStore } from "react";
import {
  getOfflineSnapshotAction,
  syncNotificationChangeAction,
} from "@/lib/actions/offline";
import {
  applyChange,
  project,
  validateChange,
  type Change,
  type SavedState,
  type Snapshot,
  type PendingChange,
} from "./model";
import { readSavedState, writeSavedState } from "./storage";

type State = {
  ready: boolean;
  authenticated: boolean;
  offline: boolean;
  syncing: boolean;
  pending: number;
  error: string | null;
  snapshot: Snapshot | null;
};
const initial: State = {
  ready: false,
  authenticated: false,
  offline: false,
  syncing: false,
  pending: 0,
  error: null,
  snapshot: null,
};
let state = initial;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | undefined;
let initialized: Promise<void> | undefined;
let syncPromise: Promise<void> | undefined;
let localLock = Promise.resolve();
async function locked<T>(work: () => Promise<T>): Promise<T> {
  if (navigator.locks)
    return await navigator.locks.request("notifymind-offline", work);
  const result = localLock.then(work);
  localLock = result.then(
    () => {},
    () => {},
  );
  return result;
}
function update(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}
function publish(saved: SavedState | null) {
  update({
    ready: true,
    snapshot: saved ? project(saved) : null,
    pending: saved?.queue.length ?? 0,
  });
}
export function getOfflineState() {
  return state;
}
export function subscribeOffline(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useOfflineState() {
  return useSyncExternalStore(subscribeOffline, getOfflineState, () => initial);
}
export function initializeOffline() {
  return (initialized ??= readSavedState()
    .then((saved) => {
      publish(saved);
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("notifymind-offline-state");
        channel.onmessage = () => {
          void readSavedState().then(publish);
        };
      }
    })
    .catch(() => {
      update({
        ready: true,
        error:
          "Offline storage is unavailable. Changes cannot be saved on this device.",
      });
    }));
}
export function setOffline(offline: boolean) {
  update({ offline });
}
export async function clearOfflineData() {
  await locked(async () => {
    await writeSavedState(null);
    publish(null);
    update({ authenticated: false, error: null });
  });
}

export async function synchronizeOffline() {
  if (!navigator.onLine) {
    setOffline(true);
    return;
  }
  if (syncPromise) return syncPromise;
  syncPromise = locked(async () => {
    await initializeOffline();
    update({ syncing: true });
    try {
      let saved = await readSavedState();
      const result = await getOfflineSnapshotAction();
      setOffline(!navigator.onLine);
      if (!result.snapshot) {
        update({
          authenticated: false,
          error: saved?.queue.length
            ? "Sign in again to synchronize your pending changes."
            : null,
        });
        return;
      }
      if (saved && saved.snapshot.user.id !== result.snapshot.user.id) {
        // Never replay an old account's changes under the new account.
        saved = null;
      }
      saved = { snapshot: result.snapshot, queue: saved?.queue ?? [] };
      await writeSavedState(saved);
      publish(saved);
      update({ authenticated: true });
      const hadPending = saved.queue.length > 0;
      while (saved.queue.length) {
        const entry: PendingChange = saved.queue[0];
        const response = await syncNotificationChangeAction(
          saved.snapshot.user.id,
          entry.change,
        );
        if ("error" in response) {
          update({ error: response.error ?? "Could not synchronize changes" });
          return; // Keep this change and its dependents until resolved or discarded.
        }
        saved = {
          snapshot: applyChange(saved.snapshot, entry.change),
          queue: saved.queue.slice(1),
        };
        await writeSavedState(saved);
        publish(saved);
      }
      const fresh = hadPending ? await getOfflineSnapshotAction() : result;
      if (fresh.snapshot && fresh.snapshot.user.id === saved.snapshot.user.id) {
        saved = { snapshot: fresh.snapshot, queue: [] };
        await writeSavedState(saved);
        publish(saved);
      }
      update({ error: null });
    } catch {
      // A connection can disappear even when navigator.onLine is still true.
      setOffline(true);
    } finally {
      update({ syncing: false });
    }
  }).finally(() => {
    syncPromise = undefined;
  });
  return syncPromise;
}

export async function queueChange(
  change: Change,
): Promise<{ success: true } | { error: string }> {
  await initializeOffline();
  try {
    const result = await locked(async () => {
      const saved = await readSavedState();
      if (!saved)
        return {
          error: "Connect once to download your data before editing offline.",
        };
      const error = validateChange(project(saved), change);
      if (error) return { error };
      saved.queue.push({ id: crypto.randomUUID(), change });
      await writeSavedState(saved); // Acknowledge only after the transaction commits.
      publish(saved);
      return { success: true as const };
    });
    if ("success" in result) void synchronizeOffline();
    return result;
  } catch {
    return {
      error: "Could not save this change on your device. Please try again.",
    };
  }
}

export async function discardPendingChanges() {
  await locked(async () => {
    const saved = await readSavedState();
    if (saved) {
      saved.queue = [];
      await writeSavedState(saved);
      publish(saved);
    }
    update({ error: null });
  });
  await synchronizeOffline();
}
