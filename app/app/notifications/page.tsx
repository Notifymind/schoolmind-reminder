"use client";

import { enablePush, disablePush } from "@/lib/push-client";
import * as React from "react";
import { useOfflineState } from "@/lib/offline/store";
import { usePageTitle } from "@/app/app/layout";
import { useAppSession } from "@/lib/offline/session";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/time-picker";
import { DaysBeforePicker } from "@/components/ui/days-before-picker";
import { Spinner } from "@/components/ui/spinner";
import {
   Bell,
   Plus,
   Trash2,
   Check,
   Clock,
   Calendar,
   Edit2,
   Smartphone,
   FileText,
   ClipboardList,
   Download,
   Share,
   Save,
   Star,
   MoreHorizontal,
 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createPresetAction,
  deletePresetAction,
  activatePresetForExamsAction,
  activatePresetForAssignmentsAction,
  applyPresetToAllCurrentExamsAction,
  applyPresetToAllCurrentAssignmentsAction,
  getPresetsAction,
  addNotificationTimeAction,
  removeNotificationTimeAction,
  updatePresetAction,
  getLimitsAction,
} from "@/lib/offline/notifications";
import { usePushNotificationStore } from "@/lib/stores/push-notifications";



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

type Limits = {
  presets: number;
  timesPerPreset: number;
};

type ActivatingButton = { presetId: string; type: "exams" | "assignments" | "applyExams" | "applyAssignments" } | null;

function PresetCard({
  preset,
  limits,
  hasAssignmentsPermission,
  activatingButton,
  onSetDefault,
  onApplyToAll,
  onDelete,
  onEdit,
  onAddTime,
  onRemoveTime,
}: {
  preset: Preset;
  limits: Limits;
  hasAssignmentsPermission: boolean;
  activatingButton: ActivatingButton;
  onSetDefault: (exams: boolean, assignments: boolean) => Promise<void>;
  onApplyToAll: (exams: boolean, assignments: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
  onEdit: (name: string) => Promise<void>;
  onAddTime: (daysBefore: number, time: string) => Promise<void>;
  onRemoveTime: (timeId: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(preset.name);
  const [daysBefore, setDaysBefore] = React.useState("1");
  const [time, setTime] = React.useState("09:00");
  const [isAddTimeOpen, setIsAddTimeOpen] = React.useState(false);
  const [addTimeStep, setAddTimeStep] = React.useState<"time" | "day">("day");
  const addTimeTitleRef = React.useRef<HTMLHeadingElement>(null);
  const [deletingTimeId, setDeletingTimeId] = React.useState<string | null>(null);
  const [isAddingTime, setIsAddingTime] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDefaultDialogOpen, setIsDefaultDialogOpen] = React.useState(false);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = React.useState(false);
  const [defaultExams, setDefaultExams] = React.useState(preset.isActiveForExams);
  const [defaultAssignments, setDefaultAssignments] = React.useState(preset.isActiveForAssignments);
  const [applyExams, setApplyExams] = React.useState(false);
  const [applyAssignments, setApplyAssignments] = React.useState(false);
  const [isSettingDefault, setIsSettingDefault] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);

  const isActivating = activatingButton !== null;

  const handleSaveEdit = async () => {
    if (editName.trim()) {
      setIsSavingEdit(true);
      await onEdit(editName.trim());
      setIsSavingEdit(false);
      setIsEditing(false);
    }
  };

  const handleAddTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddingTime) return;
    const days = Number(daysBefore);
    if (daysBefore === "" || !Number.isInteger(days) || days < 0 || days > 14) return;
    if (addTimeStep === "day") {
      setAddTimeStep("time");
      addTimeTitleRef.current?.focus();
      return;
    }
    if (time) {
      setIsAddingTime(true);
      await onAddTime(days, time);
      setIsAddingTime(false);
      setDaysBefore("1");
      setTime("09:00");
      setIsAddTimeOpen(false);
    }
  };

  const handleRemoveTime = async (timeId: string) => {
    setDeletingTimeId(timeId);
    await onRemoveTime(timeId);
    setDeletingTimeId(null);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setShowDeleteConfirm(false);
    try { await onDelete(); } finally { setIsDeleting(false); }
  };

  const handleOpenDefaultDialog = () => {
    setDefaultExams(preset.isActiveForExams);
    setDefaultAssignments(preset.isActiveForAssignments);
    setIsDefaultDialogOpen(true);
  };

  const handleOpenApplyDialog = () => {
    setApplyExams(false);
    setApplyAssignments(false);
    setIsApplyDialogOpen(true);
  };

  const handleSetDefault = async () => {
    setIsSettingDefault(true);
    try {
      await onSetDefault(defaultExams, defaultAssignments);
      setIsDefaultDialogOpen(false);
    } finally {
      setIsSettingDefault(false);
    }
  };

  const handleApply = async () => {
    if (!applyExams && !applyAssignments) return;
    setIsApplying(true);
    try {
      await onApplyToAll(applyExams, applyAssignments);
      setIsApplyDialogOpen(false);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-6 [overflow-wrap:anywhere]">
            {preset.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {preset.isActiveForExams && preset.isActiveForAssignments
              ? "Default for Exams & Assignments"
              : preset.isActiveForExams
                ? "Default for Exams"
                : preset.isActiveForAssignments
                  ? "Default for Assignments"
                  : "Not the default for anything"}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              aria-label={`Actions for ${preset.name}`}
              disabled={isActivating || isDeleting || isSettingDefault || isApplying}
            >
              {isDeleting ? <Spinner className="size-4" /> : <MoreHorizontal className="size-5" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem className="min-h-11" onSelect={handleOpenDefaultDialog}>
              <Star /> Make default
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" onSelect={handleOpenApplyDialog}>
              <Save /> Apply to current items
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" onSelect={() => {
              setEditName(preset.name);
              setIsEditing(true);
            }}>
              <Edit2 /> Rename preset
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="min-h-11" variant="destructive" onSelect={handleDelete}>
              <Trash2 /> Delete preset
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CardContent className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
        {preset.times.length > 0 ? (
          <div className="space-y-2">
            {preset.times.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 p-2 pl-3"
              >
                <div className="flex min-w-0 flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:gap-x-4">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-4" />
                    {t.daysBefore === 0 ? "On the day" : `${t.daysBefore} day${t.daysBefore !== 1 ? "s" : ""} before`}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-4" />
                    {t.time}
                  </span>
                </div>
                <Button
                   variant="ghost"
                   size="icon"
                   className="size-11 shrink-0 text-muted-foreground hover:text-destructive"
                   aria-label={`Remove reminder ${t.daysBefore} days before at ${t.time}`}
                   onClick={() => handleRemoveTime(t.id)}
                   disabled={isActivating || deletingTimeId !== null}
                 >
                   {deletingTimeId === t.id ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm leading-5 text-muted-foreground">Add a reminder time to start using this preset.</p>
        )}

        {preset.times.length < limits.timesPerPreset && (
          <Dialog open={isAddTimeOpen} onOpenChange={(open) => {
            if (isAddingTime) return;
            if (open) setAddTimeStep("day");
            setIsAddTimeOpen(open);
          }}>
             <DialogTrigger asChild>
               <Button variant="outline" size="sm" className="min-h-11 w-full" disabled={isActivating || isDeleting || deletingTimeId !== null}>
                 <Plus className="size-4 mr-2" />
                 Add reminder time
               </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-sm">
              <DialogHeader>
                <DialogTitle ref={addTimeTitleRef} tabIndex={-1} className="outline-none">
                  {addTimeStep === "day" ? "How many days ahead should the reminder arrive?" : "And at what time?"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTime}>
                <FieldGroup>
                  {addTimeStep === "time" ? (
                    <TimePicker value={time} onChange={setTime} disabled={isAddingTime} />
                  ) : (
                    <DaysBeforePicker value={daysBefore} onChange={setDaysBefore} disabled={isAddingTime} />
                  )}
                  <div className="flex justify-end gap-2">
                    {addTimeStep === "time" && (
                      <Button type="button" variant="ghost" className="mr-auto" disabled={isAddingTime} onClick={() => {
                        setAddTimeStep("day");
                        addTimeTitleRef.current?.focus();
                      }}>
                        Back
                      </Button>
                    )}
                     <Button type="button" variant="outline" onClick={() => setIsAddTimeOpen(false)} disabled={isAddingTime}>
                       Cancel
                    </Button>
                    <Button type="submit" disabled={isAddingTime}>
                       {isAddingTime ? <Spinner className="size-4" /> : addTimeStep === "day" ? "Next: choose time" : "Add reminder"}
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>

      <Dialog open={isEditing} onOpenChange={(open) => {
        if (!isSavingEdit) setIsEditing(open);
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename preset</DialogTitle>
            <DialogDescription>Choose a name for this reminder schedule.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => {
            event.preventDefault();
            void handleSaveEdit();
          }} className="space-y-4">
            <Field>
              <FieldLabel htmlFor={`preset-name-${preset.id}`}>Preset name</FieldLabel>
              <Input id={`preset-name-${preset.id}`} value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="h-11" disabled={isSavingEdit} required />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="min-h-11"
                onClick={() => setIsEditing(false)} disabled={isSavingEdit}>Cancel</Button>
              <Button type="submit" className="min-h-11" disabled={isSavingEdit || !editName.trim()}>
                {isSavingEdit ? <Spinner className="size-4" /> : "Save name"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{preset.name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDefaultDialogOpen} onOpenChange={setIsDefaultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Preset Default</DialogTitle>
            <DialogDescription>
              Choose what this preset should be the default for:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4" />
                <label htmlFor={`default-exams-${preset.id}`} className="text-sm font-medium">
                  Exams
                </label>
              </div>
              <Button
                id={`default-exams-${preset.id}`}
                aria-pressed={defaultExams}
                className="min-h-11"
                variant={defaultExams ? "default" : "outline"}
                size="sm"
                onClick={() => setDefaultExams(!defaultExams)}
              >
                {defaultExams ? "Default" : "Not Default"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4" />
                <label htmlFor={`default-assignments-${preset.id}`} className="text-sm font-medium">
                  Assignments
                </label>
              </div>
              <Button
                id={`default-assignments-${preset.id}`}
                aria-pressed={defaultAssignments}
                className="min-h-11"
                variant={defaultAssignments ? "default" : "outline"}
                size="sm"
                onClick={() => setDefaultAssignments(!defaultAssignments)}
                disabled={!hasAssignmentsPermission}
              >
                {defaultAssignments ? "Default" : "Not Default"}
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDefaultDialogOpen(false)}
              disabled={isSettingDefault}
            >
              Cancel
            </Button>
            <Button onClick={handleSetDefault} disabled={isSettingDefault}>
              {isSettingDefault ? <Spinner className="size-4" /> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Preset to All</DialogTitle>
            <DialogDescription>
              Apply this preset to all current items. This will update existing notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4" />
                <label htmlFor={`apply-exams-${preset.id}`} className="text-sm font-medium">
                  Exams
                </label>
              </div>
              <Button
                id={`apply-exams-${preset.id}`}
                aria-pressed={applyExams}
                className="min-h-11"
                variant={applyExams ? "default" : "outline"}
                size="sm"
                onClick={() => setApplyExams(!applyExams)}
              >
                {applyExams ? "Selected" : "Select"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4" />
                <label htmlFor={`apply-assignments-${preset.id}`} className="text-sm font-medium">
                  Assignments
                </label>
              </div>
              <Button
                id={`apply-assignments-${preset.id}`}
                aria-pressed={applyAssignments}
                className="min-h-11"
                variant={applyAssignments ? "default" : "outline"}
                size="sm"
                onClick={() => setApplyAssignments(!applyAssignments)}
                disabled={!hasAssignmentsPermission}
              >
                {applyAssignments ? "Selected" : "Select"}
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsApplyDialogOpen(false)}
              disabled={isApplying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={isApplying || (!applyExams && !applyAssignments)}
            >
              {isApplying ? <Spinner className="size-4" /> : "Apply"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PushNotificationManager() {
  const [isSupported, setIsSupported] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const isMobile = useIsMobile();
  const { offline } = useOfflineState();
  const { canInstall, isInstalling, installApp, isIos, isAndroid } = usePwaInstall();
  const { isSubscribed } = usePushNotificationStore();

  React.useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
    }
  }, []);

  async function subscribeToPush() {
    setIsLoading(true);
    try {
      await enablePush();
    } catch (error) {
      console.error("Failed to subscribe:", error);
      toast.error(error instanceof Error ? error.message : "Could not enable notifications. Please try again.");
    }
    setIsLoading(false);
  }

  async function unsubscribeFromPush() {
    setIsLoading(true);
    try {
      await disablePush();
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
      toast.error("Could not disable notifications. Please try again.");
    }
    setIsLoading(false);
  }

  if (!isSupported && !isIos) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-muted-foreground text-sm">
            Push notifications are not supported in this browser.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      <CardHeader className="p-4 sm:p-5">
        <CardTitle className="flex items-center gap-2 text-base leading-6">
          <Smartphone className="size-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>Receive notifications on your device</CardDescription>
      </CardHeader>
      <CardContent className="border-t border-border/60 bg-muted/20 p-4 sm:px-5">
        {isAndroid ? (
          <Button className="min-h-11 w-full sm:w-auto" onClick={installApp} disabled={isInstalling}>
            {isInstalling ? <Spinner className="size-4 mr-2" /> : <Download className="size-4 mr-2" />}
            {isInstalling ? "Installing..." : "Install App"}
          </Button>
        ) : isMobile && canInstall ? (
          <Button className="min-h-11 w-full sm:w-auto" onClick={installApp} disabled={isInstalling}>
            {isInstalling ? <Spinner className="size-4 mr-2" /> : <Download className="size-4 mr-2" />}
            {isInstalling ? "Installing..." : "Install App"}
          </Button>
        ) : isMobile && isIos ? (
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Tap the <Share className="size-4 inline mx-1" /> Share button in Safari</li>
              <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
              <li>Open the app from your home screen</li>
             </ol>
        ) : (
          <>
            {isSubscribed ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-green-500" />
                  <span className="text-sm">Notifications enabled</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 w-full sm:w-auto"
                  onClick={unsubscribeFromPush}
                  disabled={isLoading || offline}
                >
                  Disable
                </Button>
              </div>
            ) : (
              <Button className="min-h-11 w-full sm:w-auto" onClick={subscribeToPush} disabled={isLoading || offline}>
                {isLoading ? "Enabling..." : "Enable Notifications"}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function NotificationsPage() {
  usePageTitle("Notification Settings");
  const { data: session } = useAppSession();
  const [loadedPresets, setPresets] = React.useState<Preset[]>([]);
  const [loadedLimits, setLimits] = React.useState<Limits>({
    presets: 1,
    timesPerPreset: 2,
  });
  const [newPresetName, setNewPresetName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [activatingButton, setActivatingButton] = React.useState<ActivatingButton>(null);

  const role = session?.user?.role as "free" | "basic" | "pro" | "admin" | undefined;

  const offline = useOfflineState();
  const hasAssignmentsPermission = offline.snapshot?.hasAssignmentsPermission ?? null;
  const presets = offline.snapshot?.presets ?? loadedPresets;
  const limits = offline.snapshot?.limits ?? loadedLimits;

  async function loadPresets() {
    const [presetsResult, limitsResult] = await Promise.all([
      getPresetsAction(),
      getLimitsAction(),
    ]);
    setPresets(presetsResult.presets as Preset[]);
    setLimits(limitsResult.limits);
  }

  React.useEffect(() => {
    loadPresets().finally(() => setIsInitialLoading(false));
  }, []);



  async function handleCreatePreset(e: React.FormEvent) {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    setIsLoading(true);
    const result = await createPresetAction(newPresetName.trim());
    if ("error" in result) {
      toast.error(result.error);
    } else {
      setNewPresetName("");
      await loadPresets();
    }
    setIsLoading(false);
  }

  async function handleDeletePreset(presetId: string): Promise<void> {
     const result = await deletePresetAction(presetId);
     if ("error" in result) toast.error(result.error);
     else await loadPresets();
  }

  async function handleSetDefault(presetId: string, exams: boolean, assignments: boolean): Promise<void> {
    setActivatingButton({ presetId, type: exams ? "exams" : "assignments" });
    try {
      if (exams) {
        const result = await activatePresetForExamsAction(presetId);
        if ("error" in result) { toast.error(result.error); return; }
      }
      if (assignments) {
        const result = await activatePresetForAssignmentsAction(presetId);
        if ("error" in result) { toast.error(result.error); return; }
      }
      await loadPresets();
    } finally {
      setActivatingButton(null);
    }
  }

  async function handleApplyToAll(presetId: string, exams: boolean, assignments: boolean): Promise<void> {
    setActivatingButton({ presetId, type: exams ? "applyExams" : "applyAssignments" });
    try {
      const results: string[] = [];
      
      if (exams) {
        const result = await applyPresetToAllCurrentExamsAction(presetId);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        results.push(`${result.applied} exam(s)`);
      }
      
      if (assignments) {
        const result = await applyPresetToAllCurrentAssignmentsAction(presetId);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        results.push(`${result.applied} assignment(s)`);
      }
      
      if (results.length > 0) {
        toast.success(`Applied to ${results.join(" and ")}`);
      }
    } finally {
      setActivatingButton(null);
    }
  }

  async function handleEditPreset(presetId: string, name: string): Promise<void> {
     const result = await updatePresetAction(presetId, name);
     if ("error" in result) toast.error(result.error);
     else await loadPresets();
  }
 
  async function handleAddTime(
     presetId: string,
     daysBefore: number,
     time: string,
  ): Promise<void> {
     const result = await addNotificationTimeAction(presetId, daysBefore, time);
     if ("error" in result) {
       toast.error(result.error);
     } else {
       await loadPresets();
     }
  }
 
  async function handleRemoveTime(timeId: string): Promise<void> {
     const result = await removeNotificationTimeAction(timeId);
     if ("error" in result) toast.error(result.error);
     else await loadPresets();
  }

  const canAddPreset = presets.length < limits.presets;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
        <div className="grid w-full min-w-0 max-w-2xl gap-6">
          <div>
            <h1 className="text-2xl font-semibold">Notification Settings</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Choose when to get reminders for exams and assignments.
            </p>
          </div>

          <PushNotificationManager />

          <section aria-labelledby="presets-heading" className="min-w-0 space-y-4">
            <div>
              <h2 id="presets-heading" className="text-lg font-semibold">Reminder presets</h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Save a schedule, then make it the default for new items or apply it to current ones.
              </p>
            </div>
          {isInitialLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="size-8" />
            </div>
          ) : presets.length > 0 ? (
            <div className="grid gap-4">
              {presets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  limits={limits}
                  hasAssignmentsPermission={hasAssignmentsPermission ?? false}
                  activatingButton={activatingButton}
                  onSetDefault={(exams, assignments) => handleSetDefault(preset.id, exams, assignments)}
                  onApplyToAll={(exams, assignments) => handleApplyToAll(preset.id, exams, assignments)}
                  onDelete={() => handleDeletePreset(preset.id)}
                  onEdit={(name) => handleEditPreset(preset.id, name)}
                  onAddTime={(days, time) =>
                    handleAddTime(preset.id, days, time)
                  }
                  onRemoveTime={(timeId) => handleRemoveTime(timeId)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Bell className="size-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No presets configured yet.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a preset to set up your notifications.
                </p>
              </CardContent>
            </Card>
          )}

          </section>

          {!isInitialLoading && canAddPreset && (
            <Card className="min-w-0 gap-0 overflow-hidden py-0">
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="text-base leading-6">Create a preset</CardTitle>
                <CardDescription>
                  {limits.presets - presets.length} {limits.presets - presets.length === 1 ? "preset" : "presets"} available on your plan
                </CardDescription>
              </CardHeader>
              <CardContent className="border-t border-border/60 bg-muted/20 p-4 sm:p-5">
                <form onSubmit={handleCreatePreset}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="preset-name">Preset Name</FieldLabel>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                          id="preset-name"
                          className="h-11 min-w-0"
                          required
                          value={newPresetName}
                          onChange={(e) => setNewPresetName(e.target.value)}
                          placeholder="e.g., Default reminders"
                        />
                        <Button type="submit" className="min-h-11 sm:shrink-0" disabled={isLoading || !newPresetName.trim()}>
                          {isLoading ? "Creating..." : "Create"}
                        </Button>
                      </div>
                    </Field>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>
          )}

          {!isInitialLoading && !canAddPreset && role === "free" && (
            <Card className="bg-muted/50">
              <CardContent className="py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  You&apos;ve reached the maximum number of presets for your
                  plan.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
  );
}
