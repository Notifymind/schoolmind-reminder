import { getUserSettings } from "@/db/user-settings";
import { visibleSubjectEvents } from "@/lib/user-settings";
import type { Metadata } from "next";
import { auth } from "@/lib/auth"
import { getClassNames, getUserClass, getExamsByClass, getAssignmentsByClass, getPresetsWithTimes, getNotificationPreferencesForExams, getNotificationPreferencesForAssignments, getNotificationPresetById, getNotificationTimes } from "@/db"
import { exams, assignments } from "@/db/schema"
import { HomeClient } from "./client"

export const metadata: Metadata = {
  title: "Dashboard - NotifyMind",
  description: "View your upcoming exams and assignments",
};


type Exam = typeof exams.$inferSelect
type Assignment = typeof assignments.$inferSelect

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

type AssignmentPreset = {
  assignmentId: number;
  preset: Preset | null;
  disabled: boolean;
};

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then(m => m.headers()),
  })

  const classes = session?.user?.id ? await getClassNames() : []

  let examsList: Exam[] = []
  let assignmentsList: Assignment[] = []
  let hasClass = false
  let presets: Preset[] = []
  let examPresets: ExamPreset[] = []
  let assignmentPresets: AssignmentPreset[] = []

  if (session?.user?.id) {
    const { hiddenSubjects } = await getUserSettings(session.user.id)
    const userClass = await getUserClass(session.user.id)
    if (userClass) {
      hasClass = true
      const now = new Date()
      const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

      const allExams = visibleSubjectEvents(await getExamsByClass(userClass), hiddenSubjects)
      examsList = allExams
        .filter((exam) => {
          if (!exam.dueDate) return false
          const dueDate = new Date(exam.dueDate)
          return dueDate >= now && dueDate <= fourteenDaysLater
        })
        .sort((a, b) => {
          if (!a.dueDate || !b.dueDate) return 0
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        })

      const allAssignments = visibleSubjectEvents(await getAssignmentsByClass(userClass), hiddenSubjects)
      assignmentsList = allAssignments
        .filter((assignment) => {
          if (!assignment.dueDate) return false
          const dueDate = new Date(assignment.dueDate)
          return dueDate >= now && dueDate <= fourteenDaysLater
        })
        .sort((a, b) => {
          if (!a.dueDate || !b.dueDate) return 0
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        })

      presets = await getPresetsWithTimes(session.user.id) as Preset[]

      if (examsList.length > 0) {
        const examIds = examsList.map(e => e.id)
        const prefs = await getNotificationPreferencesForExams(session.user.id, examIds)
        
        const presetIds = [...new Set(prefs.map(p => p.presetId).filter((id): id is string => id !== null))]
        const presetDetails = await Promise.all(
          presetIds.map(async (id) => {
            const preset = await getNotificationPresetById(id, session.user!.id)
            if (!preset) return null
            const times = await getNotificationTimes(id)
            return { ...preset, times }
          })
        )
        
        const presetMap = new Map<string, Preset>()
        presetDetails.forEach(p => {
          if (p) presetMap.set(p.id, p)
        })

        examPresets = prefs.map(p => ({
          examId: p.examId!,
          preset: p.presetId ? presetMap.get(p.presetId) ?? null : null,
          disabled: p.disabled
        }))
      }

      if (assignmentsList.length > 0) {
        const assignmentIds = assignmentsList.map(a => a.id)
        const prefs = await getNotificationPreferencesForAssignments(session.user.id, assignmentIds)
        
        const presetIds = [...new Set(prefs.map(p => p.presetId).filter((id): id is string => id !== null))]
        const presetDetails = await Promise.all(
          presetIds.map(async (id) => {
            const preset = await getNotificationPresetById(id, session.user!.id)
            if (!preset) return null
            const times = await getNotificationTimes(id)
            return { ...preset, times }
          })
        )
        
        const presetMap = new Map<string, Preset>()
        presetDetails.forEach(p => {
          if (p) presetMap.set(p.id, p)
        })

        assignmentPresets = prefs.map(p => ({
          assignmentId: p.assignmentId!,
          preset: p.presetId ? presetMap.get(p.presetId) ?? null : null,
          disabled: p.disabled
        }))
      }
    }
  }

  return (
    <HomeClient
      classes={classes}
      exams={examsList}
      assignments={assignmentsList}
      hasClass={hasClass}
      isLoggedIn={!!session?.user?.id}
      presets={presets}
      examPresets={examPresets}
      assignmentPresets={assignmentPresets}
    />
  )
}
