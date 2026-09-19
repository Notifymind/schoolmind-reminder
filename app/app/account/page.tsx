import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getClassNames, getUserClass } from "@/db";
import { ClassSelectionCard } from "@/components/class-selection-card";
import { AccountClient } from "./client";

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const [classes, currentClass] = session?.user?.id
    ? await Promise.all([getClassNames(), getUserClass(session.user.id)])
    : [[], null];

  return (
    <AccountClient>
      {session?.user?.id && (
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
