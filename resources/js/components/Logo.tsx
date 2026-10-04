import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * OTACenter brand mark — an upward "push" arrow (over-the-air delivery) framed
 * by broadcast signal brackets, on a rounded indigo→violet tile.
 */
export function LogoMark({
  className,
  title = "OTACenter",
}: {
  className?: string;
  title?: string;
}) {
  const rawId = useId();
  const gradientId = `ota-logo-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>

      <rect width="32" height="32" rx="8.5" fill={`url(#${gradientId})`} />

      {/* Broadcast signal brackets */}
      <path
        d="M7 11c-2.6 3.4-2.6 6.6 0 10"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M25 11c2.6 3.4 2.6 6.6 0 10"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Upward push arrow */}
      <path
        d="M16 6.2 22.8 14h-4.1v10h-5.4V14H9.2z"
        fill="#fff"
      />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  showTagline = false,
}: {
  className?: string;
  markClassName?: string;
  showTagline?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={cn("size-9", markClassName)} />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="font-display text-sm font-semibold tracking-tight">
          OTACenter
        </span>
        {showTagline ? (
          <span className="mt-0.5 text-[0.625rem] text-muted-foreground">
            App distribution
          </span>
        ) : null}
      </span>
    </span>
  );
}

export default LogoMark;
