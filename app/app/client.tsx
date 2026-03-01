"use client"

import * as React from "react"
import Link from "next/link"
import { usePageTitle } from "@/app/app/layout"
import { authClient } from "@/lib/auth-client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, Clock, CalendarClock, BookOpen, Bell, Sparkles, Plus, Trash2, DollarSign } from "lucide-react"
import {
  applyPresetToExamAction,
  createOneTimePresetForExamAction,
  applyPresetToAssignmentAction,
  createOneTimePresetForAssignmentAction,
  getPresetsAction,
  getExamPresetsAction,
  getAssignmentPresetsAction,
  getLimitsAction,
} from "@/lib/actions/notifications"

type Exam = {
  id: number
  className: string
  subject: string | null
  title: string | null
  date: string | null
  time: string | null
  type: string | null
  description: string | null
  dueDate: Date | null
  createdAt: Date | null
}

type Assignment = {
  id: number
  className: string
  subject: string | null
  title: string | null
  date: string | null
  time: string | null
  type: string | null
  description: string | null
  dueDate: Date | null
  createdAt: Date | null
}

type NotificationTime = {
  id: number
  presetId: number
  daysBefore: number
  time: string
  createdAt: Date
}

type Preset = {
  id: number
  userId: string
  name: string
  isActive: boolean
  isActiveForExams: boolean
  isActiveForAssignments: boolean
  isOneTime: boolean
  createdAt: Date
  updatedAt: Date
  times: NotificationTime[]
}

type ExamPreset = {
  examId: number
  preset: Preset | null
}

type AssignmentPreset = {
  assignmentId: number
  preset: Preset | null
}

type Limits = {
  presets: number
  timesPerPreset: number
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 15, 30, 45]

function TimePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [hours, minutes] = value.split(":").map(Number)

  return (
    <div className="flex items-center gap-1">
      <select
        value={hours}
        onChange={(e) =>
          onChange(`${e.target.value.padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`)
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
          onChange(`${hours.toString().padStart(2, "0")}:${e.target.value.padStart(2, "0")}`)
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
  )
}

function CustomPresetDialog({
  open,
  onOpenChange,
  targetId,
  targetType,
  limits,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetId: number
  targetType: "exam" | "assignment"
  limits: Limits
  onCreated: () => void
}) {
  const [times, setTimes] = React.useState<{ daysBefore: number; time: string }[]>([
    { daysBefore: 1, time: "09:00" },
  ])
  const [isLoading, setIsLoading] = React.useState(false)
  const [newDaysBefore, setNewDaysBefore] = React.useState("1")
  const [newTime, setNewTime] = React.useState("09:00")

  const handleAddTime = () => {
    const days = parseInt(newDaysBefore, 10)
    if (!isNaN(days) && days >= 0 && times.length < limits.timesPerPreset) {
      setTimes([...times, { daysBefore: days, time: newTime }])
      setNewDaysBefore("1")
      setNewTime("09:00")
    }
  }

  const handleRemoveTime = (index: number) => {
    setTimes(times.filter((_, i) => i !== index))
  }

  const handleCreate = async () => {
    if (times.length === 0) return
    setIsLoading(true)
    const result =
      targetType === "exam"
        ? await createOneTimePresetForExamAction(targetId, times)
        : await createOneTimePresetForAssignmentAction(targetId, times)
    setIsLoading(false)
    if ("error" in result) {
      alert(result.error)
    } else {
      onCreated()
      onOpenChange(false)
      setTimes([{ daysBefore: 1, time: "09:00" }])
    }
  }

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
                <div key={i} className="flex items-center justify-between rounded-md border p-2">
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
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveTime(i)}>
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
                <span className="text-sm text-muted-foreground whitespace-nowrap">days before at:</span>
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
  )
}

function getDaysText(dueDate: Date | null): string | null {
  if (!dueDate) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays > 1) return `In ${diffDays} days`
  return `${Math.abs(diffDays)} days ago`
}

function ExamCard({
  exam,
  preset,
  presets,
  limits,
  onPresetChange,
}: {
  exam: Exam
  preset: Preset | null
  presets: Preset[]
  limits: Limits
  onPresetChange: () => void
}) {
  const daysText = getDaysText(exam.dueDate)
  const [isCustomDialogOpen, setIsCustomDialogOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSelectPreset = async (value: string) => {
    if (value === "custom") {
      setIsCustomDialogOpen(true)
    } else {
      setIsLoading(true)
      const presetId = parseInt(value, 10)
      await applyPresetToExamAction(exam.id, presetId)
      setIsLoading(false)
      onPresetChange()
    }
  }

  const activePreset = presets.find((p) => p.isActive)

  return (
    <>
      <Card className="gap-1">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">{exam.title || "Untitled Exam"}</CardTitle>
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
                {daysText && (
                  <span className="flex items-center gap-1">
                    <CalendarClock className="size-3" />
                    {daysText}
                  </span>
                )}
                {exam.type && (
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {exam.type}
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
                      preset ? (preset.isOneTime ? "custom" : String(preset.id)) : activePreset ? String(activePreset.id) : ""
                    }
                    onValueChange={handleSelectPreset}
                  >
                    {presets.map((p) => (
                      <DropdownMenuRadioItem key={p.id} value={String(p.id)}>
                        {p.name}
                        {p.isActive && (
                          <span className="text-xs text-muted-foreground ml-1">(default)</span>
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
            </CardAction>
          </div>
        </CardHeader>
        {exam.description && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground line-clamp-2">{exam.description}</p>
          </CardContent>
        )}
      </Card>

      <CustomPresetDialog
        open={isCustomDialogOpen}
        onOpenChange={setIsCustomDialogOpen}
        targetId={exam.id}
        targetType="exam"
        limits={limits}
        onCreated={onPresetChange}
      />
    </>
  )
}

function AssignmentCard({
  assignment,
  preset,
  presets,
  limits,
  onPresetChange,
}: {
  assignment: Assignment
  preset: Preset | null
  presets: Preset[]
  limits: Limits
  onPresetChange: () => void
}) {
  const daysText = getDaysText(assignment.dueDate)
  const [isCustomDialogOpen, setIsCustomDialogOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSelectPreset = async (value: string) => {
    if (value === "custom") {
      setIsCustomDialogOpen(true)
    } else {
      setIsLoading(true)
      const presetId = parseInt(value, 10)
      await applyPresetToAssignmentAction(assignment.id, presetId)
      setIsLoading(false)
      onPresetChange()
    }
  }

  const activePreset = presets.find((p) => p.isActiveForAssignments)

  return (
    <>
      <Card className="gap-1">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">{assignment.title || "Untitled Assignment"}</CardTitle>
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
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
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
                        ? preset.isOneTime
                          ? "custom"
                          : String(preset.id)
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
                          <span className="text-xs text-muted-foreground ml-1">(default)</span>
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
            </CardAction>
          </div>
        </CardHeader>
        {assignment.description && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground line-clamp-2">{assignment.description}</p>
          </CardContent>
        )}
      </Card>

      <CustomPresetDialog
        open={isCustomDialogOpen}
        onOpenChange={setIsCustomDialogOpen}
        targetId={assignment.id}
        targetType="assignment"
        limits={limits}
        onCreated={onPresetChange}
      />
    </>
  )
}

function ProAdCard() {
  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Sparkles className="size-5 text-primary" />
          </div>
          <CardTitle>Upgrade to Pro</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Unlock assignment notifications and never miss a deadline again.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <span>Assignment reminders</span>
          </li>
          <li className="flex items-center gap-2">
            <CalendarClock className="size-4 text-primary" />
            <span>Custom notification times</span>
          </li>
          <li className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span>Priority support</span>
          </li>
        </ul>
        <Button asChild className="w-full">
          <Link href="/app/subscription">View Plans</Link>
        </Button>
      </CardContent>
    </Card>
  )
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
  exams: Exam[]
  assignments: Assignment[]
  hasClass: boolean
  isLoggedIn: boolean
  presets: Preset[]
  examPresets: ExamPreset[]
  assignmentPresets: AssignmentPreset[]
}) {
  usePageTitle("Home")

  const { data: session } = authClient.useSession()
  const [hasAssignmentsPermission, setHasAssignmentsPermission] = React.useState<boolean | null>(null)
  const [presets, setPresets] = React.useState<Preset[]>(initialPresets)
  const [examPresets, setExamPresets] = React.useState<ExamPreset[]>(initialExamPresets)
  const [assignmentPresets, setAssignmentPresets] = React.useState<AssignmentPreset[]>(initialAssignmentPresets)
  const [limits, setLimits] = React.useState<Limits>({ presets: 1, timesPerPreset: 2 })

  React.useEffect(() => {
    async function checkPermission() {
      if (session) {
        const result = await authClient.admin.hasPermission({
          permission: { assignments: ["access"] },
        })
        setHasAssignmentsPermission(result.data?.success ?? false)
      } else {
        setHasAssignmentsPermission(false)
      }
    }
    checkPermission()
  }, [session])

  React.useEffect(() => {
    getLimitsAction().then((result) => setLimits(result.limits))
  }, [])

  const refreshData = async () => {
    const [presetsResult, examPresetsResult, assignmentPresetsResult] = await Promise.all([
      getPresetsAction(),
      getExamPresetsAction(exams.map((e) => e.id)),
      getAssignmentPresetsAction(assignments.map((a) => a.id)),
    ])
    setPresets(presetsResult.presets as Preset[])
    setExamPresets(examPresetsResult.examPresets as ExamPreset[])
    setAssignmentPresets(assignmentPresetsResult.assignmentPresets as AssignmentPreset[])
  }

  const getPresetForExam = (examId: number): Preset | null => {
    const meta = examPresets.find((ep) => ep.examId === examId)
    return meta?.preset ?? null
  }

  const getPresetForAssignment = (assignmentId: number): Preset | null => {
    const meta = assignmentPresets.find((ap) => ap.assignmentId === assignmentId)
    return meta?.preset ?? null
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Please log in to view your dashboard.</p>
      </div>
    )
  }

  if (!hasClass) {
    return (
      <div className="flex flex-1 items-center justify-center -mt-16">
        <div className="bg-card rounded-xl border p-8 max-w-md text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
            <DollarSign className="text-primary size-8" />
          </div>
          <h2 className="text-xl font-semibold">Subscription Required</h2>
          <p className="text-muted-foreground mt-2">
            You need an active subscription to access your class. Subscribe now to see upcoming exams and assignments.
          </p>
          <Button asChild className="mt-6">
            <Link href="/app/subscription">View Plans</Link>
          </Button>
        </div>
      </div>
    )
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
              <p className="text-muted-foreground text-sm">No exams scheduled in the next 14 days.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
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
              <p className="text-muted-foreground text-sm">No assignments due in the next 14 days.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                preset={getPresetForAssignment(assignment.id)}
                presets={presets}
                limits={limits}
                onPresetChange={refreshData}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
