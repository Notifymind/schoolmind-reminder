"use client";

import * as React from "react";
import { usePageTitle } from "@/app/app/layout";
import { getAdminOverviewAction } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, DollarSign, AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface SellerWithDebt {
  id: string;
  name: string;
  email: string;
  balance: string;
  class: string | null;
}

export default function AdminOverviewPage() {
  usePageTitle("Admin Overview");
  const [totalDebt, setTotalDebt] = React.useState("0");
  const [totalRevenue, setTotalRevenue] = React.useState("0");
  const [sellersWithDebt, setSellersWithDebt] = React.useState<SellerWithDebt[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    const result = await getAdminOverviewAction();
    if ("totalDebt" in result) {
      setTotalDebt(result.totalDebt ?? "0");
      setTotalRevenue(result.totalRevenue ?? "0");
      setSellersWithDebt(result.sellersWithDebt ?? []);
    }
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Overview</h1>
          <p className="text-muted-foreground">
            View system statistics and seller debts
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {parseFloat(totalDebt).toFixed(2)} KM
            </div>
            <p className="text-xs text-muted-foreground">
              Sum of all sellers&apos; negative balances
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {parseFloat(totalRevenue).toFixed(2)} KM
            </div>
            <p className="text-xs text-muted-foreground">
              Sum of all redeemed codes
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Sellers with Debt
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sellersWithDebt.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No sellers currently have debt.
            </p>
          ) : (
            <div className="space-y-2">
              {sellersWithDebt.map((seller) => (
                <div
                  key={seller.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{seller.name}</p>
                    <p className="text-sm text-muted-foreground">{seller.email}</p>
                    {seller.class && (
                      <p className="text-xs text-muted-foreground">
                        Class: {seller.class}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-destructive">
                      {parseFloat(seller.balance).toFixed(2)} KM
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
