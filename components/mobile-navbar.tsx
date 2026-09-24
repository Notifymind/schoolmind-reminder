"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"

import { useMobileNavigation } from "@/hooks/use-mobile-navigation"

export function MobileNavbar() {
  const pathname = usePathname()
  const { pages, selected, appearance } = useMobileNavigation()
  const navItems = selected.flatMap(href => pages.filter(page => page.href === href))
  const { toggleSidebar } = useSidebar()

  return (
    <nav aria-label="Mobile navigation" className={cn("fixed z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden", appearance.floating ? "bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-[calc(0.75rem+env(safe-area-inset-left))] right-[calc(0.75rem+env(safe-area-inset-right))] rounded-2xl border shadow-lg" : "inset-x-0 bottom-0 border-t pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]")}>
      <div className="flex h-16 items-center overflow-x-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.title}
              title={item.title}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-11 min-w-max shrink-0 flex-1 flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="h-5 w-5" />
              {appearance.showLabels && <span className="whitespace-nowrap text-xs font-medium">{item.title}</span>}
            </Link>
          )
        })}
        <button
          type="button"
          aria-label="Menu"
          title="Menu"
          onClick={toggleSidebar}
          className="flex min-h-11 min-w-max shrink-0 flex-1 flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
          {appearance.showLabels && <span className="whitespace-nowrap text-xs font-medium">Menu</span>}
        </button>
      </div>
    </nav>
  )
}
