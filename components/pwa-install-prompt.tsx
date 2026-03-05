"use client"

import * as React from "react"
import { Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSAL_KEY = "pwa-install-dismissed"
const DISMISSAL_DAYS = 7

function isRecentlyDismissed(): boolean {
  const dismissedAt = localStorage.getItem(DISMISSAL_KEY)
  if (!dismissedAt) return false

  const dismissedDate = new Date(parseInt(dismissedAt, 10))
  const now = new Date()
  const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)

  return daysSinceDismissed < DISMISSAL_DAYS
}

function markDismissed(): void {
  localStorage.setItem(DISMISSAL_KEY, Date.now().toString())
}

function clearDismissed(): void {
  localStorage.removeItem(DISMISSAL_KEY)
}

export function PwaInstallPrompt() {
  const isMobile = useIsMobile()
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = React.useState(false)

  React.useEffect(() => {
    if (!isMobile) return

    const handler = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent

      if (isRecentlyDismissed()) return

      setDeferredPrompt(promptEvent)
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [isMobile])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()

    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      clearDismissed()
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    markDismissed()
    setShowPrompt(false)
  }

  if (!isMobile || !showPrompt) return null

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 p-3">
      <div className="bg-card border shadow-lg rounded-lg p-3 flex items-center gap-3 max-w-md mx-auto">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <Download className="size-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Get the app</p>
          <p className="text-xs text-muted-foreground">Quick access from your home screen</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" onClick={handleInstall}>
            Download
          </Button>
          <Button size="icon-xs" variant="ghost" onClick={handleDismiss} aria-label="Dismiss">
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
