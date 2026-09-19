export type ProPlan = {
  id: string;
  label: string;
  price: string;
  duration: number;
  unit: string;
};
export type GiftCardOption = { id: number; value: string; sellerCost: string };

export function subscriptionEnd(
  plan: Pick<ProPlan, "duration" | "unit">,
  from: Date,
): Date {
  if (plan.unit === "days")
    return new Date(from.getTime() + plan.duration * 86_400_000);
  const end = new Date(from);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + plan.duration);
  const lastDay = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
  ).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end;
}
