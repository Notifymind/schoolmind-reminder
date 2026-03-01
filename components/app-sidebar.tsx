"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Home, FileText, ClipboardList, User, LogOut, Sun, Moon, DollarSign, Bell, Ticket, BarChart3, Users, Wallet, GraduationCap } from "lucide-react"

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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { authClient } from "@/lib/auth-client"
import { getUserNotificationsAction, getUnreadNotificationCountAction, markAllNotificationsReadAction } from "@/lib/actions/notifications"
import { Separator } from "@/components/ui/separator"

type UserNotification = {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
}

function NotificationDropdown() {
  const [notifications, setNotifications] = React.useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    getUnreadNotificationCountAction().then((result) => {
      setUnreadCount(result.count)
    })
  }, [])

  React.useEffect(() => {
    if (open) {
      getUserNotificationsAction().then((result) => {
        setNotifications(result.notifications as UserNotification[])
        markAllNotificationsReadAction().then(() => {
          setUnreadCount(0)
        })
      })
    }
  }, [open])

  const unreadNotifications = notifications.filter((n) => !n.read)
  const readNotifications = notifications.filter((n) => n.read)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton tooltip="Notifications">
          <div className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <span>Notifications</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-80 rounded-lg"
        side="top"
        align="start"
        sideOffset={4}
      >
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <>
              {unreadNotifications.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <Separator className="flex-1 bg-destructive" />
                    <span className="text-xs font-medium text-destructive">NEW</span>
                    <Separator className="flex-1 bg-destructive" />
                  </div>
                  {unreadNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex flex-col gap-1 px-2 py-2 hover:bg-accent"
                    >
                      <span className="text-sm font-medium">{notification.title}</span>
                      <span className="text-xs text-muted-foreground">{notification.message}</span>
                    </div>
                  ))}
                </>
              )}
              {readNotifications.length > 0 && (
                <>
                  {unreadNotifications.length > 0 && <DropdownMenuSeparator />}
                  {readNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex flex-col gap-1 px-2 py-2 hover:bg-accent opacity-60"
                    >
                      <span className="text-sm font-medium">{notification.title}</span>
                      <span className="text-xs text-muted-foreground">{notification.message}</span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

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
    subItems: [
      { title: "All Assignments", url: "/app/assignments" },
      { title: "Upcoming Assignments", url: "/app/assignments/upcoming" },
      { title: "Notifications", url: "/app/assignments/notifications" },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const { data: session } = authClient.useSession()

  const userRole = session?.user?.role as "admin" | "seller" | undefined
  const canAccessSellerPlatform = userRole
    ? authClient.admin.checkRolePermission({
        role: userRole,
        permission: {
          seller: ["access"],
        },
      })
    : false

  const canAccessAdminPlatform = userRole
    ? authClient.admin.checkRolePermission({
        role: userRole,
        permission: {
          admin: ["access"],
        },
      })
    : false

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
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton tooltip={item.title}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
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
                  </SidebarMenuItem>
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
                  <SidebarMenuButton asChild tooltip="Codes">
                    <Link href="/app/seller/codes">
                      <Ticket />
                      <span>Codes</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {canAccessAdminPlatform && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Overview">
                    <Link href="/app/admin/overview">
                      <BarChart3 />
                      <span>Overview</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Sellers">
                    <Link href="/app/admin/sellers">
                      <Users />
                      <span>Sellers</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Balance">
                    <Link href="/app/admin/balance">
                      <Wallet />
                      <span>Balance</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Classes">
                    <Link href="/app/admin/classes">
                      <GraduationCap />
                      <span>Classes</span>
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
            <NotificationDropdown />
          </SidebarMenuItem>
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
