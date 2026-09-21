"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const links = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Sign In" },
];

export function MarketingMobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="h-11 px-3 md:hidden">
          <Menu className="size-5" aria-hidden="true" />
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        aria-describedby={undefined}
        className="h-dvh w-full gap-0 overflow-y-auto overscroll-contain border-0 px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-none motion-reduce:animate-none"
      >
        <div className="flex min-h-12 items-center justify-between gap-4 border-b pb-4">
          <SheetTitle className="text-lg font-bold">NotifyMind</SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="size-11" aria-label="Close menu">
              <X className="size-6" aria-hidden="true" />
            </Button>
          </SheetClose>
        </div>
        <nav aria-label="Mobile navigation" className="flex flex-col gap-2 py-8">
          {links.map(({ href, label }) => (
            <SheetClose key={href} asChild>
              <Link
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className="rounded-lg px-4 py-4 text-2xl font-medium transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:bg-accent"
              >
                {label}
              </Link>
            </SheetClose>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-6">
          <SheetClose asChild>
            <Button asChild className="h-12 w-full text-base">
              <Link href="/register">Get Started</Link>
            </Button>
          </SheetClose>
          <div className="flex min-h-11 items-center justify-between border-t pt-4 [&_button]:size-11">
            <span className="text-sm text-muted-foreground">Appearance</span>
            <ModeToggle />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
