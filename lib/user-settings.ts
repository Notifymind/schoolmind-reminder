export const pillColors = {
  neutral: { label: "Neutral", className: "bg-muted text-muted-foreground" },
  orange: { label: "Orange", className: "bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  red: { label: "Red", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
  amber: { label: "Amber", className: "bg-amber-500/10 text-amber-800 dark:text-amber-400" },
  green: { label: "Green", className: "bg-green-500/10 text-green-700 dark:text-green-400" },
  blue: { label: "Blue", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  purple: { label: "Purple", className: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
} as const;

export type PillColor = keyof typeof pillColors;
export const countdownBands = [
  { key: "today", label: "Today", preview: "Today" },
  { key: "tomorrow", label: "Tomorrow", preview: "Tomorrow" },
  { key: "soon", label: "2–3 days away", preview: "In 3 days" },
  { key: "thisWeek", label: "4–7 days away", preview: "In 7 days" },
  { key: "later", label: "8+ days away", preview: "In 14 days" },
  { key: "past", label: "Past items", preview: "2 days ago" },
] as const;
export type CountdownBand = (typeof countdownBands)[number]["key"];
export type CountdownColors = Record<CountdownBand, PillColor>;
export type SubjectAlias = { subject: string; alias: string };
export type UserSettings = {
  subjectAliases: SubjectAlias[];
  countdownColors: CountdownColors;
};
export const defaultCountdownColors: CountdownColors = {
  today: "orange", tomorrow: "orange", soon: "orange", thisWeek: "orange",
  later: "neutral", past: "neutral",
};
export const defaultUserSettings: UserSettings = {
  subjectAliases: [], countdownColors: defaultCountdownColors,
};

export function validSubjectAliases(value: unknown): value is SubjectAlias[] {
  if (!Array.isArray(value) || value.length > 100) return false;
  const subjects = new Set<string>();
  return value.every((entry) => {
    if (!entry || typeof entry !== "object" ||
      typeof entry.subject !== "string" || typeof entry.alias !== "string" ||
      !entry.subject.trim() || !entry.alias.trim() ||
      entry.subject.length > 200 || entry.alias.length > 100 ||
      entry.subject !== entry.subject.trim() || entry.alias !== entry.alias.trim() ||
      subjects.has(entry.subject)) return false;
    subjects.add(entry.subject);
    return true;
  });
}

export function validCountdownColors(value: unknown): value is CountdownColors {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const colors = value as Record<string, unknown>;
  return Object.keys(colors).length === countdownBands.length && countdownBands.every(
    ({ key }) => typeof colors[key] === "string" && Object.hasOwn(pillColors, colors[key]),
  );
}

export function countdownBand(days: number): CountdownBand {
  if (days < 0) return "past";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 3) return "soon";
  if (days <= 7) return "thisWeek";
  return "later";
}

export function subjectDisplayName(subject: string | null, aliases: SubjectAlias[]): string {
  return aliases.find((entry) => entry.subject === subject)?.alias || subject || "No subject";
}

// Compare local calendar dates, so DST days are still exactly one day apart.
export function getDaysInfo(dueDate: Date | string | null, now = new Date()) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;
  const days = Math.round((
    Date.UTC(due.getFullYear(), due.getMonth(), due.getDate()) -
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  ) / 86400000);
  const text = days < 0 ? `${Math.abs(days)} day${days === -1 ? "" : "s"} ago`
    : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
  return { days, text, isPast: days < 0 };
}
