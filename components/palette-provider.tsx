"use client";

import { useSyncExternalStore } from "react";
import { paletteStorageKey, parsePalette, type Palette } from "@/lib/themes";

const changeEvent = "notifymind-palette-change";

function getSnapshot() {
  return parsePalette(document.documentElement.dataset.palette ?? null);
}

function subscribe(onChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key !== paletteStorageKey && event.key !== null) return;
    document.documentElement.dataset.palette = parsePalette(event.newValue);
    onChange();
  }
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function setPalette(palette: Palette) {
  document.documentElement.dataset.palette = palette;
  window.dispatchEvent(new Event(changeEvent));
  try {
    localStorage.setItem(paletteStorageKey, palette);
  } catch {
    // Keep the selected palette for this visit when storage is unavailable.
  }
}

export function usePalette() {
  const palette = useSyncExternalStore(subscribe, getSnapshot, () => "neutral" as const);
  return { palette, setPalette };
}

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  // Keep other tabs in sync even when the theme picker is not mounted.
  usePalette();
  return children;
}
