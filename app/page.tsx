import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";
import {
  Bell,
  Calendar,
  ClipboardList,
  Clock,
  Smartphone,
  Users,
  Check,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Exam Notifications",
    description:
      "Get reminded before your exams so you never miss one again.",
  },
  {
    icon: ClipboardList,
    title: "Assignment Tracking",
    description:
      "Stay on top of your assignments with timely deadline reminders.",
  },
  {
    icon: Clock,
    title: "Custom Presets",
    description:
      "Create notification schedules that work for you - remind me 2 days before at 9:00 AM.",
  },
  {
    icon: Bell,
    title: "Push Notifications",
    description:
      "Receive alerts directly on your device, even when the app is closed.",
  },
  {
    icon: Smartphone,
    title: "PWA Support",
    description:
      "Install NotifyMind as an app on your phone for quick access.",
  },
  {
    icon: Users,
    title: "Class Sync",
    description:
      "Automatically synced with your class data from SchoolMind.",
  },
];

const steps = [
  {
    number: "01",
    title: "Register & Select Class",
    description: "Create your account and choose your class to get started.",
  },
  {
    number: "02",
    title: "Configure Notifications",
    description:
      "Set up your notification preferences and custom reminder schedules.",
  },
  {
    number: "03",
    title: "Stay Informed",
    description: "Receive automatic reminders for all your exams and assignments.",
  },
];

const pricingPlans = [
  {
    name: "Basic",
    price: "3 KM",
    period: "/month",
    yearlyPrice: "24 KM",
    yearlyPeriod: "/year",
    description: "Perfect for exam preparation",
    features: [
      { text: "Exam access", included: true },
      { text: "1 notification preset", included: true },
      { text: "2 notifications per preset", included: true },
      { text: "Push notifications", included: true },
      { text: "Assignment access", included: false },
      { text: "Trial codes for friends", included: false },
    ],
    cta: "Get Started",
    href: "/register",
    popular: false,
  },
  {
    name: "Pro",
    price: "6 KM",
    period: "/month",
    yearlyPrice: "40 KM",
    yearlyPeriod: "/year",
    yearlySavings: "Save 8 KM",
    description: "Full access to all features",
    features: [
      { text: "Exam access", included: true },
      { text: "5 notification presets", included: true },
      { text: "5 notifications per preset", included: true },
      { text: "Push notifications", included: true },
      { text: "Assignment access", included: true },
      { text: "Trial codes for friends", included: true },
    ],
    cta: "Get Started",
    href: "/register",
    popular: true,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold text-xl">
            NotifyMind
          </Link>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Never Miss an Exam or
              <br />
              Assignment Again
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Get smart reminders for your SchoolMind exams and assignments.
              Because SchoolMind is too shitty to do it themselves.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">
                  Get Started Free <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto max-w-4xl">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="rounded-xl border bg-card shadow-2xl overflow-hidden">
              <div className="h-8 bg-muted border-b flex items-center px-4 gap-2">
                <div className="size-3 rounded-full bg-red-500" />
                <div className="size-3 rounded-full bg-yellow-500" />
                <div className="size-3 rounded-full bg-green-500" />
              </div>
              <div className="p-6 bg-muted/30">
                <div className="grid gap-4">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-background border">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="size-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Mathematics Exam</p>
                      <p className="text-sm text-muted-foreground">
                        Tomorrow at 9:00 AM
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 text-sm font-medium">
                      In 1 day
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-background border">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="size-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Physics Assignment</p>
                      <p className="text-sm text-muted-foreground">
                        Due in 3 days
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-sm font-medium">
                      In 3 days
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-background border">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="size-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Chemistry Exam</p>
                      <p className="text-sm text-muted-foreground">
                        Next Monday at 11:00 AM
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-sm font-medium">
                      In 5 days
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful features to keep you on track with your school work
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow"
              >
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="size-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="size-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that works best for you
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative p-6 rounded-xl border bg-card",
                  plan.popular && "border-primary shadow-lg scale-105"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="font-semibold text-lg mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  {plan.yearlyPrice && (
                    <div className="mt-2">
                      <span className="text-lg font-semibold">
                        {plan.yearlyPrice}
                      </span>
                      <span className="text-muted-foreground">
                        {plan.yearlyPeriod}
                      </span>
                      {plan.yearlySavings && (
                        <span className="ml-2 px-2 py-0.5 bg-green-500/10 text-green-600 text-sm font-medium rounded-full">
                          {plan.yearlySavings}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.description}
                  </p>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "size-4",
                          feature.included
                            ? "text-primary"
                            : "text-muted-foreground opacity-50"
                        )}
                      />
                      <span
                        className={cn(
                          !feature.included && "text-muted-foreground line-through"
                        )}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            Purchase subscription codes from your class seller to upgrade your
            plan.
          </p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Never Miss a Deadline?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join other students who never miss an exam or assignment.
          </p>
          <Button size="lg" asChild>
            <Link href="/register">
              Get Started Free <ArrowRight className="size-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold">NotifyMind</p>
              <p className="text-sm text-muted-foreground">
                Smart reminders for SchoolMind
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} NotifyMind. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
