"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { queueChange } from "@/lib/offline/store";
import { countdownBands, defaultCountdownColors, pillColors, type CountdownColors, type PillColor } from "@/lib/user-settings";
import { cn } from "@/lib/utils";

export function CountdownColorSettings({ colors, disabled }: { colors: CountdownColors; disabled: boolean }) {
  const [draft, setDraft] = useState<CountdownColors | null>(null);
  const [saving, setSaving] = useState(false);
  const current = draft ?? colors;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || disabled) return;
    setSaving(true);
    try {
      const result = await queueChange({ kind: "countdownColors", value: current });
      if ("error" in result) toast.error(result.error);
      else {
        setDraft(null);
        toast.success("Countdown colors saved");
      }
    } finally { setSaving(false); }
  }

  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      <CardHeader className="p-4 sm:p-5">
        <CardTitle className="flex items-center gap-2 text-base leading-6">
          <CalendarClock aria-hidden="true" className="size-4 text-muted-foreground" />
          Countdown colors
        </CardTitle>
        <CardDescription className="leading-5">Choose a pill color for each day range. These colors apply to both exams and assignments.</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
        <form onSubmit={save} className="space-y-4">
          <fieldset disabled={disabled || saving} className="space-y-2">
            <legend className="sr-only">Colors by days remaining</legend>
            {countdownBands.map(({ key, label, preview }) => (
              <div key={key} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <label htmlFor={`countdown-${key}`} className="block text-sm font-medium">{label}</label>
                  <span className={cn("inline-block rounded-md px-2 py-1 text-xs font-medium", pillColors[current[key]].className)}>{preview}</span>
                </div>
                <select id={`countdown-${key}`} value={current[key]} onChange={(event) => setDraft({ ...current, [key]: event.target.value as PillColor })}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50">
                  {Object.entries(pillColors).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            ))}
          </fieldset>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" className="min-h-11" disabled={disabled || saving} onClick={() => setDraft({ ...defaultCountdownColors })}>Reset colors</Button>
            <Button type="submit" className="min-h-11" disabled={disabled || saving || draft === null}>{saving ? "Saving…" : "Save colors"}</Button>
          </div>
        </form>
      </CardContent>
      <div className="border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
        <p className="text-sm leading-5 text-muted-foreground">Colors adapt to light and dark mode. The day label always stays visible.</p>
      </div>
    </Card>
  );
}
