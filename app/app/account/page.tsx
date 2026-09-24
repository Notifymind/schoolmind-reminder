import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getClassNames, getUserClass, getUserRole, hasSellerDebt } from "@/db";
import { ClassSelectionCard } from "@/components/class-selection-card";
import { AccountClient } from "./client";
import { BackToSettings } from "@/components/back-to-settings";

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const [role, deletionBlockedByDebt] = session?.user?.id
    ? await Promise.all([getUserRole(session.user.id), hasSellerDebt(session.user.id)])
    : [null, false];
  const canChangeClass = !!session?.user?.id && !role?.split(",").includes("seller");
  const [classes, currentClass] = session?.user?.id && canChangeClass
    ? await Promise.all([getClassNames(), getUserClass(session.user.id)])
    : [[], null];

  return (
    <AccountClient deletionBlockedByDebt={deletionBlockedByDebt}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Account</h1>
        <div className="ml-auto">
          <BackToSettings />
        </div>
      </div>
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
