"use server";

import { auth } from "@/lib/auth";
import {
  getCodeByCode,
  getUserSubscription,
  setUserSubscription,
  redeemCodeInDb,
} from "@/db";

const DURATION_DAYS: Record<string, number> = {
  month: 30,
  school_year: 365,
  once: 0,
};

export async function redeemCodeAction(code: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const normalizedCode = code.toUpperCase().trim();

  if (!/^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(normalizedCode)) {
    return { error: "Invalid code format" };
  }

  const codeRecord = await getCodeByCode(normalizedCode);
  if (!codeRecord) {
    return { error: "Code not found" };
  }

  if (codeRecord.wasRedeemedAt) {
    return { error: "Code has already been redeemed" };
  }

  const userSubscription = await getUserSubscription(session.user.id);
  if (!userSubscription) {
    return { error: "User not found" };
  }

  const currentRole = userSubscription.role;
  const currentEndsAt = userSubscription.subscriptionEndsAt;
  const now = new Date();

  if (codeRecord.type === "pro") {
    if (currentRole === "pro") {
      return { error: "Pro users cannot redeem pro codes" };
    }

    const isActive = currentEndsAt && new Date(currentEndsAt) > now;
    const baseDate = isActive ? new Date(currentEndsAt) : now;

    const durationDays = DURATION_DAYS[codeRecord.duration];
    if (!durationDays) {
      return { error: "Invalid code duration" };
    }

    const newEndsAt = new Date(baseDate);
    newEndsAt.setDate(newEndsAt.getDate() + durationDays);

    await setUserSubscription(session.user.id, "pro", newEndsAt);

    const redeemed = await redeemCodeInDb(codeRecord.id, session.user.id);
    if (!redeemed) {
      return { error: "Failed to redeem code. Please try again." };
    }

    return {
      success: true,
      message: `Code redeemed successfully! Your subscription is now active until ${newEndsAt.toLocaleDateString("de-DE")}.`,
      newEndsAt,
    };
  }

  if (codeRecord.type === "assign") {
    return { error: "Class codes are no longer used. Choose your class on the dashboard." };
  }

  return { error: "Invalid code type" };
}

export async function getSubscriptionStatusAction() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { role: "free", subscriptionEndsAt: null, isActive: false };
  }

  const subscription = await getUserSubscription(session.user.id);
  if (!subscription) {
    return { role: "free", subscriptionEndsAt: null, isActive: false };
  }

  const now = new Date();
  const endsAt = subscription.subscriptionEndsAt;
  const isActive = endsAt ? new Date(endsAt) > now : false;

  return {
    role: subscription.role,
    subscriptionEndsAt: endsAt,
    isActive,
  };
}
