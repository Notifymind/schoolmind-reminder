import { Spinner } from "@/components/ui/spinner";

export default function ExamsLoading() {
  return (
    <div className="flex flex-1 items-center justify-center -mt-16">
      <Spinner className="size-12" />
    </div>
  );
}
