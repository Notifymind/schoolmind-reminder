"use client";

import * as React from "react";
import { usePageTitle } from "@/app/app/layout";
import { SubscriptionGate } from "@/components/subscription-prompt";
import { authClient } from "@/lib/auth-client";
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
  subscribeToPushAction,
  unsubscribeFromPushAction,
} from "@/lib/actions/notifications";
import { usePushNotificationStore } from "@/lib/stores/push-notifications";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

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
            `${e.target.value.padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
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
            `${hours.toString().padStart(2, "0")}:${e.target.value.padStart(2, "0")}`,
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

type ApplyDialogState = { presetId: string; exams: boolean; assignments: boolean } | null;
type DefaultDialogState = { presetId: string; exams: boolean; assignments: boolean } | null;

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
  const isActivatingExams = activatingButton?.presetId === preset.id && activatingButton?.type === "exams";
  const isActivatingAssignments = activatingButton?.presetId === preset.id && activatingButton?.type === "assignments";
  const isApplyingExams = activatingButton?.presetId === preset.id && activatingButton?.type === "applyExams";
  const isApplyingAssignments = activatingButton?.presetId === preset.id && activatingButton?.type === "applyAssignments";

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
    const days = parseInt(daysBefore, 10);
    if (!isNaN(days) && days >= 0 && time) {
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
    await onDelete();
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
    <Card className={(preset.isActiveForExams || preset.isActiveForAssignments ? "border-primary " : "") + "gap-0"}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={editName}
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
              <CardTitle className="flex items-center gap-2">
                {preset.name}
              </CardTitle>
            )}
            <CardDescription className="mt-1">
              {preset.times.length} notification time(s)
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {!isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleOpenDefaultDialog}
                  title="Make Default"
                  disabled={isActivating || isDeleting || isSettingDefault}
                >
                  {isSettingDefault ? <Spinner className="size-4" /> : <Star className="size-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleOpenApplyDialog}
                  title="Apply to All"
                  disabled={isActivating || isDeleting || isApplying}
                >
                  {isApplying ? <Spinner className="size-4" /> : <Save className="size-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  title="Edit"
                  disabled={isActivating || isDeleting}
                >
                  <Edit2 className="size-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              title="Delete"
              disabled={isActivating || isDeleting}
            >
              {isDeleting ? <Spinner className="size-4" /> : <Trash2 className="size-4 text-destructive" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {(preset.isActiveForExams || preset.isActiveForAssignments) && (
          <div className="flex flex-wrap gap-2">
            {preset.isActiveForExams && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                <FileText className="size-3" />
                <span>Default for Exams</span>
              </div>
            )}
            {preset.isActiveForAssignments && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                <ClipboardList className="size-3" />
                <span>Default for Assignments</span>
              </div>
            )}
          </div>
        )}

        {preset.times.length > 0 ? (
          <div className="space-y-2">
            {preset.times.map((t) => (
              <div
                key={t.id}
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
                   onClick={() => handleRemoveTime(t.id)}
                   disabled={isActivating || deletingTimeId !== null}
                 >
                   {deletingTimeId === t.id ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <FieldDescription>No notification times configured.</FieldDescription>
        )}

        {preset.times.length < limits.timesPerPreset && (
          <Dialog open={isAddTimeOpen} onOpenChange={setIsAddTimeOpen}>
             <DialogTrigger asChild>
               <Button variant="outline" size="sm" className="w-full" disabled={isActivating || isDeleting || deletingTimeId !== null}>
                 <Plus className="size-4 mr-2" />
                 Add notification time
               </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add notification time</DialogTitle>
                <DialogDescription>
                  {limits.timesPerPreset - preset.times.length} remaining for this preset
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddTime}>
                <FieldGroup>
                  <Field>
                    <FieldLabel>When to notify</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="30"
                          value={daysBefore}
                          onChange={(e) => setDaysBefore(e.target.value)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          days before at:
                        </span>
                      </div>
                      <TimePicker value={time} onChange={setTime} />
                    </div>
                  </Field>
                  <div className="flex justify-end gap-2">
                     <Button type="button" variant="outline" onClick={() => setIsAddTimeOpen(false)} disabled={isAddingTime}>
                       Cancel
                    </Button>
                    <Button type="submit" disabled={isAddingTime}>
                       {isAddingTime ? <Spinner className="size-4" /> : "Add"}
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>

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
  const { canInstall, isInstalling, installApp, isIos, isAndroid } = usePwaInstall();
  const { isSubscribed, setSubscribed } = usePushNotificationStore();

  React.useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
    }
  }, []);

  async function subscribeToPush() {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
          ),
        });
      }
      const serializedSub = JSON.parse(JSON.stringify(sub));
      await subscribeToPushAction({
        endpoint: serializedSub.endpoint,
        keys: serializedSub.keys,
      });
      setSubscribed(true);
    } catch (error) {
      console.error("Failed to subscribe:", error);
      toast.error("Failed to subscribe to push notifications. Make sure you've added this app to your home screen and granted notification permission.");
    }
    setIsLoading(false);
  }

  async function unsubscribeFromPush() {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await unsubscribeFromPushAction(sub.endpoint);
      }
      setSubscribed(false);
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="size-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>Receive notifications on your device</CardDescription>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-green-500" />
                  <span className="text-sm">Notifications enabled</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={unsubscribeFromPush}
                  disabled={isLoading}
                >
                  Disable
                </Button>
              </div>
            ) : (
              <Button onClick={subscribeToPush} disabled={isLoading}>
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
  const { data: session } = authClient.useSession();
  const [presets, setPresets] = React.useState<Preset[]>([]);
  const [limits, setLimits] = React.useState<Limits>({
    presets: 1,
    timesPerPreset: 2,
  });
  const [newPresetName, setNewPresetName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [hasAssignmentsPermission, setHasAssignmentsPermission] = React.useState<boolean | null>(null);
  const [activatingButton, setActivatingButton] = React.useState<ActivatingButton>(null);

  const role = session?.user?.role as "free" | "basic" | "pro" | "admin" | undefined;

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
     await deletePresetAction(presetId);
     await loadPresets();
  }

  async function handleSetDefault(presetId: string, exams: boolean, assignments: boolean): Promise<void> {
    setActivatingButton({ presetId, type: exams ? "exams" : "assignments" });
    try {
      if (exams) {
        await activatePresetForExamsAction(presetId);
      }
      if (assignments) {
        await activatePresetForAssignmentsAction(presetId);
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
     await updatePresetAction(presetId, name);
     await loadPresets();
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
     await removeNotificationTimeAction(timeId);
     await loadPresets();
  }

  const canAddPreset = presets.length < limits.presets;

  return (
    <SubscriptionGate permission={{ exams: ["access"] }}>
      <div className="flex flex-1 flex-col gap-6 items-center">
        <div className="grid gap-6 w-full max-w-2xl">
          <div>
            <h1 className="text-2xl font-semibold">Notification Settings</h1>
            <p className="text-muted-foreground">
              Configure when you want to be notified about exams and assignments
            </p>
          </div>

          <PushNotificationManager />

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

          {!isInitialLoading && canAddPreset && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create New Preset</CardTitle>
                <CardDescription>
                  {limits.presets - presets.length} preset(s) remaining for your
                  plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePreset}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="preset-name">Preset Name</FieldLabel>
                      <div className="flex gap-2">
                        <Input
                          id="preset-name"
                          value={newPresetName}
                          onChange={(e) => setNewPresetName(e.target.value)}
                          placeholder="e.g., Default reminders"
                        />
                        <Button type="submit" disabled={isLoading}>
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
    </SubscriptionGate>
  );
}
