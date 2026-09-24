"use client";

import Link from "next/link";
import { Bell, ChevronRight, Palette, User, Navigation } from "lucide-react";
import { usePageTitle } from "@/app/app/layout";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


const settingsLinks = [
  { href: "/app/navigation", title: "Navigation", description: "Arrange your mobile navbar and choose its appearance.", action: "Customize navigation", icon: Navigation },
  { href: "/app/theming", title: "Appearance", description: "Choose a theme and customize your exam and assignment cards.", action: "Customize appearance", icon: Palette },
  {
    href: "/app/notifications",
    title: "Notifications",
    description: "Manage push notifications and reminder presets for exams and assignments.",
    action: "Manage notifications",
    icon: Bell,
  },
  {
    href: "/app/account",
    title: "Account",
    description: "Update your email, change your password, and manage passkeys.",
    action: "Manage account",
    icon: User,
  },
] as const;

export default function SettingsPage() {
  usePageTitle("Settings");

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <div className="grid w-full min-w-0 max-w-2xl gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Choose how NotifyMind looks and manage your account preferences.
          </p>
        </div>

        <div className="grid min-w-0 gap-4">
          {settingsLinks.map(({ href, title, description, action, icon: Icon }) => (
            <Card key={href} className="min-w-0 gap-0 overflow-hidden py-0">
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="flex items-center gap-2 text-base leading-6">
                  <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                  {title}
                </CardTitle>
                <CardDescription className="leading-5">{description}</CardDescription>
              </CardHeader>
              <Link
                href={href}
                className="flex min-h-11 items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-4 py-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
              >
                {action}
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
