"use client"

import { useOfflineState } from "@/lib/offline/store";
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppSession } from "@/lib/offline/session";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const offline = useOfflineState()
  const { data: session, isPending } = useAppSession()

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [isPending, session, router])

  if (isPending || !session || (offline.snapshot && offline.snapshot.user.id !== session.user.id)) {
    return null
  }

  return <>{children}</>
}
