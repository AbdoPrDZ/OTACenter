import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export default function StarRating({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const rounded = Math.round(value);

  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      title={`${value} / 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "size-3.5",
            star <= rounded
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground",
          )}
        />
      ))}
    </span>
  );
}
