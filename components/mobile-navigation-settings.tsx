"use client";

import { Menu } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMobileNavigation } from "@/hooks/use-mobile-navigation";

export function MobileNavigationSettings() {
  const { pages, selected, setSelected, ready } = useMobileNavigation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mobile navigation</CardTitle>
        <CardDescription>Choose pages for the bottom navigation bar. Changes are saved automatically for your account in this browser. Swipe through links when they don&apos;t all fit.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <fieldset disabled={!ready} className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Pages in mobile navigation</legend>
          {pages.map(({ href, title, icon: Icon }) => (
            <label key={href} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
              <input type="checkbox" checked={selected.includes(href)} onChange={event => {
                const next = event.target.checked ? [...selected, href] : selected.filter(page => page !== href);
                if (!setSelected(next)) toast.error("Could not save mobile navigation. Check your browser storage settings.");
              }} className="size-4 accent-primary" />
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {title}
            </label>
          ))}
        </fieldset>
        <div className="flex items-center gap-3 rounded-lg bg-muted p-3 text-sm">
          <Menu aria-hidden="true" className="size-4 shrink-0" />
          <span>Menu is always visible and cannot be removed.</span>
        </div>
      </CardContent>
    </Card>
  );
}
