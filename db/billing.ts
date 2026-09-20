import { randomInt } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { codes, user, proPlans, giftCardOptions } from "@/db/schema";
import { generateId } from "@/lib/utils";
import { subscriptionEnd } from "@/lib/billing";

export async function createGiftCard(sellerId: string, optionId: number) {
  if (!Number.isSafeInteger(optionId) || optionId <= 0) return { error: "Choose a valid gift card option" };
  return db.transaction(async tx => {
    const [seller] = await tx.select().from(user).where(eq(user.id, sellerId)).for("update");
    const roles = seller?.role.split(",") ?? [];
    if (!roles.includes("seller") && !roles.includes("admin")) return { error: "Seller access required" };
    const [option] = await tx.select().from(giftCardOptions).where(eq(giftCardOptions.id, optionId));
    if (!option) return { error: "Gift card option not found" };
    const value = Number(option.value);
    const cost = roles.includes("admin") ? 0 : Number(option.sellerCost);
    if (Math.round(Number(seller.balance) * 100) - Math.round(cost * 100) < -Math.round(Number(seller.maxDebt) * 100)) return { error: "This gift card would exceed your maximum debt" };
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let attempt = 0; attempt < 10; attempt++) {
      const part = () => Array.from({ length: 5 }, () => chars[randomInt(chars.length)]).join("");
      const [code] = await tx.insert(codes).values({
        id: generateId(), code: `${part()}-${part()}`, type: "balance", duration: "once",
        value: value.toFixed(2), sellerCost: cost.toFixed(2), sellerId,
      }).onConflictDoNothing().returning();
      if (!code) continue;
      await tx.update(user).set({ balance: sql`${user.balance} - ${cost.toFixed(2)}` }).where(eq(user.id, sellerId));
      return { code };
    }
    return { error: "Could not generate a unique code. Please try again." };
  });
}

export async function deleteGiftCard(codeId: string, sellerId: string) {
  return db.transaction(async tx => {
    const [code] = await tx.delete(codes).where(and(
      eq(codes.id, codeId), eq(codes.sellerId, sellerId), isNull(codes.wasRedeemedAt), isNull(codes.redeemedAt), isNull(codes.redeemedBy),
    )).returning();
    if (!code) return { error: "Code not found or already redeemed" };
    await tx.update(user).set({ balance: sql`${user.balance} + ${code.sellerCost}` }).where(eq(user.id, sellerId));
    return { success: true };
  });
}

export async function redeemGiftCard(codeString: string, userId: string) {
  return db.transaction(async tx => {
    // Shared with referral linking and rewards. Take this before any row locks,
    // including when two accounts refer each other, to avoid lock inversion.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(73401911)`);
    const [code] = await tx.select().from(codes).where(eq(codes.code, codeString)).for("update");
    if (!code) return { error: "Code not found" };
    if (code.wasRedeemedAt || code.redeemedAt || code.redeemedBy) return { error: "Code has already been redeemed" };
    if (code.type !== "balance") return { error: "This is not a gift card code" };
    const [account] = await tx.update(user).set({ walletBalance: sql`${user.walletBalance} + ${code.value}` })
      .where(eq(user.id, userId)).returning();
    if (!account) return { error: "User not found" };
    const now = new Date();
    await tx.update(codes).set({ redeemedBy: userId, redeemedAt: sql`clock_timestamp()`, wasRedeemedAt: now }).where(eq(codes.id, code.id));
    await tx.execute(sql`SELECT reward_referral(${code.id})`);
    return { success: true, message: `${code.value} KM added to your balance.`, balance: account.walletBalance };
  });
}

export async function subscribeToPro(userId: string, plan: string) {
  if (typeof plan !== "string" || !plan || plan.length > 20) return { error: "Invalid Pro plan" };
  return db.transaction(async tx => {
    const [account] = await tx.select().from(user).where(eq(user.id, userId)).for("update");
    if (!account || !["free", "pro"].includes(account.role)) return { error: "This account cannot subscribe to Pro" };
    const [option] = await tx.select().from(proPlans).where(eq(proPlans.id, plan));
    if (!option) return { error: "Invalid Pro plan" };
    const now = new Date();
    // Existing paid time is preserved. Re-enabling renewal never bills early.
    if (account.role === "pro" && account.subscriptionEndsAt && account.subscriptionEndsAt > now) {
      if (account.subscriptionAutoRenew) return { error: "Cancel automatic renewal before changing plans" };
      await tx.update(user).set({ subscriptionPlan: plan, subscriptionAutoRenew: true }).where(eq(user.id, userId));
      return { success: true };
    }
    const price = Number(option.price);
    if (Number(account.walletBalance) < price) return { error: `You need ${price} KM in your balance to subscribe` };
    await tx.update(user).set({
      walletBalance: sql`${user.walletBalance} - ${price}`, role: "pro", subscriptionPlan: plan,
      subscriptionAutoRenew: true, subscriptionEndsAt: subscriptionEnd(option, now),
    }).where(eq(user.id, userId));
    return { success: true };
  });
}

export async function cancelProRenewal(userId: string) {
  await db.update(user).set({ subscriptionAutoRenew: false }).where(eq(user.id, userId));
  return { success: true };
}

export async function settleSubscription(userId: string) {
  return db.transaction(async tx => {
    const [account] = await tx.select().from(user).where(eq(user.id, userId)).for("update");
    const now = new Date();
    if (!account || !["pro", "basic"].includes(account.role) || !account.subscriptionEndsAt || account.subscriptionEndsAt > now) return "unchanged";
    const plan = account.subscriptionPlan;
    const [option] = plan ? await tx.select().from(proPlans).where(eq(proPlans.id, plan)) : [];
    if (account.subscriptionAutoRenew && option && Number(account.walletBalance) >= Number(option.price)) {
      await tx.update(user).set({
        walletBalance: sql`${user.walletBalance} - ${Number(option.price)}`,
        role: "pro", subscriptionEndsAt: subscriptionEnd(option, now),
      }).where(eq(user.id, userId));
      return "renewed";
    }
    await tx.update(user).set({ role: "free", subscriptionAutoRenew: false, subscriptionEndsAt: null }).where(eq(user.id, userId));
    return "downgraded";
  });
}

export async function getBillingStatus(userId: string) {
  await settleSubscription(userId);
  const [account] = await db.select({
    role: user.role, balance: user.walletBalance, subscriptionEndsAt: user.subscriptionEndsAt,
    plan: user.subscriptionPlan, autoRenew: user.subscriptionAutoRenew,
  }).from(user).where(eq(user.id, userId));
  return account ? { ...account, isActive: account.role === "pro" && !!account.subscriptionEndsAt && account.subscriptionEndsAt > new Date() } : null;
}
