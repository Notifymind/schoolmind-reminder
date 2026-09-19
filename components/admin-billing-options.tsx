"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/app/app/layout";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  saveProPlanAction,
  saveGiftCardOptionAction,
} from "@/lib/actions/billing-options";
import type { ProPlan, GiftCardOption } from "@/lib/billing";

function OptionForm({
  plan,
  gift,
  kind,
  onCancel,
}: {
  plan?: ProPlan;
  gift?: GiftCardOption;
  kind: "pro" | "gift";
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            const result =
              kind === "pro"
                ? await saveProPlanAction({
                    id: plan?.id,
                    label: String(form.get("label")),
                    price: String(form.get("price")),
                    duration: Number(form.get("duration")),
                    unit: String(form.get("unit")),
                  })
                : await saveGiftCardOptionAction({
                    id: gift?.id,
                    value: String(form.get("value")),
                    sellerCost: String(form.get("sellerCost")),
                  });
            if (result.error) {
              toast.error(result.error);
              return;
            }
            toast.success("Option saved");
            router.refresh();
            onCancel?.();
          } catch {
            toast.error("Could not save this option. Please try again.");
          }
        });
      }}
    >
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        {kind === "pro" ? (
          <>
            <label className="grid gap-2 text-sm">
              Name
              <Input
                name="label"
                required
                maxLength={100}
                defaultValue={plan?.label}
                placeholder="Three months"
              />
            </label>
            <label className="grid gap-2 text-sm">
              Price (KM)
              <Input
                name="price"
                type="number"
                min="0.01"
                max="99999999.99"
                step="0.01"
                required
                defaultValue={plan?.price}
              />
            </label>
            <label className="grid gap-2 text-sm">
              Duration
              <Input
                name="duration"
                type="number"
                min="1"
                max="3650"
                step="1"
                required
                defaultValue={plan?.duration ?? 3}
              />
            </label>
            <label className="grid gap-2 text-sm">
              Duration unit
              <select
                name="unit"
                defaultValue={plan?.unit ?? "months"}
                className="h-9 rounded-md border bg-background px-3"
              >
                <option value="months">Months</option>
                <option value="days">Days</option>
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="grid gap-2 text-sm">
              Gift card value (KM)
              <Input
                name="value"
                type="number"
                min="0.01"
                max="99999999.99"
                step="0.01"
                required
                defaultValue={gift?.value}
              />
            </label>
            <label className="grid gap-2 text-sm">
              Seller cost (KM)
              <Input
                name="sellerCost"
                type="number"
                min="0"
                max="99999999.99"
                step="0.01"
                required
                defaultValue={gift?.sellerCost}
              />
            </label>
          </>
        )}
      </fieldset>
      <div className="flex gap-2">
        <Button disabled={pending} type="submit">
          {pending ? "Saving..." : "Save option"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function AdminBillingOptions({
  kind,
  plans = [],
  gifts = [],
}: {
  kind: "pro" | "gift";
  plans?: ProPlan[];
  gifts?: GiftCardOption[];
}) {
  const title = kind === "pro" ? "Pro pricing" : "Gift card options";
  usePageTitle(title);
  const [editing, setEditing] = useState<string | number | null>(null);
  const [adding, setAdding] = useState(false);
  const options = kind === "pro" ? plans : gifts;
  return (
    <div className="grid w-full max-w-2xl gap-4 mx-auto">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground">
        {kind === "pro"
          ? "Set prices and durations for Pro subscriptions. Changes apply to new purchases and future renewals. Current paid access keeps its end date."
          : "Set what sellers pay and how much each gift card adds to a user's balance. Changes apply to newly generated cards."}
      </p>
      <Button
        className="justify-self-start"
        onClick={() => setAdding(true)}
        disabled={adding}
      >
        Add option
      </Button>
      {adding && (
        <Card>
          <CardHeader>
            <CardTitle>Add option</CardTitle>
          </CardHeader>
          <CardContent>
            <OptionForm kind={kind} onCancel={() => setAdding(false)} />
          </CardContent>
        </Card>
      )}
      {options.length === 0 && (
        <p className="text-muted-foreground">
          No options yet. Add an option to get started.
        </p>
      )}
      {options.map((option) => (
        <Card key={option.id}>
          <CardContent>
            {editing === option.id ? (
              <OptionForm
                kind={kind}
                plan={"label" in option ? option : undefined}
                gift={"value" in option ? option : undefined}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  {"label" in option ? (
                    <>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {option.price} KM / {option.duration} {option.unit}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">
                        Gift card value: {option.value} KM
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Seller cost: {option.sellerCost} KM
                      </p>
                    </>
                  )}
                </div>
                <Button variant="outline" onClick={() => setEditing(option.id)}>
                  Edit
                  <span className="sr-only">
                    {" "}
                    {"label" in option
                      ? option.label
                      : `${option.value} KM gift card`}
                  </span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
