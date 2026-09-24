import { defaultUserSettings, validHiddenSubjects, validSubjectAliases, validCountdownColors, type SubjectAlias, type CountdownColors } from "@/lib/user-settings";
import type { getOfflineSnapshotAction } from "@/lib/actions/offline";

export type Snapshot = NonNullable<
  Awaited<ReturnType<typeof getOfflineSnapshotAction>>["snapshot"]
>;
export type Change =
  | { kind: "hiddenSubjects"; value: string[] }
  | { kind: "subjectAliases"; value: SubjectAlias[] }
  | { kind: "countdownColors"; value: CountdownColors }
  | { kind: "createPreset"; id: string; name: string }
  | { kind: "renamePreset"; presetId: string; name: string }
  | { kind: "deletePreset"; presetId: string }
  | {
      kind: "addTime";
      id: string;
      presetId: string;
      daysBefore: number;
      time: string;
    }
  | { kind: "removeTime"; id: string }
  | { kind: "default"; target: "exams" | "assignments"; presetId: string }
  | {
      kind: "apply";
      target: "exams" | "assignments";
      itemId: number;
      presetId: string | null;
    }
  | { kind: "applyAll"; target: "exams" | "assignments"; presetId: string };
export type PendingChange = { id: string; change: Change };
export type SavedState = { snapshot: Snapshot; queue: PendingChange[] };

// Apply pending intent over the last server snapshot, including after a reload.
export function applyChange(snapshot: Snapshot, change: Change): Snapshot {
  const next = structuredClone(snapshot);
  const now = new Date();
  const preset =
    "presetId" in change
      ? next.presets.find((p) => p.id === change.presetId)
      : undefined;
  switch (change.kind) {
    case "hiddenSubjects":
      next.settings = { ...(next.settings ?? defaultUserSettings), hiddenSubjects: change.value };
      break;
    case "subjectAliases":
      next.settings = { ...(next.settings ?? defaultUserSettings), subjectAliases: change.value };
      break;
    case "countdownColors":
      next.settings = { ...(next.settings ?? defaultUserSettings), countdownColors: change.value };
      break;
    case "createPreset": {
      if (next.presets.some((p) => p.id === change.id)) break;
      const first = next.presets.length === 0;
      next.presets.push({
        id: change.id,
        userId: next.user.id,
        name: change.name,
        isActiveForExams: first,
        isActiveForAssignments: first,
        activatedForExamsAt: first ? now : null,
        activatedForAssignmentsAt: first ? now : null,
        createdAt: now,
        updatedAt: now,
        times: [],
      });
      break;
    }
    case "renamePreset":
      if (preset) preset.name = change.name;
      break;
    case "deletePreset":
      next.presets = next.presets.filter((p) => p.id !== change.presetId);
      for (const pref of [
        ...next.examPreferences,
        ...next.assignmentPreferences,
      ]) {
        if (pref.presetId === change.presetId) pref.presetId = null;
      }
      break;
    case "addTime":
      if (preset?.times.some((t) => t.id === change.id)) break;
      preset?.times.push({
        id: change.id,
        presetId: change.presetId,
        daysBefore: change.daysBefore,
        time: change.time,
        createdAt: now,
      });
      break;
    case "removeTime":
      next.presets.forEach((p) => {
        p.times = p.times.filter((t) => t.id !== change.id);
      });
      break;
    case "default":
      next.presets.forEach((p) => {
        if (change.target === "exams") {
          p.isActiveForExams = p.id === change.presetId;
          p.activatedForExamsAt = p.isActiveForExams ? now : null;
        } else {
          p.isActiveForAssignments = p.id === change.presetId;
          p.activatedForAssignmentsAt = p.isActiveForAssignments ? now : null;
        }
      });
      break;
    case "apply":
    case "applyAll": {
      const items = change.target === "exams" ? next.exams : next.assignments;
      const ids =
        change.kind === "apply"
          ? [change.itemId]
          : items
              .filter((item) => item.dueDate && new Date(item.dueDate) >= now)
              .map((item) => item.id);
      const prefs =
        change.target === "exams"
          ? next.examPreferences
          : next.assignmentPreferences;
      for (const id of ids) {
        const existing = prefs.find((p) => p.itemId === id);
        const value = {
          itemId: id,
          presetId: change.presetId,
          disabled: change.presetId === null,
        };
        if (existing) Object.assign(existing, value);
        else prefs.push(value);
      }
      break;
    }
  }
  return next;
}

export function project(saved: SavedState): Snapshot {
  return saved.queue.reduce(
    (snapshot, entry) => applyChange(snapshot, entry.change),
    saved.snapshot,
  );
}

export function validateChange(
  snapshot: Snapshot,
  change: Change,
): string | undefined {
  if (change.kind === "hiddenSubjects" && !validHiddenSubjects(change.value))
    return "Choose up to 100 unique subjects to hide";
  if (change.kind === "subjectAliases" && !validSubjectAliases(change.value))
    return "Use unique subject names and aliases of up to 100 characters, with at most 100 aliases";
  if (change.kind === "countdownColors" && !validCountdownColors(change.value))
    return "Choose a color for every day range";
  if (
    (change.kind === "createPreset" || change.kind === "renamePreset") &&
    !change.name.trim()
  )
    return "Enter a preset name";
  if (
    change.kind === "createPreset" &&
    snapshot.presets.length >= snapshot.limits.presets
  )
    return "You have reached your plan's preset limit";
  if (
    "presetId" in change &&
    change.presetId !== null &&
    !snapshot.presets.some((p) => p.id === change.presetId)
  )
    return "Preset not found";
  if (change.kind === "addTime") {
    if (
      !Number.isInteger(change.daysBefore) ||
      change.daysBefore < 0 ||
      change.daysBefore > 14 ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(change.time)
    )
      return "Choose a valid time, between 0 and 14 days in advance";
    const preset = snapshot.presets.find((p) => p.id === change.presetId);
    if (!preset) return "Preset not found";
    if (preset.times.length >= snapshot.limits.timesPerPreset)
      return "You have reached your plan's notification time limit";
  }
  if (
    "target" in change &&
    change.target === "assignments" &&
    !snapshot.hasAssignmentsPermission
  )
    return "Your plan does not include assignments";
}
