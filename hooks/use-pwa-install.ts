"use client";

import * as React from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || 
    (ua.includes("Mac") && "ontouchend" in document);
}

function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = React.useState(false);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isIos, setIsIos] = React.useState(false);
  const [isAndroid, setIsAndroid] = React.useState(false);

  React.useEffect(() => {
    setIsIos(isIosDevice());
    setIsAndroid(isAndroidDevice());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = React.useCallback(async () => {
    if (!deferredPrompt || isInstalling || isInstalled) return false;

    setIsInstalling(true);
    // Each browser event can only be prompted once, even after dismissal.
    setDeferredPrompt(null);
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      return true;
    } catch {
      return false;
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt, isInstalling, isInstalled]);

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    isInstalling,
    installApp,
    isInstalled,
    isIos: isIos && !isInstalled,
    isAndroid: isAndroid && !isInstalled,
  };
}
