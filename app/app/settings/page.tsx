"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Bell, ChevronRight, Monitor, Moon, Palette, Sun, User } from "lucide-react";
import { usePageTitle } from "@/app/app/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectAliasSettings } from "@/components/subject-alias-settings";
import { CountdownColorSettings } from "@/components/countdown-color-settings";
import { useOfflineState } from "@/lib/offline/store";
import { defaultUserSettings } from "@/lib/user-settings";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};
const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

const settingsLinks = [
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
  const { snapshot, ready } = useOfflineState();
  const settings = snapshot?.settings ?? defaultUserSettings;
  const subjects = [...new Set([...(snapshot?.exams ?? []), ...(snapshot?.assignments ?? [])]
    .map((item) => item.subject).filter((subject): subject is string => !!subject?.trim()))];
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <div className="grid w-full min-w-0 max-w-2xl gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Choose how NotifyMind looks and manage your account preferences.
          </p>
        </div>

        <Card className="min-w-0 gap-0 overflow-hidden py-0">
          <CardHeader className="p-4 sm:p-5">
            <CardTitle className="flex items-center gap-2 text-base leading-6">
              <Palette aria-hidden="true" className="size-4 text-muted-foreground" />
              Appearance
            </CardTitle>
            <CardDescription>Choose a theme, or follow your device settings.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
            <fieldset disabled={!mounted}>
              <legend className="sr-only">Theme</legend>
              <div className="grid grid-cols-3 gap-2">
                {themes.map(({ value, label, icon: Icon }) => (
                  <label key={value} className="relative min-w-0">
                    <input
                      type="radio"
                      name="theme"
                      value={value}
                      checked={mounted && theme === value}
                      onChange={() => setTheme(value)}
                      className="peer sr-only"
                    />
                    <span className={cn(
                      "flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-sm font-medium transition-colors hover:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-wait peer-disabled:opacity-50",
                      mounted && theme === value && "border-primary bg-primary/5 text-primary",
                    )}>
                      <Icon aria-hidden="true" className="size-5" />
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </CardContent>
          <div className="border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
            <p className="text-sm leading-5 text-muted-foreground">
              Your theme is saved automatically in this browser.
            </p>
          </div>
        </Card>

        <section aria-labelledby="card-settings-heading" className="min-w-0 space-y-4">
          <div>
            <h2 id="card-settings-heading" className="text-lg font-semibold">Exam and assignment cards</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Personalize your cards. These settings are saved to your account. Offline changes sync when you reconnect.
            </p>
            {!snapshot && <p role="status" className="mt-2 text-sm text-muted-foreground">{ready ? "Connect to load your settings before making changes." : "Loading your settings…"}</p>}
          </div>
          <SubjectAliasSettings key={`aliases-${snapshot?.user.id ?? "loading"}`} aliases={settings.subjectAliases} hiddenSubjects={settings.hiddenSubjects ?? []} subjects={subjects} disabled={!snapshot} />
          <CountdownColorSettings key={`colors-${snapshot?.user.id ?? "loading"}`} colors={settings.countdownColors} disabled={!snapshot} />
        </section>

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
