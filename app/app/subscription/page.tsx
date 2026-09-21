"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { usePageTitle } from "@/app/app/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProPriceCarousel } from "@/components/pro-price-carousel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowRight, Check, X, Gift } from "lucide-react";
import { toast } from "sonner";
import {
  redeemCodeAction,
  getSubscriptionStatusAction,
  subscribeToProAction,
  cancelProRenewalAction,
} from "@/lib/actions/subscription";
import { type ProPlan } from "@/lib/billing";
import { getProPlansAction } from "@/lib/actions/billing-options";
import { authClient } from "@/lib/auth-client";
import { RequireNotAdminSeller } from "@/components/require-not-admin-seller";

const features = [
  { name: "Exam Access", free: true, pro: true },
  { name: "Assignment Access", free: false, pro: true },
  { name: "App Notifications", free: true, pro: true },
  { name: "Max. notifications per Preset", free: "2", pro: "10" },
  { name: "Notification Presets", free: "1", pro: "5" },
];

function SubscriptionContent() {
  const { refetch: refreshSession } = authClient.useSession();
  const [code, setCode] = React.useState("");
  const [isRedeeming, setIsRedeeming] = React.useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = React.useState<Awaited<ReturnType<typeof getSubscriptionStatusAction>>>(null);
  const [plans, setPlans] = React.useState<ProPlan[]>([]);
  React.useEffect(() => { getProPlansAction().then(setPlans).catch(() => toast.error("Could not load Pro pricing. Please reload.")); }, []);
  const renewalPlan = plans.find(plan => plan.id === subscriptionStatus?.plan);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [subscribeOpen, setSubscribeOpen] = React.useState(false);

  async function updateSubscription(plan?: string) {
    setIsUpdating(true);
    try {
      const result = plan ? await subscribeToProAction(plan) : await cancelProRenewalAction();
      if ("error" in result && result.error) toast.error(result.error);
      else {
        toast.success(plan ? "Pro subscription updated" : "Automatic renewal canceled");
        if (plan) setSubscribeOpen(false);
        setSubscriptionStatus(await getSubscriptionStatusAction());
        await refreshSession({ query: { disableCookieCache: true } });
      }
    } catch {
      toast.error("Could not update your subscription. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  }

  const searchParams = useSearchParams();

  React.useEffect(() => {
    const codeParam = searchParams.get("code");
    if (codeParam) {
      setCode(codeParam.toUpperCase());
    }
  }, [searchParams]);

  React.useEffect(() => {
    async function loadStatus() {
      const status = await getSubscriptionStatusAction();
      setSubscriptionStatus(status);
    }
    loadStatus().catch(() => toast.error("Could not load your balance. Please reload the page."));
  }, []);

  async function handleRedeemCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setIsRedeeming(true);

    try {
      const result = await redeemCodeAction(code);

      if (result.error) {
        toast.error(result.error);
      } else if ("success" in result && result.success) {
        toast.success(result.message);
        setCode("");
        const status = await getSubscriptionStatusAction();
        setSubscriptionStatus(status);
      }

    } catch {
      toast.error("Could not redeem your gift card. Please try again.");
    } finally {
      setIsRedeeming(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="size-5" />
            Redeem Code
          </CardTitle>
          <CardDescription>
            Enter a gift card code to add money to your balance.
            <br />
            Buy gift cards from your class seller. Redeeming a card does not start a subscription.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRedeemCode}>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter your code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono uppercase"
              />
              <Button type="submit" disabled={isRedeeming || isUpdating || !code.trim()}>
                {isRedeeming ? "Redeeming..." : "Redeem"}
              </Button>
            </div>
          </CardContent>
        </form>
        <Dialog open={subscribeOpen} onOpenChange={(open) => {
          if (!isUpdating) setSubscribeOpen(open);
        }}>
          <CardContent className="space-y-4 border-t pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <CardTitle>Balance: {subscriptionStatus ? `${subscriptionStatus.balance} KM` : "Loading..."}</CardTitle>
              {!subscriptionStatus?.autoRenew && (
                <DialogTrigger asChild>
                  <Button className="shrink-0" disabled={!subscriptionStatus || !plans.length || isUpdating || isRedeeming}>
                    Subscribe
                  </Button>
                </DialogTrigger>
              )}
            </div>
            {subscriptionStatus?.autoRenew && (
              <div className="space-y-4">
                <p>Automatic renewal is on{renewalPlan ? `: ${renewalPlan.price} KM every ${renewalPlan.duration} ${renewalPlan.unit}` : ""}.</p>
                <Button variant="outline" disabled={isUpdating} onClick={() => updateSubscription()}>Cancel automatic renewal</Button>
              </div>
            )}
          </CardContent>
          <DialogContent className="sm:max-w-sm" showCloseButton={!isUpdating}>
            <DialogHeader>
              <DialogTitle>Subscribe to Pro</DialogTitle>
              <DialogDescription>
                {subscriptionStatus?.isActive
                  ? "Renewal starts when your current access ends. No charge today."
                  : "Pay from your balance. Your plan renews automatically."}
              </DialogDescription>
            </DialogHeader>
            <ProPriceCarousel
              options={plans}
              disabled={isUpdating || isRedeeming}
              renderAction={(plan, moving) => (
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={isUpdating}>Cancel</Button>
                  </DialogClose>
                  <Button
                    disabled={!subscriptionStatus || isUpdating || isRedeeming || moving}
                    onClick={() => updateSubscription(plan.id)}
                    aria-label={`Subscribe: ${plan.label}, ${plan.price} KM for ${plan.duration} ${plan.unit}`}
                  >
                    {isUpdating ? "Subscribing..." : "Subscribe"}
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </DialogFooter>
              )}
            />
          </DialogContent>
        </Dialog>
      </Card>
      {subscriptionStatus?.isActive && (
        <Card className="w-full max-w-2xl border-green-500/50 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-green-600 dark:text-green-400">
              Active Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              You have an active{" "}
              <strong>{subscriptionStatus.role.toUpperCase()}</strong>{" "}
              subscription
              {subscriptionStatus.subscriptionEndsAt && (
                <>
                  {" "}
                  until{" "}
                  <strong>
                    {new Date(
                      subscriptionStatus.subscriptionEndsAt,
                    ).toLocaleDateString("de-DE")}
                  </strong>
                </>
              )}
              .
            </p>
          </CardContent>
        </Card>
      )}


      <div className="w-full max-w-2xl overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 font-medium">Feature</th>
              <th className="text-center p-3 font-medium">Free</th>
              <th className="text-center p-3 font-medium">Pro</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr key={feature.name} className="border-b">
                <td className="p-3">{feature.name}</td>
                <td className="text-center p-3">
                  {typeof feature.free === "boolean" ? (
                    feature.free ? (
                      <Check className="text-primary mx-auto size-5" />
                    ) : (
                      <X className="text-muted-foreground mx-auto size-5" />
                    )
                  ) : (
                    feature.free
                  )}
                </td>
                <td className="text-center p-3">
                  {typeof feature.pro === "boolean" ? (
                    feature.pro ? (
                      <Check className="text-primary mx-auto size-5" />
                    ) : (
                      <X className="text-muted-foreground mx-auto size-5" />
                    )
                  ) : (
                    feature.pro
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  usePageTitle("Subscription");

  return (
    <RequireNotAdminSeller>
      <React.Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        }
      >
        <SubscriptionContent />
      </React.Suspense>
    </RequireNotAdminSeller>
  );
}
