"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm({ token, invalid }: { token: string; invalid: boolean }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await authClient.resetPassword({ token, newPassword: password });
      if (result.error) {
        setError("Unable to reset your password. The link may have expired or already been used.");
      } else {
        setComplete(true);
      }
    } catch {
      setError("Unable to reset your password. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Choose a new password with 8 to 128 characters.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {complete ? (
          <p role="status" className="text-sm">Your password has been reset. Sign in with your new password.</p>
        ) : invalid || !token ? (
          <p role="alert" className="text-sm text-destructive">This reset link is invalid or has expired.</p>
        ) : (
          <form onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password">New password</FieldLabel>
                <Input id="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmation">Confirm password</FieldLabel>
                <Input id="confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmation} onChange={event => setConfirmation(event.target.value)} />
              </Field>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={pending}>{pending ? "Resetting..." : "Reset password"}</Button>
            </FieldGroup>
          </form>
        )}
        <Link href="/login" className="block text-center text-sm underline">Back to login</Link>
      </CardContent>
    </Card>
  );
}
