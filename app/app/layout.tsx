"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { RequireAuth } from "@/components/require-auth"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

const PageTitleContext = React.createContext<{
  title: string
  setTitle: (title: string) => void
}>({ title: "", setTitle: () => {} })

export function usePageTitle(title: string) {
  const { setTitle } = React.useContext(PageTitleContext)
  React.useEffect(() => {
    setTitle(title)
    return () => setTitle("")
  }, [title, setTitle])
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [title, setTitle] = React.useState("")

  return (
    <RequireAuth>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {title && <h1 className="text-lg font-semibold">{title}</h1>}
          </header>
          <PageTitleContext.Provider value={{ title, setTitle }}>
            {children}
          </PageTitleContext.Provider>
        </SidebarInset>
      </SidebarProvider>
    </RequireAuth>
  )
}
