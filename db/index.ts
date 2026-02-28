import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, lt, notInArray, inArray } from "drizzle-orm";
import {
  user,
  exams,
  assignments,
  notificationPresets,
  notificationTimes,
  scheduledNotifications,
  examNotificationMeta,
  pushSubscriptions,
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
  return db
    .select({
      notification: scheduledNotifications,
      notificationTime: notificationTimes,
      preset: notificationPresets,
      exam: exams,
      user: user,
    })
    .from(scheduledNotifications)
    .innerJoin(notificationTimes, eq(scheduledNotifications.notificationTimeId, notificationTimes.id))
    .innerJoin(notificationPresets, eq(notificationTimes.presetId, notificationPresets.id))
    .innerJoin(exams, eq(scheduledNotifications.examId, exams.id))
    .innerJoin(user, eq(scheduledNotifications.userId, user.id))
    .where(and(eq(scheduledNotifications.sent, false), lt(scheduledNotifications.scheduledFor, now)));
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

export { db };
