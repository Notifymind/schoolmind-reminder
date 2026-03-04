"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function RequireNotAdminSeller({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [canAccess, setCanAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      if (!isPending && session) {
        const [adminResult, sellerResult] = await Promise.all([
          authClient.admin.hasPermission({
            permission: {
              admin: ["access"],
            },
          }),
          authClient.admin.hasPermission({
            permission: {
              seller: ["access"],
            },
          }),
        ]);

        const isAdmin = adminResult.data?.success ?? false;
        const isSeller = sellerResult.data?.success ?? false;

        setCanAccess(!isAdmin && !isSeller);
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
