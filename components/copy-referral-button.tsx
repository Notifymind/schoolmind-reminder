"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyReferralButton({ link }: { link: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={copyLink} aria-live="polite" className="h-12 w-full sm:w-auto sm:min-w-52">
        {status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {status === "copied" ? "Link copied" : "Copy invite link"}
      </Button>
      {status === "error" && (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            Couldn’t copy the link. You can select and copy it below.
          </p>
          <input
            aria-label="Invite link"
            readOnly
            value={link}
            onFocus={(event) => event.currentTarget.select()}
            className="h-12 w-full min-w-0 rounded-md border bg-background px-3 text-base"
          />
        </>
      )}
    </div>
  );
}
