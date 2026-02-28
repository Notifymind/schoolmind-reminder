import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Bell, Calendar, Clock, Smartphone } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="container mx-auto flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <Bell className="size-6 text-primary" />
          <span className="text-xl font-bold">Schoolmind Reminder</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
          <ModeToggle />
        </div>
      </header>

      <main className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Never miss an assignment again
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Get timely reminders for your SchoolMind assignments and exams.
          Because SchoolMind doesn&apos;t do it themselves.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg">Get Started Free</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              I have an account
            </Button>
          </Link>
        </div>
      </main>

      <section className="container mx-auto px-6 py-20">
        <div className="grid gap-8 md:grid-cols-3">
          <FeatureCard
            icon={Bell}
            title="Instant Notifications"
            description="Get push notifications for upcoming assignments and exams before they're due."
          />
          <FeatureCard
            icon={Calendar}
            title="Calendar Sync"
            description="View all your assignments and exams in one organized calendar view."
          />
          <FeatureCard
            icon={Smartphone}
            title="Mobile Friendly"
            description="Access your reminders from anywhere with our progressive web app."
          />
        </div>
      </section>

      <footer className="container mx-auto border-t p-6 text-center text-sm text-muted-foreground">
        <p>Schoolmind Reminder - Stay on top of your schoolwork</p>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-6 text-center shadow-sm">
      <div className="rounded-full bg-primary/10 p-3">
        <Icon className="size-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
