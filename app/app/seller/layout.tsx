"use client";

import { RequireSeller } from "@/components/require-seller";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireSeller>{children}</RequireSeller>;
}
