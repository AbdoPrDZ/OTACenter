import * as React from "react";

import { cn } from "@/lib/utils";

type Side = "top" | "right" | "bottom" | "left";

const SIDE_STYLES: Record<Side, string> = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  right: "top-1/2 left-full ml-2 -translate-y-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  left: "top-1/2 right-full mr-2 -translate-y-1/2",
};

interface TooltipProps {
  content: React.ReactNode;
  side?: Side;
  className?: string;
  children: React.ReactNode;
  /** Only show when the trigger is hovered/focused (no-op wrapper otherwise). */
  disabled?: boolean;
}

export function Tooltip({
  content,
  side = "right",
  className,
  children,
  disabled,
}: TooltipProps) {
  if (disabled || !content) return <>{children}</>;

  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 max-w-56 rounded-md border border-border bg-popover px-2 py-1 text-[0.6875rem] font-medium whitespace-nowrap text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          SIDE_STYLES[side],
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}
