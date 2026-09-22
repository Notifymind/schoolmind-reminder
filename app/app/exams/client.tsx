"use client";

import { ClassSelectionCard } from "@/components/class-selection-card";

import * as React from "react";
import { toast } from "sonner";
import { useOfflineState, getOfflineState } from "@/lib/offline/store";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { usePageTitle } from "@/app/app/layout";
import { SubscriptionPrompt } from "@/components/subscription-prompt";
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
  applyPresetToExamAction,
  getPresetsAction,
  getExamPresetsAction,
  disableNotificationsForExamAction,
} from "@/lib/offline/notifications";

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
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const getDaysInfo = () => {
    if (!exam.dueDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(exam.dueDate);
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

  const daysInfo = getDaysInfo();

  const handleSelectPreset = async (value: string) => {
    setIsLoading(true);
    try {
      const result = value === "disabled"
        ? await disableNotificationsForExamAction(exam.id)
        : await applyPresetToExamAction(exam.id, value);
      if ("error" in result) toast.error(result.error);
      else onPresetChange();
    } finally {
      setIsLoading(false);
    }
  };

  const activePreset = presets.find((p) => p.isActiveForExams);

  return (
    <SchoolEventCard
      event={exam}
      fallbackTitle="Untitled Exam"
      daysInfo={daysInfo}

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

export function ExamsClient({
  classes,
  exams,
  hasClass,
  hasPermission,
  isLoggedIn,
  presets: initialPresets,
  examPresets: initialExamPresets,
  title = "Exams",
  currentPage = 1,
  totalPages = 1,
}: {
  classes: { name: string }[];
  exams: Exam[];
  hasClass: boolean;
  hasPermission: boolean;
  isLoggedIn: boolean;
  presets: Preset[];
  examPresets: ExamPreset[];
  title?: string;
  currentPage?: number;
  totalPages?: number;
}) {
  usePageTitle(title);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loadedPresets, setPresets] = React.useState<Preset[]>(initialPresets);
  const [loadedExamPresets, setExamPresets] =
    React.useState<ExamPreset[]>(initialExamPresets);

  const offline = useOfflineState();
  const presets = offline.snapshot?.presets ?? loadedPresets;
  const examPresets = offline.snapshot ? offline.snapshot.examPreferences.map(p => ({ examId: p.itemId, disabled: p.disabled, preset: presets.find(preset => preset.id === p.presetId) ?? null })) : loadedExamPresets;

  const refreshData = async () => {
    const [presetsResult, examPresetsResult] = await Promise.all([
      getPresetsAction(),
      getExamPresetsAction(exams.map((e) => e.id)),
    ]);
    setPresets(presetsResult.presets as Preset[]);
    setExamPresets(examPresetsResult.examPresets as ExamPreset[]);
  };

  const getPresetForExam = (
    examId: number,
  ): { preset: Preset | null; disabled: boolean } => {
    const meta = examPresets.find((ep) => ep.examId === examId);
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
    return <SubscriptionPrompt />;
  }

  return (
    <div className="grid gap-4 w-full max-w-2xl mx-auto">
      {!isLoggedIn && (
        <p className="text-muted-foreground">Please log in to view exams.</p>
      )}
      {isLoggedIn && hasClass && exams.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No exams scheduled yet.</p>
        </div>
      )}
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
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
