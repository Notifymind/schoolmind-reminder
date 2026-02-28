"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

function hasCodePermission(role: string | null | undefined): boolean {
  if (!role) return false;
  return role === "seller" || role === "admin";
}

export function RequireSeller({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const canAccess = hasCodePermission(session?.user?.role);

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
