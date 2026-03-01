"use server";

import { auth } from "@/lib/auth";
import {
  getSellerBalance,
  updateSellerBalance,
  createCode,
  getCodesBySeller,
  deleteCodeById,
  getCodeByCode,
} from "@/db";

export type CodeType = "basic" | "pro" | "upgrade";
export type CodeDuration = "month" | "school_year";

const PRICING = {
  basic: { month: 3, school_year: 24 },
  pro: { month: 5, school_year: 40 },
  upgrade: { month: 2, school_year: 16 },
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
    session.user.class,
  );

  if (!isAdmin) {
    const { balance } = await getSellerBalance(session.user.id);
    const currentBalance = parseFloat(balance);
    const newBalance = currentBalance - price;
    await updateSellerBalance(session.user.id, newBalance.toString());
  }

  return { code };
}

export async function deleteCodeAction(codeId: number) {
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
    return { balance: "0", maxDebt: "0" };
  }

  if (!(await hasCodePermission(session.user.id))) {
    return { balance: "0", maxDebt: "0" };
  }

  const { balance, maxDebt } = await getSellerBalance(session.user.id);
  return { balance, maxDebt };
}
