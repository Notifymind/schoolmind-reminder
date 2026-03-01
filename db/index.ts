import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, lt, notInArray, inArray, isNull, or, isNotNull, sql, like } from "drizzle-orm";
import {
  user,
  exams,
  assignments,
  notificationPresets,
  notificationTimes,
  scheduledNotifications,
  examNotificationMeta,
  assignmentNotificationMeta,
  pushSubscriptions,
  codes,
  schoolclass,
  balanceHistory,
  userNotifications,
} from "./schema";

const db = drizzle(process.env.DATABASE_URL!);

export async function getUsersByRole(role: string) {
  return db.select().from(user).where(eq(user.role, role));
}

export async function getUserRole(userId: string) {
  const result = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
  return result[0]?.role ?? "free";
}

export async function getUserClass(userId: string) {
  const result = await db.select({ class: user.class }).from(user).where(eq(user.id, userId));
  return result[0]?.class ?? null;
}

export async function getExamsByClass(className: string) {
  return db.select().from(exams).where(eq(exams.className, className)).orderBy(desc(exams.dueDate));
}

export async function getAssignmentsByClass(className: string) {
  return db.select().from(assignments).where(eq(assignments.className, className)).orderBy(desc(assignments.dueDate));
}

export async function getPushSubscriptions(userId: string) {
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

export async function createPushSubscription(
  userId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
) {
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
  if (existing.length > 0) {
    return existing[0];
  }
  const result = await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint, p256dh, auth })
    .returning();
  return result[0];
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

export async function deleteAllPushSubscriptions(userId: string) {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

export async function getAllPushSubscriptions() {
  return db.select().from(pushSubscriptions);
}

export async function getNotificationPresets(userId: string) {
  return db.select().from(notificationPresets).where(eq(notificationPresets.userId, userId));
}

export async function getNotificationPresetById(presetId: number, userId: string) {
  const result = await db
    .select()
    .from(notificationPresets)
    .where(and(eq(notificationPresets.id, presetId), eq(notificationPresets.userId, userId)));
  return result[0] ?? null;
}

export async function createNotificationPreset(
  userId: string,
  name: string,
  isOneTime = false
) {
  const result = await db
    .insert(notificationPresets)
    .values({ userId, name, isOneTime })
    .returning();
  return result[0];
}

export async function updateNotificationPreset(presetId: number, userId: string, name: string) {
  const result = await db
    .update(notificationPresets)
    .set({ name })
    .where(and(eq(notificationPresets.id, presetId), eq(notificationPresets.userId, userId)))
    .returning();
  return result[0] ?? null;
}

export async function deleteNotificationPreset(presetId: number, userId: string) {
  await db
    .delete(notificationPresets)
    .where(and(eq(notificationPresets.id, presetId), eq(notificationPresets.userId, userId)));
}

export async function setActivePreset(userId: string, presetId: number) {
  await db.update(notificationPresets).set({ isActive: false }).where(eq(notificationPresets.userId, userId));
  const result = await db
    .update(notificationPresets)
    .set({ isActive: true })
    .where(and(eq(notificationPresets.id, presetId), eq(notificationPresets.userId, userId)))
    .returning();
  return result[0] ?? null;
}

export async function setActivePresetForExams(userId: string, presetId: number) {
  await db.update(notificationPresets).set({ isActiveForExams: false }).where(eq(notificationPresets.userId, userId));
  const result = await db
    .update(notificationPresets)
    .set({ isActiveForExams: true })
    .where(and(eq(notificationPresets.id, presetId), eq(notificationPresets.userId, userId)))
    .returning();
  return result[0] ?? null;
}

export async function setActivePresetForAssignments(userId: string, presetId: number) {
  await db.update(notificationPresets).set({ isActiveForAssignments: false }).where(eq(notificationPresets.userId, userId));
  const result = await db
    .update(notificationPresets)
    .set({ isActiveForAssignments: true })
    .where(and(eq(notificationPresets.id, presetId), eq(notificationPresets.userId, userId)))
    .returning();
  return result[0] ?? null;
}

export async function getNotificationTimes(presetId: number) {
  return db.select().from(notificationTimes).where(eq(notificationTimes.presetId, presetId));
}

export async function createNotificationTime(presetId: number, daysBefore: number, time: string) {
  const result = await db.insert(notificationTimes).values({ presetId, daysBefore, time }).returning();
  return result[0];
}

export async function deleteNotificationTime(timeId: number, userId: string) {
  const preset = await db
    .select()
    .from(notificationPresets)
    .innerJoin(notificationTimes, eq(notificationPresets.id, notificationTimes.presetId))
    .where(and(eq(notificationTimes.id, timeId), eq(notificationPresets.userId, userId)));
  if (preset.length === 0) return false;
  await db.delete(notificationTimes).where(eq(notificationTimes.id, timeId));
  return true;
}

export async function getActivePreset(userId: string) {
  const result = await db
    .select()
    .from(notificationPresets)
    .where(and(eq(notificationPresets.userId, userId), eq(notificationPresets.isActive, true)));
  return result[0] ?? null;
}

export async function getActivePresetForExams(userId: string) {
  const result = await db
    .select()
    .from(notificationPresets)
    .where(and(eq(notificationPresets.userId, userId), eq(notificationPresets.isActiveForExams, true)));
  return result[0] ?? null;
}

export async function getActivePresetForAssignments(userId: string) {
  const result = await db
    .select()
    .from(notificationPresets)
    .where(and(eq(notificationPresets.userId, userId), eq(notificationPresets.isActiveForAssignments, true)));
  return result[0] ?? null;
}

export async function countUserPresets(userId: string) {
  const result = await db
    .select({ id: notificationPresets.id })
    .from(notificationPresets)
    .where(
      and(
        eq(notificationPresets.userId, userId),
        eq(notificationPresets.isOneTime, false)
      )
    );
  return result.length;
}

export async function countPresetNotificationTimes(presetId: number) {
  const result = await db.select({ id: notificationTimes.id }).from(notificationTimes).where(eq(notificationTimes.presetId, presetId));
  return result.length;
}

export async function getExamsWithoutPreset(userId: string, className: string) {
  const existingMeta = await db
    .select({ examId: examNotificationMeta.examId })
    .from(examNotificationMeta)
    .where(eq(examNotificationMeta.userId, userId));

  const existingExamIds = existingMeta.map((m) => m.examId);

  if (existingExamIds.length === 0) {
    return db.select().from(exams).where(eq(exams.className, className));
  }

  return db
    .select()
    .from(exams)
    .where(and(eq(exams.className, className), notInArray(exams.id, existingExamIds)));
}

export async function createExamNotificationMeta(userId: string, examId: number, presetId: number) {
  const result = await db.insert(examNotificationMeta).values({ userId, examId, presetId }).returning();
  return result[0];
}

export async function createScheduledNotification(
  examId: number,
  userId: string,
  notificationTimeId: number,
  scheduledFor: Date,
) {
  const result = await db.insert(scheduledNotifications).values({ examId, userId, notificationTimeId, scheduledFor }).returning();
  return result[0];
}

export async function getPendingNotifications() {
  const now = new Date();
  
  const examNotifications = await db
    .select({
      notification: scheduledNotifications,
      notificationTime: notificationTimes,
      preset: notificationPresets,
      exam: exams,
      assignment: sql`NULL::assignments`.as("assignment"),
      user: user,
    })
    .from(scheduledNotifications)
    .innerJoin(notificationTimes, eq(scheduledNotifications.notificationTimeId, notificationTimes.id))
    .innerJoin(notificationPresets, eq(notificationTimes.presetId, notificationPresets.id))
    .innerJoin(exams, eq(scheduledNotifications.examId, exams.id))
    .innerJoin(user, eq(scheduledNotifications.userId, user.id))
    .where(and(eq(scheduledNotifications.sent, false), lt(scheduledNotifications.scheduledFor, now), isNotNull(scheduledNotifications.examId)));

  const assignmentNotifications = await db
    .select({
      notification: scheduledNotifications,
      notificationTime: notificationTimes,
      preset: notificationPresets,
      exam: sql`NULL::exams`.as("exam"),
      assignment: assignments,
      user: user,
    })
    .from(scheduledNotifications)
    .innerJoin(notificationTimes, eq(scheduledNotifications.notificationTimeId, notificationTimes.id))
    .innerJoin(notificationPresets, eq(notificationTimes.presetId, notificationPresets.id))
    .innerJoin(assignments, eq(scheduledNotifications.assignmentId, assignments.id))
    .innerJoin(user, eq(scheduledNotifications.userId, user.id))
    .where(and(eq(scheduledNotifications.sent, false), lt(scheduledNotifications.scheduledFor, now), isNotNull(scheduledNotifications.assignmentId)));

  return [...examNotifications, ...assignmentNotifications];
}

export async function markNotificationSent(notificationId: number) {
  await db
    .update(scheduledNotifications)
    .set({ sent: true, sentAt: new Date() })
    .where(eq(scheduledNotifications.id, notificationId));
}

export async function applyPresetToExam(
  userId: string,
  examId: number,
  presetId: number
) {
  const times = await getNotificationTimes(presetId);
  const exam = await db.select().from(exams).where(eq(exams.id, examId));
  if (exam.length === 0 || !exam[0].dueDate) return false;

  await deleteScheduledNotificationsForExam(userId, examId);
  await db
    .delete(examNotificationMeta)
    .where(
      and(
        eq(examNotificationMeta.userId, userId),
        eq(examNotificationMeta.examId, examId)
      )
    );

  const examDate = exam[0].dueDate;

  await createExamNotificationMeta(userId, examId, presetId);

  for (const time of times) {
    const scheduledFor = new Date(examDate);
    scheduledFor.setDate(scheduledFor.getDate() - time.daysBefore);
    const [hours, minutes] = time.time.split(":").map(Number);
    scheduledFor.setHours(hours, minutes, 0, 0);

    await createScheduledNotification(examId, userId, time.id, scheduledFor);
  }

  return true;
}

export async function applyPresetToNewExams(userId: string) {
  const activePreset = await getActivePreset(userId);
  if (!activePreset) return { applied: 0 };

  const userClass = await getUserClass(userId);
  if (!userClass) return { applied: 0 };

  const examsWithoutPreset = await getExamsWithoutPreset(userId, userClass);

  for (const exam of examsWithoutPreset) {
    await applyPresetToExam(userId, exam.id, activePreset.id);
  }

  return { applied: examsWithoutPreset.length };
}

export async function getExamNotificationMeta(
  userId: string,
  examId: number
) {
  const result = await db
    .select()
    .from(examNotificationMeta)
    .where(
      and(
        eq(examNotificationMeta.userId, userId),
        eq(examNotificationMeta.examId, examId)
      )
    );
  return result[0] ?? null;
}

export async function getExamNotificationMetas(
  userId: string,
  examIds: number[]
) {
  if (examIds.length === 0) return [];
  return db
    .select()
    .from(examNotificationMeta)
    .where(
      and(
        eq(examNotificationMeta.userId, userId),
        inArray(examNotificationMeta.examId, examIds)
      )
    );
}

export async function deleteScheduledNotificationsForExam(
  userId: string,
  examId: number
) {
  await db
    .delete(scheduledNotifications)
    .where(
      and(
        eq(scheduledNotifications.userId, userId),
        eq(scheduledNotifications.examId, examId)
      )
    );
}

export async function deleteExamNotificationMeta(
  userId: string,
  examId: number
) {
  await deleteScheduledNotificationsForExam(userId, examId);
  await db
    .delete(examNotificationMeta)
    .where(
      and(
        eq(examNotificationMeta.userId, userId),
        eq(examNotificationMeta.examId, examId)
      )
    );
}

export async function getReusablePresets(userId: string) {
  return db
    .select()
    .from(notificationPresets)
    .where(
      and(
        eq(notificationPresets.userId, userId),
        eq(notificationPresets.isOneTime, false)
      )
    );
}

export async function getReusablePresetsWithTimes(userId: string) {
  const presets = await getReusablePresets(userId);
  const presetsWithTimes = await Promise.all(
    presets.map(async (preset) => {
      const times = await getNotificationTimes(preset.id);
      return { ...preset, times };
    })
  );
  return presetsWithTimes;
}

export async function getSellerBalance(userId: string) {
  const result = await db.select({ balance: user.balance, maxDebt: user.maxDebt }).from(user).where(eq(user.id, userId));
  return {
    balance: result[0]?.balance ?? "0",
    maxDebt: result[0]?.maxDebt ?? "0",
  };
}

export async function updateSellerBalance(userId: string, newBalance: string) {
  await db.update(user).set({ balance: newBalance }).where(eq(user.id, userId));
}

export async function createCode(
  code: string,
  type: string,
  duration: string,
  value: string,
  sellerId: string,
  className?: string | null
) {
  const result = await db.insert(codes).values({ code, type, duration, value, sellerId, className }).returning();
  return result[0];
}

export async function getCodesBySeller(sellerId: string) {
  return db.select().from(codes).where(eq(codes.sellerId, sellerId)).orderBy(desc(codes.createdAt));
}

export async function getCodeByCode(codeString: string) {
  const result = await db.select().from(codes).where(eq(codes.code, codeString));
  return result[0] ?? null;
}

export async function deleteCodeById(codeId: number, sellerId: string) {
  const result = await db
    .delete(codes)
    .where(and(eq(codes.id, codeId), eq(codes.sellerId, sellerId), isNull(codes.redeemedBy)))
    .returning();
  return result[0] ?? null;
}

export async function getUserSubscription(userId: string) {
  const result = await db
    .select({
      role: user.role,
      subscriptionEndsAt: user.subscriptionEndsAt,
      lastTrialCodeGenerated: user.lastTrialCodeGenerated,
    })
    .from(user)
    .where(eq(user.id, userId));
  return result[0] ?? null;
}

export async function setUserSubscription(
  userId: string,
  role: string,
  subscriptionEndsAt: Date,
  className?: string | null
) {
  const updateData: { role: string; subscriptionEndsAt: Date; class?: string | null } = { role, subscriptionEndsAt };
  if (className !== undefined) {
    updateData.class = className;
  }
  await db
    .update(user)
    .set(updateData)
    .where(eq(user.id, userId));
}

export async function extendSubscription(userId: string, newEndsAt: Date, newRole?: string, className?: string | null) {
  const updateData: { subscriptionEndsAt: Date; role?: string; class?: string | null } = { subscriptionEndsAt: newEndsAt };
  if (newRole) {
    updateData.role = newRole;
  }
  if (className !== undefined) {
    updateData.class = className;
  }
  await db.update(user).set(updateData).where(eq(user.id, userId));
}

export async function redeemCodeInDb(codeId: number, userId: string) {
  const result = await db
    .update(codes)
    .set({ redeemedBy: userId, redeemedAt: new Date() })
    .where(and(eq(codes.id, codeId), isNull(codes.redeemedBy)))
    .returning();
  return result[0] ?? null;
}

export async function getExpiredSubscriptions() {
  const now = new Date();
  return db
    .select()
    .from(user)
    .where(
      and(
        lt(user.subscriptionEndsAt, now),
        or(eq(user.role, "basic"), eq(user.role, "pro"))
      )
    );
}

export async function downgradeExpiredUser(userId: string) {
  await db
    .update(user)
    .set({ role: "free", subscriptionEndsAt: null })
    .where(eq(user.id, userId));
}

export async function updateLastTrialCodeGenerated(userId: string) {
  await db
    .update(user)
    .set({ lastTrialCodeGenerated: new Date() })
    .where(eq(user.id, userId));
}

export async function getAssignmentsWithoutPreset(userId: string, className: string) {
  const existingMeta = await db
    .select({ assignmentId: assignmentNotificationMeta.assignmentId })
    .from(assignmentNotificationMeta)
    .where(eq(assignmentNotificationMeta.userId, userId));

  const existingAssignmentIds = existingMeta.map((m) => m.assignmentId);

  if (existingAssignmentIds.length === 0) {
    return db.select().from(assignments).where(eq(assignments.className, className));
  }

  return db
    .select()
    .from(assignments)
    .where(and(eq(assignments.className, className), notInArray(assignments.id, existingAssignmentIds)));
}

export async function createAssignmentNotificationMeta(userId: string, assignmentId: number, presetId: number) {
  const result = await db.insert(assignmentNotificationMeta).values({ userId, assignmentId, presetId }).returning();
  return result[0];
}

export async function getAssignmentNotificationMetas(
  userId: string,
  assignmentIds: number[]
) {
  if (assignmentIds.length === 0) return [];
  return db
    .select()
    .from(assignmentNotificationMeta)
    .where(
      and(
        eq(assignmentNotificationMeta.userId, userId),
        inArray(assignmentNotificationMeta.assignmentId, assignmentIds)
      )
    );
}

export async function deleteScheduledNotificationsForAssignment(
  userId: string,
  assignmentId: number
) {
  await db
    .delete(scheduledNotifications)
    .where(
      and(
        eq(scheduledNotifications.userId, userId),
        eq(scheduledNotifications.assignmentId, assignmentId)
      )
    );
}

export async function deleteAssignmentNotificationMeta(
  userId: string,
  assignmentId: number
) {
  await deleteScheduledNotificationsForAssignment(userId, assignmentId);
  await db
    .delete(assignmentNotificationMeta)
    .where(
      and(
        eq(assignmentNotificationMeta.userId, userId),
        eq(assignmentNotificationMeta.assignmentId, assignmentId)
      )
    );
}

export async function applyPresetToAssignment(
  userId: string,
  assignmentId: number,
  presetId: number
) {
  const times = await getNotificationTimes(presetId);
  const assignment = await db.select().from(assignments).where(eq(assignments.id, assignmentId));
  if (assignment.length === 0 || !assignment[0].dueDate) return false;

  await deleteScheduledNotificationsForAssignment(userId, assignmentId);
  await db
    .delete(assignmentNotificationMeta)
    .where(
      and(
        eq(assignmentNotificationMeta.userId, userId),
        eq(assignmentNotificationMeta.assignmentId, assignmentId)
      )
    );

  const assignmentDate = assignment[0].dueDate;

  await createAssignmentNotificationMeta(userId, assignmentId, presetId);

  for (const time of times) {
    const scheduledFor = new Date(assignmentDate);
    scheduledFor.setDate(scheduledFor.getDate() - time.daysBefore);
    const [hours, minutes] = time.time.split(":").map(Number);
    scheduledFor.setHours(hours, minutes, 0, 0);

    await db.insert(scheduledNotifications).values({
      assignmentId,
      userId,
      notificationTimeId: time.id,
      scheduledFor,
    });
  }

  return true;
}

export async function applyPresetToNewAssignments(userId: string) {
  const activePreset = await getActivePresetForAssignments(userId);
  if (!activePreset) return { applied: 0 };

  const userClass = await getUserClass(userId);
  if (!userClass) return { applied: 0 };

  const assignmentsWithoutPreset = await getAssignmentsWithoutPreset(userId, userClass);

  for (const assignment of assignmentsWithoutPreset) {
    await applyPresetToAssignment(userId, assignment.id, activePreset.id);
  }

  return { applied: assignmentsWithoutPreset.length };
}

export async function getTotalDebt() {
  const result = await db
    .select({ total: sql<string>`SUM(CASE WHEN ${user.balance}::numeric < 0 THEN ABS(${user.balance}::numeric) ELSE 0 END)` })
    .from(user)
    .where(eq(user.role, "seller"));
  return result[0]?.total ?? "0";
}

export async function getTotalRevenue() {
  const result = await db
    .select({ total: sql<string>`SUM(${codes.value}::numeric)` })
    .from(codes)
    .where(isNotNull(codes.redeemedAt));
  return result[0]?.total ?? "0";
}

export async function getSellersWithDebt() {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance,
      class: user.class,
    })
    .from(user)
    .where(and(eq(user.role, "seller"), sql`${user.balance}::numeric < 0`))
    .orderBy(desc(user.balance));
}

export async function searchUsers(query: string) {
  const searchTerm = `%${query.toLowerCase()}%`;
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      class: user.class,
    })
    .from(user)
    .where(or(like(sql`LOWER(${user.name})`, searchTerm), like(sql`LOWER(${user.email})`, searchTerm)))
    .limit(10);
}

export async function searchSellers(query: string) {
  const searchTerm = `%${query.toLowerCase()}%`;
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance,
      maxDebt: user.maxDebt,
      class: user.class,
    })
    .from(user)
    .where(and(eq(user.role, "seller"), or(like(sql`LOWER(${user.name})`, searchTerm), like(sql`LOWER(${user.email})`, searchTerm))))
    .limit(10);
}

export async function getAllSellers() {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance,
      maxDebt: user.maxDebt,
      class: user.class,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.role, "seller"))
    .orderBy(desc(user.createdAt));
}

export async function getUserById(userId: string) {
  const result = await db.select().from(user).where(eq(user.id, userId));
  return result[0] ?? null;
}

export async function upgradeUserToSeller(userId: string, maxDebt: string, className: string | null) {
  const updateData: { role: string; maxDebt: string; class?: string | null } = { role: "seller", maxDebt };
  if (className !== undefined) {
    updateData.class = className;
  }
  const result = await db.update(user).set(updateData).where(eq(user.id, userId)).returning();
  return result[0] ?? null;
}

export async function updateSellerInfo(userId: string, maxDebt: string, className: string | null) {
  const result = await db
    .update(user)
    .set({ maxDebt, class: className })
    .where(eq(user.id, userId))
    .returning();
  return result[0] ?? null;
}

export async function removeSellerRole(userId: string) {
  const result = await db
    .update(user)
    .set({ role: "free", maxDebt: "0", balance: "0" })
    .where(eq(user.id, userId))
    .returning();
  return result[0] ?? null;
}

export async function updateSellerBalanceWithLog(
  sellerId: string,
  adminId: string,
  type: "add" | "remove" | "set",
  amount: string
) {
  const currentBalance = await getSellerBalance(sellerId);
  const previousBalance = parseFloat(currentBalance.balance);
  let newBalance: number;

  switch (type) {
    case "add":
      newBalance = previousBalance + parseFloat(amount);
      break;
    case "remove":
      newBalance = previousBalance - parseFloat(amount);
      break;
    case "set":
      newBalance = parseFloat(amount);
      break;
  }

  await db.update(user).set({ balance: newBalance.toString() }).where(eq(user.id, sellerId));

  await db.insert(balanceHistory).values({
    sellerId,
    adminId,
    type,
    amount,
    previousBalance: previousBalance.toString(),
    newBalance: newBalance.toString(),
  });

  return { newBalance: newBalance.toString() };
}

export async function getBalanceHistory(sellerId: string, limit = 50) {
  return db
    .select({
      id: balanceHistory.id,
      type: balanceHistory.type,
      amount: balanceHistory.amount,
      previousBalance: balanceHistory.previousBalance,
      newBalance: balanceHistory.newBalance,
      createdAt: balanceHistory.createdAt,
      admin: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    .from(balanceHistory)
    .innerJoin(user, eq(balanceHistory.adminId, user.id))
    .where(eq(balanceHistory.sellerId, sellerId))
    .orderBy(desc(balanceHistory.createdAt))
    .limit(limit);
}

export async function getAllClasses() {
  return db.select().from(schoolclass).orderBy(schoolclass.name);
}

export async function createClass(name: string, username: string, password: string) {
  const result = await db.insert(schoolclass).values({ name, username, password }).returning();
  return result[0];
}

export async function getClassByName(name: string) {
  const result = await db.select().from(schoolclass).where(eq(schoolclass.name, name));
  return result[0] ?? null;
}

export async function updateClass(oldName: string, name: string, username: string, password: string) {
  const result = await db.update(schoolclass).set({ name, username, password }).where(eq(schoolclass.name, oldName)).returning();
  return result[0];
}

export async function deleteClass(name: string) {
  const result = await db.delete(schoolclass).where(eq(schoolclass.name, name)).returning();
  return result[0];
}

export async function getUserNotifications(userId: string) {
  return db
    .select()
    .from(userNotifications)
    .where(eq(userNotifications.userId, userId))
    .orderBy(desc(userNotifications.createdAt))
    .limit(50);
}

export async function getUnreadNotificationCount(userId: string) {
  const result = await db
    .select({ id: userNotifications.id })
    .from(userNotifications)
    .where(and(eq(userNotifications.userId, userId), eq(userNotifications.read, false)));
  return result.length;
}

export async function markAllNotificationsRead(userId: string) {
  await db
    .update(userNotifications)
    .set({ read: true })
    .where(and(eq(userNotifications.userId, userId), eq(userNotifications.read, false)));
}

export async function createUserNotification(
  userId: string,
  title: string,
  message: string,
  type: string
) {
  const result = await db
    .insert(userNotifications)
    .values({ userId, title, message, type })
    .returning();
  return result[0];
}

export { db };
