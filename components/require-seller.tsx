"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function RequireSeller({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [canAccess, setCanAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      if (!isPending && session) {
        const result = await authClient.admin.hasPermission({
          permission: {
            code: ["generate"],
          },
        });
        setCanAccess(result.data?.success ?? false);
        setChecking(false);
      } else if (!isPending && !session) {
        setChecking(false);
      }
    }
    checkPermission();
  }, [isPending, session]);

  useEffect(() => {
    if (!checking && !canAccess && session) {
      router.push("/app");
    }
  }, [checking, canAccess, session, router]);

  if (isPending || checking || !session || !canAccess) {
    return null;
  }

  return <>{children}</>;
}
