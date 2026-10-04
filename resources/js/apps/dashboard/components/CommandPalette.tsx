import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CornerDownLeft, Search } from "lucide-react";

import DashboardRouter from "@/apps/dashboard/router";
import { NAV_ITEMS } from "@/components/navigation";
import { Modal, ModalContent } from "@/components/ui/modal";
import { can } from "@/utils/permissions";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const items = useMemo(
    () => NAV_ITEMS.filter((item) => can(item.access)),
    [],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle),
    );
  }, [items, query]);

  const go = (name: string) => {
    navigate(DashboardRouter.getPath(name)!);
    onOpenChange(false);
    setQuery("");
    setHighlighted(0);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        showCloseButton={false}
        className="top-[12vh] max-w-lg self-start p-0"
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlighted((value) => Math.min(value + 1, filtered.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlighted((value) => Math.max(value - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            const item = filtered[highlighted];
            if (item) go(item.name);
          }
        }}
      >
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlighted(0);
            }}
            placeholder="Jump to..."
            className="h-6 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              No matches for “{query}”.
            </p>
          ) : (
            filtered.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  type="button"
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => go(item.name)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                    index === highlighted && "bg-accent",
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">
                      {item.label}
                    </span>
                    <span className="block truncate text-[0.625rem] text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  {index === highlighted ? (
                    <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
