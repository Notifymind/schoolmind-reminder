export const PRO_PLANS = {
  month: { label: "Monthly", price: 3, days: 30 },
  school_year: { label: "Yearly", price: 24, days: 365 },
} as const;
export type ProPlan = keyof typeof PRO_PLANS;
export const GIFT_CARD_VALUES = [3, 6, 12, 24] as const;

export function isProPlan(value: unknown): value is ProPlan {
  return value === "month" || value === "school_year";
}

export function subscriptionEnd(plan: ProPlan, from: Date): Date {
  return new Date(from.getTime() + PRO_PLANS[plan].days * 86_400_000);
}
