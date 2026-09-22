"use client";

import {
  getOfflineState,
  initializeOffline,
  queueChange,
  synchronizeOffline,
} from "./store";

async function snapshot() {
  await initializeOffline();
  if (!getOfflineState().snapshot) await synchronizeOffline();
  return getOfflineState().snapshot;
}
export async function getPresetsAction() {
  return { presets: (await snapshot())?.presets ?? [] };
}
export async function getLimitsAction() {
  return {
    limits: (await snapshot())?.limits ?? { presets: 1, timesPerPreset: 2 },
  };
}
export async function getExamPresetsAction(ids: number[]) {
  const requested = new Set(ids);
  const data = await snapshot();
  return {
    examPresets:
      data?.examPreferences
        .filter((p) => requested.has(p.itemId))
        .map((p) => ({
          examId: p.itemId,
          disabled: p.disabled,
          preset:
            data.presets.find((preset) => preset.id === p.presetId) ?? null,
        })) ?? [],
  };
}
export async function getAssignmentPresetsAction(ids: number[]) {
  const requested = new Set(ids);
  const data = await snapshot();
  return {
    assignmentPresets:
      data?.assignmentPreferences
        .filter((p) => requested.has(p.itemId))
        .map((p) => ({
          assignmentId: p.itemId,
          disabled: p.disabled,
          preset:
            data.presets.find((preset) => preset.id === p.presetId) ?? null,
        })) ?? [],
  };
}
export async function createPresetAction(name: string) {
  return queueChange({ kind: "createPreset", id: crypto.randomUUID(), name });
}
export async function updatePresetAction(presetId: string, name: string) {
  return queueChange({ kind: "renamePreset", presetId, name });
}
export async function deletePresetAction(presetId: string) {
  return queueChange({ kind: "deletePreset", presetId });
}
export async function addNotificationTimeAction(
  presetId: string,
  daysBefore: number,
  time: string,
) {
  return queueChange({
    kind: "addTime",
    id: crypto.randomUUID(),
    presetId,
    daysBefore,
    time,
  });
}
export async function removeNotificationTimeAction(id: string) {
  return queueChange({ kind: "removeTime", id });
}
export async function activatePresetForExamsAction(presetId: string) {
  return queueChange({ kind: "default", target: "exams", presetId });
}
export async function activatePresetForAssignmentsAction(presetId: string) {
  return queueChange({ kind: "default", target: "assignments", presetId });
}
export async function applyPresetToExamAction(
  itemId: number,
  presetId: string,
) {
  return queueChange({ kind: "apply", target: "exams", itemId, presetId });
}
export async function applyPresetToAssignmentAction(
  itemId: number,
  presetId: string,
) {
  return queueChange({
    kind: "apply",
    target: "assignments",
    itemId,
    presetId,
  });
}
export async function disableNotificationsForExamAction(itemId: number) {
  return queueChange({
    kind: "apply",
    target: "exams",
    itemId,
    presetId: null,
  });
}
export async function disableNotificationsForAssignmentAction(itemId: number) {
  return queueChange({
    kind: "apply",
    target: "assignments",
    itemId,
    presetId: null,
  });
}
export async function applyPresetToAllCurrentExamsAction(presetId: string) {
  const result = await queueChange({
    kind: "applyAll",
    target: "exams",
    presetId,
  });
  return "error" in result
    ? result
    : {
        applied:
          getOfflineState().snapshot?.exams.filter(
            (e) => e.dueDate && new Date(e.dueDate) >= new Date(),
          ).length ?? 0,
      };
}
export async function applyPresetToAllCurrentAssignmentsAction(
  presetId: string,
) {
  const result = await queueChange({
    kind: "applyAll",
    target: "assignments",
    presetId,
  });
  return "error" in result
    ? result
    : {
        applied:
          getOfflineState().snapshot?.assignments.filter(
            (e) => e.dueDate && new Date(e.dueDate) >= new Date(),
          ).length ?? 0,
      };
}
export async function getUserNotificationsAction() {
  return { notifications: (await snapshot())?.notifications ?? [] };
}
export async function getUnreadNotificationCountAction() {
  return {
    count: (await snapshot())?.notifications.filter((n) => !n.read).length ?? 0,
  };
}
export async function markAllNotificationsReadAction() {
  if (getOfflineState().offline)
    return { error: "Notifications are unavailable while offline" };
  const { markAllNotificationsReadAction: markRead } =
    await import("@/lib/actions/notifications");
  return markRead();
}
