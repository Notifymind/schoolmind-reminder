import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "NotifyMind - Smart Reminders for SchoolMind",
  description: "Never miss an exam or assignment again. Get smart reminders for your SchoolMind exams and assignments.",
};

export default function LandingPage() {
  return (
    <>
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
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
                  Get Started <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div className="flex justify-center">
              <div className="relative p-8 rounded-3xl bg-background">
                <Image
                  src="/images/ios-screenshot.png"
                  alt="NotifyMind iOS App"
                  width={355}
                  height={700}
                  className="rounded-3xl shadow-2xl"
                  priority
                />
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Install as Web App
              </h2>
              
              <p className="text-lg text-muted-foreground">
                NotifyMind works like a native app on your phone. Install it directly from your browser and get push notifications for all your exams and assignments.
              </p>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Open in Safari or Chrome</p>
                    <p className="text-sm text-muted-foreground">
                      Visit NotifyMind on your mobile browser
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Tap Share / Menu</p>
                    <p className="text-sm text-muted-foreground">
                      Look for the share icon or browser menu
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Add to Home Screen</p>
                    <p className="text-sm text-muted-foreground">
                      Select "Add to Home Screen" and confirm
                    </p>
                  </div>
                </div>
              </div>

              <Button size="lg" asChild>
                <Link href="/register">
                  Get Started <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
