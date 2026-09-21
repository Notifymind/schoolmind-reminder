"use client";

import { ClassSelectionCard } from "@/components/class-selection-card";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { usePageTitle } from "@/app/app/layout";
import { ProAdCard } from "@/components/pro-ad-card";
import { Pagination } from "@/components/ui/pagination";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SchoolEventCard } from "@/components/school-event-card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import {
  applyPresetToAssignmentAction,
  getPresetsAction,
  getAssignmentPresetsAction,
  disableNotificationsForAssignmentAction,
} from "@/lib/actions/notifications";

type Assignment = {
  id: number;
  className: string;
  subject: string | null;
  title: string | null;
  date: string | null;
  time: string | null;
  type: string | null;
  description: string | null;
  dueDate: Date | null;
  createdAt: Date | null;
};

type NotificationTime = {
  id: string;
  presetId: string;
  daysBefore: number;
  time: string;
  createdAt: Date;
};

type Preset = {
  id: string;
  userId: string;
  name: string;
  isActiveForExams: boolean;
  isActiveForAssignments: boolean;
  activatedForExamsAt: Date | null;
  activatedForAssignmentsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  times: NotificationTime[];
};

type AssignmentPreset = {
  assignmentId: number;
  preset: Preset | null;
  disabled: boolean;
};

function AssignmentCard({
  assignment,
  preset,
  presets,
  disabled,
  onPresetChange,
}: {
  assignment: Assignment;
  preset: Preset | null;
  presets: Preset[];
  disabled: boolean;
  onPresetChange: () => void;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const getDaysText = (): {
    text: string;
    isPast: boolean;
    isUrgent: boolean;
  } | null => {
    if (!assignment.dueDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(assignment.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0)
      return {
        text: `${Math.abs(diffDays)} days ago`,
        isPast: true,
        isUrgent: false,
      };
    if (diffDays === 0) return { text: "Today", isPast: false, isUrgent: true };
    if (diffDays === 1)
      return { text: "Tomorrow", isPast: false, isUrgent: true };
    if (diffDays <= 7)
      return { text: `In ${diffDays} days`, isPast: false, isUrgent: true };
    return { text: `In ${diffDays} days`, isPast: false, isUrgent: false };
  };

  const daysInfo = getDaysText();

  const handleSelectPreset = async (value: string) => {
    setIsLoading(true);
    if (value === "disabled") {
      await disableNotificationsForAssignmentAction(assignment.id);
    } else {
      await applyPresetToAssignmentAction(assignment.id, value);
    }
    setIsLoading(false);
    onPresetChange();
  };

  const activePreset = presets.find((p) => p.isActiveForAssignments);

  return (
    <SchoolEventCard
      event={assignment}
      fallbackTitle="Untitled Assignment"
      daysInfo={daysInfo}

      action={
        !daysInfo?.isPast ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isLoading}
                aria-label={`Notification settings for ${assignment.title || "untitled assignment"}`}
                className={`size-11 shrink-0 rounded-xl border border-border/70 ${disabled ? "text-muted-foreground" : ""}`}
              >
                {disabled ? (
                  <BellOff className="size-4" />
                ) : (
                  <Bell className="size-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Notification Preset</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={
                  disabled
                    ? "disabled"
                    : preset
                      ? String(preset.id)
                      : activePreset
                        ? String(activePreset.id)
                        : ""
                }
                onValueChange={handleSelectPreset}
              >
                {presets.map((p) => (
                  <DropdownMenuRadioItem key={p.id} value={String(p.id)}>
                    {p.name}
                    {p.isActiveForAssignments && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (default)
                      </span>
                    )}
                  </DropdownMenuRadioItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value="disabled">
                  Disable Notifications
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/app/notifications")}
              >
                Create Preset
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null
      }
    />
  );
}

export function AssignmentsClient({
  classes,
  assignments,
  hasClass,
  hasPermission,
  isLoggedIn,
  userRole,
  presets: initialPresets,
  assignmentPresets: initialAssignmentPresets,
  title = "Assignments",
  currentPage = 1,
  totalPages = 1,
}: {
  classes: { name: string }[];
  assignments: Assignment[];
  hasClass: boolean;
  hasPermission: boolean;
  isLoggedIn: boolean;
  userRole?: string;
  presets: Preset[];
  assignmentPresets: AssignmentPreset[];
  title?: string;
  currentPage?: number;
  totalPages?: number;
}) {
  usePageTitle(title);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [presets, setPresets] = React.useState<Preset[]>(initialPresets);
  const [assignmentPresets, setAssignmentPresets] = React.useState<
    AssignmentPreset[]
  >(initialAssignmentPresets);

  const refreshData = async () => {
    const [presetsResult, assignmentPresetsResult] = await Promise.all([
      getPresetsAction(),
      getAssignmentPresetsAction(assignments.map((a) => a.id)),
    ]);
    setPresets(presetsResult.presets as Preset[]);
    setAssignmentPresets(
      assignmentPresetsResult.assignmentPresets as AssignmentPreset[],
    );
  };

  const getPresetForAssignment = (
    assignmentId: number,
  ): { preset: Preset | null; disabled: boolean } => {
    const meta = assignmentPresets.find(
      (ap) => ap.assignmentId === assignmentId,
    );
    return { preset: meta?.preset ?? null, disabled: meta?.disabled ?? false };
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (isLoggedIn && !hasClass) {
    return (
      <div className="flex flex-1 items-center justify-center -mt-16">
        <ClassSelectionCard classes={classes} />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex flex-1 items-center justify-center -mt-16">
        <ProAdCard />
      </div>
    );
  }

  return (
    <div className="grid gap-4 w-full max-w-2xl mx-auto">
      {!isLoggedIn && (
        <p className="text-muted-foreground">
          Please log in to view assignments.
        </p>
      )}
      {isLoggedIn && hasClass && assignments.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No assignments scheduled yet.</p>
        </div>
      )}
      {assignments.map((assignment) => {
        const { preset, disabled } = getPresetForAssignment(assignment.id);
        return (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            preset={preset}
            presets={presets}
            disabled={disabled}
            onPresetChange={refreshData}
          />
        );
      })}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
