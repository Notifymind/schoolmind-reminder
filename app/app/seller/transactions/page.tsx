"use client";

import { usePageTitle } from "@/app/app/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Receipt } from "lucide-react";

export default function TransactionsPage() {
  usePageTitle("Transaction History");

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground">
          View your sales and balance changes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-5" />
            Transactions
          </CardTitle>
          <CardDescription>
            A record of all your code-related transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="size-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No transactions yet</p>
            <p className="text-sm">Transactions will appear here when you generate or delete codes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
