import type { Metadata } from "next";
import { AuthRedirect } from "@/components/auth-redirect"
import { LoginForm } from "@/components/login-form"
import { ModeToggle } from "@/components/mode-toggle"

export const metadata: Metadata = {
  title: "Sign In - NotifyMind",
  description: "Sign in to your NotifyMind account",
};

export default function Page() {
  return (
    <AuthRedirect>
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="absolute top-4 right-4">
          <ModeToggle />
        </div>
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </AuthRedirect>
  )
}
