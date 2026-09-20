import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { referrals, referralRewards, user } from "@/db/schema";

export const referralCookie = "notifymind_referral";
export const validReferralCode = (code: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(code);

export async function linkReferral(userId: string, code: string) {
  if (!validReferralCode(code)) return;
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(73401911)`);
    const [account] = await tx.select().from(user).where(eq(user.id, userId)).for("update");
    if (!account || account.role.split(",").includes("seller")) return;
    const [referrer] = await tx.select({ id: user.id }).from(user).where(eq(user.referralCode, code));
    if (!referrer || referrer.id === userId) return;
    await tx.insert(referrals).values({ referredId: userId, referrerId: referrer.id }).onConflictDoNothing();
  });
}

export async function getReferralSummary(userId: string) {
  const [account] = await db.select({ code: user.referralCode }).from(user).where(eq(user.id, userId));
  const [rewards] = await db.select({ total: sql<string>`coalesce(sum(${referralRewards.amount}), 0)` })
    .from(referrals).leftJoin(referralRewards, eq(referrals.referredId, referralRewards.referredId))
    .where(eq(referrals.referrerId, userId));
  if (!account) return null;
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!baseURL) throw new Error("BETTER_AUTH_URL is required to generate referral links");
  const link = new URL("/", baseURL);
  link.searchParams.set("referral", account.code);
  return { link: link.toString(), earned: Number(rewards.total).toFixed(2) };
}
