"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DaysBeforePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const hintId = React.useId();
  const days = value === "" ? null : Number(value);

  function step(amount: number) {
    onChange(String(Math.max(0, Math.min(30, (days ?? 0) + amount))));
  }

  return (
    <fieldset disabled={disabled} aria-label="Reminder days before" className="min-w-0 space-y-4 disabled:opacity-50">
      <div className="flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-10 rounded-full"
          aria-label="Decrease days before"
          disabled={disabled || days === null || days <= 0}
          onClick={() => step(-1)}
        >
          <Minus className="size-4" />
        </Button>
        <div className="flex flex-col items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            required
            min={0}
            max={30}
            step={1}
            value={value}
            aria-label="Number of days before"
            aria-describedby={hintId}
            onChange={(event) => onChange(event.target.value)}
            onFocus={(event) => event.target.select()}
            className="h-14 w-16 appearance-none rounded-lg border-0 bg-primary/10 text-center text-3xl font-semibold text-foreground tabular-nums ring-1 ring-primary/20 outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-10 rounded-full"
          aria-label="Increase days before"
          disabled={disabled || (days !== null && days >= 30)}
          onClick={() => step(1)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <p id={hintId} aria-live="polite" className="rounded-lg bg-muted/50 px-3 py-2.5 text-center text-sm text-foreground/90">
        {days === null || !Number.isInteger(days) || days < 0 || days > 30
          ? "Please choose between 0 and 30 days"
          : days === 0
            ? "You'll get a reminder on the day of your exam or due date"
            : `You'll get a reminder ${days} ${days === 1 ? "day" : "days"} before your exam or due date`}
      </p>
    </fieldset>
  );
}
