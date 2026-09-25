"use client";

import { useSyncExternalStore } from "react";
import { useAppSession } from "@/lib/offline/session";
import { availableMobilePages, parseMobilePages, parseNavigationAppearance, type NavigationAppearance } from "@/lib/mobile-navigation";

const changeEvent = "notifymind-mobile-navigation-change";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(changeEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(changeEvent, listener);
  };
}

export function useMobileNavigation() {
  const { data: session } = useAppSession();
  const key = `notifymind-mobile-navigation-v1:${session?.user.id ?? "anonymous"}`;
  const saved = useSyncExternalStore(subscribe, () => {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }, () => null);
  const appearanceKey = `${key}:appearance`;
  const savedAppearance = useSyncExternalStore(subscribe, () => {
    try { return window.localStorage.getItem(appearanceKey); } catch { return null; }
  }, () => null);
  const appearance = parseNavigationAppearance(savedAppearance);
  function setAppearance(next: NavigationAppearance) {
    try {
      window.localStorage.setItem(appearanceKey, JSON.stringify(next));
      window.dispatchEvent(new Event(changeEvent));
      return true;
    } catch { return false; }
  }
  const selected = parseMobilePages(saved);
  const pages = availableMobilePages(session?.user.role);

  function setSelected(next: string[]) {
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event(changeEvent));
      return true;
    } catch {
      return false;
    }
  }

  return { pages, selected, setSelected, appearance, setAppearance, ready: !!session };
}
