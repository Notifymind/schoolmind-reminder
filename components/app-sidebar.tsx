"use client"

import { disablePush } from "@/lib/push-client";
import { toast } from "sonner";

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Home, FileText, ClipboardList, User, LogOut, Sun, Moon, DollarSign, Bell, Inbox, Ticket, BarChart3, Users, Wallet, GraduationCap, History, Settings } from "lucide-react"

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
import { clearOfflineData } from "@/lib/offline/store";
import { useAppSession } from "@/lib/offline/session";
import { authClient } from "@/lib/auth-client"
import { getUserNotificationsAction, getUnreadNotificationCountAction, markAllNotificationsReadAction } from "@/lib/offline/notifications"
import { Separator } from "@/components/ui/separator"

type UserNotification = {
  id: string;
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
        markAllNotificationsReadAction().then((result) => {
          if ("error" in result) return;
          setUnreadCount(0)
        }).catch(() => {})
      })
    }
  }, [open])

  const unreadNotifications = notifications.filter((n) => !n.read)
  const readNotifications = notifications.filter((n) => n.read)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton tooltip="Inbox">
          <div className="relative">
            <Inbox className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <span>Inbox</span>
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
      { title: "Upcoming Exams", url: "/app/exams" },
      { title: "All Exams", url: "/app/exams/all" },
    ],
  },
  {
    title: "Assignments",
    url: "/app/assignments",
    icon: ClipboardList,
    subItems: [
      { title: "Upcoming Assignments", url: "/app/assignments" },
      { title: "All Assignments", url: "/app/assignments/all" },
    ],
  },
  {
    title: "Notifications",
    url: "/app/notifications",
    icon: Bell,
  },
  {
    title: "Subscription",
    url: "/app/subscription",
    icon: DollarSign,
  },
  {
    title: "Referrals",
    url: "/app/referrals",
    icon: Users,
  },
  {
    title: "Settings",
    url: "/app/settings",
    icon: Settings,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const { data: session } = useAppSession()

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
            <SidebarMenuButton size="lg" asChild className="h-16 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:p-2">
              <Link href="/app">
                <div className="flex aspect-square size-12 shrink-0 items-center justify-center rounded-lg group-data-[collapsible=icon]:size-8">
                  <Image
                    src="/android-chrome-512x512.png"
                    alt="NotifyMind"
                    width={48}
                    height={48}
                    className="size-12 rounded-lg group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8"
                  />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-lg font-bold">NotifyMind</span>
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
              {navItems
                .filter((item) => {
                  if (item.title === "Subscription") {
                    return !canAccessAdminPlatform && !canAccessSellerPlatform;
                  }
                  return true;
                })
                .map((item) =>
                  item.subItems ? (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title} isActive={item.subItems?.some((sub) => pathname === sub.url)}>
                        <Link href={item.url}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      <SidebarMenuSub>
                        {item.subItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
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
                      <SidebarMenuButton asChild tooltip={item.title} isActive={pathname === item.url}>
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
                  <SidebarMenuButton asChild tooltip="Codes" isActive={pathname === "/app/seller/codes"}>
                    <Link href="/app/seller/codes">
                      <Ticket />
                      <span>Codes</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Prices" isActive={pathname === "/app/seller/prices"}>
                    <Link href="/app/seller/prices">
                      <DollarSign />
                      <span>Prices</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="History" isActive={pathname === "/app/seller/history"}>
                    <Link href="/app/seller/history">
                      <History />
                      <span>History</span>
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
                  <SidebarMenuButton asChild tooltip="Overview" isActive={pathname === "/app/admin/overview"}>
                    <Link href="/app/admin/overview">
                      <BarChart3 />
                      <span>Overview</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Sellers" isActive={pathname === "/app/admin/sellers"}>
                    <Link href="/app/admin/sellers">
                      <Users />
                      <span>Sellers</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Balance" isActive={pathname === "/app/admin/balance"}>
                    <Link href="/app/admin/balance">
                      <Wallet />
                      <span>Balance</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Pro pricing" isActive={pathname === "/app/admin/pricing"}>
                    <Link href="/app/admin/pricing"><DollarSign /><span>Pro pricing</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Gift card options" isActive={pathname === "/app/admin/gift-cards"}>
                    <Link href="/app/admin/gift-cards"><Ticket /><span>Gift card options</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Classes" isActive={pathname === "/app/admin/classes"}>
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
          <SidebarMenuItem className="hidden md:block">
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
                <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {mounted && theme === "dark" ? <Sun /> : <Moon />}
                  Toggle theme
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={async () => {
                  try {
                    await disablePush(async () => {
                      const result = await authClient.signOut();
                      if (result.error) throw new Error(result.error.message);
                      await clearOfflineData();
                    });
                  } catch {
                    toast.error("Could not safely log out. Please retry while online.");
                  }
                }}>
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
