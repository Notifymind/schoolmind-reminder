"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { authClient } from "@/lib/auth-client"
import { Fingerprint } from "lucide-react"
import { toast } from "sonner"

export function LoginForm({
  googleEnabled = false,
  className,
  ...props
}: React.ComponentProps<"div"> & { googleEnabled?: boolean }) {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [needsCode, setNeedsCode] = React.useState(false)
  const [code, setCode] = React.useState("")
  const [resendAvailable, setResendAvailable] = React.useState(true)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isPasskeyLoading, setIsPasskeyLoading] = React.useState(false)

  React.useEffect(() => {
    if (resendAvailable) return
    const timer = setTimeout(() => setResendAvailable(true), 60_000)
    return () => clearTimeout(timer)
  }, [resendAvailable])

  async function sendCode() {
    setResendAvailable(false)
    const result = await authClient.twoFactor.sendOtp()
    if (result.error) toast.error(result.error.message || "Unable to send a code. Please try again.")
  }

  async function handleResend() {
    setIsLoading(true)
    try {
      await sendCode()
    } catch {
      toast.error("Unable to send a code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    try {
      const result = await authClient.twoFactor.verifyOtp({ code })
      if (result.error) {
        toast.error(result.error.message || "Unable to verify the code")
        return
      }
      toast.success("Logged in successfully")
      router.push("/app")
    } catch {
      toast.error("Unable to verify the code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await authClient.signIn.email({ email, password })
      if (result.error) {
        if (result.error.code === "EMAIL_NOT_VERIFIED") {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`)
          return
        }
        toast.error(result.error.message || "Failed to login")
        return
      }
      if (result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect) {
        setPassword("")
        setNeedsCode(true)
        await sendCode()
        return
      }
      toast.success("Logged in successfully")
      router.push("/app")
    } catch {
      toast.error("Unable to sign in. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePasskeyLogin() {
    setIsPasskeyLoading(true)
    const result = await authClient.signIn.passkey()
    setIsPasskeyLoading(false)

    if (result.error) {
      toast.error(result.error.message || "Failed to login with passkey")
      return
    }

    toast.success("Logged in successfully")
    router.push("/app")
  }

  if (needsCode) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              Enter the six-digit login code sent to {email}. Codes expire after 5 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="login-code">Email code</FieldLabel>
                  <Input id="login-code" inputMode="numeric" autoComplete="one-time-code"
                    pattern="[0-9]{6}" maxLength={6} required value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))} />
                </Field>
                <Field>
                  <Button type="submit" disabled={isLoading || code.length !== 6}>
                    {isLoading ? "Please wait..." : "Verify and log in"}
                  </Button>
                  <Button type="button" variant="outline" disabled={isLoading || !resendAvailable}
                    onClick={handleResend}>
                    {resendAvailable ? "Resend code" : "You can resend in one minute"}
                  </Button>
                  <Button type="button" variant="ghost" disabled={isLoading}
                    onClick={() => { setNeedsCode(false); setCode("") }}>
                    Back to login
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-2">
            {googleEnabled && <GoogleSignInButton className="w-full" />}
            <Button
              type="button"
              variant="outline"
              disabled={isPasskeyLoading}
              onClick={handlePasskeyLogin}
            >
              <Fingerprint className="size-4" />
              {isPasskeyLoading ? "Signing in..." : "Login with Passkey"}
            </Button>
          </div>
          <FieldSeparator className="mt-0 mb-6 [&_[data-slot=field-separator-content]]:bg-card">or</FieldSeparator>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <Link href="/register">Sign up</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
