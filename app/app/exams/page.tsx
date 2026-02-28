import { auth } from "@/lib/auth"
import { getUserClass, getExamsByClass, getReusablePresetsWithTimes, getExamNotificationMetas, getNotificationPresetById } from "@/db"
import { exams } from "@/db/schema"
import { ExamsClient } from "./client"

type Exam = typeof exams.$inferSelect

type Preset = Awaited<ReturnType<typeof getReusablePresetsWithTimes>>[number]

type ExamPreset = {
  examId: number
  preset: Preset | null
}

export default async function ExamsPage() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then(m => m.headers()),
  })

  let examsList: Exam[] = []
  let hasClass = false
  let presets: Preset[] = []
  let examPresets: ExamPreset[] = []

  if (session?.user?.id) {
    const userClass = await getUserClass(session.user.id)
    if (userClass) {
      hasClass = true
      examsList = (await getExamsByClass(userClass)).sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      })

      presets = await getReusablePresetsWithTimes(session.user.id)

      if (examsList.length > 0) {
        const examIds = examsList.map(e => e.id)
        const metas = await getExamNotificationMetas(session.user.id, examIds)
        
        const presetIds = [...new Set(metas.map(m => m.presetId))]
        const presetDetails = await Promise.all(
          presetIds.map(async (id) => {
            const preset = await getNotificationPresetById(id, session.user.id)
            if (!preset) return null
            const times = await (await import("@/db")).getNotificationTimes(id)
            return { ...preset, times }
          })
        )
        
        const presetMap = new Map<number, Preset>()
        presetDetails.forEach(p => {
          if (p) presetMap.set(p.id, p)
        })

        examPresets = metas.map(m => ({
          examId: m.examId,
          preset: presetMap.get(m.presetId) ?? null
        }))
      }
    }
  }

  return (
    <ExamsClient 
      exams={examsList} 
      hasClass={hasClass} 
      isLoggedIn={!!session?.user?.id}
      presets={presets}
      examPresets={examPresets}
    />
  )
}
