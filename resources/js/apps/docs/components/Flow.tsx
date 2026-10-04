import { Children, Fragment, type ReactNode } from "react";
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const TONES = {
  primary: "bg-primary/12 text-primary ring-primary/25",
  success: "bg-success/12 text-success ring-success/25",
  warning: "bg-warning/15 text-warning ring-warning/30",
  muted: "bg-muted text-muted-foreground ring-border",
} as const;

type Tone = keyof typeof TONES;

export function FlowStep({
  icon: Icon,
  title,
  tone = "primary",
}: {
  icon?: LucideIcon;
  title: string;
  tone?: Tone;
}) {
  return (
    <div className="flow-node flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card/80 px-4 py-6 text-center shadow-sm backdrop-blur-sm">
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-2xl ring-1",
          TONES[tone],
        )}
      >
        {Icon ? <Icon className="size-6" /> : <span className="size-2 rounded-full bg-current" />}
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="flex shrink-0 items-center justify-center" aria-hidden="true">
      {/* stacked layout (below lg) */}
      <div className="flex flex-col items-center py-1 lg:hidden">
        <span className="flow-track-y relative">
          <span className="flow-dot flow-dot-y left-1/2 -translate-x-1/2" />
        </span>
        <ChevronDown className="size-4 text-primary" />
      </div>

      {/* row layout (lg and up) */}
      <div className="relative hidden items-center px-1.5 lg:flex">
        <span className="flow-track-x relative">
          <span className="flow-dot flow-dot-x top-1/2 -translate-y-1/2" />
        </span>
        <ChevronRight className="size-5 text-primary" />
      </div>
    </div>
  );
}

/**
 * A big, animated flow diagram. Children are `FlowStep` nodes; the connecting
 * beam (dashed line + traveling dot) is drawn between them automatically.
 * Row layout on `lg` and up, stacked with downward beams below.
 */
export function Flow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const items = Children.toArray(children);

  return (
    <div
      className={cn(
        "relative my-8 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card/60 to-card p-5 sm:p-6",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative flex flex-col gap-1.5 lg:flex-row lg:items-stretch lg:gap-0">
        {items.map((child, index) => (
          <Fragment key={index}>
            <div className="flex w-full min-w-0 lg:flex-1">{child}</div>
            {index < items.length - 1 ? <FlowConnector /> : null}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
