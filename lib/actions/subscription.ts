"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { cancelProRenewal, getBillingStatus, redeemGiftCard, subscribeToPro } from "@/db/billing";
import { isProPlan } from "@/lib/billing";

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id;
}

export async function redeemCodeAction(code: string) {
  const id = await currentUserId();
  if (!id) return { error: "Not authenticated" };
  if (typeof code !== "string" || !/^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(code.trim().toUpperCase())) return { error: "Invalid code format" };
  const result = await redeemGiftCard(code.trim().toUpperCase(), id);
  revalidatePath("/app", "layout");
  return result;
}

export async function subscribeToProAction(plan: string) {
  const id = await currentUserId();
  if (!id) return { error: "Not authenticated" };
  if (!isProPlan(plan)) return { error: "Invalid Pro plan" };
  const result = await subscribeToPro(id, plan);
  revalidatePath("/app", "layout");
  return result;
}

export async function cancelProRenewalAction() {
  const id = await currentUserId();
  if (!id) return { error: "Not authenticated" };
  const result = await cancelProRenewal(id);
  revalidatePath("/app", "layout");
  return result;
}

export async function getSubscriptionStatusAction() {
  const id = await currentUserId();
  return id ? getBillingStatus(id) : null;
}
