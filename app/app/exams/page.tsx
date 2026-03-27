import type { Metadata } from "next";
import { auth } from "@/lib/auth"
import { getUserClass, getExamsByClass, getPresetsWithTimes, getNotificationPreferencesForExams, getNotificationPresetById, getNotificationTimes } from "@/db"
import { exams } from "@/db/schema"
import { ExamsClient } from "./client"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Upcoming Exams - NotifyMind",
  description: "View and manage notifications for your upcoming exams",
};

type Exam = typeof exams.$inferSelect

type Preset = Awaited<ReturnType<typeof getPresetsWithTimes>>[number]

type ExamPreset = {
  examId: number
  preset: Preset | null
  disabled: boolean
}

export default async function UpcomingExamsPage() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then(m => m.headers()),
  })

  let examsList: Exam[] = []
  let hasClass = false
  let hasPermission = false
  let presets: Preset[] = []
  let examPresets: ExamPreset[] = []

  if (session?.user?.id) {
    const permissionResult = await auth.api.userHasPermission({
      body: {
        userId: session.user.id,
        permission: { exams: ["access"] },
      },
    })
    hasPermission = permissionResult?.success ?? false

    const userClass = await getUserClass(session.user.id)
    if (userClass) {
      hasClass = true
      const allExams = await getExamsByClass(userClass)
      const now = new Date()
      const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      
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

      presets = await getPresetsWithTimes(session.user.id)

      if (examsList.length > 0) {
        const examIds = examsList.map(e => e.id)
        const prefs = await getNotificationPreferencesForExams(session.user.id, examIds)
        
        const presetIds = [...new Set(prefs.map(p => p.presetId).filter((id): id is string => id !== null))]
        const presetDetails = await Promise.all(
          presetIds.map(async (id) => {
            const preset = await getNotificationPresetById(id, session.user.id)
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
    }
  }

  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center"><div className="text-muted-foreground">Loading...</div></div>}>
      <ExamsClient 
        exams={examsList} 
        hasClass={hasClass}
        hasPermission={hasPermission}
        isLoggedIn={!!session?.user?.id}
        presets={presets}
        examPresets={examPresets}
        title="Upcoming Exams"
      />
    </Suspense>
  )
}
