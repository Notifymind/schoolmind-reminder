import { auth } from "@/lib/auth"
import { getUserClass, getAssignmentsByClass, getReusablePresetsWithTimes, getAssignmentNotificationMetas, getNotificationPresetById, getNotificationTimes } from "@/db"
import { assignments } from "@/db/schema"
import { AssignmentsClient } from "../client"

type Assignment = typeof assignments.$inferSelect

type Preset = Awaited<ReturnType<typeof getReusablePresetsWithTimes>>[number]

type AssignmentPreset = {
  assignmentId: number
  preset: Preset | null
}

export default async function UpcomingAssignmentsPage() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then(m => m.headers()),
  })

  let assignmentsList: Assignment[] = []
  let hasClass = false
  let hasPermission = false
  let presets: Preset[] = []
  let assignmentPresets: AssignmentPreset[] = []

  if (session?.user?.id) {
    const permissionResult = await auth.api.userHasPermission({
      body: {
        userId: session.user.id,
        permission: { assignments: ["access"] },
      },
    })
    hasPermission = permissionResult?.success ?? false

    const userClass = await getUserClass(session.user.id)
    if (userClass) {
      hasClass = true
      const allAssignments = await getAssignmentsByClass(userClass)
      const now = new Date()
      const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      
      assignmentsList = allAssignments
        .filter((assignment) => {
          if (!assignment.dueDate) return false
          const dueDate = new Date(assignment.dueDate)
          return dueDate >= now && dueDate <= fourteenDaysLater
        })
        .sort((a, b) => {
          if (!a.dueDate || !b.dueDate) return 0
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
        })

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

  return (
    <AssignmentsClient 
      assignments={assignmentsList} 
      hasClass={hasClass}
      hasPermission={hasPermission}
      isLoggedIn={!!session?.user?.id}
      presets={presets}
      assignmentPresets={assignmentPresets}
      title="Upcoming Assignments"
    />
  )
}
