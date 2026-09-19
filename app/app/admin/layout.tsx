import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");
  const permission = await auth.api.userHasPermission({
    body: { userId: session.user.id, permission: { admin: ["access"] } },
  });
  if (!permission?.success) redirect("/app");
  return children;
}
