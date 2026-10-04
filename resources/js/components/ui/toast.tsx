import * as React from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "destructive" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (input: {
    title: string;
    description?: string;
    variant?: ToastVariant;
  }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue>({
  toast: () => undefined,
  success: () => undefined,
  error: () => undefined,
});

export function useToast() {
  return React.useContext(ToastContext);
}

const VARIANT_STYLES: Record<ToastVariant, { box: string; icon: typeof Info }> = {
  default: { box: "border-border bg-popover", icon: Info },
  success: { box: "border-success/40 bg-popover", icon: CheckCircle2 },
  destructive: { box: "border-destructive/40 bg-popover", icon: XCircle },
  info: { box: "border-info/40 bg-popover", icon: Info },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const counter = React.useRef(0);

  const remove = React.useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    ({ title, description, variant = "default" }) => {
      const id = ++counter.current;
      setItems((current) => [...current, { id, title, description, variant }]);
      window.setTimeout(() => remove(id), 4200);
    },
    [remove],
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, variant: "success" }),
      error: (title, description) => toast({ title, description, variant: "destructive" }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(22rem,92vw)] flex-col gap-2">
          {items.map((item) => {
            const config = VARIANT_STYLES[item.variant];
            const Icon = config.icon;
            const iconColor =
              item.variant === "success"
                ? "text-success"
                : item.variant === "destructive"
                  ? "text-destructive"
                  : item.variant === "info"
                    ? "text-info"
                    : "text-muted-foreground";

            return (
              <div
                key={item.id}
                className={cn(
                  "pointer-events-auto flex items-start gap-2.5 rounded-lg border p-3 shadow-lg animate-slide-up",
                  config.box,
                )}
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", iconColor)} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{item.title}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => remove(item.id)}
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
