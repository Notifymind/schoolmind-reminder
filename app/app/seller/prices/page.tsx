"use client";

import { usePageTitle } from "@/app/app/layout";
import { GIFT_CARD_VALUES } from "@/lib/billing";

export default function PricesPage() {
  usePageTitle("Gift card prices");

  return (
    <div className="grid gap-4 w-full max-w-2xl mx-auto">
      <p className="text-muted-foreground">
        Sellers pay the full gift card value. Users redeem cards into their
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
            {GIFT_CARD_VALUES.map(value => (
              <tr key={value} className="border-b">
                <td className="p-3">{value} KM</td>
                <td className="p-3 text-right">{value} KM</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
