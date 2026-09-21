"use client";

import * as React from "react";
import Link from "next/link";
import { ClassSelectionCard } from "@/components/class-selection-card";
import { usePageTitle } from "@/app/app/layout";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent } from "@/components/ui/card";
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
import { Calendar, BookOpen, Bell, BellOff } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { ProAdCard } from "@/components/pro-ad-card";
import {
  applyPresetToExamAction,
  applyPresetToAssignmentAction,
  getPresetsAction,
  getExamPresetsAction,
  getAssignmentPresetsAction,
  disableNotificationsForExamAction,
  disableNotificationsForAssignmentAction,
} from "@/lib/actions/notifications";

type Exam = {
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

type ExamPreset = {
  examId: number;
  preset: Preset | null;
  disabled: boolean;
};

type AssignmentPreset = {
  assignmentId: number;
  preset: Preset | null;
  disabled: boolean;
};

function getDaysText(
  dueDate: Date | null,
): { text: string; isPast: boolean; isUrgent: boolean } | null {
  if (!dueDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
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
}

function ExamCard({
  exam,
  preset,
  presets,
  disabled,
  onPresetChange,
}: {
  exam: Exam;
  preset: Preset | null;
  presets: Preset[];
  disabled: boolean;
  onPresetChange: () => void;
}) {
  const daysInfo = getDaysText(exam.dueDate);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSelectPreset = async (value: string) => {
    setIsLoading(true);
    if (value === "disabled") {
      await disableNotificationsForExamAction(exam.id);
    } else {
      await applyPresetToExamAction(exam.id, value);
    }
    setIsLoading(false);
    onPresetChange();
  };

  const activePreset = presets.find((p) => p.isActiveForExams);

  return (
    <SchoolEventCard
      event={exam}
      fallbackTitle="Untitled Exam"
      daysInfo={daysInfo}
      compactDescription
      action={
        !daysInfo?.isPast ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isLoading}
                aria-label={`Notification settings for ${exam.title || "untitled exam"}`}
                className={`size-11 shrink-0 rounded-xl border border-border/70 ${disabled ? "text-muted-foreground" : ""}`}
              >
                {isLoading ? (
                  <Spinner />
                ) : disabled ? (
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
                        {p.isActiveForExams && (
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
                </>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/app/notifications">Create Preset</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null
      }
    />
  );
}

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
  const daysInfo = getDaysText(assignment.dueDate);
  const [isLoading, setIsLoading] = React.useState(false);

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
      compactDescription
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
                {isLoading ? (
                  <Spinner />
                ) : disabled ? (
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
                </>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/app/notifications">Create Preset</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null
      }
    />
  );
}

export function HomeClient({
  classes,
  exams,
  assignments,
  hasClass,
  isLoggedIn,
  presets: initialPresets,
  examPresets: initialExamPresets,
  assignmentPresets: initialAssignmentPresets,
}: {
  classes: { name: string }[];
  exams: Exam[];
  assignments: Assignment[];
  hasClass: boolean;
  isLoggedIn: boolean;
  presets: Preset[];
  examPresets: ExamPreset[];
  assignmentPresets: AssignmentPreset[];
}) {
  usePageTitle("Home");

  const { data: session } = authClient.useSession();
  const [hasAssignmentsPermission, setHasAssignmentsPermission] =
    React.useState<boolean | null>(null);
  const [presets, setPresets] = React.useState<Preset[]>(initialPresets);
  const [examPresets, setExamPresets] =
    React.useState<ExamPreset[]>(initialExamPresets);
  const [assignmentPresets, setAssignmentPresets] = React.useState<
    AssignmentPreset[]
  >(initialAssignmentPresets);

  React.useEffect(() => {
    async function checkPermission() {
      if (session) {
        const result = await authClient.admin.hasPermission({
          permission: { assignments: ["access"] },
        });
        setHasAssignmentsPermission(result.data?.success ?? false);
      } else {
        setHasAssignmentsPermission(false);
      }
    }
    checkPermission();
  }, [session]);

  const refreshData = async () => {
    const [presetsResult, examPresetsResult, assignmentPresetsResult] =
      await Promise.all([
        getPresetsAction(),
        getExamPresetsAction(exams.map((e) => e.id)),
        getAssignmentPresetsAction(assignments.map((a) => a.id)),
      ]);
    setPresets(presetsResult.presets as Preset[]);
    setExamPresets(examPresetsResult.examPresets as ExamPreset[]);
    setAssignmentPresets(
      assignmentPresetsResult.assignmentPresets as AssignmentPreset[],
    );
  };

  const getPresetForExam = (
    examId: number,
  ): { preset: Preset | null; disabled: boolean } => {
    const meta = examPresets.find((ep) => ep.examId === examId);
    return { preset: meta?.preset ?? null, disabled: meta?.disabled ?? false };
  };

  const getPresetForAssignment = (
    assignmentId: number,
  ): { preset: Preset | null; disabled: boolean } => {
    const meta = assignmentPresets.find(
      (ap) => ap.assignmentId === assignmentId,
    );
    return { preset: meta?.preset ?? null, disabled: meta?.disabled ?? false };
  };

  if (!isLoggedIn) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">
          Please log in to view your dashboard.
        </p>
      </div>
    );
  }

  if (!hasClass) {
    return (
      <div className="flex flex-1 items-center justify-center -mt-16">
        <ClassSelectionCard classes={classes} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 w-full max-w-4xl mx-auto">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="size-5" />
          Upcoming Exams
        </h2>
        {exams.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground text-sm">
                No exams scheduled in the next 14 days.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => {
              const { preset, disabled } = getPresetForExam(exam.id);
              return (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  preset={preset}
                  presets={presets}
                  disabled={disabled}
                  onPresetChange={refreshData}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="size-5" />
          Upcoming Assignments
        </h2>
        {hasAssignmentsPermission === null ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground text-sm">Loading...</p>
            </CardContent>
          </Card>
        ) : !hasAssignmentsPermission ? (
          <ProAdCard />
        ) : assignments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground text-sm">
                No assignments due in the next 14 days.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const { preset, disabled } = getPresetForAssignment(
                assignment.id,
              );
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
          </div>
        )}
      </div>
    </div>
  );
}
