"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq, asc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { proPlans, giftCardOptions } from "@/db/schema";

async function isAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return false;
  const result = await auth.api.userHasPermission({
    body: { userId: session.user.id, permission: { admin: ["access"] } },
  });
  return result?.success ?? false;
}

export async function getProPlansAction() {
  return db
    .select()
    .from(proPlans)
    .orderBy(asc(proPlans.duration), asc(proPlans.price));
}

export async function getGiftCardOptionsAction() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Not authenticated");
  const result = await auth.api.userHasPermission({
    body: { userId: session.user.id, permission: { seller: ["access"] } },
  });
  if (!result?.success) throw new Error("Seller access required");
  return db
    .select()
    .from(giftCardOptions)
    .orderBy(asc(giftCardOptions.value), asc(giftCardOptions.id));
}

function money(value: unknown, allowZero = false): value is string {
  return (
    typeof value === "string" &&
    /^\d{1,8}(\.\d{1,2})?$/.test(value) &&
    (allowZero ? Number(value) >= 0 : Number(value) > 0)
  );
}

function refreshPricing() {
  revalidatePath("/pricing");
  revalidatePath("/app", "layout");
}

export async function saveProPlanAction(input: {
  id?: string;
  label: string;
  marketingText?: string;
  price: string;
  duration: number;
  unit: string;
}) {
  if (!(await isAdmin())) return { error: "Admin access required" };
  if (
    !input ||
    typeof input.label !== "string" ||
    !input.label.trim() ||
    input.label.trim().length > 100 ||
    !money(input.price) ||
    !Number.isInteger(input.duration) ||
    input.duration < 1 ||
    input.duration > 3650 ||
    !["days", "months"].includes(input.unit) ||
    (input.id !== undefined &&
      (typeof input.id !== "string" || !input.id || input.id.length > 20))
  )
    return {
      error:
        "Enter a name, a positive price, and a duration from 1 to 3650 days or months",
    };
  if (
    input.marketingText !== undefined &&
    (typeof input.marketingText !== "string" || input.marketingText.trim().length > 160)
  ) return { error: "Marketing text must be 160 characters or fewer" };
  const values = {
    marketingText: input.marketingText?.trim() ?? "",
    label: input.label.trim(),
    price: input.price,
    duration: input.duration,
    unit: input.unit,
  };
  if (input.id) {
    const rows = await db
      .update(proPlans)
      .set(values)
      .where(eq(proPlans.id, input.id))
      .returning();
    if (!rows.length) return { error: "Pro plan not found" };
  } else {
    await db
      .insert(proPlans)
      .values({ ...values, id: randomUUID().replaceAll("-", "").slice(0, 20) });
  }
  refreshPricing();
  return { success: true };
}

export async function saveGiftCardOptionAction(input: {
  id?: number;
  value: string;
  sellerCost: string;
}) {
  if (!(await isAdmin())) return { error: "Admin access required" };
  if (
    !input ||
    !money(input.value) ||
    !money(input.sellerCost, true) ||
    (input.id !== undefined &&
      (!Number.isSafeInteger(input.id) || input.id <= 0))
  )
    return {
      error:
        "Enter a positive gift card value and a seller cost of zero or more, with at most two decimal places",
    };
  const values = { value: input.value, sellerCost: input.sellerCost };
  if (input.id) {
    const rows = await db
      .update(giftCardOptions)
      .set(values)
      .where(eq(giftCardOptions.id, input.id))
      .returning();
    if (!rows.length) return { error: "Gift card option not found" };
  } else {
    await db.insert(giftCardOptions).values(values);
  }
  refreshPricing();
  return { success: true };
}
