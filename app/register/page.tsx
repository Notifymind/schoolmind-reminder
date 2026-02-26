import { AuthRedirect } from "@/components/auth-redirect"
import { ModeToggle } from "@/components/mode-toggle"
import { RegisterForm } from "@/components/register-form"

export default function Page() {
  return (
    <AuthRedirect>
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="absolute top-4 right-4">
          <ModeToggle />
        </div>
        <div className="w-full max-w-sm">
          <RegisterForm />
        </div>
      </div>
    </AuthRedirect>
  )
}
