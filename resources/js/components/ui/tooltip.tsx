import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type Side = "top" | "right" | "bottom" | "left";

/** Gap between the trigger and the tooltip, in px. */
const OFFSET = 8;

const SIDE_TRANSFORM: Record<Side, string> = {
  top: "translate(-50%, -100%)",
  right: "translate(0, -50%)",
  bottom: "translate(-50%, 0)",
  left: "translate(-100%, -50%)",
};

function anchorFor(rect: DOMRect, side: Side): { top: number; left: number } {
  switch (side) {
    case "top":
      return { top: rect.top - OFFSET, left: rect.left + rect.width / 2 };
    case "bottom":
      return { top: rect.bottom + OFFSET, left: rect.left + rect.width / 2 };
    case "left":
      return { top: rect.top + rect.height / 2, left: rect.left - OFFSET };
    case "right":
    default:
      return { top: rect.top + rect.height / 2, left: rect.right + OFFSET };
  }
}

interface TooltipProps {
  content: React.ReactNode;
  side?: Side;
  className?: string;
  children: React.ReactNode;
  /** Only show when the trigger is hovered/focused (no-op wrapper otherwise). */
  disabled?: boolean;
}

/**
 * Hover/focus tooltip rendered in a portal at fixed screen coordinates, so it is
 * never clipped by — and never adds scrollable width to — an overflow container
 * such as the collapsed sidebar.
 */
export function Tooltip({
  content,
  side = "right",
  className,
  children,
  disabled,
}: TooltipProps) {
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null);

  const show = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPosition(anchorFor(rect, side));
  }, [side]);

  const hide = React.useCallback(() => setPosition(null), []);

  React.useEffect(() => {
    if (!position) return;

    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);

    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [position, hide]);

  if (disabled || !content) return <>{children}</>;

  return (
    <span
      ref={triggerRef}
      className="inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {position
        ? createPortal(
            <span
              role="tooltip"
              style={{ top: position.top, left: position.left, transform: SIDE_TRANSFORM[side] }}
              className={cn(
                "pointer-events-none fixed z-[60] max-w-56 animate-fade-in rounded-md border border-border bg-popover px-2 py-1 text-[0.6875rem] font-medium whitespace-nowrap text-popover-foreground shadow-md",
                className,
              )}
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
