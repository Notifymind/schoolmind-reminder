"use client";

import * as React from "react";
import { usePageTitle } from "@/app/app/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { History, ArrowDownCircle, ArrowUpCircle, MinusCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Pagination } from "@/components/ui/pagination";
import {
  getTransactionHistoryAction,
  type Transaction,
} from "@/lib/actions/seller";

const ITEMS_PER_PAGE = 10;

const TYPE_CONFIG: Record<Transaction["type"], { icon: typeof ArrowDownCircle; color: string; label: string }> = {
  code_generated: { icon: MinusCircle, color: "text-red-500", label: "Code Generated" },
  code_deleted: { icon: ArrowUpCircle, color: "text-green-500", label: "Code Deleted" },
  balance_added: { icon: ArrowUpCircle, color: "text-green-500", label: "Balance Added" },
  balance_removed: { icon: MinusCircle, color: "text-red-500", label: "Balance Removed" },
  balance_set: { icon: ArrowDownCircle, color: "text-blue-500", label: "Balance Set" },
};

export default function HistoryPage() {
  usePageTitle("History");
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [total, setTotal] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  async function loadData() {
    setIsLoading(true);
    const result = await getTransactionHistoryAction(ITEMS_PER_PAGE, (currentPage - 1) * ITEMS_PER_PAGE);
    setTransactions(result.transactions);
    setTotal(result.total);
    setIsLoading(false);
  }

  React.useEffect(() => {
    loadData();
  }, [currentPage]);

  if (isLoading && currentPage === 1) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            View your balance changes from code generation and admin adjustments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="size-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => {
                const config = TYPE_CONFIG[transaction.type];
                const Icon = config.icon;
                const amount = parseFloat(transaction.amount);
                const isPositive = amount > 0;

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`${config.color}`}>
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <p className="font-medium">{config.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.description}
                          {transaction.adminName && ` by ${transaction.adminName}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isPositive ? "text-green-500" : "text-red-500"}`}>
                        {isPositive ? "+" : ""}{amount.toFixed(2)} KM
                      </p>
                      {transaction.newBalance !== null && (
                        <p className="text-xs text-muted-foreground">
                          Balance: {parseFloat(transaction.previousBalance ?? "0").toFixed(2)} → {parseFloat(transaction.newBalance).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
