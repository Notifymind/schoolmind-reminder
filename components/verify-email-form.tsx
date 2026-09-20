"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function VerifyEmailForm({ initialEmail, sent, verified, hasError }: {
  initialEmail: string;
  sent: boolean;
  verified: boolean;
  hasError: boolean;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(sent ? 60 : 0);
  const [message, setMessage] = useState(sent ? "Check your inbox and spam folder for your verification link." : "");
  const [error, setError] = useState(hasError ? "This verification link is invalid or has expired. Request a new link below." : "");

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending || cooldown > 0) return;
    setIsSending(true);
    setError("");
    setMessage("");
    try {
      const result = await authClient.sendVerificationEmail({
        email: email.trim(),
        callbackURL: `${window.location.origin}/verify-email?verified=1`,
      });
      if (result.error) {
        if (result.error.status === 429) {
          setCooldown(60);
          setError("Please wait a minute before requesting another link.");
        } else {
          setError("Unable to send a verification email. Please try again later.");
        }
        return;
      }
      setMessage("If this email belongs to an unverified account, a verification link is on its way. Check your inbox and spam folder.");
      setCooldown(60);
    } catch {
      setError("Unable to send a verification email. Check your connection and try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{verified ? "Email verified" : "Verify your email"}</CardTitle>
        <CardDescription>
          {verified ? "You can now sign in to NotifyMind." : "Open the link in your email before signing in. Links expire after one hour."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {verified ? null : (
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
              {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
              <Field>
                <FieldLabel htmlFor="verification-email">Email</FieldLabel>
                <Input id="verification-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
              </Field>
              <Button type="submit" disabled={isSending || cooldown > 0}>
                {isSending ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
              </Button>
            </FieldGroup>
          </form>
        )}
        <Button variant="outline" className="w-full" asChild>
          <Link href="/login">Back to login</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
