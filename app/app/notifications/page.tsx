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
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
    <Card className={(preset.isActiveForExams || preset.isActiveForAssignments ? "border-primary/30 " : "") + "gap-5 shadow-none"}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="flex flex-wrap gap-2">
                <Input
                  value={editName}
                  aria-label="Preset name"
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-lg font-semibold"
                />
                <Button size="sm" onClick={handleSaveEdit} disabled={isSavingEdit}>
                   {isSavingEdit ? <Spinner className="size-4" /> : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <CardTitle className="text-lg leading-snug break-words">
                <h3>{preset.name}</h3>
              </CardTitle>
            )}
            <CardDescription className="mt-1">
              {preset.times.length} of {limits.timesPerPreset} reminders used
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {!isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  aria-label={`Rename ${preset.name}`}
                  title="Rename preset"
                  disabled={isActivating || isDeleting}
                >
                  <Edit2 className="size-4" />
                </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              aria-label={`Delete ${preset.name}`}
              title="Delete preset"
              disabled={isActivating || isDeleting}
            >
              {isDeleting ? <Spinner className="size-4" /> : <Trash2 className="size-4 text-destructive" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(preset.isActiveForExams || preset.isActiveForAssignments) && (
          <div className="flex flex-wrap gap-2">
            {preset.isActiveForExams && (
              <div className="flex items-center gap-1 text-xs font-medium bg-primary/5 px-2.5 py-1.5 rounded-full">
                <FileText className="size-3" />
                <span>Exam default</span>
              </div>
            )}
            {preset.isActiveForAssignments && (
              <div className="flex items-center gap-1 text-xs font-medium bg-primary/5 px-2.5 py-1.5 rounded-full">
                <ClipboardList className="size-3" />
                <span>Assignment default</span>
              </div>
            )}
          </div>
        )}

        {preset.times.length > 0 ? (
          <div className="space-y-2">
            {[...preset.times].sort((a, b) => b.daysBefore - a.daysBefore || a.time.localeCompare(b.time)).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 p-3"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-4" />
                    {t.daysBefore === 0 ? "On the day" : `${t.daysBefore} day${t.daysBefore === 1 ? "" : "s"} before`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-4" />
                    {t.time}
                  </span>
                </div>
                <Button
                   variant="ghost"
                   size="icon"
                   onClick={() => handleRemoveTime(t.id)}
                   aria-label={`Remove reminder ${t.daysBefore} days before at ${t.time}`}
                   disabled={isActivating || deletingTimeId !== null}
                 >
                   {deletingTimeId === t.id ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <FieldDescription className="rounded-xl border border-dashed p-5 text-center">Add a reminder to choose when this preset notifies you.</FieldDescription>
        )}

        {preset.times.length < limits.timesPerPreset && (
          <Dialog open={isAddTimeOpen} onOpenChange={(open) => {
            if (isAddingTime) return;
            if (open) setAddTimeStep("day");
            setIsAddTimeOpen(open);
          }}>
             <DialogTrigger asChild>
               <Button variant="outline" size="sm" className="w-full border-dashed" disabled={isActivating || isDeleting || deletingTimeId !== null}>
                 <Plus className="size-4 mr-2" />
                 Add reminder
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

      <div className="flex flex-wrap gap-2 border-t px-6 pt-4">
        <Button variant="secondary" size="sm" onClick={handleOpenDefaultDialog} disabled={isActivating || isDeleting || isSettingDefault}>
          {isSettingDefault ? <Spinner className="size-4" /> : <Star className="size-4" />}
          Set as default
        </Button>
        <Button variant="ghost" size="sm" onClick={handleOpenApplyDialog} disabled={isActivating || isDeleting || isApplying}>
          {isApplying ? <Spinner className="size-4" /> : <Save className="size-4" />}
          Apply to existing
        </Button>
      </div>

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-4" />
                <label htmlFor="default-exams" className="text-sm font-medium">
                  Exams
                </label>
              </div>
              <Button
                id="default-exams"
                variant={defaultExams ? "default" : "outline"}
                size="sm"
                onClick={() => setDefaultExams(!defaultExams)}
              >
                {defaultExams ? "Default" : "Not Default"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4" />
                <label htmlFor="default-assignments" className="text-sm font-medium">
                  Assignments
                </label>
              </div>
              <Button
                id="default-assignments"
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-4" />
                <label htmlFor="apply-exams" className="text-sm font-medium">
                  Exams
                </label>
              </div>
              <Button
                id="apply-exams"
                variant={applyExams ? "default" : "outline"}
                size="sm"
                onClick={() => setApplyExams(!applyExams)}
              >
                {applyExams ? "Selected" : "Select"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4" />
                <label htmlFor="apply-assignments" className="text-sm font-medium">
                  Assignments
                </label>
              </div>
              <Button
                id="apply-assignments"
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
    <Card className="gap-5 shadow-none">
      <CardHeader>
        <span className="mb-2 flex size-11 items-center justify-center rounded-xl bg-muted">
          <Smartphone className="size-5" />
        </span>
        <CardTitle><h2>This device</h2></CardTitle>
        <CardDescription>Allow push notifications to receive your exam and assignment reminders here.</CardDescription>
      </CardHeader>
      <CardContent>
        {isAndroid ? (
          <Button onClick={installApp} disabled={isInstalling}>
            {isInstalling ? <Spinner className="size-4 mr-2" /> : <Download className="size-4 mr-2" />}
            {isInstalling ? "Installing..." : "Install App"}
          </Button>
        ) : isMobile && canInstall ? (
          <Button onClick={installApp} disabled={isInstalling}>
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
                  onClick={unsubscribeFromPush}
                  disabled={isLoading || offline}
                >
                  Disable
                </Button>
              </div>
            ) : (
              <Button onClick={subscribeToPush} disabled={isLoading || offline}>
                {isLoading ? "Enabling..." : "Enable Notifications"}
              </Button>
            )}
          </>
        )}
        {offline && <p className="mt-3 text-xs text-muted-foreground">Connect to the internet to change device notifications.</p>}
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
    <div className="mx-auto w-full max-w-6xl py-4 md:px-4 md:py-8">
      <header className="mb-8 border-b pb-8">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Bell className="size-6" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Choose when to get a heads-up about exams and assignments.
        </p>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="presets-heading" className="min-w-0 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="presets-heading" className="text-lg font-semibold">Reminder presets</h2>
              <p className="mt-1 text-sm text-muted-foreground">Save a schedule and reuse it for your schoolwork.</p>
            </div>
            {!isInitialLoading && <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums">{presets.length} / {limits.presets} used</span>}
          </div>
          {isInitialLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="size-8" /><span className="sr-only">Loading reminder presets</span>
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
                  Your first reminder starts here.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a preset below, then add the days and times to be notified.
                </p>
              </CardContent>
            </Card>
          )}

          {!isInitialLoading && canAddPreset && (
            <Card>
              <CardHeader>
                <CardTitle><h3>Create a preset</h3></CardTitle>
                <CardDescription>
                  Give your schedule a name, then add reminders.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePreset}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="preset-name">Preset name</FieldLabel>
                      <div className="flex gap-2">
                        <Input
                          id="preset-name"
                          value={newPresetName}
                          onChange={(e) => setNewPresetName(e.target.value)}
                          placeholder="e.g., Exam week"
                          disabled={isLoading}
                        />
                        <Button type="submit" disabled={isLoading || !newPresetName.trim()}>
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
        </section>
        <aside className="space-y-5 lg:sticky lg:top-6">
          <PushNotificationManager />
          <div className="rounded-xl bg-muted/50 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Star className="size-4" /> How presets work</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>Set a default to use that schedule for new exams or assignments.</p>
              <p>Choose <span className="font-medium text-foreground">Apply to existing</span> to update reminders for items you already have.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
