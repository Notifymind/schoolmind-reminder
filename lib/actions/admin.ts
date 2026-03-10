"use server";

import { auth } from "@/lib/auth";
import {
  getTotalDebt,
  getTotalRevenue,
  getSellersWithDebt,
  searchUsers,
  searchSellers,
  getAllSellers,
  getUserById,
  upgradeUserToSeller,
  updateSellerInfo,
  removeSellerRole,
  updateSellerBalanceWithLog,
  getBalanceHistory,
  getAllClasses,
  createClass,
  getClassByName,
  getSellerBalance,
  updateClass,
  deleteClass,
  resetTrialCodesGenerated,
} from "@/db";

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

export async function getAdminOverviewAction() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (!(await hasAdminPermission(session.user.id))) {
    return { error: "You don't have permission to access admin data" };
  }

  const [totalDebt, totalRevenue, sellersWithDebt] = await Promise.all([
    getTotalDebt(),
    getTotalRevenue(),
    getSellersWithDebt(),
  ]);

  return {
    totalDebt,
    totalRevenue,
    sellersWithDebt,
  };
}

export async function searchUsersAction(query: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { users: [] };
  }

  if (!(await hasAdminPermission(session.user.id))) {
    return { users: [] };
  }

  if (!query || query.length < 1) {
    return { users: [] };
  }

  const users = await searchUsers(query);
  return { users };
}

export async function searchSellersAction(query: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { sellers: [] };
  }

  if (!(await hasAdminPermission(session.user.id))) {
    return { sellers: [] };
  }

  if (!query || query.length < 1) {
    return { sellers: [] };
  }

  const sellers = await searchSellers(query);
  return { sellers };
}

export async function upgradeToSellerAction(
  userId: string,
  maxDebt: string,
  maxTrialCodes: number,
  className: string | null
) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (!(await hasAdminPermission(session.user.id))) {
    return { error: "You don't have permission to perform this action" };
  }

  const existingUser = await getUserById(userId);
  if (!existingUser) {
    return { error: "User not found" };
  }

  if (className) {
    const classExists = await getClassByName(className);
    if (!classExists) {
      return { error: "Class not found" };
    }
  }

  const result = await upgradeUserToSeller(userId, maxDebt, maxTrialCodes, className);
  if (!result) {
    return { error: "Failed to upgrade user" };
  }

  return { success: true, user: result };
}

export async function updateSellerAction(
  userId: string,
  maxDebt: string,
  maxTrialCodes: number,
  className: string | null
) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (!(await hasAdminPermission(session.user.id))) {
    return { error: "You don't have permission to perform this action" };
  }

  const existingUser = await getUserById(userId);
  if (!existingUser) {
    return { error: "User not found" };
  }

  if (className) {
    const classExists = await getClassByName(className);
    if (!classExists) {
      return { error: "Class not found" };
    }
  }

  const result = await updateSellerInfo(userId, maxDebt, maxTrialCodes, className);
  if (!result) {
    return { error: "Failed to update seller" };
  }

  return { success: true, user: result };
}

export async function removeSellerAction(userId: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (!(await hasAdminPermission(session.user.id))) {
    return { error: "You don't have permission to perform this action" };
  }

  const existingUser = await getUserById(userId);
  if (!existingUser) {
    return { error: "User not found" };
  }

  const result = await removeSellerRole(userId);
  if (!result) {
    return { error: "Failed to remove seller role" };
  }

  return { success: true };
}

export async function resetSellerTrialCodesAction(sellerId: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (!(await hasAdminPermission(session.user.id))) {
    return { error: "You don't have permission to perform this action" };
  }

  const seller = await getUserById(sellerId);
  if (!seller) {
    return { error: "Seller not found" };
  }

  if (seller.role !== "seller") {
    return { error: "User is not a seller" };
  }

  await resetTrialCodesGenerated(sellerId);
  return { success: true };
}

export async function getAllSellersAction() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { sellers: [] };
  }

  if (!(await hasAdminPermission(session.user.id))) {
    return { sellers: [] };
  }

  const sellers = await getAllSellers();
  return { sellers };
}

export async function getSellerBalanceAction(sellerId: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (!(await hasAdminPermission(session.user.id))) {
    return { error: "You don't have permission to access this data" };
  }

  const balance = await getSellerBalance(sellerId);
  return balance;
}

export async function adjustBalanceAction(
  sellerId: string,
  type: "add" | "remove" | "set",
  amount: string
) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (!(await hasAdminPermission(session.user.id))) {
    return { error: "You don't have permission to perform this action" };
  }

  const seller = await getUserById(sellerId);
  if (!seller) {
    return { error: "Seller not found" };
  }

  if (seller.role !== "seller") {
    return { error: "User is not a seller" };
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) {
    return { error: "Invalid amount" };
  }

  const result = await updateSellerBalanceWithLog(
    sellerId,
    session.user.id,
    type,
    amount
  );

  return { success: true, newBalance: result.newBalance };
}

export async function getBalanceHistoryAction(sellerId: string, limit?: number) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { history: [] };
  }

  if (!(await hasAdminPermission(session.user.id))) {
    return { history: [] };
  }

  const history = await getBalanceHistory(sellerId, limit);
  return { history };
}

export async function getClassesAction() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { classes: [] };
  }

  if (!(await hasAdminPermission(session.user.id))) {
    return { classes: [] };
  }

  const classes = await getAllClasses();
  return { classes };
}

export async function createClassAction(name: string, username: string, password: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (!(await hasAdminPermission(session.user.id))) {
    return { error: "You don't have permission to perform this action" };
  }

  if (!name || !username || !password) {
    return { error: "All fields are required" };
  }

  const existingClass = await getClassByName(name);
  if (existingClass) {
    return { error: "Class with this name already exists" };
  }

  const result = await createClass(name, username, password);
  if (!result) {
    return { error: "Failed to create class" };
  }

  return { success: true, class: result };
}

export async function updateClassAction(
  oldName: string,
  name: string,
  username: string,
  password: string
) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (!(await hasAdminPermission(session.user.id))) {
    return { error: "You don't have permission to perform this action" };
  }

  if (!name || !username) {
    return { error: "Name and username are required" };
  }

  const existingClass = await getClassByName(oldName);
  if (!existingClass) {
    return { error: "Class not found" };
  }

  if (name !== oldName) {
    const classWithNewName = await getClassByName(name);
    if (classWithNewName) {
      return { error: "Class with this name already exists" };
    }
  }

  const result = await updateClass(
    oldName,
    name,
    username,
    password || existingClass.password
  );
  if (!result) {
    return { error: "Failed to update class" };
  }

  return { success: true, class: result };
}

export async function deleteClassAction(name: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (!(await hasAdminPermission(session.user.id))) {
    return { error: "You don't have permission to perform this action" };
  }

  const existingClass = await getClassByName(name);
  if (!existingClass) {
    return { error: "Class not found" };
  }

  const result = await deleteClass(name);
  if (!result) {
    return { error: "Failed to delete class" };
  }

  return { success: true };
}
