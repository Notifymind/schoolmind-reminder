"use server";

import { auth } from "@/lib/auth";
import {
  createNotificationPreset,
  updateNotificationPreset,
  deleteNotificationPreset,
  setActivePresetForExams,
  setActivePresetForAssignments,
  createNotificationTime,
  deleteNotificationTime,
  countUserPresets,
  countPresetNotificationTimes,
  getNotificationPresetById,
  getPushSubscriptions,
  createPushSubscription,
  deletePushSubscription,
  applyPresetToExam,
  applyPresetToAssignment,
  applyPresetToAllExams,
  applyPresetToAllAssignments,
  deleteNotificationPreferenceForExam,
  deleteNotificationPreferenceForAssignment,
  disableNotificationsForExam,
  disableNotificationsForAssignment,
  getNotificationPreferencesForExams,
  getNotificationPreferencesForAssignments,
  getPresetsWithTimes,
  getNotificationTimes,
  getUserNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from "@/db";

const PRESET_LIMITS = {
  free: { presets: 1, timesPerPreset: 2 },
  pro: { presets: 5, timesPerPreset: 7 },
  seller: { presets: 5, timesPerPreset: 7 },
  admin: { presets: 5, timesPerPreset: 7 },
} as const;

type UserRole = "free" | "pro" | "seller" | "admin";

function getLimits(role: UserRole) {
  return PRESET_LIMITS[role] ?? PRESET_LIMITS.free;
}

export async function createPresetAction(name: string, clientId?: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  if (typeof name !== "string" || !name.trim() || name.length > 200) return { error: "Enter a preset name of at most 200 characters" };
  if (clientId && !/^[0-9a-f-]{36}$/i.test(clientId)) return { error: "Invalid preset ID" };
  if (clientId) {
    const existing = await getNotificationPresetById(clientId, session.user.id);
    if (existing) return { preset: existing };
  }

  const role = session.user.role as UserRole;
  const limits = getLimits(role);
  const currentCount = await countUserPresets(session.user.id);

  if (currentCount >= limits.presets) {
    return {
      error: `Maximum ${limits.presets} preset(s) allowed for your plan`,
    };
  }

  const preset = await createNotificationPreset(session.user.id, name, clientId, currentCount === 0);
  if (!preset) return { error: "Preset ID already exists" };

  return { preset };
}

export async function updatePresetAction(presetId: string, name: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const preset = await updateNotificationPreset(
    presetId,
    session.user.id,
    name,
  );
  if (!preset) {
    return { error: "Preset not found" };
  }

  return { preset };
}

export async function deletePresetAction(presetId: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  await deleteNotificationPreset(presetId, session.user.id);
  return { success: true };
}

export async function activatePresetForExamsAction(presetId: string) {
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

  return { success: true };
}

export async function activatePresetForAssignmentsAction(presetId: string) {
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

  return { success: true };
}

export async function applyPresetToAllCurrentExamsAction(presetId: string) {
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

  const result = await applyPresetToAllExams(session.user.id, presetId);
  return { applied: result.applied };
}

export async function applyPresetToAllCurrentAssignmentsAction(
  presetId: string,
) {
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

  const result = await applyPresetToAllAssignments(session.user.id, presetId);
  return { applied: result.applied };
}

export async function getPresetsAction() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { presets: [] };
  }

  const presetsWithTimes = await getPresetsWithTimes(session.user.id);
  return { presets: presetsWithTimes };
}

export async function addNotificationTimeAction(
  presetId: string,
  daysBefore: number,
  time: string,
  clientId?: string,
) {
  if (!Number.isInteger(daysBefore) || daysBefore < 0 || daysBefore > 14) {
    return { error: "Notification times must be between 0 and 14 days in advance" };
  }

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

  if (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { error: "Invalid notification time" };
  if (clientId && !/^[0-9a-f-]{36}$/i.test(clientId)) return { error: "Invalid time ID" };
  if (clientId) {
    const existing = (await getNotificationTimes(presetId)).find(t => t.id === clientId);
    if (existing) return { notificationTime: existing };
  }

  const role = session.user.role as UserRole;
  const limits = getLimits(role);
  const currentCount = await countPresetNotificationTimes(presetId);

  if (currentCount >= limits.timesPerPreset) {
    return {
      error: `Maximum ${limits.timesPerPreset} notification time(s) per preset for your plan`,
    };
  }

  const notificationTime = await createNotificationTime(
    presetId,
    daysBefore,
    time,
    clientId,
  );
  if (!notificationTime) return { error: "Notification time ID already exists" };
  return { notificationTime };
}

export async function removeNotificationTimeAction(timeId: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  await deleteNotificationTime(timeId, session.user.id);

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

  if (!subscription || typeof subscription.endpoint !== "string" ||
      typeof subscription.keys?.p256dh !== "string" || typeof subscription.keys?.auth !== "string") {
    return { error: "Invalid push subscription" };
  }
  try {
    const endpoint = new URL(subscription.endpoint);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
        subscription.endpoint.length > 4096 ||
        !/^[A-Za-z0-9_-]{87}=?$/.test(subscription.keys.p256dh) ||
        !/^[A-Za-z0-9_-]{22}={0,2}$/.test(subscription.keys.auth)) {
      return { error: "Invalid push subscription" };
    }
  } catch {
    return { error: "Invalid push subscription" };
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

export async function getPushSubscriptionStatusAction(endpoint: string) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { isSubscribed: false };
  }

  const subscriptions = await getPushSubscriptions(session.user.id);
  return { isSubscribed: subscriptions.some((sub) => sub.endpoint === endpoint) };
}

export async function applyPresetToExamAction(
  examId: number,
  presetId: string,
) {
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

  await deleteNotificationPreferenceForExam(session.user.id, examId);
  return { success: true };
}

export async function disableNotificationsForExamAction(examId: number) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  await disableNotificationsForExam(session.user.id, examId);
  return { success: true };
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

  const prefs = await getNotificationPreferencesForExams(
    session.user.id,
    examIds,
  );

  const presetIds = [...new Set(prefs.map((p) => p.presetId).filter((id): id is string => id !== null))];
  const presetDetails = await Promise.all(
    presetIds.map(async (id) => {
      const preset = await getNotificationPresetById(id, session.user.id);
      return preset ? { ...preset } : null;
    }),
  );

  const presetMap = new Map(
    presetDetails
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((p) => [p.id, p]),
  );

  const examPresets = prefs.map((p) => ({
    examId: p.examId,
    preset: p.presetId ? presetMap.get(p.presetId) ?? null : null,
    disabled: p.disabled,
  }));

  return { examPresets };
}

export async function applyPresetToAssignmentAction(
  assignmentId: number,
  presetId: string,
) {
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

  const success = await applyPresetToAssignment(
    session.user.id,
    assignmentId,
    presetId,
  );
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

  await deleteNotificationPreferenceForAssignment(
    session.user.id,
    assignmentId,
  );
  return { success: true };
}

export async function disableNotificationsForAssignmentAction(assignmentId: number) {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  await disableNotificationsForAssignment(session.user.id, assignmentId);
  return { success: true };
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

  const prefs = await getNotificationPreferencesForAssignments(
    session.user.id,
    assignmentIds,
  );

  const presetIds = [...new Set(prefs.map((p) => p.presetId).filter((id): id is string => id !== null))];
  const presetDetails = await Promise.all(
    presetIds.map(async (id) => {
      const preset = await getNotificationPresetById(id, session.user.id);
      if (!preset) return null;
      const times = await getNotificationTimes(id);
      return { ...preset, times };
    }),
  );

  const presetMap = new Map(
    presetDetails
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((p) => [p.id, p]),
  );

  const assignmentPresets = prefs.map((p) => ({
    assignmentId: p.assignmentId,
    preset: p.presetId ? presetMap.get(p.presetId) ?? null : null,
    disabled: p.disabled,
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
