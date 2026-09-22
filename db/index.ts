import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, lt, notInArray, inArray, isNull, or, isNotNull, sql, like, gt } from "drizzle-orm";
import {
  user,
  exams,
  assignments,
  notificationPresets,
  notificationTimes,
  notificationPreferences,
  sentNotifications,
  pushSubscriptions,
  pushDeliveries,
  codes,
  schoolclass,
  balanceHistory,
  userNotifications,
} from "./schema";
import { generateId } from "@/lib/utils";
import { isNotificationDue } from "@/lib/notification-schedule";

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
  return db.transaction(async (tx) => {
    const [result] = await tx.insert(pushSubscriptions)
      .values({ id: generateId(), userId, endpoint, p256dh, auth })
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, p256dh, auth } })
      .returning();
    // A transferred browser must never receive queued reminders for its old owner.
    await tx.delete(pushDeliveries).where(and(
      eq(pushDeliveries.subscriptionId, result.id), sql`${pushDeliveries.userId} <> ${userId}`,
    ));
    return result;
  });
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

export async function getNotificationPresetById(presetId: string, userId: string) {
  const result = await db
    .select()
    .from(notificationPresets)
    .where(and(eq(notificationPresets.id, presetId), eq(notificationPresets.userId, userId)));
  return result[0] ?? null;
}

export async function createNotificationPreset(userId: string, name: string, id = generateId(), makeDefault = false) {
  const now = new Date();
  const result = await db.insert(notificationPresets).values({
    id, userId, name,
    isActiveForExams: makeDefault, isActiveForAssignments: makeDefault,
    activatedForExamsAt: makeDefault ? now : null,
    activatedForAssignmentsAt: makeDefault ? now : null,
  }).onConflictDoNothing().returning();
  return result[0];
}

export async function updateNotificationPreset(presetId: string, userId: string, name: string) {
  const result = await db
    .update(notificationPresets)
    .set({ name })
    .where(and(eq(notificationPresets.id, presetId), eq(notificationPresets.userId, userId)))
    .returning();
  return result[0] ?? null;
}

export async function deleteNotificationPreset(presetId: string, userId: string) {
  await db
    .delete(notificationPresets)
    .where(and(eq(notificationPresets.id, presetId), eq(notificationPresets.userId, userId)));
}

export async function setActivePresetForExams(userId: string, presetId: string) {
  await db.update(notificationPresets).set({ isActiveForExams: false, activatedForExamsAt: null }).where(eq(notificationPresets.userId, userId));
  const result = await db
    .update(notificationPresets)
    .set({ isActiveForExams: true, activatedForExamsAt: new Date() })
    .where(and(eq(notificationPresets.id, presetId), eq(notificationPresets.userId, userId)))
    .returning();
  return result[0] ?? null;
}

export async function setActivePresetForAssignments(userId: string, presetId: string) {
  await db.update(notificationPresets).set({ isActiveForAssignments: false, activatedForAssignmentsAt: null }).where(eq(notificationPresets.userId, userId));
  const result = await db
    .update(notificationPresets)
    .set({ isActiveForAssignments: true, activatedForAssignmentsAt: new Date() })
    .where(and(eq(notificationPresets.id, presetId), eq(notificationPresets.userId, userId)))
    .returning();
  return result[0] ?? null;
}

export async function getNotificationTimes(presetId: string) {
  return db.select().from(notificationTimes).where(eq(notificationTimes.presetId, presetId));
}

export async function createNotificationTime(presetId: string, daysBefore: number, time: string, id = generateId()) {
  const result = await db.insert(notificationTimes).values({ id, presetId, daysBefore, time }).onConflictDoNothing().returning();
  return result[0];
}

export async function deleteNotificationTime(timeId: string, userId: string) {
  const preset = await db
    .select()
    .from(notificationPresets)
    .innerJoin(notificationTimes, eq(notificationPresets.id, notificationTimes.presetId))
    .where(and(eq(notificationTimes.id, timeId), eq(notificationPresets.userId, userId)));
  if (preset.length === 0) return false;
  await db.delete(notificationTimes).where(eq(notificationTimes.id, timeId));
  return true;
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
    .where(eq(notificationPresets.userId, userId));
  return result.length;
}

export async function countPresetNotificationTimes(presetId: string) {
  const result = await db.select({ id: notificationTimes.id }).from(notificationTimes).where(eq(notificationTimes.presetId, presetId));
  return result.length;
}

export async function getExamsWithoutPreference(userId: string, className: string) {
  const now = new Date();
  const existingPrefs = await db
    .select({ examId: notificationPreferences.examId })
    .from(notificationPreferences)
    .where(and(eq(notificationPreferences.userId, userId), isNotNull(notificationPreferences.examId)));

  const existingExamIds = existingPrefs.map((p) => p.examId).filter((id): id is number => id !== null);

  if (existingExamIds.length === 0) {
    return db.select().from(exams).where(and(eq(exams.className, className), gt(exams.dueDate, now)));
  }

  return db
    .select()
    .from(exams)
    .where(and(eq(exams.className, className), notInArray(exams.id, existingExamIds), gt(exams.dueDate, now)));
}

export async function getAssignmentsWithoutPreference(userId: string, className: string) {
  const existingPrefs = await db
    .select({ assignmentId: notificationPreferences.assignmentId })
    .from(notificationPreferences)
    .where(and(eq(notificationPreferences.userId, userId), isNotNull(notificationPreferences.assignmentId)));

  const existingAssignmentIds = existingPrefs.map((p) => p.assignmentId).filter((id): id is number => id !== null);

  if (existingAssignmentIds.length === 0) {
    return db.select().from(assignments).where(eq(assignments.className, className));
  }

  return db
    .select()
    .from(assignments)
    .where(and(eq(assignments.className, className), notInArray(assignments.id, existingAssignmentIds)));
}

export async function createNotificationPreference(
  userId: string,
  presetId: string | null,
  examId?: number,
  assignmentId?: number,
  disabled: boolean = false
) {
  const result = await db
    .insert(notificationPreferences)
    .values({ id: generateId(), userId, presetId: presetId ?? null, examId: examId ?? null, assignmentId: assignmentId ?? null, disabled })
    .returning();
  return result[0];
}

export async function getNotificationPreferenceForExam(userId: string, examId: number) {
  const result = await db
    .select()
    .from(notificationPreferences)
    .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.examId, examId)));
  return result[0] ?? null;
}

export async function getNotificationPreferenceForAssignment(userId: string, assignmentId: number) {
  const result = await db
    .select()
    .from(notificationPreferences)
    .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.assignmentId, assignmentId)));
  return result[0] ?? null;
}

export async function getNotificationPreferencesForExams(userId: string, examIds: number[]) {
  if (examIds.length === 0) return [];
  return db
    .select()
    .from(notificationPreferences)
    .where(and(eq(notificationPreferences.userId, userId), inArray(notificationPreferences.examId, examIds)));
}

export async function getNotificationPreferencesForAssignments(userId: string, assignmentIds: number[]) {
  if (assignmentIds.length === 0) return [];
  return db
    .select()
    .from(notificationPreferences)
    .where(and(eq(notificationPreferences.userId, userId), inArray(notificationPreferences.assignmentId, assignmentIds)));
}

export async function deleteNotificationPreferenceForExam(userId: string, examId: number) {
  await db
    .delete(notificationPreferences)
    .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.examId, examId)));
}

export async function deleteNotificationPreferenceForAssignment(userId: string, assignmentId: number) {
  await db
    .delete(notificationPreferences)
    .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.assignmentId, assignmentId)));
}

export async function disableNotificationsForExam(userId: string, examId: number) {
  await deleteNotificationPreferenceForExam(userId, examId);
  await createNotificationPreference(userId, null, examId, undefined, true);
}

export async function disableNotificationsForAssignment(userId: string, assignmentId: number) {
  await deleteNotificationPreferenceForAssignment(userId, assignmentId);
  await createNotificationPreference(userId, null, undefined, assignmentId, true);
}

export async function applyPresetToExam(userId: string, examId: number, presetId: string) {
  const exam = await db.select().from(exams).where(eq(exams.id, examId));
  if (exam.length === 0) return false;

  await deleteNotificationPreferenceForExam(userId, examId);
  await createNotificationPreference(userId, presetId, examId, undefined);
  return true;
}

export async function applyPresetToAllExams(userId: string, presetId: string) {
  const userClass = await getUserClass(userId);
  if (!userClass) return { applied: 0 };

  const now = new Date();
  const futureExams = await db
    .select()
    .from(exams)
    .where(and(eq(exams.className, userClass), gt(exams.dueDate, now)));

  for (const exam of futureExams) {
    await deleteNotificationPreferenceForExam(userId, exam.id);
    await createNotificationPreference(userId, presetId, exam.id, undefined);
  }
  return { applied: futureExams.length };
}

export async function applyPresetToAssignment(userId: string, assignmentId: number, presetId: string) {
  const assignment = await db.select().from(assignments).where(eq(assignments.id, assignmentId));
  if (assignment.length === 0) return false;

  await deleteNotificationPreferenceForAssignment(userId, assignmentId);
  await createNotificationPreference(userId, presetId, undefined, assignmentId);
  return true;
}

export async function applyPresetToAllAssignments(userId: string, presetId: string) {
  const userClass = await getUserClass(userId);
  if (!userClass) return { applied: 0 };

  const now = new Date();
  const futureAssignments = await db
    .select()
    .from(assignments)
    .where(and(eq(assignments.className, userClass), gt(assignments.dueDate, now)));

  for (const assignment of futureAssignments) {
    await deleteNotificationPreferenceForAssignment(userId, assignment.id);
    await createNotificationPreference(userId, presetId, undefined, assignment.id);
  }
  return { applied: futureAssignments.length };
}

export async function getPendingNotificationsForCron() {
  const now = new Date();
  const results: {
    userId: string;
    examId: number | null;
    assignmentId: number | null;
    daysBefore: number;
    item: typeof exams.$inferSelect | typeof assignments.$inferSelect;
    preset: typeof notificationPresets.$inferSelect;
    time: typeof notificationTimes.$inferSelect;
  }[] = [];

  const allPrefs = await db.select().from(notificationPreferences);
  const disabledExamIds = new Set<number>();
  const disabledAssignmentIds = new Set<number>();
  const userExamPrefs = new Map<string, Set<number>>();
  const userAssignmentPrefs = new Map<string, Set<number>>();

  for (const pref of allPrefs) {
    if (pref.disabled) {
      if (pref.examId) disabledExamIds.add(pref.examId);
      if (pref.assignmentId) disabledAssignmentIds.add(pref.assignmentId);
    } else {
      if (!userExamPrefs.has(pref.userId)) userExamPrefs.set(pref.userId, new Set());
      if (!userAssignmentPrefs.has(pref.userId)) userAssignmentPrefs.set(pref.userId, new Set());
      if (pref.examId) userExamPrefs.get(pref.userId)!.add(pref.examId);
      if (pref.assignmentId) userAssignmentPrefs.get(pref.userId)!.add(pref.assignmentId);
    }
  }

  const activeExamPresets = await db
    .select()
    .from(notificationPresets)
    .where(and(eq(notificationPresets.isActiveForExams, true), isNotNull(notificationPresets.activatedForExamsAt)));

  for (const preset of activeExamPresets) {
    const userClass = await getUserClass(preset.userId);
    if (!userClass) continue;

    const times = await getNotificationTimes(preset.id);
    if (times.length === 0) continue;

    const classExams = await db
      .select()
      .from(exams)
      .where(and(eq(exams.className, userClass), gt(exams.createdAt, preset.activatedForExamsAt!)));

    const examPrefsForUser = userExamPrefs.get(preset.userId) ?? new Set();

    for (const exam of classExams) {
      if (!exam.dueDate) continue;
      if (disabledExamIds.has(exam.id)) continue;
      if (examPrefsForUser.has(exam.id)) continue;

      for (const time of times) {
        if (isNotificationDue(exam.dueDate, time.daysBefore, time.time, now)) {
          const alreadySent = await db
            .select()
            .from(sentNotifications)
            .where(
              and(
                eq(sentNotifications.userId, preset.userId),
                eq(sentNotifications.examId, exam.id),
                eq(sentNotifications.daysBefore, time.daysBefore),
                eq(sentNotifications.time, time.time)
              )
            );

          if (alreadySent.length === 0) {
            results.push({
              userId: preset.userId,
              examId: exam.id,
              assignmentId: null,
              daysBefore: time.daysBefore,
              item: exam,
              preset,
              time,
            });
          }
        }
      }
    }
  }

  const activeAssignmentPresets = await db
    .select()
    .from(notificationPresets)
    .where(and(eq(notificationPresets.isActiveForAssignments, true), isNotNull(notificationPresets.activatedForAssignmentsAt)));

  for (const preset of activeAssignmentPresets) {
    const userClass = await getUserClass(preset.userId);
    if (!userClass) continue;

    const times = await getNotificationTimes(preset.id);
    if (times.length === 0) continue;

    const classAssignments = await db
      .select()
      .from(assignments)
      .where(and(eq(assignments.className, userClass), gt(assignments.createdAt, preset.activatedForAssignmentsAt!)));

    const assignmentPrefsForUser = userAssignmentPrefs.get(preset.userId) ?? new Set();

    for (const assignment of classAssignments) {
      if (!assignment.dueDate) continue;
      if (disabledAssignmentIds.has(assignment.id)) continue;
      if (assignmentPrefsForUser.has(assignment.id)) continue;

      for (const time of times) {
        if (isNotificationDue(assignment.dueDate, time.daysBefore, time.time, now)) {
          const alreadySent = await db
            .select()
            .from(sentNotifications)
            .where(
              and(
                eq(sentNotifications.userId, preset.userId),
                eq(sentNotifications.assignmentId, assignment.id),
                eq(sentNotifications.daysBefore, time.daysBefore),
                eq(sentNotifications.time, time.time)
              )
            );

          if (alreadySent.length === 0) {
            results.push({
              userId: preset.userId,
              examId: null,
              assignmentId: assignment.id,
              daysBefore: time.daysBefore,
              item: assignment,
              preset,
              time,
            });
          }
        }
      }
    }
  }

  for (const pref of allPrefs) {
    if (pref.disabled || !pref.presetId) continue;
    const userClass = await getUserClass(pref.userId);
    if (!userClass) continue;

    const preset = await db
      .select()
      .from(notificationPresets)
      .where(eq(notificationPresets.id, pref.presetId));
    if (preset.length === 0) continue;

    const times = await getNotificationTimes(pref.presetId);
    if (times.length === 0) continue;

    if (pref.examId) {
      const exam = await db.select().from(exams).where(eq(exams.id, pref.examId));
      if (exam.length === 0 || !exam[0].dueDate || exam[0].className !== userClass) continue;

      for (const time of times) {
        if (isNotificationDue(exam[0].dueDate, time.daysBefore, time.time, now)) {
          const alreadySent = await db
            .select()
            .from(sentNotifications)
            .where(
              and(
                eq(sentNotifications.userId, pref.userId),
                eq(sentNotifications.examId, pref.examId),
                eq(sentNotifications.daysBefore, time.daysBefore),
                eq(sentNotifications.time, time.time)
              )
            );

          if (alreadySent.length === 0) {
            results.push({
              userId: pref.userId,
              examId: pref.examId,
              assignmentId: null,
              daysBefore: time.daysBefore,
              item: exam[0],
              preset: preset[0],
              time,
            });
          }
        }
      }
    }

    if (pref.assignmentId) {
      const assignment = await db.select().from(assignments).where(eq(assignments.id, pref.assignmentId));
      if (assignment.length === 0 || !assignment[0].dueDate || assignment[0].className !== userClass) continue;

      for (const time of times) {
        if (isNotificationDue(assignment[0].dueDate, time.daysBefore, time.time, now)) {
          const alreadySent = await db
            .select()
            .from(sentNotifications)
            .where(
              and(
                eq(sentNotifications.userId, pref.userId),
                eq(sentNotifications.assignmentId, pref.assignmentId),
                eq(sentNotifications.daysBefore, time.daysBefore),
                eq(sentNotifications.time, time.time)
              )
            );

          if (alreadySent.length === 0) {
            results.push({
              userId: pref.userId,
              examId: null,
              assignmentId: pref.assignmentId,
              daysBefore: time.daysBefore,
              item: assignment[0],
              preset: preset[0],
              time,
            });
          }
        }
      }
    }
  }

  return results;
}

export async function markNotificationSent(
  userId: string,
  examId: number | null,
  assignmentId: number | null,
  daysBefore: number,
  time: string
) {
  await db.insert(sentNotifications).values({
    id: generateId(),
    userId,
    examId,
    assignmentId,
    daysBefore,
    time,
    sentAt: new Date(),
  });
}

export async function getPresetsWithTimes(userId: string) {
  const presets = await db.select().from(notificationPresets).where(eq(notificationPresets.userId, userId));
  const presetsWithTimes = await Promise.all(
    presets.map(async (preset) => {
      const times = await getNotificationTimes(preset.id);
      return { ...preset, times };
    })
  );
  return presetsWithTimes;
}

export async function getSellerBalance(userId: string) {
  const result = await db.select({
    balance: user.balance,
    maxDebt: user.maxDebt,
  }).from(user).where(eq(user.id, userId));
  return {
    balance: result[0]?.balance ?? "0",
    maxDebt: result[0]?.maxDebt ?? "0",
  };
}

export async function updateSellerBalance(userId: string, newBalance: string) {
  await db.update(user).set({ balance: newBalance }).where(eq(user.id, userId));
}

export async function getCodesBySeller(sellerId: string) {
  return db.select().from(codes).where(eq(codes.sellerId, sellerId)).orderBy(desc(codes.createdAt));
}

export async function setUserClass(userId: string, className: string) {
  await db.transaction(async (tx) => {
    // Share this lock with queueReminder so an old cron snapshot cannot undo cleanup.
    const [account] = await tx.select({ class: user.class }).from(user)
      .where(eq(user.id, userId)).for("update");
    if (!account || account.class === className) return;

    await tx.update(user).set({ class: className }).where(eq(user.id, userId));
    await tx.delete(notificationPreferences).where(and(
      eq(notificationPreferences.userId, userId),
      or(
        and(isNotNull(notificationPreferences.examId), notInArray(notificationPreferences.examId,
          tx.select({ id: exams.id }).from(exams).where(eq(exams.className, className)))),
        and(isNotNull(notificationPreferences.assignmentId), notInArray(notificationPreferences.assignmentId,
          tx.select({ id: assignments.id }).from(assignments).where(eq(assignments.className, className)))),
      ),
    ));
    // Pending deliveries belong to reminders queued before the class change.
    await tx.delete(pushDeliveries).where(eq(pushDeliveries.userId, userId));
  });
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
  return db.transaction(async tx => {
    const [seller] = await tx.select().from(user).where(eq(user.id, sellerId)).for("update");
    if (!seller) throw new Error("Seller not found");
    const previousBalance = Number(seller.balance);
    const value = Number(amount);
    if (!Number.isFinite(value)) throw new Error("Invalid balance amount");
    const newBalance = type === "add" ? previousBalance + value : type === "remove" ? previousBalance - value : value;
    await tx.update(user).set({ balance: newBalance.toFixed(2) }).where(eq(user.id, sellerId));
    await tx.insert(balanceHistory).values({
      id: generateId(), sellerId, adminId, type, amount,
      previousBalance: previousBalance.toFixed(2), newBalance: newBalance.toFixed(2),
    });
    return { newBalance: newBalance.toFixed(2) };
  });
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
    .values({ id: generateId(), userId, title, message, type })
    .returning();
  return result[0];
}

export { db };

export async function getClassNames() {
  return db.select({ name: schoolclass.name }).from(schoolclass).orderBy(schoolclass.name);
}

export async function hasSellerDebt(userId: string) {
  const [account] = await db
    .select({ role: user.role, balance: user.balance })
    .from(user)
    .where(eq(user.id, userId));
  return !!account?.role?.split(",").includes("seller") && Number(account.balance) < 0;
}

export async function queueReminder(
  userId: string, examId: number | null, assignmentId: number | null,
  daysBefore: number, time: string, title: string, body: string, type: string,
) {
  return db.transaction(async (tx) => {
    const [account] = await tx.select({ class: user.class }).from(user)
      .where(eq(user.id, userId)).for("update");
    if (!account?.class) return false;
    if (examId !== null) {
      const [exam] = await tx.select({ className: exams.className }).from(exams).where(eq(exams.id, examId));
      if (exam?.className !== account.class) return false;
    }
    if (assignmentId !== null) {
      const [assignment] = await tx.select({ className: assignments.className }).from(assignments)
        .where(eq(assignments.id, assignmentId));
      if (assignment?.className !== account.class) return false;
    }
    // Serialize overlapping cron runs for the same reminder, including NULL IDs.
    const key = JSON.stringify([userId, examId, assignmentId, daysBefore, time]);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
    const condition = and(
      eq(sentNotifications.userId, userId), eq(sentNotifications.daysBefore, daysBefore),
      eq(sentNotifications.time, time),
      examId === null ? isNull(sentNotifications.examId) : eq(sentNotifications.examId, examId),
      assignmentId === null ? isNull(sentNotifications.assignmentId) : eq(sentNotifications.assignmentId, assignmentId),
    );
    if ((await tx.select().from(sentNotifications).where(condition)).length) return false;
    await tx.insert(userNotifications).values({ id: generateId(), userId, title, message: body, type });
    const subscriptions = await tx.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    if (subscriptions.length) await tx.insert(pushDeliveries).values(subscriptions.map(sub => ({
      id: generateId(), subscriptionId: sub.id, userId,
      payload: JSON.stringify({ title, body, tag: key, icon: "/android-chrome-192x192.png" }),
    })));
    await tx.insert(sentNotifications).values({ id: generateId(), userId, examId, assignmentId, daysBefore, time });
    return true;
  });
}

export async function claimPushDelivery() {
  return db.transaction(async (tx) => {
    const [delivery] = await tx.select().from(pushDeliveries)
      .where(lt(pushDeliveries.nextAttemptAt, new Date()))
      .orderBy(pushDeliveries.nextAttemptAt).limit(1).for("update", { skipLocked: true });
    if (!delivery) return null;
    await tx.update(pushDeliveries).set({
      attempts: delivery.attempts + 1,
      nextAttemptAt: new Date(Date.now() + 5 * 60_000),
    }).where(eq(pushDeliveries.id, delivery.id));
    const [subscription] = await tx.select().from(pushSubscriptions).where(and(
      eq(pushSubscriptions.id, delivery.subscriptionId), eq(pushSubscriptions.userId, delivery.userId),
    ));
    return { ...delivery, attempts: delivery.attempts + 1, subscription };
  });
}

export async function finishPushDelivery(id: string, retryAt?: Date) {
  if (retryAt) await db.update(pushDeliveries).set({ nextAttemptAt: retryAt }).where(eq(pushDeliveries.id, id));
  else await db.delete(pushDeliveries).where(eq(pushDeliveries.id, id));
}
