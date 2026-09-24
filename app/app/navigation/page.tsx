"use client";

import { usePageTitle } from "@/app/app/layout";
import { MobileNavigationSettings } from "@/components/mobile-navigation-settings";
import { BackToSettings } from "@/components/back-to-settings";

export default function NavigationPage() {
  usePageTitle("Navigation");
  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl space-y-6">
      <BackToSettings />
      <MobileNavigationSettings />
    </div>
  );
}
