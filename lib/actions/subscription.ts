"use server";

import { auth } from "@/lib/auth";
import {
  getCodeByCode,
  getUserSubscription,
  setUserSubscription,
  extendSubscription,
  redeemCodeInDb,
  updateLastTrialCodeGenerated,
} from "@/db";

const DURATION_DAYS: Record<string, number> = {
  month: 30,
  quarter: 90,
  school_year: 210,
  trial: 7,
};

async function hasTrialCodePermission(userId: string): Promise<boolean> {
  const result = await auth.api.userHasPermission({
    body: {
      userId,
      permission: {
        trialCode: ["generate"],
      },
    },
  });
  return result?.success ?? false;
}

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

  if (codeRecord.redeemedBy) {
    return { error: "Code has already been redeemed" };
  }

  const userSubscription = await getUserSubscription(session.user.id);
  if (!userSubscription) {
    return { error: "User not found" };
  }

  const currentRole = userSubscription.role;
  const currentEndsAt = userSubscription.subscriptionEndsAt;
  const now = new Date();

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
      await setUserSubscription(session.user.id, "basic", newEndsAt);
      break;

    case "pro":
      await setUserSubscription(session.user.id, "pro", newEndsAt);
      break;

    case "upgrade":
      if (currentRole !== "basic") {
        return { error: "Upgrade codes can only be used by basic users" };
      }
      await extendSubscription(session.user.id, newEndsAt, "pro");
      break;

    case "trial":
      if (currentRole === "free") {
        await setUserSubscription(session.user.id, "basic", newEndsAt);
      } else {
        await extendSubscription(session.user.id, newEndsAt);
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
    message: `Code redeemed successfully! Your subscription is now active until ${newEndsAt.toLocaleDateString()}.`,
    newEndsAt,
  };
}

export async function generateTrialCodeAction() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (!(await hasTrialCodePermission(session.user.id))) {
    return { error: "Only Pro users can generate trial codes" };
  }

  const userSubscription = await getUserSubscription(session.user.id);
  if (!userSubscription) {
    return { error: "User not found" };
  }

  const lastGenerated = userSubscription.lastTrialCodeGenerated;
  const now = new Date();

  if (lastGenerated) {
    const lastGeneratedDate = new Date(lastGenerated);
    const daysSinceLastGenerated = Math.floor(
      (now.getTime() - lastGeneratedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastGenerated < 30) {
      const daysUntilNext = 30 - daysSinceLastGenerated;
      return {
        error: `You can generate another trial code in ${daysUntilNext} day(s)`,
        daysUntilNext,
      };
    }
  }

  const { createCode } = await import("@/db");
  const { getCodeByCode } = await import("@/db");

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const generatePart = () => {
    let result = "";
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  let codeString = `${generatePart()}-${generatePart()}`;
  let attempts = 0;
  while (await getCodeByCode(codeString)) {
    codeString = `${generatePart()}-${generatePart()}`;
    attempts++;
    if (attempts > 100) {
      return { error: "Failed to generate unique code. Please try again." };
    }
  }

  const code = await createCode(codeString, "trial", "trial", "0", session.user.id);
  await updateLastTrialCodeGenerated(session.user.id);

  return { code };
}

export async function getSubscriptionStatusAction() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { role: "free", subscriptionEndsAt: null, isActive: false, lastTrialCodeGenerated: null };
  }

  const subscription = await getUserSubscription(session.user.id);
  if (!subscription) {
    return { role: "free", subscriptionEndsAt: null, isActive: false, lastTrialCodeGenerated: null };
  }

  const now = new Date();
  const endsAt = subscription.subscriptionEndsAt;
  const isActive = endsAt ? new Date(endsAt) > now : false;

  return {
    role: subscription.role,
    subscriptionEndsAt: endsAt,
    isActive,
    lastTrialCodeGenerated: subscription.lastTrialCodeGenerated,
  };
}
