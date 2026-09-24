"use client";

import { useState } from "react";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queueChange } from "@/lib/offline/store";
import type { SubjectAlias } from "@/lib/user-settings";

export function SubjectAliasSettings({ aliases, subjects, hiddenSubjects, disabled }: {
  aliases: SubjectAlias[];
  subjects: string[];
  hiddenSubjects: string[];
  disabled: boolean;
}) {
  const [draft, setDraft] = useState<SubjectAlias[] | null>(null);
  const [changingVisibility, setChangingVisibility] = useState(false);
  const [saving, setSaving] = useState(false);
  const current = draft ?? aliases;
  const hidden = new Set(hiddenSubjects);
  const allSubjects = [...new Set([...subjects, ...hiddenSubjects, ...aliases.map((entry) => entry.subject), ...current.map((entry) => entry.subject)])].sort((a, b) => a.localeCompare(b));

  function setAlias(subject: string, alias: string) {
    setDraft((previous) => [...(previous ?? aliases).filter((entry) => entry.subject !== subject), { subject, alias }]);
  }

  async function toggleHidden(subject: string) {
    if (changingVisibility || disabled) return;
    setChangingVisibility(true);
    try {
      const wasHidden = hidden.has(subject);
      const result = await queueChange({ kind: "hiddenSubjects", value: wasHidden
        ? hiddenSubjects.filter((value) => value !== subject) : [...hiddenSubjects, subject] });
      if ("error" in result) toast.error(result.error);
      else toast.success(wasHidden ? "Subject shown" : "Subject hidden");
    } finally { setChangingVisibility(false); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || disabled) return;
    setSaving(true);
    try {
      const value = current.map(({ subject, alias }) => ({ subject, alias: alias.trim() }))
        .filter(({ subject, alias }) => alias && alias !== subject);
      const result = await queueChange({ kind: "subjectAliases", value });
      if ("error" in result) toast.error(result.error);
      else {
        setDraft(null);
        toast.success("Subject aliases saved");
      }
    } finally { setSaving(false); }
  }

  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      <CardHeader className="p-4 sm:p-5">
        <CardTitle className="flex items-center gap-2 text-base leading-6">
          <BookOpen aria-hidden="true" className="size-4 text-muted-foreground" />
          Subjects
        </CardTitle>
        <CardDescription className="leading-5">
          Rename subjects or hide their cards and stop their reminders. Show a subject again to resume future reminders.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
        <form onSubmit={save} className="space-y-4">
          <fieldset disabled={disabled || saving || changingVisibility} className="min-w-0 space-y-3">
            <legend className="sr-only">Subject display names</legend>
            {allSubjects.length ? allSubjects.map((subject) => (
              <div key={subject} className="grid min-w-0 gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 sm:grid-cols-2 sm:items-center sm:gap-4">
                <span className="text-sm font-medium [overflow-wrap:anywhere]">{subject}</span>
                <Input
                  aria-label={`Alias for ${subject}`}
                  className="h-11 min-w-0 bg-background"
                  value={current.find((entry) => entry.subject === subject)?.alias ?? ""}
                  onChange={(event) => setAlias(subject, event.target.value)}
                  maxLength={100}
                  placeholder={subject}
                />
                <Button type="button" variant="outline" className="min-h-11 sm:col-span-2"
                  aria-label={`Hide ${subject}`} aria-pressed={hidden.has(subject)}
                  onClick={() => void toggleHidden(subject)}>
                  {hidden.has(subject) ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                  {hidden.has(subject) ? "Hidden · click to show" : "Visible · click to hide"}
                </Button>
              </div>
            )) : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Your subjects will appear here when school data is available.</p>}
            <p className="text-sm leading-5 text-muted-foreground">Leave an alias blank to use the original name. Visibility changes save immediately. Offline changes stop reminders after syncing.</p>
          </fieldset>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" className="min-h-11" disabled={disabled || saving || current.length === 0} onClick={() => setDraft([])}>Reset aliases</Button>
            <Button type="submit" className="min-h-11" disabled={disabled || saving || draft === null}>{saving ? "Saving…" : "Save aliases"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
