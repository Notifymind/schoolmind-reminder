"use client";

import * as React from "react";
import { usePageTitle } from "@/app/app/layout";
import { SubscriptionGate } from "@/components/subscription-prompt";
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, BookOpen, Bell, Plus, Trash2, Check } from "lucide-react";
import {
  applyPresetToExamAction,
  clearExamPresetAction,
  createOneTimePresetForExamAction,
  getPresetsAction,
  getExamPresetsAction,
  getLimitsAction,
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
  isActive: boolean;
  isOneTime: boolean;
  createdAt: Date;
  updatedAt: Date;
  times: NotificationTime[];
};

type ExamPreset = {
  examId: number;
  preset: Preset | null;
};

type Limits = {
  presets: number;
  timesPerPreset: number;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [hours, minutes] = value.split(":").map(Number);

  return (
    <div className="flex items-center gap-1">
      <select
        value={hours}
        onChange={(e) =>
          onChange(
            `${e.target.value.padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
          )
        }
        className="flex h-9 w-16 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h.toString().padStart(2, "0")}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground">:</span>
      <select
        value={minutes}
        onChange={(e) =>
          onChange(
            `${hours.toString().padStart(2, "0")}:${e.target.value.padStart(2, "0")}`
          )
        }
        className="flex h-9 w-16 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m.toString().padStart(2, "0")}
          </option>
        ))}
      </select>
    </div>
  );
}

function CustomPresetDialog({
  open,
  onOpenChange,
  examId,
  limits,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: number;
  limits: Limits;
  onCreated: () => void;
}) {
  const [times, setTimes] = React.useState<{ daysBefore: number; time: string }[]>([
    { daysBefore: 1, time: "09:00" },
  ]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [newDaysBefore, setNewDaysBefore] = React.useState("1");
  const [newTime, setNewTime] = React.useState("09:00");

  const handleAddTime = () => {
    const days = parseInt(newDaysBefore, 10);
    if (!isNaN(days) && days >= 0 && times.length < limits.timesPerPreset) {
      setTimes([...times, { daysBefore: days, time: newTime }]);
      setNewDaysBefore("1");
      setNewTime("09:00");
    }
  };

  const handleRemoveTime = (index: number) => {
    setTimes(times.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (times.length === 0) return;
    setIsLoading(true);
    const result = await createOneTimePresetForExamAction(examId, times);
    setIsLoading(false);
    if ("error" in result) {
      alert(result.error);
    } else {
      onCreated();
      onOpenChange(false);
      setTimes([{ daysBefore: 1, time: "09:00" }]);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Custom Notifications</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          {times.length > 0 && (
            <div className="space-y-2">
              {times.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-4" />
                      {t.daysBefore} day{t.daysBefore !== 1 ? "s" : ""} before
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-4" />
                      {t.time}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTime(i)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {times.length < limits.timesPerPreset && (
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={newDaysBefore}
                  onChange={(e) => setNewDaysBefore(e.target.value)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  days before
                </span>
              </div>
              <TimePicker value={newTime} onChange={setNewTime} />
              <Button type="button" size="sm" onClick={handleAddTime}>
                <Plus className="size-4" />
              </Button>
            </div>
          )}
        </div>
        <SheetFooter className="flex-row gap-2 sm:justify-start">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isLoading || times.length === 0}>
            {isLoading ? "Creating..." : "Create & Apply"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ExamCard({
  exam,
  preset,
  presets,
  limits,
  onPresetChange,
}: {
  exam: Exam;
  preset: Preset | null;
  presets: Preset[];
  limits: Limits;
  onPresetChange: () => void;
}) {
  const [isCustomDialogOpen, setIsCustomDialogOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const getDaysText = () => {
    if (!exam.dueDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(exam.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays > 1) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  };

  const daysText = getDaysText();

  const handleSelectPreset = async (value: string) => {
    if (value === "default") {
      setIsLoading(true);
      await clearExamPresetAction(exam.id);
      setIsLoading(false);
      onPresetChange();
    } else if (value === "custom") {
      setIsCustomDialogOpen(true);
    } else {
      setIsLoading(true);
      const presetId = parseInt(value, 10);
      await applyPresetToExamAction(exam.id, presetId);
      setIsLoading(false);
      onPresetChange();
    }
  };

  const currentPresetName = preset?.isOneTime ? "Custom" : preset?.name;
  const activePreset = presets.find((p) => p.isActive);

  return (
    <>
      <Card className="gap-1">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">
                {exam.title || "Untitled Exam"}
              </CardTitle>
              <div className="flex items-center gap-3 mt-1 text-muted-foreground text-sm">
                <span className="flex items-center gap-1">
                  <BookOpen className="size-4" />
                  {exam.subject || "No subject"}
                </span>
                {exam.date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-4" />
                    {exam.date}
                  </span>
                )}
                {exam.time && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-4" />
                    {exam.time}
                  </span>
                )}
                {daysText && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {daysText}
                  </span>
                )}
                {exam.type && (
                  <span className="text-xs bg-primary/10 text-primary px-2 rounded-full">
                    {exam.type}
                  </span>
                )}
              </div>
            </div>
            <CardAction>
              <div className="flex items-center gap-2">
                {currentPresetName && (
                  <span className="text-xs bg-muted px-2 py-1 rounded-full flex items-center gap-1">
                    <Bell className="size-3" />
                    {currentPresetName}
                  </span>
                )}
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
                          ? preset.isOneTime
                            ? "custom"
                            : String(preset.id)
                          : activePreset
                            ? String(activePreset.id)
                            : "default"
                      }
                      onValueChange={handleSelectPreset}
                    >
                      <DropdownMenuRadioItem value="default">
                        Use default
                        {activePreset && !preset && (
                          <Check className="size-4 ml-auto" />
                        )}
                      </DropdownMenuRadioItem>
                      {presets.map((p) => (
                        <DropdownMenuRadioItem
                          key={p.id}
                          value={String(p.id)}
                        >
                          {p.name}
                          {p.isActive && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (default)
                            </span>
                          )}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsCustomDialogOpen(true)}>
                      <Plus className="size-4 mr-2" />
                      Create custom...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardAction>
          </div>
        </CardHeader>
        {exam.description && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{exam.description}</p>
          </CardContent>
        )}
      </Card>

      <CustomPresetDialog
        open={isCustomDialogOpen}
        onOpenChange={setIsCustomDialogOpen}
        examId={exam.id}
        limits={limits}
        onCreated={onPresetChange}
      />
    </>
  );
}

export function ExamsClient({
  exams,
  hasClass,
  isLoggedIn,
  presets: initialPresets,
  examPresets: initialExamPresets,
}: {
  exams: Exam[];
  hasClass: boolean;
  isLoggedIn: boolean;
  presets: Preset[];
  examPresets: ExamPreset[];
}) {
  usePageTitle("Exams");

  const [presets, setPresets] = React.useState<Preset[]>(initialPresets);
  const [examPresets, setExamPresets] = React.useState<ExamPreset[]>(initialExamPresets);
  const [limits, setLimits] = React.useState<Limits>({
    presets: 1,
    timesPerPreset: 2,
  });

  React.useEffect(() => {
    getLimitsAction().then((result) => setLimits(result.limits));
  }, []);

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

  return (
    <SubscriptionGate>
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
            limits={limits}
            onPresetChange={refreshData}
          />
        ))}
      </div>
    </SubscriptionGate>
  );
}
