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
import { Check, X, Gift, Copy, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  redeemCodeAction,
  generateTrialCodeAction,
  getSubscriptionStatusAction,
} from "@/lib/actions/subscription";
import { RequireNotAdminSeller } from "@/components/require-not-admin-seller";

const features = [
  { name: "Exam Access", basic: true, pro: true },
  { name: "Assignment Access", basic: false, pro: true },
  { name: "App Notifications", basic: true, pro: true },
  { name: "Max. notifications", basic: "2", pro: "5" },
  { name: "Notification Presets", basic: "1", pro: "5" },
  { name: "Trial Code for Friend", basic: false, pro: true },
  { name: "Price/Month", basic: "3KM", pro: "6KM" },
  { name: "Price/Year:", basic: "24KM", pro: "40KM (saves 8KM)" },
];

export default function SubscriptionPage() {
  usePageTitle("Subscription");

  const { data: session } = authClient.useSession();
  const [code, setCode] = React.useState("");
  const [isRedeeming, setIsRedeeming] = React.useState(false);
  const [isGeneratingTrial, setIsGeneratingTrial] = React.useState(false);
  const [message, setMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = React.useState<{
    role: string;
    subscriptionEndsAt: Date | null;
    isActive: boolean;
    lastTrialCodeGenerated: Date | null;
  } | null>(null);
  const [trialCode, setTrialCode] = React.useState<string | null>(null);

  const searchParams = useSearchParams();
  const [hasTrialPermission, setHasTrialPermission] = React.useState(false);

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

  React.useEffect(() => {
    async function checkPermission() {
      if (session) {
        const result = await authClient.admin.hasPermission({
          permission: {
            trialCode: ["generate"],
          },
        });
        setHasTrialPermission(result.data?.success ?? false);
      } else {
        setHasTrialPermission(false);
      }
    }
    checkPermission();
  }, [session]);

  async function handleRedeemCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setIsRedeeming(true);
    setMessage(null);

    const result = await redeemCodeAction(code);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result.success) {
      setMessage({ type: "success", text: result.message });
      setCode("");
      const status = await getSubscriptionStatusAction();
      setSubscriptionStatus(status);
    }

    setIsRedeeming(false);
  }

  async function handleGenerateTrialCode() {
    setIsGeneratingTrial(true);
    setMessage(null);
    setTrialCode(null);

    const result = await generateTrialCodeAction();

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result.code) {
      setTrialCode(result.code.code);
      setMessage({
        type: "success",
        text: "Trial code generated! Share it with a friend.",
      });
      const status = await getSubscriptionStatusAction();
      setSubscriptionStatus(status);
    }

    setIsGeneratingTrial(false);
  }

  async function copyTrialCode() {
    if (trialCode) {
      await navigator.clipboard.writeText(trialCode);
      setMessage({ type: "success", text: "Code copied to clipboard!" });
    }
  }

  const [canGenerateTrial, setCanGenerateTrial] = React.useState(false);
  const [daysUntilNextTrial, setDaysUntilNextTrial] = React.useState(0);

  React.useEffect(() => {
    if (!hasTrialPermission || !subscriptionStatus) {
      setCanGenerateTrial(false);
      setDaysUntilNextTrial(0);
      return;
    }
    const lastGenerated = subscriptionStatus.lastTrialCodeGenerated;
    if (!lastGenerated) {
      setCanGenerateTrial(true);
      setDaysUntilNextTrial(0);
      return;
    }
    const daysSince = Math.floor(
      (Date.now() - new Date(lastGenerated).getTime()) / (1000 * 60 * 60 * 24),
    );
    setCanGenerateTrial(daysSince >= 30);
    setDaysUntilNextTrial(Math.max(0, 30 - daysSince));
  }, [hasTrialPermission, subscriptionStatus]);

  return (
    <RequireNotAdminSeller>
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

        {message && (
          <div
            className={`w-full max-w-2xl p-4 rounded-md border ${
              message.type === "success"
                ? "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400"
                : "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
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

        {hasTrialPermission && (
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="size-5" />
                Trial Code for Friends
              </CardTitle>
              <CardDescription>
                Generate a 7-day trial code to share with a friend. You can
                generate one trial code per month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trialCode ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-md font-mono text-lg">
                    {trialCode}
                  </div>
                  <Button variant="outline" size="icon" onClick={copyTrialCode}>
                    <Copy className="size-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleGenerateTrialCode}
                  disabled={isGeneratingTrial || !canGenerateTrial}
                >
                  {isGeneratingTrial ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : canGenerateTrial ? (
                    "Generate Trial Code"
                  ) : (
                    `Available in ${daysUntilNextTrial} day(s)`
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <div className="w-full max-w-2xl overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Feature</th>
                <th className="text-center p-3 font-medium">Basic</th>
                <th className="text-center p-3 font-medium">Pro</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr key={index} className="border-b">
                  <td className="p-3">{feature.name}</td>
                  <td className="text-center p-3">
                    {typeof feature.basic === "boolean" ? (
                      feature.basic ? (
                        <Check className="text-primary mx-auto size-5" />
                      ) : (
                        <X className="text-muted-foreground mx-auto size-5" />
                      )
                    ) : (
                      feature.basic
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
    </RequireNotAdminSeller>
  );
}
