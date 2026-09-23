"use server";

import { getUserSettings, saveSubjectAliases, saveCountdownColors } from "@/db/user-settings";
import { validSubjectAliases, validCountdownColors } from "@/lib/user-settings";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getUserClass,
  getExamsByClass,
  getAssignmentsByClass,
  getPresetsWithTimes,
  getNotificationPreferencesForExams,
  getNotificationPreferencesForAssignments,
} from "@/db";
import * as actions from "@/lib/actions/notifications";
import type { Change } from "@/lib/offline/model";

export async function getOfflineSnapshotAction() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: "Not authenticated" as const };
  const [className, permission, presetResult, limitResult, notifications, settings] =
    await Promise.all([
      getUserClass(session.user.id),
      auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permission: { assignments: ["access"] },
        },
      }),
      getPresetsWithTimes(session.user.id),
      actions.getLimitsAction(),
      actions.getUserNotificationsAction(),
      getUserSettings(session.user.id),
    ]);
  const [exams, assignments] = await Promise.all([
    className ? getExamsByClass(className) : [],
    className && permission.success ? getAssignmentsByClass(className) : [],
  ]);
  const [examPrefs, assignmentPrefs] = await Promise.all([
    exams.length
      ? getNotificationPreferencesForExams(
          session.user.id,
          exams.map((e) => e.id),
        )
      : [],
    assignments.length
      ? getNotificationPreferencesForAssignments(
          session.user.id,
          assignments.map((a) => a.id),
        )
      : [],
  ]);
  // No session token, credentials, or push subscription keys are persisted offline.
  return {
    snapshot: {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role,
        class: className,
      },
      savedAt: new Date(),
      settings,
      className,
      hasAssignmentsPermission: permission.success,
      exams,
      assignments,
      presets: presetResult,
      limits: limitResult.limits,
      notifications: notifications.notifications,
      examPreferences: examPrefs.map((p) => ({
        itemId: p.examId!,
        presetId: p.presetId,
        disabled: p.disabled,
      })),
      assignmentPreferences: assignmentPrefs.map((p) => ({
        itemId: p.assignmentId!,
        presetId: p.presetId,
        disabled: p.disabled,
      })),
    },
  };
}

export async function syncNotificationChangeAction(
  userId: string,
  change: Change,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.id !== userId)
    return { error: "Sign in to the original account to sync these changes" };
  if (!change || typeof change !== "object") return { error: "Invalid change" };
  if (
    "target" in change &&
    change.target !== "exams" &&
    change.target !== "assignments"
  )
    return { error: "Invalid target" };
  if ("target" in change && change.target === "assignments") {
    const permission = await auth.api.userHasPermission({
      body: { userId, permission: { assignments: ["access"] } },
    });
    if (!permission.success)
      return { error: "Your plan does not include assignments" };
  }
  if (
    (change.kind === "default" ||
      change.kind === "apply" ||
      change.kind === "applyAll") &&
    change.target !== "exams" &&
    change.target !== "assignments"
  )
    return { error: "Invalid target" };
  if (
    (change.kind === "createPreset" || change.kind === "addTime") &&
    (typeof change.id !== "string" || !/^[0-9a-f-]{36}$/i.test(change.id))
  ) {
    return { error: "Invalid change ID" };
  }
  if (
    (change.kind === "createPreset" || change.kind === "renamePreset") &&
    (typeof change.name !== "string" ||
      !change.name.trim() ||
      change.name.length > 200)
  ) {
    return { error: "Enter a preset name of at most 200 characters" };
  }
  if (
    change.kind === "apply" &&
    (!Number.isSafeInteger(change.itemId) || change.itemId <= 0)
  ) {
    return { error: "Invalid item" };
  }

  switch (change.kind) {
    case "subjectAliases":
      if (!validSubjectAliases(change.value)) return { error: "Invalid subject aliases" };
      await saveSubjectAliases(session.user.id, change.value);
      return { success: true };
    case "countdownColors":
      if (!validCountdownColors(change.value)) return { error: "Invalid countdown colors" };
      await saveCountdownColors(session.user.id, change.value);
      return { success: true };
    case "createPreset":
      return actions.createPresetAction(change.name, change.id);
    case "renamePreset":
      return actions.updatePresetAction(change.presetId, change.name);
    case "deletePreset":
      return actions.deletePresetAction(change.presetId);
    case "addTime":
      return actions.addNotificationTimeAction(
        change.presetId,
        change.daysBefore,
        change.time,
        change.id,
      );
    case "removeTime":
      return actions.removeNotificationTimeAction(change.id);
    case "default":
      return change.target === "exams"
        ? actions.activatePresetForExamsAction(change.presetId)
        : actions.activatePresetForAssignmentsAction(change.presetId);
    case "applyAll":
      return change.target === "exams"
        ? actions.applyPresetToAllCurrentExamsAction(change.presetId)
        : actions.applyPresetToAllCurrentAssignmentsAction(change.presetId);
    case "apply":
      return change.target === "exams"
        ? change.presetId === null
          ? actions.disableNotificationsForExamAction(change.itemId)
          : actions.applyPresetToExamAction(change.itemId, change.presetId)
        : change.presetId === null
          ? actions.disableNotificationsForAssignmentAction(change.itemId)
          : actions.applyPresetToAssignmentAction(
              change.itemId,
              change.presetId,
            );
    default:
      return { error: "Invalid change" };
  }
}
