import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** Read-only 5-star rating; partial stars are filled proportionally. */
export default function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const fill = Math.max(0, Math.min(1, value - index));

        return (
          <span key={index} className="relative inline-flex">
            <Star className="size-3.5 text-muted-foreground/35" />
            {fill > 0 ? (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className="size-3.5 fill-warning text-warning" />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
