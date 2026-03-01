"use client";

import { usePageTitle } from "@/app/app/layout";
import { Spinner } from "@/components/ui/spinner";

export default function UpcomingExamsLoading() {
  usePageTitle("Upcoming Exams");
  return (
    <div className="flex flex-1 items-center justify-center -mt-16">
      <Spinner className="size-12" />
    </div>
  );
}
