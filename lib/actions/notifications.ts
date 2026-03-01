"use server";

import { auth } from "@/lib/auth";
import {
  createNotificationPreset,
  updateNotificationPreset,
  deleteNotificationPreset,
  setActivePreset,
  setActivePresetForExams,
  setActivePresetForAssignments,
  createNotificationTime,
  deleteNotificationTime,
  countUserPresets,
  countPresetNotificationTimes,
  applyPresetToNewExams,
  applyPresetToNewAssignments,
  getNotificationPresetById,
  getPushSubscriptions,
  createPushSubscription,
  deletePushSubscription,
  applyPresetToExam,
  applyPresetToAssignment,
  deleteExamNotificationMeta,
  deleteAssignmentNotificationMeta,
  getExamNotificationMetas,
  getAssignmentNotificationMetas,
  getReusablePresetsWithTimes,
  getNotificationTimes,
  getUserNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from "@/db";

const PRESET_LIMITS = {
  free: { presets: 0, timesPerPreset: 0 },
  basic: { presets: 1, timesPerPreset: 2 },
  pro: { presets: 3, timesPerPreset: 5 },
  seller: { presets: 3, timesPerPreset: 5 },
  admin: { presets: 3, timesPerPreset: 5 },
} as const;

type UserRole = "free" | "basic" | "pro" | "seller" | "admin";

function getLimits(role: UserRole) {
  return PRESET_LIMITS[role] ?? PRESET_LIMITS.free;
}

export async function createPresetAction(name: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const role = session.user.role as UserRole;
  const limits = getLimits(role);
  const currentCount = await countUserPresets(session.user.id);

  if (currentCount >= limits.presets) {
    return { error: `Maximum ${limits.presets} preset(s) allowed for your plan` };
  }

  const preset = await createNotificationPreset(session.user.id, name);

  const isFirstPreset = currentCount === 0;
  if (isFirstPreset) {
    await setActivePreset(session.user.id, preset.id);
    await applyPresetToNewExams(session.user.id);
  }

  return { preset };
}

export async function updatePresetAction(presetId: number, name: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const preset = await updateNotificationPreset(presetId, session.user.id, name);
  if (!preset) {
    return { error: "Preset not found" };
  }

  return { preset };
}

export async function deletePresetAction(presetId: number) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  await deleteNotificationPreset(presetId, session.user.id);
  return { success: true };
}

export async function activatePresetAction(presetId: number) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const preset = await getNotificationPresetById(presetId, session.user.id);
  if (!preset) {
    return { error: "Preset not found" };
  }

  await setActivePreset(session.user.id, presetId);
  await applyPresetToNewExams(session.user.id);

  return { success: true };
}

export async function activatePresetForExamsAction(presetId: number) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const preset = await getNotificationPresetById(presetId, session.user.id);
  if (!preset) {
    return { error: "Preset not found" };
  }

  await setActivePresetForExams(session.user.id, presetId);
  await applyPresetToNewExams(session.user.id);

  return { success: true };
}

export async function activatePresetForAssignmentsAction(presetId: number) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const preset = await getNotificationPresetById(presetId, session.user.id);
  if (!preset) {
    return { error: "Preset not found" };
  }

  await setActivePresetForAssignments(session.user.id, presetId);
  await applyPresetToNewAssignments(session.user.id);

  return { success: true };
}

export async function getPresetsAction() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { presets: [] };
  }

  const presetsWithTimes = await getReusablePresetsWithTimes(session.user.id);
  return { presets: presetsWithTimes };
}

export async function addNotificationTimeAction(presetId: number, daysBefore: number, time: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const preset = await getNotificationPresetById(presetId, session.user.id);
  if (!preset) {
    return { error: "Preset not found" };
  }

  const role = session.user.role as UserRole;
  const limits = getLimits(role);
  const currentCount = await countPresetNotificationTimes(presetId);

  if (currentCount >= limits.timesPerPreset) {
    return { error: `Maximum ${limits.timesPerPreset} notification time(s) per preset for your plan` };
  }

  const notificationTime = await createNotificationTime(presetId, daysBefore, time);
  return { notificationTime };
}

export async function removeNotificationTimeAction(timeId: number) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const deleted = await deleteNotificationTime(timeId, session.user.id);
  if (!deleted) {
    return { error: "Notification time not found" };
  }

  return { success: true };
}

export async function getLimitsAction() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { limits: PRESET_LIMITS.free };
  }

  const role = session.user.role as UserRole;
  return { limits: getLimits(role) };
}

export async function subscribeToPushAction(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  await createPushSubscription(
    session.user.id,
    subscription.endpoint,
    subscription.keys.p256dh,
    subscription.keys.auth,
  );

  return { success: true };
}

export async function unsubscribeFromPushAction(endpoint: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  await deletePushSubscription(session.user.id, endpoint);
  return { success: true };
}

export async function getPushSubscriptionStatusAction() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { isSubscribed: false };
  }

  const subscriptions = await getPushSubscriptions(session.user.id);
  return { isSubscribed: subscriptions.length > 0 };
}

export async function applyPresetToExamAction(examId: number, presetId: number) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const preset = await getNotificationPresetById(presetId, session.user.id);
  if (!preset) {
    return { error: "Preset not found" };
  }

  const success = await applyPresetToExam(session.user.id, examId, presetId);
  if (!success) {
    return { error: "Failed to apply preset to exam" };
  }

  return { success: true };
}

export async function clearExamPresetAction(examId: number) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  await deleteExamNotificationMeta(session.user.id, examId);
  return { success: true };
}

export async function createOneTimePresetForExamAction(
  examId: number,
  times: { daysBefore: number; time: string }[]
) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (times.length === 0) {
    return { error: "At least one notification time is required" };
  }

  const role = session.user.role as UserRole;
  const limits = getLimits(role);

  if (times.length > limits.timesPerPreset) {
    return { error: `Maximum ${limits.timesPerPreset} notification time(s) per preset for your plan` };
  }

  const preset = await createNotificationPreset(session.user.id, "Custom", true);

  for (const t of times) {
    await createNotificationTime(preset.id, t.daysBefore, t.time);
  }

  const success = await applyPresetToExam(session.user.id, examId, preset.id);
  if (!success) {
    return { error: "Failed to apply preset to exam" };
  }

  return { success: true, presetId: preset.id };
}

export async function getExamPresetsAction(examIds: number[]) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { examPresets: [] };
  }

  if (examIds.length === 0) {
    return { examPresets: [] };
  }

  const metas = await getExamNotificationMetas(session.user.id, examIds);

  const presetIds = [...new Set(metas.map((m) => m.presetId))];
  const presetDetails = await Promise.all(
    presetIds.map(async (id) => {
      const preset = await getNotificationPresetById(id, session.user.id);
      return preset ? { ...preset } : null;
    })
  );

  const presetMap = new Map(
    presetDetails
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((p) => [p.id, p])
  );

  const examPresets = metas.map((m) => ({
    examId: m.examId,
    preset: presetMap.get(m.presetId) ?? null,
  }));

  return { examPresets };
}

export async function applyPresetToAssignmentAction(assignmentId: number, presetId: number) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const preset = await getNotificationPresetById(presetId, session.user.id);
  if (!preset) {
    return { error: "Preset not found" };
  }

  const success = await applyPresetToAssignment(session.user.id, assignmentId, presetId);
  if (!success) {
    return { error: "Failed to apply preset to assignment" };
  }

  return { success: true };
}

export async function clearAssignmentPresetAction(assignmentId: number) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  await deleteAssignmentNotificationMeta(session.user.id, assignmentId);
  return { success: true };
}

export async function createOneTimePresetForAssignmentAction(
  assignmentId: number,
  times: { daysBefore: number; time: string }[]
) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (times.length === 0) {
    return { error: "At least one notification time is required" };
  }

  const role = session.user.role as UserRole;
  const limits = getLimits(role);

  if (times.length > limits.timesPerPreset) {
    return { error: `Maximum ${limits.timesPerPreset} notification time(s) per preset for your plan` };
  }

  const preset = await createNotificationPreset(session.user.id, "Custom", true);

  for (const t of times) {
    await createNotificationTime(preset.id, t.daysBefore, t.time);
  }

  const success = await applyPresetToAssignment(session.user.id, assignmentId, preset.id);
  if (!success) {
    return { error: "Failed to apply preset to assignment" };
  }

  return { success: true, presetId: preset.id };
}

export async function getAssignmentPresetsAction(assignmentIds: number[]) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { assignmentPresets: [] };
  }

  if (assignmentIds.length === 0) {
    return { assignmentPresets: [] };
  }

  const metas = await getAssignmentNotificationMetas(session.user.id, assignmentIds);

  const presetIds = [...new Set(metas.map((m) => m.presetId))];
  const presetDetails = await Promise.all(
    presetIds.map(async (id) => {
      const preset = await getNotificationPresetById(id, session.user.id);
      if (!preset) return null;
      const times = await getNotificationTimes(id);
      return { ...preset, times };
    })
  );

  const presetMap = new Map(
    presetDetails
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((p) => [p.id, p])
  );

  const assignmentPresets = metas.map((m) => ({
    assignmentId: m.assignmentId,
    preset: presetMap.get(m.presetId) ?? null,
  }));

  return { assignmentPresets };
}

export async function getUserNotificationsAction() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { notifications: [] };
  }

  const notifications = await getUserNotifications(session.user.id);
  return { notifications };
}

export async function getUnreadNotificationCountAction() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { count: 0 };
  }

  const count = await getUnreadNotificationCount(session.user.id);
  return { count };
}

export async function markAllNotificationsReadAction() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  await markAllNotificationsRead(session.user.id);
  return { success: true };
}
