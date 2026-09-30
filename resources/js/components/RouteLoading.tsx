import { Spinner } from "@/components/ui/spinner";

export default function RouteLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-16">
      <Spinner />
    </div>
  );
}