import { Suspense } from "react";
import { OfflineApp } from "@/components/offline-app";

export const dynamic = "force-static";
export default function OfflinePage() {
  return (
    <Suspense fallback={<p className="p-6">Loading saved data…</p>}>
      <OfflineApp />
    </Suspense>
  );
}
