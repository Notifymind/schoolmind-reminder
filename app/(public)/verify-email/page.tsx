import type { Metadata } from "next";
import { VerifyEmailForm } from "@/components/verify-email-form";

export const metadata: Metadata = {
  title: "Verify your email - NotifyMind",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-svh items-center justify-center px-6 pt-28 pb-10">
      <div className="w-full max-w-sm">
        <VerifyEmailForm
          initialEmail={typeof params.email === "string" ? params.email : ""}
          sent={params.sent === "1"}
          verified={params.verified === "1" && !params.error}
          hasError={Boolean(params.error)}
        />
      </div>
    </div>
  );
}
