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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FieldDescription,
  FieldGroup,
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
  Star,
  MoreHorizontal,
  BellOff,
  X,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const isDefault = preset.isActiveForExams || preset.isActiveForAssignments;

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
    <Card className={isDefault ? "border-primary ring-1 ring-primary/20" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Title / edit row */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 text-sm font-semibold"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                />
                <Button size="sm" onClick={handleSaveEdit} disabled={isSavingEdit} className="h-8">
                  {isSavingEdit ? <Spinner className="size-3.5" /> : <Check className="size-3.5" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setEditName(preset.name); }} className="h-8">
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CardTitle className="text-base truncate">{preset.name}</CardTitle>
                {isDefault && (
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                    <Star className="size-2.5" />
                    Default
                  </span>
                )}
              </div>
            )}
            {/* Active-for badges */}
            {!isEditing && isDefault && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {preset.isActiveForExams && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    <FileText className="size-3" />Exams
                  </span>
                )}
                {preset.isActiveForAssignments && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    <ClipboardList className="size-3" />Assignments
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions menu */}
          {!isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 shrink-0" disabled={isDeleting}>
                  {isDeleting ? <Spinner className="size-4" /> : <MoreHorizontal className="size-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setIsEditing(true)} disabled={isActivating}>
                  <Edit2 className="size-3.5 mr-2" />Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenDefaultDialog} disabled={isActivating || isSettingDefault}>
                  <Star className="size-3.5 mr-2" />Set as default
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenApplyDialog} disabled={isActivating || isApplying}>
                  <Bell className="size-3.5 mr-2" />Apply to all
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isActivating}
                >
                  <Trash2 className="size-3.5 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Time chips */}
        {preset.times.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {preset.times.map((t) => (
              <div
                key={t.id}
                className="group flex items-center gap-1.5 text-xs bg-muted rounded-full pl-2.5 pr-1 py-1"
              >
                <Calendar className="size-3 text-muted-foreground" />
                <span className="font-medium">
                  {t.daysBefore === 0 ? "Same day" : `${t.daysBefore}d before`}
                </span>
                <span className="text-muted-foreground">·</span>
                <Clock className="size-3 text-muted-foreground" />
                <span>{t.time}</span>
                <button
                  onClick={() => handleRemoveTime(t.id)}
                  disabled={isActivating || deletingTimeId !== null}
                  className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                  aria-label="Remove time"
                >
                  {deletingTimeId === t.id
                    ? <Spinner className="size-3" />
                    : <X className="size-3" />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <FieldDescription className="text-xs">No reminder times yet.</FieldDescription>
        )}

        {/* Add time */}
        {preset.times.length < limits.timesPerPreset && (
          <Dialog open={isAddTimeOpen} onOpenChange={(open) => {
            if (isAddingTime) return;
            if (open) setAddTimeStep("day");
            setIsAddTimeOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 rounded-full"
                disabled={isActivating || isDeleting || deletingTimeId !== null}
              >
                <Plus className="size-3" />Add reminder time
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-sm">
              <DialogHeader>
                <DialogTitle ref={addTimeTitleRef} tabIndex={-1} className="outline-none">
                  {addTimeStep === "day" ? "How many days ahead?" : "At what time?"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTime}>
                <FieldGroup>
                  {addTimeStep === "time"
                    ? <TimePicker value={time} onChange={setTime} disabled={isAddingTime} />
                    : <DaysBeforePicker value={daysBefore} onChange={setDaysBefore} disabled={isAddingTime} />
                  }
                  <div className="flex justify-end gap-2">
                    {addTimeStep === "time" && (
                      <Button type="button" variant="ghost" className="mr-auto" disabled={isAddingTime} onClick={() => {
                        setAddTimeStep("day");
                        addTimeTitleRef.current?.focus();
                      }}>Back</Button>
                    )}
                    <Button type="button" variant="outline" onClick={() => setIsAddTimeOpen(false)} disabled={isAddingTime}>Cancel</Button>
                    <Button type="submit" disabled={isAddingTime}>
                      {isAddingTime ? <Spinner className="size-4" /> : addTimeStep === "day" ? "Next" : "Add reminder"}
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>

      {/* Delete confirm */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{preset.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the preset and all its reminder times. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Set default dialog */}
      <Dialog open={isDefaultDialogOpen} onOpenChange={setIsDefaultDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set as default for…</DialogTitle>
            <DialogDescription>
              Choose which item types should use &quot;{preset.name}&quot; by default.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {(["exams", "assignments"] as const).map((type) => {
              const isExams = type === "exams";
              const checked = isExams ? defaultExams : defaultAssignments;
              const disabled = !isExams && !hasAssignmentsPermission;
              return (
                <label
                  key={type}
                  className={[
                    "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors",
                    disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50",
                    checked ? "border-primary bg-primary/5" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2.5">
                    {isExams ? <FileText className="size-4 text-muted-foreground" /> : <ClipboardList className="size-4 text-muted-foreground" />}
                    <span className="text-sm font-medium capitalize">{type}</span>
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => isExams ? setDefaultExams(!defaultExams) : setDefaultAssignments(!defaultAssignments)}
                  />
                  <div className={[
                    "size-5 rounded border-2 flex items-center justify-center transition-colors",
                    checked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30",
                  ].join(" ")}>
                    {checked && <Check className="size-3" />}
                  </div>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setIsDefaultDialogOpen(false)} disabled={isSettingDefault}>Cancel</Button>
            <Button onClick={handleSetDefault} disabled={isSettingDefault}>
              {isSettingDefault ? <Spinner className="size-4" /> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply to all dialog */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply to all current items</DialogTitle>
            <DialogDescription>
              Override existing notification settings for all exams or assignments with &quot;{preset.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {(["exams", "assignments"] as const).map((type) => {
              const isExams = type === "exams";
              const checked = isExams ? applyExams : applyAssignments;
              const disabled = !isExams && !hasAssignmentsPermission;
              return (
                <label
                  key={type}
                  className={[
                    "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors",
                    disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50",
                    checked ? "border-primary bg-primary/5" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2.5">
                    {isExams ? <FileText className="size-4 text-muted-foreground" /> : <ClipboardList className="size-4 text-muted-foreground" />}
                    <span className="text-sm font-medium capitalize">{type}</span>
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => isExams ? setApplyExams(!applyExams) : setApplyAssignments(!applyAssignments)}
                  />
                  <div className={[
                    "size-5 rounded border-2 flex items-center justify-center transition-colors",
                    checked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30",
                  ].join(" ")}>
                    {checked && <Check className="size-3" />}
                  </div>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setIsApplyDialogOpen(false)} disabled={isApplying}>Cancel</Button>
            <Button onClick={handleApply} disabled={isApplying || (!applyExams && !applyAssignments)}>
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
      <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-3">
        <BellOff className="size-4 text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground">Push notifications aren&apos;t supported in this browser.</p>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border bg-card px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Smartphone className="size-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium leading-none">Push notifications</p>
          <p className="mt-1 text-xs text-muted-foreground">Receive reminders directly on this device</p>
        </div>
      </div>

      <div className="shrink-0">
        {isAndroid || (isMobile && canInstall) ? (
          <Button size="sm" onClick={installApp} disabled={isInstalling} className="gap-1.5">
            {isInstalling ? <Spinner className="size-3.5" /> : <Download className="size-3.5" />}
            {isInstalling ? "Installing…" : "Install app"}
          </Button>
        ) : isMobile && isIos ? (
          <Button size="sm" variant="outline" disabled className="gap-1.5 text-xs">
            <Share className="size-3.5" />iOS instructions below
          </Button>
        ) : isSubscribed ? (
          <Button
            size="sm"
            variant="outline"
            onClick={unsubscribeFromPush}
            disabled={isLoading || offline}
            className="gap-1.5"
          >
            {isLoading ? <Spinner className="size-3.5" /> : <Check className="size-3.5 text-green-500" />}
            {isLoading ? "Disabling…" : "Enabled"}
          </Button>
        ) : (
          <Button size="sm" onClick={subscribeToPush} disabled={isLoading || offline} className="gap-1.5">
            {isLoading ? <Spinner className="size-3.5" /> : <Bell className="size-3.5" />}
            {isLoading ? "Enabling…" : "Enable"}
          </Button>
        )}
      </div>

      {isMobile && isIos && !isSubscribed && (
        <div className="col-span-full mt-2 rounded-md bg-muted/50 px-3 py-2">
          <ol className="space-y-1 text-xs text-muted-foreground list-decimal list-inside">
            <li>Tap the <Share className="size-3.5 inline mx-0.5 -mt-0.5" /> Share button in Safari</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
            <li>Open the app from your home screen</li>
          </ol>
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  usePageTitle("Notification Settings");
  const { data: session } = useAppSession();
  const [loadedPresets, setPresets] = React.useState<Preset[]>([]);
  const [loadedLimits, setLimits] = React.useState<Limits>({ presets: 1, timesPerPreset: 2 });
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
        if ("error" in result) { toast.error(result.error); return; }
        results.push(`${result.applied} exam(s)`);
      }
      if (assignments) {
        const result = await applyPresetToAllCurrentAssignmentsAction(presetId);
        if ("error" in result) { toast.error(result.error); return; }
        results.push(`${result.applied} assignment(s)`);
      }
      if (results.length > 0) toast.success(`Applied to ${results.join(" and ")}`);
    } finally {
      setActivatingButton(null);
    }
  }

  async function handleEditPreset(presetId: string, name: string): Promise<void> {
    const result = await updatePresetAction(presetId, name);
    if ("error" in result) toast.error(result.error);
    else await loadPresets();
  }

  async function handleAddTime(presetId: string, daysBefore: number, time: string): Promise<void> {
    const result = await addNotificationTimeAction(presetId, daysBefore, time);
    if ("error" in result) toast.error(result.error);
    else await loadPresets();
  }

  async function handleRemoveTime(timeId: string): Promise<void> {
    const result = await removeNotificationTimeAction(timeId);
    if ("error" in result) toast.error(result.error);
    else await loadPresets();
  }

  const canAddPreset = presets.length < limits.presets;

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="grid gap-8 w-full max-w-2xl">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage when and how you get reminded about exams and assignments.
          </p>
        </div>

        {/* Push notification toggle */}
        <section className="grid gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Device</h2>
          <PushNotificationManager />
        </section>

        {/* Presets */}
        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reminder presets
            </h2>
            {!isInitialLoading && (
              <span className="text-xs text-muted-foreground">
                {presets.length} / {limits.presets}
              </span>
            )}
          </div>

          {isInitialLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="size-6" />
            </div>
          ) : presets.length > 0 ? (
            <div className="grid gap-3">
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
                  onAddTime={(days, time) => handleAddTime(preset.id, days, time)}
                  onRemoveTime={(timeId) => handleRemoveTime(timeId)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Bell className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No presets yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create a preset to define your reminder schedule.
                </p>
              </div>
            </div>
          )}

          {/* Create preset form */}
          {!isInitialLoading && canAddPreset && (
            <form onSubmit={handleCreatePreset} className="flex gap-2 mt-1">
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="New preset name…"
                className="h-9 text-sm"
              />
              <Button type="submit" size="sm" disabled={isLoading || !newPresetName.trim()} className="h-9 gap-1.5 shrink-0">
                {isLoading ? <Spinner className="size-3.5" /> : <Plus className="size-3.5" />}
                {isLoading ? "Creating…" : "Create"}
              </Button>
            </form>
          )}

          {!isInitialLoading && !canAddPreset && role === "free" && (
            <p className="text-xs text-center text-muted-foreground px-4 py-2 rounded-lg bg-muted/50">
              Upgrade to Pro to create more presets and add more reminder times.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

