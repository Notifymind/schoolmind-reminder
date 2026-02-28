"use client";

import * as React from "react";
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
import Link from "next/link";

const features = [
  { name: "Test Reminders", basic: true, pro: true },
  { name: "Assignment Reminders", basic: false, pro: true },
  { name: "Email Reminders", basic: false, pro: true },
  {
    name: "Discord, Telegram, Viber, Whatsapp Reminders",
    basic: true,
    pro: true,
  },
  { name: "Trial Codes for friends", basic: "0", pro: "1" },
  { name: "Max. notifications", basic: "2", pro: "5" },
  { name: "Notification Presets", basic: "1", pro: "3" },
  { name: "Price/Month", basic: "3KM", pro: "5KM" },
  { name: "Price/Quarter", basic: "9KM", pro: "15KM" },
  { name: "Price/Schoolyear", basic: "21KM", pro: "30KM (-5KM)" },
];

export default function SubscriptionPage() {
  usePageTitle("Subscription");
  const [code, setCode] = React.useState("");
  const [isRedeeming, setIsRedeeming] = React.useState(false);

  async function handleRedeemCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setIsRedeeming(true);
    // TODO: Implement code redemption logic
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRedeeming(false);
    setCode("");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center -mt-16 gap-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="size-5" />
            Redeem Code
          </CardTitle>
          <CardDescription>
            Enter a gift or promotional code to activate your subscription.
            <br />
            You can buy gift codes from your clases seller.
            <br />A list of sellers can be found{" "}
            <Link href={"/app/sellers"} className="underline">
              here
            </Link>
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
  );
}
