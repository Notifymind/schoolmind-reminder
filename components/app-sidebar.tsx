"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Home, FileText, ClipboardList, User, LogOut, Sun, Moon, DollarSign, Bell, LayoutDashboard, Ticket, Receipt } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { authClient } from "@/lib/auth-client"

const navItems = [
  {
    title: "Home",
    url: "/app",
    icon: Home,
  },
  {
    title: "Exams",
    url: "/app/exams",
    icon: FileText,
    subItems: [
      { title: "All Exams", url: "/app/exams" },
      { title: "Upcoming Exams", url: "/app/exams/upcoming" },
      { title: "Notifications", url: "/app/exams/notifications" },
    ],
  },
  {
    title: "Assignments",
    url: "/app/assignments",
    icon: ClipboardList,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const { data: session } = authClient.useSession()

  const userRole = session?.user?.role as string | undefined
  const canAccessSellerPlatform = userRole === "seller" || userRole === "admin"

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/app">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Bell className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Schoolmind</span>
                  <span className="truncate text-xs">Reminder</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) =>
                item.subItems ? (
                  <Collapsible key={item.title} asChild defaultOpen>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild>
                                <Link href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link href={item.url}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {canAccessSellerPlatform && (
          <SidebarGroup>
            <SidebarGroupLabel>Seller Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Overview">
                    <Link href="/app/seller">
                      <LayoutDashboard />
                      <span>Overview</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Codes">
                    <Link href="/app/seller/codes">
                      <Ticket />
                      <span>Codes</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Transaction History">
                    <Link href="/app/seller/transactions">
                      <Receipt />
                      <span>Transaction History</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={session?.user?.image ?? undefined} alt={session?.user?.name ?? "User"} />
                    <AvatarFallback className="rounded-lg">{session?.user?.name?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{session?.user?.name ?? "User"}</span>
                    <span className="truncate text-xs">{session?.user?.email ?? ""}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/app/account">
                    <User />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/app/subscription">
                    <DollarSign />
                    Subscription
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {mounted && theme === "dark" ? <Sun /> : <Moon />}
                  Toggle theme
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => authClient.signOut()}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
