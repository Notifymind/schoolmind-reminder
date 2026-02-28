"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function RequireSeller({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const userRole = session?.user?.role as string | undefined;
  const canAccess = userRole === "seller" || userRole === "admin";

  useEffect(() => {
    if (!isPending && !canAccess && session) {
      router.push("/app");
    }
  }, [isPending, canAccess, session, router]);

  if (isPending || !session || !canAccess) {
    return null;
  }

  return <>{children}</>;
}
