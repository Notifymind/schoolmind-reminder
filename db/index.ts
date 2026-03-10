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
  codes,
  schoolclass,
  balanceHistory,
  userNotifications,
} from "./schema";
import { generateId } from "@/lib/utils";

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
    .values({ id: generateId(), userId, endpoint, p256dh, auth })
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

export async function getNotificationPresetById(presetId: string, userId: string) {
  const result = await db
    .select()
    .from(notificationPresets)
    .where(and(eq(notificationPresets.id, presetId), eq(notificationPresets.userId, userId)));
  return result[0] ?? null;
}

export async function createNotificationPreset(userId: string, name: string) {
  const result = await db.insert(notificationPresets).values({ id: generateId(), userId, name }).returning();
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

export async function createNotificationTime(presetId: string, daysBefore: number, time: string) {
  const result = await db.insert(notificationTimes).values({ id: generateId(), presetId, daysBefore, time }).returning();
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
  const bufferMs = 5 * 60 * 1000;
  const nowWithBuffer = new Date(now.getTime() + bufferMs);
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
        const notificationTime = new Date(exam.dueDate);
        notificationTime.setDate(notificationTime.getDate() - time.daysBefore);
        const [hours, minutes] = time.time.split(":").map(Number);
        notificationTime.setHours(hours, minutes, 0, 0);

        if (notificationTime <= nowWithBuffer) {
          const alreadySent = await db
            .select()
            .from(sentNotifications)
            .where(
              and(
                eq(sentNotifications.userId, preset.userId),
                eq(sentNotifications.examId, exam.id),
                eq(sentNotifications.daysBefore, time.daysBefore)
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
        const notificationTime = new Date(assignment.dueDate);
        notificationTime.setDate(notificationTime.getDate() - time.daysBefore);
        const [hours, minutes] = time.time.split(":").map(Number);
        notificationTime.setHours(hours, minutes, 0, 0);

        if (notificationTime <= nowWithBuffer) {
          const alreadySent = await db
            .select()
            .from(sentNotifications)
            .where(
              and(
                eq(sentNotifications.userId, preset.userId),
                eq(sentNotifications.assignmentId, assignment.id),
                eq(sentNotifications.daysBefore, time.daysBefore)
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

    const preset = await db
      .select()
      .from(notificationPresets)
      .where(eq(notificationPresets.id, pref.presetId));
    if (preset.length === 0) continue;

    const times = await getNotificationTimes(pref.presetId);
    if (times.length === 0) continue;

    if (pref.examId) {
      const exam = await db.select().from(exams).where(eq(exams.id, pref.examId));
      if (exam.length === 0 || !exam[0].dueDate) continue;

      for (const time of times) {
        const notificationTime = new Date(exam[0].dueDate);
        notificationTime.setDate(notificationTime.getDate() - time.daysBefore);
        const [hours, minutes] = time.time.split(":").map(Number);
        notificationTime.setHours(hours, minutes, 0, 0);

        if (notificationTime <= nowWithBuffer) {
          const alreadySent = await db
            .select()
            .from(sentNotifications)
            .where(
              and(
                eq(sentNotifications.userId, pref.userId),
                eq(sentNotifications.examId, pref.examId),
                eq(sentNotifications.daysBefore, time.daysBefore)
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
      if (assignment.length === 0 || !assignment[0].dueDate) continue;

      for (const time of times) {
        const notificationTime = new Date(assignment[0].dueDate);
        notificationTime.setDate(notificationTime.getDate() - time.daysBefore);
        const [hours, minutes] = time.time.split(":").map(Number);
        notificationTime.setHours(hours, minutes, 0, 0);

        if (notificationTime <= nowWithBuffer) {
          const alreadySent = await db
            .select()
            .from(sentNotifications)
            .where(
              and(
                eq(sentNotifications.userId, pref.userId),
                eq(sentNotifications.assignmentId, pref.assignmentId),
                eq(sentNotifications.daysBefore, time.daysBefore)
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
  daysBefore: number
) {
  await db.insert(sentNotifications).values({
    id: generateId(),
    userId,
    examId,
    assignmentId,
    daysBefore,
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
    maxTrialCodes: user.maxTrialCodes,
    trialCodesGenerated: user.trialCodesGenerated,
  }).from(user).where(eq(user.id, userId));
  return {
    balance: result[0]?.balance ?? "0",
    maxDebt: result[0]?.maxDebt ?? "0",
    maxTrialCodes: result[0]?.maxTrialCodes ?? 0,
    trialCodesGenerated: result[0]?.trialCodesGenerated ?? 0,
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
  const result = await db.insert(codes).values({ id: generateId(), code, type, duration, value, sellerId, className }).returning();
  return result[0];
}

export async function getCodesBySeller(sellerId: string) {
  return db.select().from(codes).where(eq(codes.sellerId, sellerId)).orderBy(desc(codes.createdAt));
}

export async function getCodeByCode(codeString: string) {
  const result = await db.select().from(codes).where(eq(codes.code, codeString));
  return result[0] ?? null;
}

export async function deleteCodeById(codeId: string, sellerId: string) {
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

export async function redeemCodeInDb(codeId: string, userId: string) {
  const result = await db
    .update(codes)
    .set({ redeemedBy: userId, redeemedAt: new Date(), wasRedeemedAt: new Date() })
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

export async function countTrialCodesBySeller(sellerId: string) {
  const result = await db
    .select({ id: codes.id })
    .from(codes)
    .where(and(eq(codes.sellerId, sellerId), eq(codes.type, "trial")));
  return result.length;
}

export async function incrementTrialCodesGenerated(userId: string) {
  await db
    .update(user)
    .set({ trialCodesGenerated: sql`${user.trialCodesGenerated} + 1` })
    .where(eq(user.id, userId));
}

export async function resetTrialCodesGenerated(userId: string) {
  await db
    .update(user)
    .set({ trialCodesGenerated: 0 })
    .where(eq(user.id, userId));
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
      maxTrialCodes: user.maxTrialCodes,
      trialCodesGenerated: user.trialCodesGenerated,
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

export async function upgradeUserToSeller(userId: string, maxDebt: string, maxTrialCodes: number, className: string | null) {
  const updateData: { role: string; maxDebt: string; maxTrialCodes: number; class?: string | null } = { role: "seller", maxDebt, maxTrialCodes };
  if (className !== undefined) {
    updateData.class = className;
  }
  const result = await db.update(user).set(updateData).where(eq(user.id, userId)).returning();
  return result[0] ?? null;
}

export async function updateSellerInfo(userId: string, maxDebt: string, maxTrialCodes: number, className: string | null) {
  const result = await db
    .update(user)
    .set({ maxDebt, maxTrialCodes, class: className })
    .where(eq(user.id, userId))
    .returning();
  return result[0] ?? null;
}

export async function removeSellerRole(userId: string) {
  const result = await db
    .update(user)
    .set({ role: "free", maxDebt: "0", balance: "0", maxTrialCodes: 0, trialCodesGenerated: 0 })
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
    id: generateId(),
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
    .values({ id: generateId(), userId, title, message, type })
    .returning();
  return result[0];
}

export { db };
