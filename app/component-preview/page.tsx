"use client";

import * as React from "react";
import { DaysBeforePicker } from "@/components/ui/days-before-picker";

export default function ComponentPreviewPage() {
  const [daysBefore, setDaysBefore] = React.useState("1");

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-md space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Days Before Picker - Redesigned</h1>
          <p className="text-muted-foreground mt-2">
            Preview of the improved component design
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <DaysBeforePicker value={daysBefore} onChange={setDaysBefore} />
        </div>

        <div className="rounded-lg border bg-muted p-4">
          <p className="text-sm font-medium">Current value:</p>
          <p className="text-2xl font-bold">{daysBefore} days</p>
        </div>
      </div>
    </div>
  );
}
