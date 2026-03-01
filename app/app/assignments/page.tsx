import { auth } from "@/lib/auth"
import { getUserClass, getAssignmentsByClass, getReusablePresetsWithTimes, getAssignmentNotificationMetas, getNotificationPresetById, getNotificationTimes } from "@/db"
import { assignments } from "@/db/schema"
import { AssignmentsClient } from "./client"

type Assignment = typeof assignments.$inferSelect

type Preset = Awaited<ReturnType<typeof getReusablePresetsWithTimes>>[number]

type AssignmentPreset = {
  assignmentId: number
  preset: Preset | null
}

const ITEMS_PER_PAGE = 10

export default async function AssignmentsPage(props: { searchParams: Promise<{ page?: string }> }) {
  const searchParams = await props.searchParams
  const currentPage = Math.max(1, parseInt(searchParams.page || "1", 10))

  const session = await auth.api.getSession({
    headers: await import("next/headers").then(m => m.headers()),
  })

  let assignmentsList: Assignment[] = []
  let hasClass = false
  let presets: Preset[] = []
  let assignmentPresets: AssignmentPreset[] = []
  let totalCount = 0

  if (session?.user?.id) {
    const userClass = await getUserClass(session.user.id)
    if (userClass) {
      hasClass = true
      const allAssignments = (await getAssignmentsByClass(userClass)).sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      })

      totalCount = allAssignments.length
      assignmentsList = allAssignments.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      )

      presets = await getReusablePresetsWithTimes(session.user.id)

      if (assignmentsList.length > 0) {
        const assignmentIds = assignmentsList.map(a => a.id)
        const metas = await getAssignmentNotificationMetas(session.user.id, assignmentIds)
        
        const presetIds = [...new Set(metas.map(m => m.presetId))]
        const presetDetails = await Promise.all(
          presetIds.map(async (id) => {
            const preset = await getNotificationPresetById(id, session.user.id)
            if (!preset) return null
            const times = await getNotificationTimes(id)
            return { ...preset, times }
          })
        )
        
        const presetMap = new Map<number, Preset>()
        presetDetails.forEach(p => {
          if (p) presetMap.set(p.id, p)
        })

        assignmentPresets = metas.map(m => ({
          assignmentId: m.assignmentId,
          preset: presetMap.get(m.presetId) ?? null
        }))
      }
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <AssignmentsClient 
      assignments={assignmentsList} 
      hasClass={hasClass} 
      isLoggedIn={!!session?.user?.id}
      presets={presets}
      assignmentPresets={assignmentPresets}
      currentPage={currentPage}
      totalPages={totalPages}
    />
  )
}
