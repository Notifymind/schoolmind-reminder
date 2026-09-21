import type { ReactNode } from "react";
import { Calendar, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SchoolEvent = {
  title: string | null;
  subject: string | null;
  date: string | null;
  time: string | null;
  type: string | null;
  description: string | null;
};

export function SchoolEventCard({
  event,
  fallbackTitle,
  daysInfo,
  action,
  compactDescription = false,
}: {
  event: SchoolEvent;
  fallbackTitle: string;
  daysInfo: { text: string; isUrgent: boolean; isPast: boolean } | null;
  action: ReactNode;
  compactDescription?: boolean;
}) {
  const description = event.description?.trim();
  const showDescription = description && description !== event.title?.trim();

  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm leading-5 text-muted-foreground [overflow-wrap:anywhere]">
              {event.subject || "No subject"}
            </p>
            {event.type && (
              <span className="inline-block max-w-full rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground [overflow-wrap:anywhere]">
                {event.type}
              </span>
            )}
          </div>
          <h3 className="mt-1 text-base font-semibold leading-6 [overflow-wrap:anywhere]">
            {event.title || fallbackTitle}
          </h3>
        </div>
        {action}
      </div>

      {(event.date || event.time || daysInfo) && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pb-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            {event.date && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                {event.date}
              </span>
            )}
            {event.time && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Clock aria-hidden="true" className="size-3.5 shrink-0" />
                {event.time}
              </span>
            )}
          </div>
          {daysInfo && (
            <span
              className={cn(
                "shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-medium",
                daysInfo.isUrgent
                  ? "bg-orange-500/10 text-orange-700 dark:text-orange-400"
                  : "text-muted-foreground",
              )}
            >
              {daysInfo.text}
            </span>
          )}
        </div>
      )}

      {showDescription && (
        <div className="border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
          <p
            className={cn(
              "text-sm leading-5 text-muted-foreground [overflow-wrap:anywhere]",
              compactDescription && "line-clamp-2",
            )}
          >
            {description}
          </p>
        </div>
      )}
    </Card>
  );
}
