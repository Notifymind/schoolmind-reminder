"use client"

import { OfflineBanner } from "@/components/offline-manager";
import { PushSubscriptionSync } from "@/components/push-subscription-sync"
import * as React from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { RequireAuth } from "@/components/require-auth"
import { MobileNavbar } from "@/components/mobile-navbar"
import { NotificationFab } from "@/components/notification-fab"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

const PAGE_TITLES: Record<string, string> = {
  "/app": "Dashboard",
  "/app/account": "Account Settings",
  "/app/subscription": "Subscription",
  "/app/referrals": "Referrals",
  "/app/notifications": "Notification Settings",
  "/app/assignments": "Upcoming Assignments",
  "/app/assignments/all": "All Assignments",
  "/app/assignments/notifications": "Assignment Notifications",
  "/app/exams": "Upcoming Exams",
  "/app/exams/all": "All Exams",
  "/app/exams/notifications": "Exam Notifications",
  "/app/admin/overview": "Overview",
  "/app/admin/classes": "Classes",
  "/app/admin/sellers": "Sellers",
  "/app/admin/balance": "Balance",
  "/app/seller/codes": "Codes",
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  
  const baseMatch = Object.keys(PAGE_TITLES).find(key => pathname.startsWith(key + "/"))
  if (baseMatch) return PAGE_TITLES[baseMatch]
  
  return ""
}

const PageTitleContext = React.createContext<{
  title: string
  setTitle: (title: string) => void
}>({ title: "", setTitle: () => {} })

export function usePageTitle(title: string) {
  const { setTitle } = React.useContext(PageTitleContext)
  React.useLayoutEffect(() => {
    setTitle(title)
  }, [title, setTitle])
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [overrideTitle, setOverrideTitle] = React.useState("")
  
  const title = overrideTitle || getPageTitle(pathname)

  return (
    <RequireAuth>
      <SidebarProvider>
        <PushSubscriptionSync />
        <AppSidebar />
        <SidebarInset>
          <OfflineBanner />
          <header className="relative z-10 hidden md:flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {title && <h1 className="text-lg font-semibold">{title}</h1>}
          </header>
          <PageTitleContext.Provider value={{ title, setTitle: setOverrideTitle }}>
            <div className="flex flex-1 flex-col gap-4 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-4">
              {children}
            </div>
          </PageTitleContext.Provider>
        </SidebarInset>
        <MobileNavbar />
        <NotificationFab />
      </SidebarProvider>
    </RequireAuth>
  )
}
