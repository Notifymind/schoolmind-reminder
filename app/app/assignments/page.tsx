import { SubscriptionGate } from "@/components/subscription-prompt"

export default function AssignmentsPage() {
  return (
    <SubscriptionGate>
      <h1 className="text-2xl font-bold">Assignments</h1>
      <p className="text-muted-foreground">Manage your assignments</p>
    </SubscriptionGate>
  )
}
