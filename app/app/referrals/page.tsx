import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getReferralSummary } from "@/db/referrals";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function ReferralsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const referral = await getReferralSummary(session.user.id);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referrals</h1>
        <p className="text-muted-foreground">Invite friends and earn balance credit when they load their accounts.</p>
      </div>
      {referral && (
        <Card>
          <CardHeader>
            <CardTitle>Refer friends</CardTitle>
            <CardDescription>Earn 10% of their future balance loads, up to 5 KM per friend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label htmlFor="referral-link" className="text-sm font-medium">Your referral link</label>
            <input id="referral-link" readOnly value={referral.link} className="w-full rounded-md border bg-background p-2 text-sm" />
            <p className="text-sm">Referral rewards earned: {referral.earned} KM</p>
            <p className="text-sm text-muted-foreground">Friends can register or sign in with an existing account. Each account can have one permanent referrer. Sellers can refer friends but cannot be referred.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
