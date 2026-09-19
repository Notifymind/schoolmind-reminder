"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function PwaInstallButton() {
  const { installApp, isInstalling, isInstalled, isIos } = usePwaInstall();
  const [showInstructions, setShowInstructions] = useState(false);

  async function handleInstall() {
    setShowInstructions(false);
    if (!(await installApp())) setShowInstructions(true);
  }

  return (
    <div className="space-y-3">
      <Button size="lg" type="button" onClick={handleInstall} disabled={isInstalling || isInstalled}>
        <Download className="size-4" />
        {isInstalled ? "App Installed" : isInstalling ? "Installing..." : "Install as Web App"}
      </Button>
      {showInstructions && !isInstalled && (
        <p role="status" className="text-sm text-muted-foreground">
          {isIos
            ? 'In Safari, tap Share, then "Add to Home Screen".'
            : 'Open your browser menu and choose "Install app" or "Add to Home screen". If neither appears, open this page in Chrome.'}
        </p>
      )}
    </div>
  );
}
