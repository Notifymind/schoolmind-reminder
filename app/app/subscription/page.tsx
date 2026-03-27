"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { usePageTitle } from "@/app/app/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, X, Gift } from "lucide-react";
import { toast } from "sonner";
import {
  redeemCodeAction,
  getSubscriptionStatusAction,
} from "@/lib/actions/subscription";
import { RequireNotAdminSeller } from "@/components/require-not-admin-seller";

const features = [
  { name: "Exam Access", free: true, pro: true },
  { name: "Assignment Access", free: false, pro: true },
  { name: "App Notifications", free: true, pro: true },
  { name: "Max. notifications", free: "2", pro: "5" },
  { name: "Notification Presets", free: "1", pro: "5" },
  { name: "Price/Month", free: "Free", pro: "4KM" },
  { name: "Price/Year:", free: "Free", pro: "32KM (saves 16KM)" },
];

function SubscriptionContent() {
  const [code, setCode] = React.useState("");
  const [isRedeeming, setIsRedeeming] = React.useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = React.useState<{
    role: string;
    subscriptionEndsAt: Date | null;
    isActive: boolean;
  } | null>(null);

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
    loadStatus();
  }, []);

  async function handleRedeemCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setIsRedeeming(true);

    const result = await redeemCodeAction(code);

    if (result.error) {
      toast.error(result.error);
    } else if (result.success) {
      toast.success(result.message);
      setCode("");
      const status = await getSubscriptionStatusAction();
      setSubscriptionStatus(status);
    }

    setIsRedeeming(false);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
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

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="size-5" />
            Redeem Code
          </CardTitle>
          <CardDescription>
            Enter a gift or promotional code to activate your subscription.
            <br />
            You can buy gift codes from your classes seller.
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
              <Button type="submit" disabled={isRedeeming || !code.trim()}>
                {isRedeeming ? "Redeeming..." : "Redeem"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>

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
