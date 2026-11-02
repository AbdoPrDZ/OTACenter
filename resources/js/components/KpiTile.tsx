import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

import { Skeleton } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "info";

const TONE: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
};

/**
 * A headline number (stat tile): icon chip, label, value and an optional hint.
 * With `onClick` it becomes a button that lifts on hover.
 */
export default function KpiTile({
  label,
  value,
  icon: Icon,
  hint,
  tone = "primary",
  onClick,
  className,
  style,
}: {
  label: string;
  value?: number;
  icon: LucideIcon;
  hint?: string;
  tone?: Tone;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={style}
      className={cn(
        "group relative flex animate-slide-up flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 text-left shadow-sm",
        onClick &&
          "transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("flex size-9 items-center justify-center rounded-lg", TONE[tone])}>
          <Icon className="size-4.5" />
        </span>
        {onClick ? (
          <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        ) : null}
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        {value === undefined ? (
          <Skeleton className="mt-1 h-7 w-14" />
        ) : (
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{value.toLocaleString()}</span>
        )}
        {hint ? <span className="truncate text-xs text-muted-foreground">{hint}</span> : null}
      </div>
    </Tag>
  );
}
