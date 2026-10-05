import { cn } from "@/lib/utils";

/**
 * OTACenter brand mark — the cloud + push-arrow mark (`public/favicon.svg`), so
 * it stays crisp at every size from the 36px sidebar chip to the 192px home
 * hero. Pass `src` to swap in a raster rendition (e.g. `Logo-192.png`).
 */
export function LogoMark({
  className,
  title = "OTACenter",
  src = "/favicon.svg",
}: {
  className?: string;
  title?: string;
  src?: string;
}) {
  return (
    <img
      src={src}
      alt={title}
      className={cn("shrink-0 object-contain", className)}
    />
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
