"use server";

import { auth } from "@/lib/auth";
import {
  getSellerBalance,
  updateSellerBalance,
  createCode,
  getCodesBySeller,
  deleteCodeById,
  getCodeByCode,
  db,
} from "@/db";
import { codes, balanceHistory, user } from "@/db/schema";
import { eq, desc, or } from "drizzle-orm";

export type CodeType = "pro";
export type CodeDuration = "month" | "school_year";

const PRICING = {
  pro: { month: 2, school_year: 16 },
} as const;

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

function getCodePrice(type: CodeType, duration: CodeDuration): number {
  return PRICING[type][duration];
}

function generateCodeString(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const generatePart = () => {
    let result = "";
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  return `${generatePart()}-${generatePart()}`;
}

async function hasAdminPermission(userId: string): Promise<boolean> {
  const result = await auth.api.userHasPermission({
    body: {
      userId,
      permission: {
        admin: ["access"],
      },
    },
  });
  return result?.success ?? false;
}

export async function generateCodeAction(
  type: CodeType,
  duration: CodeDuration,
) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (!(await hasCodePermission(session.user.id))) {
    return { error: "You don't have permission to generate codes" };
  }

  if (type !== "pro" || (duration !== "month" && duration !== "school_year")) {
    return { error: "Only monthly or school-year Pro codes can be generated" };
  }

  const isAdmin = await hasAdminPermission(session.user.id);

  const price = getCodePrice(type, duration);

  if (!isAdmin) {
    const { balance, maxDebt } = await getSellerBalance(session.user.id);
    const currentBalance = parseFloat(balance);
    const maxDebtValue = parseFloat(maxDebt);
    const newBalance = currentBalance - price;

    if (newBalance < -maxDebtValue) {
      return {
        error: `Insufficient balance. Generating this code would exceed your maximum debt of ${maxDebtValue} KM.`,
      };
    }
  }

  let codeString = generateCodeString();
  let attempts = 0;
  while (await getCodeByCode(codeString)) {
    codeString = generateCodeString();
    attempts++;
    if (attempts > 100) {
      return { error: "Failed to generate unique code. Please try again." };
    }
  }

  const code = await createCode(
    codeString,
    type,
    duration,
    price.toString(),
    session.user.id,
  );

  if (!isAdmin) {
    const { balance } = await getSellerBalance(session.user.id);
    const currentBalance = parseFloat(balance);
    const newBalance = currentBalance - price;
    await updateSellerBalance(session.user.id, newBalance.toString());
  }

  return { code };
}

export async function deleteCodeAction(codeId: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (!(await hasCodePermission(session.user.id))) {
    return { error: "You don't have permission to delete codes" };
  }

  const deletedCode = await deleteCodeById(codeId, session.user.id);
  if (!deletedCode) {
    return { error: "Code not found or already redeemed" };
  }

  const { balance } = await getSellerBalance(session.user.id);
  const currentBalance = parseFloat(balance);
  const codeValue = parseFloat(deletedCode.value);
  const newBalance = currentBalance + codeValue;
  await updateSellerBalance(session.user.id, newBalance.toString());

  return { success: true };
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
    return { balance: "0", maxDebt: "0", maxTrialCodes: 0, trialCodesGenerated: 0 };
  }

  if (!(await hasCodePermission(session.user.id))) {
    return { balance: "0", maxDebt: "0", maxTrialCodes: 0, trialCodesGenerated: 0 };
  }

  const { balance, maxDebt, maxTrialCodes, trialCodesGenerated } = await getSellerBalance(session.user.id);
  return { balance, maxDebt, maxTrialCodes, trialCodesGenerated };
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
      type: c.redeemedBy ? ("code_generated" as const) : ("code_generated" as const),
      amount: `-${c.value}`,
      previousBalance: null,
      newBalance: null,
      description: c.redeemedBy
        ? `Code generated: ${c.code} (${c.type}, ${c.duration}) - Redeemed`
        : `Code generated: ${c.code} (${c.type}, ${c.duration})`,
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
