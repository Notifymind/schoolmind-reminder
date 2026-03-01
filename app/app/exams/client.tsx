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
  applyPresetToExamAction,
  getPresetsAction,
  getExamPresetsAction,
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
};

function ExamCard({
  exam,
  preset,
  presets,
  onPresetChange,
}: {
  exam: Exam;
  preset: Preset | null;
  presets: Preset[];
  onPresetChange: () => void;
}) {
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

    if (diffDays < 0) return { text: `${Math.abs(diffDays)} days ago`, isPast: true, isUrgent: false };
    if (diffDays === 0) return { text: "Today", isPast: false, isUrgent: true };
    if (diffDays === 1) return { text: "Tomorrow", isPast: false, isUrgent: true };
    if (diffDays <= 7) return { text: `In ${diffDays} days`, isPast: false, isUrgent: true };
    return { text: `In ${diffDays} days`, isPast: false, isUrgent: false };
  };

  const daysInfo = getDaysInfo();

  const handleSelectPreset = async (value: string) => {
    setIsLoading(true);
    const presetId = parseInt(value, 10);
    await applyPresetToExamAction(exam.id, presetId);
    setIsLoading(false);
    onPresetChange();
  };

  const activePreset = presets.find((p) => p.isActiveForExams);

  return (
    <Card className="gap-1">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
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
                <span className="text-xs bg-primary/10 text-primary px-2 rounded-full">
                  {exam.type}
                </span>
              )}
            </div>
          </div>
          {!daysInfo?.isPast && (
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
                        {p.isActiveForExams && (
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
          )}
        </div>
      </CardHeader>
      {exam.description && (
        <CardContent>
          <p className="text-sm text-muted-foreground">{exam.description}</p>
        </CardContent>
      )}
    </Card>
  );
}

export function ExamsClient({
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

  const [presets, setPresets] = React.useState<Preset[]>(initialPresets);
  const [examPresets, setExamPresets] =
    React.useState<ExamPreset[]>(initialExamPresets);

  const refreshData = async () => {
    const [presetsResult, examPresetsResult] = await Promise.all([
      getPresetsAction(),
      getExamPresetsAction(exams.map((e) => e.id)),
    ]);
    setPresets(presetsResult.presets as Preset[]);
    setExamPresets(examPresetsResult.examPresets as ExamPreset[]);
  };

  const getPresetForExam = (examId: number): Preset | null => {
    const meta = examPresets.find((ep) => ep.examId === examId);
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
        <p className="text-muted-foreground">Please log in to view exams.</p>
      )}
      {isLoggedIn && !hasClass && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            You haven&apos;t joined a class yet.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Join a class to see your exams.
          </p>
        </div>
      )}
      {isLoggedIn && hasClass && exams.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No exams scheduled yet.</p>
        </div>
      )}
      {exams.map((exam) => (
        <ExamCard
          key={exam.id}
          exam={exam}
          preset={getPresetForExam(exam.id)}
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
