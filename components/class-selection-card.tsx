"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { selectClassAction } from "@/lib/actions/classes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ClassSelectionCard({ classes }: { classes: { name: string }[] }) {
  const router = useRouter();
  const [className, setClassName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await selectClassAction(className);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch {
        setError("Could not save your class. Please try again.");
      }
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="bg-primary/10 mx-auto mb-2 flex size-16 items-center justify-center rounded-full">
          <Users className="text-primary size-8" aria-hidden="true" />
        </div>
        <CardTitle>Choose your class</CardTitle>
        <CardDescription>Select your class to see your exams and assignments.</CardDescription>
      </CardHeader>
      <CardContent>
        {classes.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No classes are available yet. Please check back later.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="school-class" className="text-sm font-medium">Class</label>
              <select
                id="school-class"
                value={className}
                onChange={(event) => { setClassName(event.target.value); setError(null); }}
                disabled={isPending}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="" disabled>Select your class</option>
                {classes.map(({ name }) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={!className || isPending}>
              {isPending ? "Saving..." : "Choose class"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
