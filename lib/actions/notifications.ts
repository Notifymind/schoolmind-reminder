"use server";

import { auth } from "@/lib/auth";
import {
  createNotificationPreset,
  updateNotificationPreset,
  deleteNotificationPreset,
  setActivePreset,
  getNotificationPresets,
  getNotificationTimes,
  createNotificationTime,
  deleteNotificationTime,
  countUserPresets,
  countPresetNotificationTimes,
  applyPresetToNewExams,
  getNotificationPresetById,
  getPushSubscriptions,
  createPushSubscription,
  deletePushSubscription,
} from "@/db";

const PRESET_LIMITS = {
  free: { presets: 1, timesPerPreset: 2 },
  pro: { presets: 3, timesPerPreset: 5 },
} as const;

type UserRole = "free" | "pro";

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

export async function getPresetsAction() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user?.id) {
    return { presets: [] };
  }

  const presets = await getNotificationPresets(session.user.id);

  const presetsWithTimes = await Promise.all(
    presets.map(async (preset) => {
      const times = await getNotificationTimes(preset.id);
      return { ...preset, times };
    }),
  );

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
