import { SubscriptionGate } from "@/components/subscription-prompt"

export default function HomePage() {
  return (
    <SubscriptionGate permission={{ exams: ["access"] }}>
      <h1 className="text-2xl font-bold">Home</h1>
      <p className="text-muted-foreground">Welcome to Schoolmind Reminder</p>
    </SubscriptionGate>
  )
}
