"use server";

import { auth } from "@/lib/auth";
import { getSellerBalance, getCodesBySeller, db } from "@/db";
import { GIFT_CARD_VALUES } from "@/lib/billing";
import { createGiftCard, deleteGiftCard } from "@/db/billing";
import { codes, balanceHistory, user } from "@/db/schema";
import { eq, desc, or } from "drizzle-orm";

async function hasCodePermission(userId: string): Promise<boolean> {
  const result = await auth.api.userHasPermission({
    body: {
      userId,
      permission: {
        seller: ["access"],
      },
    },
  });
  return result?.success ?? false;
}

export async function generateCodeAction(value: number) {
  const session = await auth.api.getSession({ headers: await import("next/headers").then(m => m.headers()) });
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (!(await hasCodePermission(session.user.id))) return { error: "You don't have permission to generate codes" };
  if (!GIFT_CARD_VALUES.some(amount => amount === value)) return { error: "Choose a valid gift card value" };
  return createGiftCard(session.user.id, value);
}

export async function deleteCodeAction(codeId: string) {
  const session = await auth.api.getSession({ headers: await import("next/headers").then(m => m.headers()) });
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (!(await hasCodePermission(session.user.id))) return { error: "You don't have permission to delete codes" };
  return deleteGiftCard(codeId, session.user.id);
}

export async function getCodesAction() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { codes: [] };
  }

  if (!(await hasCodePermission(session.user.id))) {
    return { codes: [] };
  }

  const codes = await getCodesBySeller(session.user.id);
  return { codes };
}

export async function getBalanceAction() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { balance: "0", maxDebt: "0" };
  }

  if (!(await hasCodePermission(session.user.id))) {
    return { balance: "0", maxDebt: "0" };
  }

  const { balance, maxDebt } = await getSellerBalance(session.user.id);
  return { balance, maxDebt, isAdmin: (await db.select({ role: user.role }).from(user).where(eq(user.id, session.user.id)))[0]?.role.split(",").includes("admin") ?? false };
}

export type Transaction = {
  id: string;
  type: "code_generated" | "code_deleted" | "balance_added" | "balance_removed" | "balance_set";
  amount: string;
  previousBalance: string | null;
  newBalance: string | null;
  description: string;
  createdAt: Date;
  adminName?: string;
};

export async function getTransactionHistoryAction(limit = 100, offset = 0) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { transactions: [], total: 0 };
  }

  if (!(await hasCodePermission(session.user.id))) {
    return { transactions: [], total: 0 };
  }

  const sellerCodes = await db
    .select()
    .from(codes)
    .where(eq(codes.sellerId, session.user.id))
    .orderBy(desc(codes.createdAt));

  const history = await db
    .select({
      id: balanceHistory.id,
      type: balanceHistory.type,
      amount: balanceHistory.amount,
      previousBalance: balanceHistory.previousBalance,
      newBalance: balanceHistory.newBalance,
      createdAt: balanceHistory.createdAt,
      adminId: balanceHistory.adminId,
    })
    .from(balanceHistory)
    .where(eq(balanceHistory.sellerId, session.user.id))
    .orderBy(desc(balanceHistory.createdAt));

  const adminIds = [...new Set(history.map((h) => h.adminId))];
  const admins = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(or(...adminIds.map((id) => eq(user.id, id))));

  const adminMap = new Map(admins.map((a) => [a.id, a.name]));

  const transactions: Transaction[] = [
    ...sellerCodes.map((c) => ({
      id: `code-${c.id}`,
      type: "code_generated" as const,
      amount: `-${c.sellerCost}`,
      previousBalance: null,
      newBalance: null,
      description: c.wasRedeemedAt
        ? `Code generated: ${c.code} (${c.value} KM ${c.type === "balance" ? "gift card" : "legacy code"}) - Redeemed`
        : `Code generated: ${c.code} (${c.value} KM ${c.type === "balance" ? "gift card" : "legacy code"})`,
      createdAt: c.createdAt,
    })),
    ...history.map((h) => ({
      id: `balance-${h.id}`,
      type: h.type === "add" ? ("balance_added" as const) : h.type === "remove" ? ("balance_removed" as const) : ("balance_set" as const),
      amount: h.type === "remove" ? `-${h.amount}` : h.amount,
      previousBalance: h.previousBalance,
      newBalance: h.newBalance,
      description: h.type === "add"
        ? `Balance added by admin`
        : h.type === "remove"
          ? `Balance removed by admin`
          : `Balance set by admin`,
      createdAt: h.createdAt,
      adminName: adminMap.get(h.adminId),
    })),
  ];

  transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = transactions.length;
  const paginatedTransactions = transactions.slice(offset, offset + limit);

  return { transactions: paginatedTransactions, total };
}
