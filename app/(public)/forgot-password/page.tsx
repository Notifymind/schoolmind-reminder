import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password - NotifyMind" };

export default function Page() {
  return (
    <div className="flex min-h-svh items-center justify-center px-6 pt-28 pb-10">
      <div className="w-full max-w-sm"><ForgotPasswordForm /></div>
    </div>
  );
}
