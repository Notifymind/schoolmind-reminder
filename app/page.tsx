import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Calendar,
  ClipboardList,
  Clock,
  Smartphone,
  Users,
  Check,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  BookOpen,
  CalendarClock,
} from "lucide-react";

export const metadata: Metadata = {
  title: "NotifyMind - Smart Reminders for SchoolMind",
  description: "Never miss an exam or assignment again. Get smart reminders for your SchoolMind exams and assignments.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex aspect-square size-9 items-center justify-center rounded-lg">
              <Bell className="size-5" />
            </div>
            <span className="font-semibold text-lg">NotifyMind</span>
          </Link>
          <div className="flex items-center gap-3">
            <ModeToggle />
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">
                <Sparkles className="size-3 mr-1" />
                Smart Notifications for Students
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Never Miss an Exam or Assignment Again
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                Get intelligent reminders for your SchoolMind exams and assignments.
                Set custom notification schedules that work for you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="text-base">
                  <Link href="/register">
                    Get Started Free <ArrowRight className="size-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base">
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-primary" />
                  <span>Free tier available</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-primary" />
                  <span>No credit card required</span>
                </div>
              </div>
            </div>

            {/* App Preview */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 rounded-3xl blur-3xl" />
              <Card className="relative border-2 shadow-2xl">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                        <Bell className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">NotifyMind</CardTitle>
                        <CardDescription className="text-xs">Dashboard</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Live</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {/* Exam Card Preview */}
                  <Card className="border">
                    <CardHeader className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-sm">Mathematics Exam</CardTitle>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpen className="size-3" />
                              Mathematics
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              Tomorrow
                            </span>
                            <span className="flex items-center gap-1 text-orange-500">
                              <CalendarClock className="size-3" />
                              In 1 day
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="size-8">
                          <Bell className="size-4" />
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Assignment Card Preview */}
                  <Card className="border">
                    <CardHeader className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-sm">Physics Assignment</CardTitle>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpen className="size-3" />
                              Physics
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              In 3 days
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="size-8">
                          <Bell className="size-4" />
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Another Exam Card Preview */}
                  <Card className="border opacity-75">
                    <CardHeader className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-sm">Chemistry Exam</CardTitle>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpen className="size-3" />
                              Chemistry
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              Next week
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="size-8">
                          <Bell className="size-4" />
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need to Stay on Track</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to keep you organized and never miss a deadline
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Calendar className="size-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Exam Notifications</CardTitle>
                <CardDescription>
                  Get reminded before your exams so you never miss one again. Automatic sync with SchoolMind.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <ClipboardList className="size-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Assignment Tracking</CardTitle>
                <CardDescription>
                  Stay on top of your assignments with timely deadline reminders and progress tracking.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="size-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Custom Presets</CardTitle>
                <CardDescription>
                  Create notification schedules that work for you. Remind me 2 days before at 9:00 AM.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Bell className="size-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Push Notifications</CardTitle>
                <CardDescription>
                  Receive alerts directly on your device, even when the app is closed or in the background.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Smartphone className="size-6 text-primary" />
                </div>
                <CardTitle className="text-lg">PWA Support</CardTitle>
                <CardDescription>
                  Install NotifyMind as an app on your phone or desktop for quick access and offline support.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="size-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Class Sync</CardTitle>
                <CardDescription>
                  Automatically synced with your class data from SchoolMind. No manual entry required.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Simple Process</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Get Started in Minutes</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Four simple steps to never miss another deadline
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                number: "01",
                title: "Register",
                description: "Create your free account to get started with NotifyMind.",
                icon: Shield,
              },
              {
                number: "02",
                title: "Redeem Code",
                description: "Redeem a subscription code from your class seller.",
                icon: Sparkles,
              },
              {
                number: "03",
                title: "Configure",
                description: "Set up your notification preferences and custom presets.",
                icon: Clock,
              },
              {
                number: "04",
                title: "Stay Informed",
                description: "Receive automatic reminders for all your exams and assignments.",
                icon: Zap,
              },
            ].map((step) => (
              <div key={step.number} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="size-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-4">
                    {step.number}
                  </div>
                  <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <step.icon className="size-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that works best for your needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <Card className="border-2">
              <CardHeader>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold">Free</h3>
                    <p className="text-sm text-muted-foreground mt-1">Perfect for exam preparation</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold">0 KM</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Check className="size-5 text-primary flex-shrink-0" />
                    <span>Exam access</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Check className="size-5 opacity-30 flex-shrink-0" />
                    <span className="line-through">Assignment access</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="size-5 text-primary flex-shrink-0" />
                    <span>Push notifications</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="size-5 text-primary flex-shrink-0" />
                    <span><strong>1</strong> notification preset</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="size-5 text-primary flex-shrink-0" />
                    <span><strong>2</strong> notifications per preset</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full" size="lg" asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-2 border-primary shadow-lg relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="px-4 py-1">Most Popular</Badge>
              </div>
              <CardHeader>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold">Pro</h3>
                    <p className="text-sm text-muted-foreground mt-1">Full access to all features</p>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold">3 KM</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      or <strong className="text-foreground">24 KM</strong>/year
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Check className="size-5 text-primary flex-shrink-0" />
                    <span>Exam access</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="size-5 text-primary flex-shrink-0" />
                    <span>Assignment access</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="size-5 text-primary flex-shrink-0" />
                    <span>Push notifications</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="size-5 text-primary flex-shrink-0" />
                    <span><strong>5</strong> notification presets</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="size-5 text-primary flex-shrink-0" />
                    <span><strong>10</strong> notifications per preset</span>
                  </li>
                </ul>
                <Button className="w-full" size="lg" asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Purchase subscription codes from your class seller to upgrade your plan.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-2 overflow-hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
              <CardContent className="relative py-16 px-6 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Ready to Never Miss a Deadline?
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join students who stay organized and never miss an exam or assignment with NotifyMind.
                </p>
                <Button size="lg" asChild className="text-base">
                  <Link href="/register">
                    Get Started Free <ArrowRight className="size-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4 bg-muted/20">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground flex aspect-square size-9 items-center justify-center rounded-lg">
                <Bell className="size-5" />
              </div>
              <div>
                <p className="font-semibold">NotifyMind</p>
                <p className="text-sm text-muted-foreground">Smart reminders for SchoolMind</p>
              </div>
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
