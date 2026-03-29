"use client";

import { usePageTitle } from "@/app/app/layout";

const prices = [
  { plan: "Pro / Month", price: "2 KM", retail: "3 KM", commission: "1 KM" },
  { plan: "Pro / Year", price: "16 KM", retail: "24 KM", commission: "8 KM" },
  { plan: "Assign (Class)", price: "0 KM", retail: "Free", commission: "0 KM" },
];

export default function PricesPage() {
  usePageTitle("Prices");

  return (
    <div className="grid gap-4 w-full max-w-2xl mx-auto">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 font-medium">Plan</th>
              <th className="text-right p-3 font-medium">Price</th>
              <th className="text-right p-3 font-medium">Retail</th>
              <th className="text-right p-3 font-medium">Commission</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p) => (
              <tr key={p.plan} className="border-b">
                <td className="p-3">{p.plan}</td>
                <td className="p-3 text-right">{p.price}</td>
                <td className="p-3 text-right">{p.retail}</td>
                <td className="p-3 text-right">{p.commission}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
