import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getClassNames, getUserClass, getUserRole } from "@/db";
import { ClassSelectionCard } from "@/components/class-selection-card";
import { AccountClient } from "./client";

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user?.id ? await getUserRole(session.user.id) : null;
  const canChangeClass = !!session?.user?.id && !role?.split(",").includes("seller");
  const [classes, currentClass] = session?.user?.id && canChangeClass
    ? await Promise.all([getClassNames(), getUserClass(session.user.id)])
    : [[], null];

  return (
    <AccountClient>
      {canChangeClass && (
        <ClassSelectionCard
          key={currentClass ?? "unassigned"}
          classes={classes}
          currentClass={currentClass}
          className="w-full"
        />
      )}
    </AccountClient>
  );
}
