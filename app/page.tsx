import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Bell, Calendar, BookOpen, ArrowRight } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="fixed top-0 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="size-6" />
            <span className="font-semibold text-lg">Schoolmind Reminder</span>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="pt-32 pb-20 px-6">
          <div className="container max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Never miss an assignment again
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Get timely reminders for your Schoolmind assignments and exams. 
              Because Schoolmind doesn&apos;t do it for you.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">
                  Get Started <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-muted/50">
          <div className="container max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Bell className="size-8" />}
                title="Push Notifications"
                description="Get instant push notifications for upcoming assignments and deadlines."
              />
              <FeatureCard
                icon={<Calendar className="size-8" />}
                title="Deadline Tracking"
                description="Keep track of all your deadlines in one place with our intuitive calendar view."
              />
              <FeatureCard
                icon={<BookOpen className="size-8" />}
                title="Exam Reminders"
                description="Never forget an exam with timely reminders sent directly to your device."
              />
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="container max-w-3xl text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to stay on top of your schoolwork?</h2>
            <p className="text-muted-foreground mb-8">
              Join other students who never miss a deadline.
            </p>
            <Button size="lg" asChild>
              <Link href="/register">
                Get Started Free <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-6">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Schoolmind Reminder &mdash; Made for students, by students.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}
