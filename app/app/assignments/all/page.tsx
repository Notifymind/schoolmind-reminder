import { auth } from "@/lib/auth"
import { getUserClass, getAssignmentsByClass, getPresetsWithTimes, getNotificationPreferencesForAssignments, getNotificationPresetById, getNotificationTimes } from "@/db"
import { assignments } from "@/db/schema"
import { AssignmentsClient } from "../client"


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
type AssignmentPreset = {
  assignmentId: number;
  preset: Preset | null;
  disabled: boolean;
};
const ITEMS_PER_PAGE = 10
export default async function AssignmentsPage(props: { searchParams: Promise<{ page?: string }> }) {
  const searchParams = await props.searchParams
  const currentPage = Math.max(1, parseInt(searchParams.page || "1", 10))
  const session = await auth.api.getSession({
    headers: await import("next/headers").then(m => m.headers()),
  })
  let assignmentsList: Assignment[] = []
  let hasClass = false
  let hasPermission = false
  let userRole: string | undefined
  let presets: Preset[] = []
  let assignmentPresets: AssignmentPreset[] = []
  let totalCount = 0
  if (session?.user?.id) {
    userRole = session.user.role as string | undefined
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
      presets = await getPresetsWithTimes(session.user.id)
      if (assignmentsList.length > 0) {
        const assignmentIds = assignmentsList.map(a => a.id)
        const prefs = await getNotificationPreferencesForAssignments(session.user.id, assignmentIds)
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
        assignmentPresets = prefs.map(p => ({
          assignmentId: p.assignmentId!,
          preset: p.presetId ? presetMap.get(p.presetId) ?? null : null,
          disabled: p.disabled
        }))
      }
    }
  }
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  return (
    <AssignmentsClient 
      assignments={assignmentsList} 
      hasClass={hasClass}
      hasPermission={hasPermission}
      isLoggedIn={!!session?.user?.id}
      userRole={userRole}
      presets={presets}
      assignmentPresets={assignmentPresets}
      currentPage={currentPage}
      totalPages={totalPages}
    />
  )
}
