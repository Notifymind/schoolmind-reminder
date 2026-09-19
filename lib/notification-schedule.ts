// School reminder times are wall-clock times in Sarajevo, regardless of where
// the scheduled function runs. Intl applies winter/summer offsets for each date.
export const NOTIFICATION_TIME_ZONE = "Europe/Sarajevo";

const schoolClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: NOTIFICATION_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function schoolWallTime(date: Date): Date {
  const parts = schoolClock.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)!.value);
  // UTC is only a container for calendar arithmetic here, not the school zone.
  return new Date(Date.UTC(
    value("year"), value("month") - 1, value("day"),
    value("hour"), value("minute"), value("second"),
  ));
}

export function isNotificationDue(
  dueDate: Date,
  daysBefore: number,
  time: string,
  now: Date,
): boolean {
  const scheduled = schoolWallTime(dueDate);
  scheduled.setUTCDate(scheduled.getUTCDate() - daysBefore);
  const [hours, minutes] = time.split(":").map(Number);
  scheduled.setUTCHours(hours, minutes, 0, 0);
  // Compare local calendar values. A skipped spring hour becomes due on the
  // first run after the jump; existing sent records suppress autumn repeats.
  return scheduled <= schoolWallTime(now);
}
