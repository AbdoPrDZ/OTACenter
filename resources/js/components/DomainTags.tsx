import type { IDomain } from "@/models/Domain";
import { cn } from "@/lib/utils";

export default function DomainTags({
  domains,
  className,
  max,
}: {
  domains: IDomain[];
  className?: string;
  /** Optional cap; overflow is rendered as a "+N" chip. */
  max?: number;
}) {
  if (!domains || domains.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const visible = max ? domains.slice(0, max) : domains;
  const hidden = max ? domains.length - visible.length : 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {visible.map((domain) => (
        <span
          key={domain.id}
          className="rounded-md bg-muted px-1.5 py-0.5 text-[0.625rem] font-medium text-muted-foreground"
        >
          {domain.name}
        </span>
      ))}
      {hidden > 0 ? (
        <span className="rounded-md bg-primary/12 px-1.5 py-0.5 text-[0.625rem] font-medium text-primary">
          +{hidden}
        </span>
      ) : null}
    </div>
  );
}
