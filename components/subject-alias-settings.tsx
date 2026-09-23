"use client";

import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queueChange } from "@/lib/offline/store";
import type { SubjectAlias } from "@/lib/user-settings";

export function SubjectAliasSettings({ aliases, subjects, disabled }: {
  aliases: SubjectAlias[];
  subjects: string[];
  disabled: boolean;
}) {
  const [draft, setDraft] = useState<SubjectAlias[] | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const current = draft ?? aliases;
  const allSubjects = [...new Set([...subjects, ...aliases.map((entry) => entry.subject), ...current.map((entry) => entry.subject)])].sort((a, b) => a.localeCompare(b));

  function setAlias(subject: string, alias: string) {
    setDraft((previous) => [...(previous ?? aliases).filter((entry) => entry.subject !== subject), { subject, alias }]);
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
          Subject aliases
        </CardTitle>
        <CardDescription className="leading-5">
          Give subjects a name you recognize. Aliases appear on your exam and assignment cards only.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
        <form onSubmit={save} className="space-y-4">
          <fieldset disabled={disabled || saving} className="min-w-0 space-y-3">
            <legend className="sr-only">Subject display names</legend>
            {allSubjects.length ? allSubjects.map((subject) => (
              <label key={subject} className="grid min-w-0 gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 sm:grid-cols-2 sm:items-center sm:gap-4">
                <span className="text-sm font-medium [overflow-wrap:anywhere]">{subject}</span>
                <Input
                  aria-label={`Alias for ${subject}`}
                  className="h-11 min-w-0 bg-background"
                  value={current.find((entry) => entry.subject === subject)?.alias ?? ""}
                  onChange={(event) => setAlias(subject, event.target.value)}
                  maxLength={100}
                  placeholder={subject}
                />
              </label>
            )) : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Your subjects will appear here when school data is available. You can also add a subject below.</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input aria-label="Original subject name" placeholder="Original subject name" value={newSubject}
                onChange={(event) => setNewSubject(event.target.value)} maxLength={200} className="h-11 min-w-0" />
              <Button type="button" variant="outline" className="min-h-11 shrink-0" disabled={!newSubject.trim() || allSubjects.includes(newSubject.trim()) || allSubjects.length >= 100}
                onClick={() => { setAlias(newSubject.trim(), ""); setNewSubject(""); }}>
                <Plus aria-hidden="true" className="size-4" /> Add subject
              </Button>
            </div>
            <p className="text-sm leading-5 text-muted-foreground">Leave an alias blank to use the original name. Added subjects must match the school&apos;s name exactly.</p>
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
