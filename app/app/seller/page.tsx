"use client";

import { usePageTitle } from "@/app/app/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Ticket, Receipt, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { getBalanceAction } from "@/lib/actions/seller";
import { useEffect, useState } from "react";

export default function SellerOverviewPage() {
  usePageTitle("Seller Platform");

  const [balance, setBalance] = useState("0");
  const [maxDebt, setMaxDebt] = useState("0");

  useEffect(() => {
    async function loadData() {
      const result = await getBalanceAction();
      setBalance(result.balance);
      setMaxDebt(result.maxDebt);
    }
    loadData();
  }, []);

  const currentBalance = parseFloat(balance);
  const maxDebtValue = parseFloat(maxDebt);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Seller Platform</h1>
        <p className="text-muted-foreground">
          Manage your codes and track your sales
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${currentBalance < 0 ? "text-destructive" : ""}`}>
              {currentBalance.toFixed(2)} KM
            </div>
            {currentBalance < 0 && (
              <p className="text-xs text-muted-foreground">
                Debt: {Math.abs(currentBalance).toFixed(2)} KM / Max: {maxDebtValue.toFixed(2)} KM
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Debt</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maxDebtValue.toFixed(2)} KM</div>
            <p className="text-xs text-muted-foreground">
              Your credit limit
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="size-5" />
              Codes
            </CardTitle>
            <CardDescription>
              Generate and manage subscription codes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Create codes for Basic, Pro, or Upgrade subscriptions. Codes can be redeemed by users to activate their subscription.
            </p>
            <Button asChild>
              <Link href="/app/seller/codes">Manage Codes</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-5" />
              Transaction History
            </CardTitle>
            <CardDescription>
              View your sales and balance history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Track all code generations, redemptions, and balance changes.
            </p>
            <Button variant="outline" asChild>
              <Link href="/app/seller/transactions">View Transactions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
