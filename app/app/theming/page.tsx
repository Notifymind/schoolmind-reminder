"use client";

import { useSyncExternalStore } from "react";
import { usePalette } from "@/components/palette-provider";
import { themes } from "@/lib/themes";
import { Check, Palette } from "lucide-react";
import { usePageTitle } from "@/app/app/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectAliasSettings } from "@/components/subject-alias-settings";
import { CountdownColorSettings } from "@/components/countdown-color-settings";
import { useOfflineState } from "@/lib/offline/store";
import { defaultUserSettings } from "@/lib/user-settings";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};

export default function ThemingPage() {
  usePageTitle("Appearance");
  const { snapshot, ready } = useOfflineState();
  const settings = snapshot?.settings ?? defaultUserSettings;
  const subjects = [...new Set([...(snapshot?.exams ?? []), ...(snapshot?.assignments ?? [])]
    .map((item) => item.subject).filter((subject): subject is string => !!subject?.trim()))];
  const { palette, setPalette } = usePalette();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <div className="grid w-full min-w-0 max-w-2xl gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Appearance</h1>
        </div>

        <Card className="min-w-0 gap-0 overflow-hidden py-0">
          <CardHeader className="p-4 sm:p-5">
            <CardTitle className="flex items-center gap-2 text-base leading-6">
              <Palette aria-hidden="true" className="size-4 text-muted-foreground" />
              Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
            <fieldset disabled={!mounted}>
              <legend className="sr-only">Theme</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {themes.map(({ value, label }) => (
                  <label key={value} className="relative min-w-0">
                    <input
                      type="radio"
                      name="theme"
                      value={value}
                      checked={mounted && palette === value}
                      onChange={() => setPalette(value)}
                      className="peer sr-only"
                    />
                    <span className={cn(
                      "flex cursor-pointer flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-sm font-medium transition-colors hover:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-wait peer-disabled:opacity-50",
                      mounted && palette === value && "border-primary bg-primary/5 text-primary",
                    )}>
                      <span data-palette={value} aria-hidden="true" className="theme-preview flex h-16 w-full overflow-hidden rounded-md border border-border">
                        <span className="flex flex-1 items-end gap-1 bg-background p-2">
                          <span className="h-6 flex-1 rounded-sm bg-primary" />
                          <span className="h-9 flex-1 rounded-sm border border-border bg-muted" />
                        </span>
                        <span className="dark theme-preview flex flex-1 items-end gap-1 bg-background p-2">
                          <span className="h-6 flex-1 rounded-sm bg-primary" />
                          <span className="h-9 flex-1 rounded-sm border border-border bg-muted" />
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-1">
                        {label}
                        <Check aria-hidden="true" className={cn("size-4 shrink-0", mounted && palette === value ? "visible" : "invisible")} />
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </CardContent>
        </Card>

        <section aria-labelledby="card-settings-heading" className="min-w-0 space-y-4">
          <div>
            <h2 id="card-settings-heading" className="text-lg font-semibold">Exam and assignment cards</h2>
            {!snapshot && <p role="status" className="mt-2 text-sm text-muted-foreground">{ready ? "Connect to load your settings before making changes." : "Loading your settings…"}</p>}
          </div>
          <SubjectAliasSettings key={`aliases-${snapshot?.user.id ?? "loading"}`} aliases={settings.subjectAliases} hiddenSubjects={settings.hiddenSubjects ?? []} subjects={subjects} disabled={!snapshot} />
          <CountdownColorSettings key={`colors-${snapshot?.user.id ?? "loading"}`} colors={settings.countdownColors} disabled={!snapshot} />
        </section>


      </div>
    </div>
  );
}
