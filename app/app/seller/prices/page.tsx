"use client";

import { usePageTitle } from "@/app/app/layout";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { GiftCardOption } from "@/lib/billing";
import { getGiftCardOptionsAction } from "@/lib/actions/billing-options";

export default function PricesPage() {
  usePageTitle("Gift card prices");
  const [options, setOptions] = useState<GiftCardOption[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getGiftCardOptionsAction().then(setOptions).catch(() => toast.error("Could not load prices. Please reload.")).finally(() => setLoading(false)); }, []);
  if (loading) return <p>Loading gift card prices...</p>;

  return (
    <div className="grid gap-4 w-full max-w-2xl mx-auto">
      <p className="text-muted-foreground">
        Each option shows the seller cost and the value credited to the buyer. Users redeem cards into their
        balance and choose their own Pro plan.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 font-medium">Gift card value</th>
              <th className="text-right p-3 font-medium">Seller cost</th>
            </tr>
          </thead>
          <tbody>
            {options.map(option => (
              <tr key={option.id} className="border-b">
                <td className="p-3">{option.value} KM</td>
                <td className="p-3 text-right">{option.sellerCost} KM</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
