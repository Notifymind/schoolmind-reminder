"use client";

import { usePageTitle } from "@/app/app/layout";

const prices = [
  { plan: "Basic / Month", price: "2 KM", retail: "3 KM", commission: "1 KM" },
  { plan: "Basic / Year", price: "16 KM", retail: "24 KM", commission: "8 KM" },
  { plan: "Pro / Month", price: "4 KM", retail: "6 KM", commission: "2 KM" },
  { plan: "Pro / Year", price: "24 KM", retail: "40 KM", commission: "16 KM" },
];

export default function PricesPage() {
  usePageTitle("Prices");

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
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
            {prices.map((p, i) => (
              <tr key={i} className="border-b">
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
