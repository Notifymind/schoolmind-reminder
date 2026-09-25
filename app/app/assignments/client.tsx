"use client";

import { ClassSelectionCard } from "@/components/class-selection-card";

import * as React from "react";
import { toast } from "sonner";
import { useOfflineState, getOfflineState } from "@/lib/offline/store";
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
import { getDaysInfo, schoolEventPage } from "@/lib/user-settings";
import { SchoolEventCard } from "@/components/school-event-card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import {
  applyPresetToAssignmentAction,
  getPresetsAction,
  getAssignmentPresetsAction,
  disableNotificationsForAssignmentAction,
} from "@/lib/offline/notifications";

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

  const daysInfo = getDaysInfo(assignment.dueDate);

  const handleSelectPreset = async (value: string) => {
    setIsLoading(true);
    try {
      const result = value === "disabled"
        ? await disableNotificationsForAssignmentAction(assignment.id)
        : await applyPresetToAssignmentAction(assignment.id, value);
      if ("error" in result) toast.error(result.error);
      else onPresetChange();
    } finally {
      setIsLoading(false);
    }
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
              {presets.length > 0 ? (
                <>
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
                </>
              ) : null}
              <DropdownMenuItem
                onClick={() => getOfflineState().offline ? window.location.assign("/app/notifications") : router.push("/app/notifications")}
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
  assignments: initialItems,
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

  const [loadedPresets, setPresets] = React.useState<Preset[]>(initialPresets);
  const [loadedAssignmentPresets, setAssignmentPresets] = React.useState<
    AssignmentPreset[]
  >(initialAssignmentPresets);

  const offline = useOfflineState();
  const all = pathname.endsWith("/all") || title.startsWith("All ");
  const view = offline.snapshot ? schoolEventPage(offline.snapshot.assignments, offline.snapshot.settings?.hiddenSubjects ?? [], all, currentPage) : null;
  const assignments = view?.items ?? initialItems;
  const presets = offline.snapshot?.presets ?? loadedPresets;
  const assignmentPresets = offline.snapshot ? offline.snapshot.assignmentPreferences.map(p => ({ assignmentId: p.itemId, disabled: p.disabled, preset: presets.find(preset => preset.id === p.presetId) ?? null })) : loadedAssignmentPresets;

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
    if (getOfflineState().offline || pathname === "/offline") {
      window.location.assign(`${window.location.pathname}?${params.toString()}`);
    } else router.push(`${pathname}?${params.toString()}`);
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
          <p className="text-muted-foreground">No visible assignments. Check Settings to show hidden subjects.</p>
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
        currentPage={view?.currentPage ?? currentPage}
        totalPages={view?.totalPages ?? totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
