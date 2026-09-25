import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackToSettings() {
  return (
    <Button asChild variant="ghost" className="min-h-11 w-fit">
      <Link href="/app/settings">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to settings
      </Link>
    </Button>
  );
}
