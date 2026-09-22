import type { SavedState } from "./model";

const DATABASE = "notifymind-offline-v1";
let channel: BroadcastChannel | undefined;
let database: Promise<IDBDatabase> | undefined;
function open() {
  return (database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("state");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}
export async function readSavedState(): Promise<SavedState | null> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = db.transaction("state").objectStore("state").get("current");
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}
export async function writeSavedState(value: SavedState | null): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("state", "readwrite");
    const store = transaction.objectStore("state");
    if (value) store.put(value, "current");
    else store.delete("current");
    transaction.oncomplete = () => {
      if (typeof BroadcastChannel !== "undefined") {
        channel ??= new BroadcastChannel("notifymind-offline-state");
        channel.postMessage("changed");
      }
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Offline storage was interrupted"));
  });
}
