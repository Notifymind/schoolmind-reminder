import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password - NotifyMind",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-svh items-center justify-center px-6 pt-28 pb-10">
      <div className="w-full max-w-sm">
        <ResetPasswordForm token={typeof params.token === "string" ? params.token : ""} invalid={Boolean(params.error)} />
      </div>
    </div>
  );
}
