"use client"

import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Bell, CalendarClock, Layers } from "lucide-react"

export function ProAdCard() {
  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Sparkles className="size-5 text-primary" />
          </div>
          <CardTitle>Upgrade to Pro</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Unlock assignment access and never miss a deadline again.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <span>Assignment reminders</span>
          </li>
          <li className="flex items-center gap-2">
            <CalendarClock className="size-4 text-primary" />
            <span>More notification times</span>
          </li>
          <li className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <span>More notification presets</span>
          </li>
        </ul>
        <Button asChild className="w-full">
          <Link href="/app/subscription">View Plans</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
