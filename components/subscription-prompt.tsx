"use client"

import Link from "next/link"
import { authClient, type Session } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign } from "lucide-react"

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const user = session?.user as Session["user"] | undefined

  if (isPending) {
    return (
      <div className="flex flex-1 flex-col gap-6 items-center">
        <div className="grid gap-6 w-full max-w-2xl">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    )
  }

  if (!user || user.role !== "free") {
    return children
  }

  return (
    <div className="flex flex-1 items-center justify-center -mt-16">
      <div className="bg-card rounded-xl border p-8 max-w-md text-center">
        <div className="bg-primary/10 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
          <DollarSign className="text-primary size-8" />
        </div>
        <h2 className="text-xl font-semibold">Subscription Required</h2>
        <p className="text-muted-foreground mt-2">
          You need an active subscription to access this feature. Upgrade your plan to unlock all features.
        </p>
        <Button asChild className="mt-6">
          <Link href="/app/subscription">View Plans</Link>
        </Button>
      </div>
    </div>
  )
}
