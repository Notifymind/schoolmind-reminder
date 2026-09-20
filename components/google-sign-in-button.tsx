"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export function GoogleSignInButton() {
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/app`,
        errorCallbackURL: `${window.location.origin}/login?error=google`,
      });
      if (error) {
        toast.error("Unable to sign in with Google. Please try again.");
        setPending(false);
      }
    } catch {
      toast.error("Unable to sign in with Google. Please try again.");
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" className="mb-6 w-full" disabled={pending} onClick={signIn}>
      {pending ? "Connecting to Google..." : "Continue with Google"}
    </Button>
  );
}
