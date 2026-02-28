import { auth } from "@/lib/auth"
import { getUserClass, getExamsByClass } from "@/db"
import { exams } from "@/db/schema"
import { ExamsClient } from "./client"

type Exam = typeof exams.$inferSelect

export default async function ExamsPage() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then(m => m.headers()),
  })

  let examsList: Exam[] = []
  let hasClass = false

  if (session?.user?.id) {
    const userClass = await getUserClass(session.user.id)
    if (userClass) {
      hasClass = true
      examsList = await getExamsByClass(userClass)
    }
  }

  return <ExamsClient exams={examsList} hasClass={hasClass} isLoggedIn={!!session?.user?.id} />
}
