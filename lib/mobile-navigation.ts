import { Home, Bell, FileText, ClipboardList, User, Settings, DollarSign, Users, Ticket, History, BarChart3, GraduationCap, Wallet, Gift } from "lucide-react";

export const mobilePages = [
  { href: "/app", title: "Home", icon: Home },
  { href: "/app/exams", title: "Upcoming exams", icon: FileText },
  { href: "/app/exams/all", title: "All exams", icon: FileText },
  { href: "/app/assignments", title: "Upcoming assignments", icon: ClipboardList },
  { href: "/app/assignments/all", title: "All assignments", icon: ClipboardList },
  { href: "/app/notifications", title: "Notifications", icon: Bell },
  { href: "/app/subscription", title: "Subscription", icon: DollarSign, access: "subscriber" },
  { href: "/app/referrals", title: "Referrals", icon: Users },
  { href: "/app/settings", title: "Settings", icon: Settings },
  { href: "/app/account", title: "Account", icon: User },
  { href: "/app/seller/codes", title: "Codes", icon: Ticket, access: "seller" },
  { href: "/app/seller/prices", title: "Prices", icon: DollarSign, access: "seller" },
  { href: "/app/seller/history", title: "History", icon: History, access: "seller" },
  { href: "/app/admin/overview", title: "Overview", icon: BarChart3, access: "admin" },
  { href: "/app/admin/sellers", title: "Sellers", icon: Users, access: "admin" },
  { href: "/app/admin/classes", title: "Classes", icon: GraduationCap, access: "admin" },
  { href: "/app/admin/balance", title: "Balance", icon: Wallet, access: "admin" },
  { href: "/app/admin/gift-cards", title: "Gift cards", icon: Gift, access: "admin" },
  { href: "/app/admin/pricing", title: "Pricing", icon: DollarSign, access: "admin" },
];

export function availableMobilePages(role?: string | null) {
  const roles = role?.split(",") ?? [];
  const admin = roles.includes("admin");
  const seller = admin || roles.includes("seller");
  return mobilePages.filter(page => !page.access ||
    (page.access === "admin" && admin) ||
    (page.access === "seller" && seller) ||
    (page.access === "subscriber" && !seller));
}

export const defaultMobilePages = ["/app", "/app/notifications"];

export function parseMobilePages(value: string | null): string[] {
  if (value === null) return defaultMobilePages;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return defaultMobilePages;
    return [...new Set(parsed.filter((href): href is string =>
      typeof href === "string" && mobilePages.some(page => page.href === href)))];
  } catch {
    return defaultMobilePages;
  }
}

export type NavigationAppearance = { showLabels: boolean; floating: boolean };
export function parseNavigationAppearance(value: string | null): NavigationAppearance {
  try {
    const parsed = JSON.parse(value ?? "{}");
    return { showLabels: parsed?.showLabels !== false, floating: parsed?.floating !== false };
  } catch {
    return { showLabels: true, floating: true };
  }
}

export function placeNavigationPage(selected: string[], href: string, before?: string): string[] {
  if (href === before) return selected;
  const next = selected.filter(page => page !== href);
  const index = before ? next.indexOf(before) : -1;
  next.splice(index < 0 ? next.length : index, 0, href);
  return next;
}
