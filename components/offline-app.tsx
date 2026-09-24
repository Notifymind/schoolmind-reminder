"use client";

import { useState, useSyncExternalStore } from "react";
import AppLayout from "@/app/app/layout";
import { HomeClient } from "@/app/app/client";
import { ExamsClient } from "@/app/app/exams/client";
import { AssignmentsClient } from "@/app/app/assignments/client";
import NotificationsPage from "@/app/app/notifications/page";
import NavigationPage from "@/app/app/navigation/page";
import ThemingPage from "@/app/app/theming/page";
import SettingsPage from "@/app/app/settings/page";
import { useOfflineState } from "@/lib/offline/store";

const subscribe = () => () => {};
export function OfflineApp() {
  const state = useOfflineState();
  const [now] = useState(() => Date.now());
  const location = useSyncExternalStore(
    subscribe,
    () => window.location.pathname + window.location.search,
    () => "/app",
  );
  if (!state.ready) return <p className="p-6">Loading saved data…</p>;
  const data = state.snapshot;
  if (!data)
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">No offline data yet</h1>
        <p>Connect and sign in once to download your school data.</p>
        <a href="/app" className="underline">
          Try again
        </a>
      </div>
    );
  const url = new URL(location, "https://offline.local");
  const path = url.pathname;
  const all = path.endsWith("/all");
  const page = Math.max(
    1,
    Number.parseInt(url.searchParams.get("page") || "1", 10) || 1,
  );
  const upcoming = <T extends { dueDate: Date | null }>(items: T[]) =>
    items
      .filter(
        (item) =>
          item.dueDate &&
          new Date(item.dueDate).getTime() >= now &&
          new Date(item.dueDate).getTime() <= now + 14 * 86400000,
      )
      .sort(
        (a, b) =>
          new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
      );
  const exams = all ? data.exams : upcoming(data.exams);
  const assignments = all ? data.assignments : upcoming(data.assignments);
  const examPresets = data.examPreferences.map((p) => ({
    examId: p.itemId,
    disabled: p.disabled,
    preset: data.presets.find((preset) => preset.id === p.presetId) ?? null,
  }));
  const assignmentPresets = data.assignmentPreferences.map((p) => ({
    assignmentId: p.itemId,
    disabled: p.disabled,
    preset: data.presets.find((preset) => preset.id === p.presetId) ?? null,
  }));
  const shared = {
    classes: [],
    hasClass: !!data.className,
    isLoggedIn: true,
    presets: data.presets,
  };
  let content;
  if (path === "/app/notifications") content = <NotificationsPage />;
  else if (path === "/app/navigation") content = <NavigationPage />;
  else if (path === "/app/theming") content = <ThemingPage />;
  else if (path === "/app/settings") content = <SettingsPage />;
  else if (!data.className)
    content = <p>Connect to select your class and download its data.</p>;
  else if (path === "/app/exams" || path === "/app/exams/all")
    content = (
      <ExamsClient
        {...shared}
        exams={all ? exams.slice((page - 1) * 10, page * 10) : exams}
        hasPermission
        examPresets={examPresets}
        title={all ? "All Exams" : "Upcoming Exams"}
        currentPage={page}
        totalPages={all ? Math.ceil(exams.length / 10) : 1}
      />
    );
  else if (path === "/app/assignments" || path === "/app/assignments/all")
    content = (
      <AssignmentsClient
        {...shared}
        assignments={
          all ? assignments.slice((page - 1) * 10, page * 10) : assignments
        }
        hasPermission={data.hasAssignmentsPermission}
        userRole={data.user.role ?? undefined}
        assignmentPresets={assignmentPresets}
        title={all ? "All Assignments" : "Upcoming Assignments"}
        currentPage={page}
        totalPages={all ? Math.ceil(assignments.length / 10) : 1}
      />
    );
  else if (path === "/app" || path === "/offline")
    content = (
      <HomeClient
        {...shared}
        exams={upcoming(data.exams)}
        assignments={upcoming(data.assignments)}
        examPresets={examPresets}
        assignmentPresets={assignmentPresets}
      />
    );
  else
    content = (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">This page needs a connection</h1>
        <p>
          Your dashboard, exams, assignments, and notification settings are
          available offline.
        </p>
        <a href="/app" className="underline">
          Go to dashboard
        </a>
      </div>
    );
  return <AppLayout>{content}</AppLayout>;
}
