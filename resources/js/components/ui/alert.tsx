import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type AlertVariant = "default" | "destructive" | "success" | "warning" | "info";

const VARIANT_STYLES: Record<AlertVariant, { box: string; icon: LucideIcon }> = {
  default: { box: "border-border bg-muted/40 text-foreground", icon: Info },
  destructive: {
    box: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: XCircle,
  },
  success: {
    box: "border-success/30 bg-success/10 text-success",
    icon: CheckCircle2,
  },
  warning: {
    box: "border-warning/30 bg-warning/10 text-warning",
    icon: AlertTriangle,
  },
  info: { box: "border-info/30 bg-info/10 text-info", icon: Info },
};

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  /** Hide the leading status icon. */
  hideIcon?: boolean;
}

export function Alert({
  className,
  variant = "default",
  hideIcon,
  children,
  ...props
}: AlertProps) {
  const config = VARIANT_STYLES[variant];
  const Icon = config.icon;

  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs/relaxed",
        config.box,
        className,
      )}
      {...props}
    >
      {!hideIcon ? <Icon className="mt-px size-4 shrink-0" /> : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="alert-title"
      className={cn("font-semibold", className)}
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="alert-description"
      className={cn("mt-0.5 opacity-90", className)}
      {...props}
    />
  );
}
