import { auth } from "@/lib/auth"
import { getUserClass, getExamsByClass, getAssignmentsByClass, getPresetsWithTimes, getNotificationPreferencesForExams, getNotificationPreferencesForAssignments, getNotificationPresetById, getNotificationTimes } from "@/db"
import { exams, assignments } from "@/db/schema"
import { HomeClient } from "./client"

type Exam = typeof exams.$inferSelect
type Assignment = typeof assignments.$inferSelect

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
  isActiveForExams: boolean
  isActiveForAssignments: boolean
  activatedForExamsAt: Date | null
  activatedForAssignmentsAt: Date | null
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

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then(m => m.headers()),
  })

  let examsList: Exam[] = []
  let assignmentsList: Assignment[] = []
  let hasClass = false
  let presets: Preset[] = []
  let examPresets: ExamPreset[] = []
  let assignmentPresets: AssignmentPreset[] = []

  if (session?.user?.id) {
    const userClass = await getUserClass(session.user.id)
    if (userClass) {
      hasClass = true
      const now = new Date()
      const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

      const allExams = await getExamsByClass(userClass)
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

      const allAssignments = await getAssignmentsByClass(userClass)
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
        
        const presetIds = [...new Set(prefs.map(p => p.presetId))]
        const presetDetails = await Promise.all(
          presetIds.map(async (id) => {
            const preset = await getNotificationPresetById(id, session.user!.id)
            if (!preset) return null
            const times = await getNotificationTimes(id)
            return { ...preset, times }
          })
        )
        
        const presetMap = new Map<number, Preset>()
        presetDetails.forEach(p => {
          if (p) presetMap.set(p.id, p)
        })

        examPresets = prefs.map(p => ({
          examId: p.examId!,
          preset: presetMap.get(p.presetId) ?? null
        }))
      }

      if (assignmentsList.length > 0) {
        const assignmentIds = assignmentsList.map(a => a.id)
        const prefs = await getNotificationPreferencesForAssignments(session.user.id, assignmentIds)
        
        const presetIds = [...new Set(prefs.map(p => p.presetId))]
        const presetDetails = await Promise.all(
          presetIds.map(async (id) => {
            const preset = await getNotificationPresetById(id, session.user!.id)
            if (!preset) return null
            const times = await getNotificationTimes(id)
            return { ...preset, times }
          })
        )
        
        const presetMap = new Map<number, Preset>()
        presetDetails.forEach(p => {
          if (p) presetMap.set(p.id, p)
        })

        assignmentPresets = prefs.map(p => ({
          assignmentId: p.assignmentId!,
          preset: presetMap.get(p.presetId) ?? null
        }))
      }
    }
  }

  return (
    <HomeClient
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
