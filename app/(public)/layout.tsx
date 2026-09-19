import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-semibold text-xl">
              NotifyMind
            </Link>
            <Button variant="ghost" asChild>
              <Link href="/pricing">Pricing</Link>
            </Button>
          </div>
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

      <main className="min-h-screen bg-background">
        {children}
      </main>

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
    </>
  );
}
