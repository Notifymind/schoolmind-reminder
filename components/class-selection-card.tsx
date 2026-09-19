"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { selectClassAction } from "@/lib/actions/classes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ClassSelectionCard({ classes, currentClass = null, className: cardClassName = "w-full max-w-2xl" }: {
  classes: { name: string }[];
  currentClass?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [className, setClassName] = useState(currentClass ?? "");
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
        toast.success("Class saved");
        router.refresh();
      } catch {
        setError("Could not save your class. Please try again.");
      }
    });
  }

  return (
    <Card className={cardClassName}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5" aria-hidden="true" />
          Class
        </CardTitle>
        <CardDescription>Select your class to see your exams and assignments.</CardDescription>
      </CardHeader>
      <CardContent>
        {classes.length === 0 ? (
          <FieldDescription>No classes are available yet. Please check back later.</FieldDescription>
        ) : (
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="school-class">Class</FieldLabel>
                <Select
                  value={className}
                  onValueChange={(value) => { setClassName(value); setError(null); }}
                  disabled={isPending}
                  required
                >
                  <SelectTrigger id="school-class" className="w-full">
                    <SelectValue placeholder="Select your class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(({ name }) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Field>
                <Button type="submit" disabled={!className || className === currentClass || isPending}>
                  {isPending ? "Saving..." : currentClass ? "Update class" : "Choose class"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
