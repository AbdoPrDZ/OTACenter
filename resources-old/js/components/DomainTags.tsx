import { IDomain } from "@/models/Domain";
import { cn } from "@/lib/utils";

export default function DomainTags({
  domains,
  className,
}: {
  domains: IDomain[];
  className?: string;
}) {
  if (!domains || domains.length === 0)
    return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {domains.map((domain) => (
        <span
          key={domain.id}
          className="rounded bg-muted px-1.5 py-0.5 text-[0.625rem] font-medium text-muted-foreground"
        >
          {domain.name}
        </span>
      ))}
    </div>
  );
}
