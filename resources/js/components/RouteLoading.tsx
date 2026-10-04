import { Spinner } from "@/components/ui/feedback";

export default function RouteLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-16">
      <Spinner className="size-5 text-muted-foreground" />
    </div>
  );
}
