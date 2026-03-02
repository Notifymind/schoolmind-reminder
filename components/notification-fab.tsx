"use client"

import * as React from "react"
import { Bell } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { getUserNotificationsAction, getUnreadNotificationCountAction, markAllNotificationsReadAction } from "@/lib/actions/notifications"

type UserNotification = {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: Date
}

export function NotificationFab() {
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="md:hidden fixed bottom-20 right-4 z-40 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-background/60 backdrop-blur shadow-lg transition-transform active:scale-95 text-muted-foreground hover:text-foreground hover:bg-accent"
          aria-label="Open notifications"
        >
          <div className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl" showCloseButton={false}>
        <SheetHeader className="pb-2">
          <SheetTitle className="text-center">Notifications</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="flex flex-col">
              {unreadNotifications.length > 0 && (
                <>
                  {unreadNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex flex-col gap-1 px-4 py-3 hover:bg-accent"
                    >
                      <span className="text-sm font-medium">{notification.title}</span>
                      <span className="text-xs text-muted-foreground">{notification.message}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <Separator className="flex-1 bg-destructive" />
                    <span className="text-xs font-medium text-destructive">NEW</span>
                    <Separator className="flex-1 bg-destructive" />
                  </div>
                </>
              )}
              {readNotifications.length > 0 && (
                <>
                  {unreadNotifications.length > 0 && <Separator />}
                  {readNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex flex-col gap-1 px-4 py-3 hover:bg-accent opacity-60"
                    >
                      <span className="text-sm font-medium">{notification.title}</span>
                      <span className="text-xs text-muted-foreground">{notification.message}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
