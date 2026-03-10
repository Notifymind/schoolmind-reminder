"use server";

import { auth } from "@/lib/auth";
import {
  getCodeByCode,
  getUserSubscription,
  setUserSubscription,
  extendSubscription,
  redeemCodeInDb,
} from "@/db";

const DURATION_DAYS: Record<string, number> = {
  month: 30,
  school_year: 365,
  trial: 14,
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

  if (currentRole === "pro") {
    return { error: "Pro users cannot redeem codes" };
  }

  if (currentRole === "basic" && codeRecord.type !== "upgrade") {
    return { error: "Basic users can only redeem upgrade codes" };
  }

  if (currentRole === "free" && codeRecord.type === "upgrade") {
    return { error: "Upgrade codes can only be used by basic users" };
  }

  const isActive = currentEndsAt && new Date(currentEndsAt) > now;
  const baseDate = isActive ? new Date(currentEndsAt) : now;

  const durationDays = DURATION_DAYS[codeRecord.duration];
  if (!durationDays) {
    return { error: "Invalid code duration" };
  }

  const newEndsAt = new Date(baseDate);
  newEndsAt.setDate(newEndsAt.getDate() + durationDays);

  switch (codeRecord.type) {
    case "basic":
      await setUserSubscription(session.user.id, "basic", newEndsAt, codeRecord.className);
      break;

    case "pro":
      await setUserSubscription(session.user.id, "pro", newEndsAt, codeRecord.className);
      break;

    case "upgrade":
      if (currentRole !== "basic") {
        return { error: "Upgrade codes can only be used by basic users" };
      }
      if (codeRecord.duration === "month" && isActive) {
        const remainingDays = Math.ceil((new Date(currentEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (remainingDays > 30) {
          return { error: "Your basic subscription has more than a month remaining. You need a year upgrade code to extend it." };
        }
      }
      await extendSubscription(session.user.id, newEndsAt, "pro", codeRecord.className);
      break;

    case "trial":
      if (currentRole === "free") {
        await setUserSubscription(session.user.id, "basic", newEndsAt, codeRecord.className);
      } else {
        await extendSubscription(session.user.id, newEndsAt, undefined, codeRecord.className);
      }
      break;

    default:
      return { error: "Invalid code type" };
  }

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
