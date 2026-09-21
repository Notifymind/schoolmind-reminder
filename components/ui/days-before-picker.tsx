"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const shortcuts = [
  { value: 0, label: "Same day" },
  { value: 1, label: "1 day" },
  { value: 2, label: "2 days" },
  { value: 7, label: "1 week" },
];

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
    <fieldset disabled={disabled} className="min-w-0 space-y-3 disabled:opacity-50">
      <legend className="mb-3 text-sm font-medium">When to notify</legend>
      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Quick choices for days before">
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.value}
            type="button"
            aria-label={shortcut.value === 0 ? "Same day" : `${shortcut.value} ${shortcut.value === 1 ? "day" : "days"} before`}
            aria-pressed={days === shortcut.value}
            onClick={() => onChange(String(shortcut.value))}
            className={cn(
              "min-h-11 rounded-xl px-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              days === shortcut.value
                ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {shortcut.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-11 rounded-full"
          aria-label="Decrease days before"
          disabled={disabled || days === null || days <= 0}
          onClick={() => step(-1)}
        >
          <Minus className="size-4" />
        </Button>
        <div className="space-y-1 text-center">
          <input
            type="number"
            inputMode="numeric"
            required
            min={0}
            max={30}
            step={1}
            value={value}
            aria-label="Days before"
            aria-describedby={hintId}
            onChange={(event) => onChange(event.target.value)}
            onFocus={(event) => event.target.select()}
            className="h-16 w-20 appearance-none rounded-xl border-0 bg-primary/15 text-center text-4xl text-foreground tabular-nums ring-1 ring-primary/30 outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]"
          />
          <p id={hintId} className="text-xs text-muted-foreground">
            {days === 0 ? "Same day" : days === 1 ? "day before" : "days before"}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-11 rounded-full"
          aria-label="Increase days before"
          disabled={disabled || (days !== null && days >= 30)}
          onClick={() => step(1)}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </fieldset>
  );
}
