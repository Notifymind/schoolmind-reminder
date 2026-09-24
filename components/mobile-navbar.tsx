"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"

import { useMobileNavigation } from "@/hooks/use-mobile-navigation"

export function MobileNavbar() {
  const pathname = usePathname()
  const { pages, selected } = useMobileNavigation()
  const navItems = selected.flatMap(href => pages.filter(page => page.href === href))
  const { toggleSidebar } = useSidebar()

  return (
    <nav aria-label="Mobile navigation" className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-[calc(0.75rem+env(safe-area-inset-left))] right-[calc(0.75rem+env(safe-area-inset-right))] z-50 rounded-2xl border bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-w-max flex-1 flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.title}</span>
              </Link>
            )
          })}
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex w-16 shrink-0 flex-col items-center justify-center gap-1 px-1 py-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs font-medium">Menu</span>
        </button>
      </div>
    </nav>
  )
}
