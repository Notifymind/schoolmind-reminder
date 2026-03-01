"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { usePageTitle } from "@/app/app/layout";
import { SubscriptionPrompt } from "@/components/subscription-prompt";
import { Pagination } from "@/components/ui/pagination";
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
import { Calendar, Clock, CalendarClock, BookOpen, Bell } from "lucide-react";
import {
  applyPresetToAssignmentAction,
  getPresetsAction,
  getAssignmentPresetsAction,
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
  id: number;
  presetId: number;
  daysBefore: number;
  time: string;
  createdAt: Date;
};

type Preset = {
  id: number;
  userId: string;
  name: string;
  isActive: boolean;
  isActiveForExams: boolean;
  isActiveForAssignments: boolean;
  isOneTime: boolean;
  createdAt: Date;
  updatedAt: Date;
  times: NotificationTime[];
};

type AssignmentPreset = {
  assignmentId: number;
  preset: Preset | null;
};

function AssignmentCard({
  assignment,
  preset,
  presets,
  onPresetChange,
}: {
  assignment: Assignment;
  preset: Preset | null;
  presets: Preset[];
  onPresetChange: () => void;
}) {
  const [isLoading, setIsLoading] = React.useState(false);

  const getDaysText = () => {
    if (!assignment.dueDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(assignment.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays > 1) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  };

  const daysText = getDaysText();

  const handleSelectPreset = async (value: string) => {
    setIsLoading(true);
    const presetId = parseInt(value, 10);
    await applyPresetToAssignmentAction(assignment.id, presetId);
    setIsLoading(false);
    onPresetChange();
  };

  const activePreset = presets.find((p) => p.isActiveForAssignments);

  return (
    <Card className="gap-1">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
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
              {daysText && (
                <span className="flex items-center gap-1">
                  <CalendarClock className="size-3" />
                  {daysText}
                </span>
              )}
              {assignment.type && (
                <span className="text-xs bg-primary/10 text-primary px-2 rounded-full">
                  {assignment.type}
                </span>
              )}
            </div>
          </div>
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isLoading}>
                  <Bell className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Notification Preset</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={
                    preset
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
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </div>
      </CardHeader>
      {assignment.description && (
        <CardContent>
          <p className="text-sm text-muted-foreground">{assignment.description}</p>
        </CardContent>
      )}
    </Card>
  );
}

export function AssignmentsClient({
  assignments,
  hasClass,
  hasPermission,
  isLoggedIn,
  presets: initialPresets,
  assignmentPresets: initialAssignmentPresets,
  title = "Assignments",
  currentPage = 1,
  totalPages = 1,
}: {
  assignments: Assignment[];
  hasClass: boolean;
  hasPermission: boolean;
  isLoggedIn: boolean;
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
  const [assignmentPresets, setAssignmentPresets] =
    React.useState<AssignmentPreset[]>(initialAssignmentPresets);

  const refreshData = async () => {
    const [presetsResult, assignmentPresetsResult] = await Promise.all([
      getPresetsAction(),
      getAssignmentPresetsAction(assignments.map((a) => a.id)),
    ]);
    setPresets(presetsResult.presets as Preset[]);
    setAssignmentPresets(assignmentPresetsResult.assignmentPresets as AssignmentPreset[]);
  };

  const getPresetForAssignment = (assignmentId: number): Preset | null => {
    const meta = assignmentPresets.find((ap) => ap.assignmentId === assignmentId);
    return meta?.preset ?? null;
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (!hasPermission) {
    return <SubscriptionPrompt />;
  }

  return (
    <div className="grid gap-4 w-full max-w-2xl mx-auto">
      {!isLoggedIn && (
        <p className="text-muted-foreground">Please log in to view assignments.</p>
      )}
      {isLoggedIn && !hasClass && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            You haven&apos;t joined a class yet.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Join a class to see your assignments.
          </p>
        </div>
      )}
      {isLoggedIn && hasClass && assignments.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No assignments scheduled yet.</p>
        </div>
      )}
      {assignments.map((assignment) => (
        <AssignmentCard
          key={assignment.id}
          assignment={assignment}
          preset={getPresetForAssignment(assignment.id)}
          presets={presets}
          onPresetChange={refreshData}
        />
      ))}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
