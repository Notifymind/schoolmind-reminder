import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getReferralSummary } from "@/db/referrals";
import { CopyReferralButton } from "@/components/copy-referral-button";

export default async function ReferralsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const referral = await getReferralSummary(session.user.id);

  return (
    <div className="mx-auto w-full max-w-xl py-4 sm:py-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Invite a friend.</h1>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          Get 10% back when they add to their balance, up to 5 KM per friend.
        </p>
      </header>

      {referral ? (
        <>
          <section aria-label="Invite a friend" className="mt-6">
            <CopyReferralButton link={referral.link} />
          </section>

          <section aria-label="Your referrals" className="my-8 border-y py-6 sm:my-10">
            <dl className="grid grid-cols-2 gap-4">
              <div className="flex min-w-0 flex-col gap-2">
                <dt className="text-sm text-muted-foreground">Friends referred</dt>
                <dd className="text-3xl font-semibold tracking-tight tabular-nums">{referral.referred}</dd>
              </div>
              <div className="flex min-w-0 flex-col gap-2 border-l pl-4 sm:pl-6">
                <dt className="text-sm text-muted-foreground">Total earned</dt>
                <dd className="break-words text-3xl font-semibold tracking-tight tabular-nums">
                  {referral.earned} <span className="text-sm font-normal text-muted-foreground">KM</span>
                </dd>
              </div>
            </dl>
            {referral.referred === 0 && (
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                Your first referral will appear here when a friend signs up or signs in through your link.
              </p>
            )}
          </section>

          <details>
            <summary className="min-h-11 cursor-pointer content-center rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
              How referrals work
            </summary>
            <div className="space-y-3 pt-3 text-sm leading-relaxed text-muted-foreground">
              <p>Friends can create an account or sign in to an existing one through your link. Each account can only be referred once.</p>
              <p>When they load their balance, you get 10% as credit, up to 5 KM per friend. There’s no limit on how many friends you can refer.</p>
              <p>Sellers can refer friends and earn seller balance credit, but can’t be referred themselves.</p>
            </div>
          </details>
        </>
      ) : (
        <p role="status" className="mt-6 text-sm text-muted-foreground">Your invite link is unavailable. Please refresh the page to try again.</p>
      )}
    </div>
  );
}
