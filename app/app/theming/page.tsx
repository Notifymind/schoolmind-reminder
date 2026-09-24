"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Palette, Sun } from "lucide-react";
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

export default function ThemingPage() {
  usePageTitle("Theming");
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
          <h1 className="text-2xl font-semibold">Theming</h1>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Choose your theme and personalize exam and assignment cards.
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


      </div>
    </div>
  );
}
