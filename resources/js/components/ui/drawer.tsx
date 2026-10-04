import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface DrawerContextValue {
  onClose: () => void;
}

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right";
  children: React.ReactNode;
}

export function Drawer({
  open,
  onOpenChange,
  side = "left",
  children,
}: DrawerProps) {
  const onClose = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <DrawerContext.Provider value={{ onClose }}>
      <div className="fixed inset-0 z-50">
        <div
          className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div
          className={cn(
            "absolute inset-y-0 flex w-[min(18rem,86vw)] flex-col border-border bg-sidebar text-sidebar-foreground shadow-lg",
            side === "left"
              ? "left-0 animate-slide-in-left border-r"
              : "right-0 animate-slide-in-right border-l",
          )}
        >
          {children}
        </div>
      </div>
    </DrawerContext.Provider>,
    document.body,
  );
}

export function DrawerHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b border-sidebar-border px-4 py-3.5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DrawerBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto p-3", className)}
      {...props}
    />
  );
}

export function DrawerClose({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(DrawerContext);
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={() => context?.onClose()}
      className={cn(
        "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className,
      )}
      {...props}
    >
      <X className="size-4" />
    </button>
  );
}
