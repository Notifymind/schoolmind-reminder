"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"

export function AuthRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [hasCheckedSession, setHasCheckedSession] = useState(false)

  if (!isPending && !hasCheckedSession) {
    setHasCheckedSession(true)
  }

  useEffect(() => {
    if (!isPending && session) {
      router.push("/app")
    }
  }, [isPending, session, router])

  // Better Auth refreshes the session during the email-code challenge.
  // Only hide for the initial check, never for a background refresh.
  return <div hidden={(!hasCheckedSession && isPending) || Boolean(session)}>{children}</div>
}
