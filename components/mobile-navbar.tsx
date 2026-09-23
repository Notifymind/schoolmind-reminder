"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Bell, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Home",
    href: "/app",
    icon: Home,
  },
  {
    title: "Notifications",
    href: "/app/notifications",
    icon: Bell,
  },
]

export function MobileNavbar() {
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar()

  return (
    <nav className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-[calc(0.75rem+env(safe-area-inset-left))] right-[calc(0.75rem+env(safe-area-inset-right))] z-50 rounded-2xl border bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href + "/"))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 rounded-lg transition-colors",
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
        <button
          onClick={toggleSidebar}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs font-medium">Menu</span>
        </button>
      </div>
    </nav>
  )
}
