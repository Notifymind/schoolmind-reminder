"use client";

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
    </fieldset>
  );
}
