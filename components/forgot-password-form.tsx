"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result.error) {
        setError("Unable to request a reset link. Please wait a minute and try again.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Unable to request a reset link. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>Enter your email to request a password reset link.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {sent ? <p role="status" className="text-sm">If an account exists for that email, you will receive a reset link. Check your inbox and spam folder.</p> : (
          <form onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
              </Field>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={pending}>{pending ? "Sending..." : "Send reset link"}</Button>
            </FieldGroup>
          </form>
        )}
        <Link href="/login" className="block text-center text-sm underline">Back to login</Link>
      </CardContent>
    </Card>
  );
}
