"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, ClipboardList, Bell, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Exams",
    href: "/app/exams",
    icon: FileText,
  },
  {
    title: "Assignments",
    href: "/app/assignments",
    icon: ClipboardList,
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
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
          className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent min-w-[60px]"
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs font-medium">Menu</span>
        </button>
      </div>
    </nav>
  )
}
