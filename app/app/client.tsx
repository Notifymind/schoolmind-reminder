"use client";

import * as React from "react";
import Link from "next/link";
import { usePageTitle } from "@/app/app/layout";
import { authClient } from "@/lib/auth-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  CalendarClock,
  BookOpen,
  Bell,
  Users,
} from "lucide-react";
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

function getDaysText(dueDate: Date | null): { text: string; isPast: boolean; isUrgent: boolean } | null {
  if (!dueDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return { text: `${Math.abs(diffDays)} days ago`, isPast: true, isUrgent: false };
  if (diffDays === 0) return { text: "Today", isPast: false, isUrgent: true };
  if (diffDays === 1) return { text: "Tomorrow", isPast: false, isUrgent: true };
  if (diffDays <= 7) return { text: `In ${diffDays} days`, isPast: false, isUrgent: true };
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
    <Card className="gap-1">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              {exam.title || "Untitled Exam"}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-muted-foreground text-xs">
              <span className="flex items-center gap-1">
                <BookOpen className="size-3" />
                {exam.subject || "No subject"}
              </span>
              {exam.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  {exam.date}
                </span>
              )}
              {exam.time && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {exam.time}
                </span>
              )}
              {daysInfo && (
                <span className={`flex items-center gap-1 ${daysInfo.isUrgent ? "text-orange-500" : ""}`}>
                  <CalendarClock className="size-3" />
                  {daysInfo.text}
                </span>
              )}
              {exam.type && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {exam.type}
                </span>
              )}
            </div>
          </div>
          {!daysInfo?.isPast && (
            <CardAction>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={isLoading} className={disabled ? "text-muted-foreground" : ""}>
                    {isLoading ? <Spinner /> : <Bell className="size-4" />}
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
                </DropdownMenuContent>
              </DropdownMenu>
            </CardAction>
          )}
        </div>
      </CardHeader>
      {exam.description && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {exam.description}
          </p>
        </CardContent>
      )}
    </Card>
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
    <Card className="gap-1">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              {assignment.title || "Untitled Assignment"}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-muted-foreground text-xs">
              <span className="flex items-center gap-1">
                <BookOpen className="size-3" />
                {assignment.subject || "No subject"}
              </span>
              {assignment.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  {assignment.date}
                </span>
              )}
              {assignment.time && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {assignment.time}
                </span>
              )}
              {daysInfo && (
                <span className={`flex items-center gap-1 ${daysInfo.isUrgent ? "text-orange-500" : ""}`}>
                  <CalendarClock className="size-3" />
                  {daysInfo.text}
                </span>
              )}
              {assignment.type && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {assignment.type}
                </span>
              )}
            </div>
          </div>
          {!daysInfo?.isPast && (
            <CardAction>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={isLoading} className={disabled ? "text-muted-foreground" : ""}>
                    {isLoading ? <Spinner /> : <Bell className="size-4" />}
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
                </DropdownMenuContent>
              </DropdownMenu>
            </CardAction>
          )}
        </div>
      </CardHeader>
      {assignment.description && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {assignment.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

export function HomeClient({
  exams,
  assignments,
  hasClass,
  isLoggedIn,
  presets: initialPresets,
  examPresets: initialExamPresets,
  assignmentPresets: initialAssignmentPresets,
}: {
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

  const getPresetForExam = (examId: number): { preset: Preset | null; disabled: boolean } => {
    const meta = examPresets.find((ep) => ep.examId === examId);
    return { preset: meta?.preset ?? null, disabled: meta?.disabled ?? false };
  };

  const getPresetForAssignment = (assignmentId: number): { preset: Preset | null; disabled: boolean } => {
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
        <div className="bg-card rounded-xl border p-8 max-w-md text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
            <Users className="text-primary size-8" />
          </div>
          <h2 className="text-xl font-semibold">No Class Assigned</h2>
          <p className="text-muted-foreground mt-2">
            You haven&apos;t been assigned to a class yet. Redeem a class assignment code from your seller to get started.
          </p>
          <Button asChild className="mt-6">
            <Link href="/app/subscription">Redeem Code</Link>
          </Button>
        </div>
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
          </div>
        )}
      </div>
    </div>
  );
}
