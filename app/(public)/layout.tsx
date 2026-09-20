import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { MarketingMobileMenu } from "@/components/marketing-mobile-menu";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 px-4 py-2 backdrop-blur-sm">
        <div className="w-full h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <img src="/android-chrome-512x512.png" alt="NotifyMind" width={48} height={48} className="size-12 shrink-0" />
              <span className="text-lg font-bold leading-tight">NotifyMind</span>
            </Link>
            <div className="hidden items-center gap-1 md:flex">
              <Button variant="ghost" className="px-3" asChild>
                <Link href="/">Home</Link>
              </Button>
              <Button variant="ghost" className="px-3" asChild>
                <Link href="/pricing">Pricing</Link>
              </Button>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <ModeToggle />
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
          <MarketingMobileMenu />
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
