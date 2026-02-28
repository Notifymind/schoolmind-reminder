import { auth } from "@/lib/auth"
import { getUserClass, getExamsByClass } from "@/db"
import { exams } from "@/db/schema"
import { ExamsClient } from "../client"

type Exam = typeof exams.$inferSelect

export default async function UpcomingExamsPage() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then(m => m.headers()),
  })

  let examsList: Exam[] = []
  let hasClass = false

  if (session?.user?.id) {
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
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
        })
    }
  }

  return <ExamsClient exams={examsList} hasClass={hasClass} isLoggedIn={!!session?.user?.id} />
}
