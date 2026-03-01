"use client";

import * as React from "react";
import { usePageTitle } from "@/app/app/layout";
import { SubscriptionGate } from "@/components/subscription-prompt";
import { authClient } from "@/lib/auth-client";
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
  Send,
} from "lucide-react";
import {
  createPresetAction,
  deletePresetAction,
  activatePresetForExamsAction,
  getPresetsAction,
  addNotificationTimeAction,
  removeNotificationTimeAction,
  updatePresetAction,
  getLimitsAction,
  subscribeToPushAction,
  unsubscribeFromPushAction,
  getPushSubscriptionStatusAction,
} from "@/lib/actions/notifications";
import { testNotificationToAdminsAction } from "@/lib/actions/cron";

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
  createdAt: Date;
  updatedAt: Date;
  times: NotificationTime[];
};

type Limits = {
  presets: number;
  timesPerPreset: number;
};

function PresetCard({
  preset,
  limits,
  onActivate,
  onDelete,
  onEdit,
  onAddTime,
  onRemoveTime,
}: {
  preset: Preset;
  limits: Limits;
  onActivate: () => void;
  onDelete: () => void;
  onEdit: (name: string) => void;
  onAddTime: (daysBefore: number, time: string) => void;
  onRemoveTime: (timeId: number) => void;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(preset.name);
  const [daysBefore, setDaysBefore] = React.useState("1");
  const [time, setTime] = React.useState("09:00");

  const handleSaveEdit = () => {
    if (editName.trim()) {
      onEdit(editName.trim());
      setIsEditing(false);
    }
  };

  const handleAddTime = (e: React.FormEvent) => {
    e.preventDefault();
    const days = parseInt(daysBefore, 10);
    if (!isNaN(days) && days >= 0 && time) {
      onAddTime(days, time);
      setDaysBefore("1");
      setTime("09:00");
    }
  };

  return (
    <Card className={preset.isActiveForExams ? "border-primary" : ""}>
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
                <Button size="sm" onClick={handleSaveEdit}>
                  Save
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
                {preset.isActiveForExams && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </CardTitle>
            )}
            <CardDescription className="mt-1">
              {preset.times.length} notification time(s)
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {!preset.isActiveForExams && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onActivate}
                title="Set as active for exams"
              >
                <Check className="size-4" />
              </Button>
            )}
            {!isEditing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                title="Edit"
              >
                <Edit2 className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
                  onClick={() => onRemoveTime(t.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <FieldDescription>No notification times configured.</FieldDescription>
        )}

        {preset.times.length < limits.timesPerPreset && (
          <form onSubmit={handleAddTime} className="border-t pt-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Add notification time</FieldLabel>
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
                  <Button type="submit" size="sm">
                    <Plus className="size-4" />
                  </Button>
                </div>
                <FieldDescription>
                  {limits.timesPerPreset - preset.times.length} remaining
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function PushNotificationManager() {
  const [isSupported, setIsSupported] = React.useState(false);
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(true);

  async function checkSubscription() {
    const result = await getPushSubscriptionStatusAction();
    setIsSubscribed(result.isSubscribed);
  }

  React.useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      checkSubscription().finally(() => setIsChecking(false));
    } else {
      setIsChecking(false);
    }
  }, []);

  if (isChecking) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner className="size-8" />
        </CardContent>
      </Card>
    );
  }

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
      setIsSubscribed(true);
    } catch (error) {
      console.error("Failed to subscribe:", error);
      alert(
        "Failed to subscribe to push notifications. Make sure you've added this app to your home screen and granted notification permission.",
      );
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
      setIsSubscribed(false);
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
    }
    setIsLoading(false);
  }

  if (!isSupported) {
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
      </CardContent>
    </Card>
  );
}

export default function NotificationsPage() {
  usePageTitle("Exam Notifications");
  const { data: session } = authClient.useSession();
  const [presets, setPresets] = React.useState<Preset[]>([]);
  const [limits, setLimits] = React.useState<Limits>({
    presets: 1,
    timesPerPreset: 2,
  });
  const [newPresetName, setNewPresetName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isTestLoading, setIsTestLoading] = React.useState(false);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);

  const role = session?.user?.role as "free" | "pro" | "admin" | undefined;

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
      alert(result.error);
    } else {
      setNewPresetName("");
      await loadPresets();
    }
    setIsLoading(false);
  }

  async function handleDeletePreset(presetId: number) {
    if (!confirm("Delete this preset?")) return;
    await deletePresetAction(presetId);
    await loadPresets();
  }

  async function handleActivatePreset(presetId: number) {
    await activatePresetForExamsAction(presetId);
    await loadPresets();
  }

  async function handleEditPreset(presetId: number, name: string) {
    await updatePresetAction(presetId, name);
    await loadPresets();
  }

  async function handleAddTime(
    presetId: number,
    daysBefore: number,
    time: string,
  ) {
    const result = await addNotificationTimeAction(presetId, daysBefore, time);
    if ("error" in result) {
      alert(result.error);
    } else {
      await loadPresets();
    }
  }

  async function handleRemoveTime(timeId: number) {
    await removeNotificationTimeAction(timeId);
    await loadPresets();
  }

  async function handleTestNotification() {
    setIsTestLoading(true);
    const result = await testNotificationToAdminsAction();
    setIsTestLoading(false);
    alert(
      `Sent: ${result.sent}/${result.total}\n${result.details.map((d) => `${d.user}: ${d.message}`).join("\n")}`,
    );
  }

  const canAddPreset = presets.length < limits.presets;

  return (
    <SubscriptionGate permission={{ exams: ["access"] }}>
      <div className="flex flex-1 flex-col gap-6 items-center">
        <div className="grid gap-6 w-full max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Exam Notifications</h1>
              <p className="text-muted-foreground">
                Configure when you want to be notified about exams
              </p>
            </div>
            {role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                disabled={isTestLoading}
              >
                <Send className="size-4" />
                {isTestLoading ? "Sending..." : "Test"}
              </Button>
            )}
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
                  onActivate={() => handleActivatePreset(preset.id)}
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
                  Create a preset to set up your exam notifications.
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
