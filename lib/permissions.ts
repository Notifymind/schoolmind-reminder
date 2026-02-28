export function hasCodePermission(role: string | null | undefined): boolean {
  if (!role) return false;
  return role === "seller" || role === "admin";
}
