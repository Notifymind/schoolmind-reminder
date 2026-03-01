"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { DollarSign } from "lucide-react"

type Permission = {
  [key: string]: string[]
}

export function SubscriptionGate({
  children,
  permission,
}: {
  children: React.ReactNode
  permission: Permission
}) {
  const { data: session, isPending } = authClient.useSession()
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkPermission() {
      if (!isPending && session) {
        const result = await authClient.admin.hasPermission({
          permission,
        })
        setHasPermission(result.data?.success ?? false)
      } else if (!isPending && !session) {
        setHasPermission(false)
      }
    }
    checkPermission()
  }, [isPending, session, permission])

  if (isPending || hasPermission === null) {
    return (
      <div className="flex flex-1 flex-col gap-6 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (!hasPermission) {
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

  return children
}
