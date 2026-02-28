import { SubscriptionGate } from "@/components/subscription-prompt"

export default function NotificationsPage() {
  return (
    <SubscriptionGate>
      <h1 className="text-2xl font-bold">Notifications</h1>
      <p className="text-muted-foreground">View your notifications</p>
    </SubscriptionGate>
  )
}
