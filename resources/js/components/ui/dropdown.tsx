import * as React from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface DropdownContextValue {
  close: () => void;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

interface DropdownProps {
  trigger: React.ReactNode;
  align?: "start" | "end";
  className?: string;
  children: React.ReactNode;
}

export function Dropdown({
  trigger,
  align = "end",
  className,
  children,
}: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  const update = React.useCallback(() => {
    const element = wrapRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    setStyle({
      position: "fixed",
      top: rect.bottom + 6,
      left: align === "start" ? rect.left : undefined,
      right:
        align === "end"
          ? Math.max(8, window.innerWidth - rect.right)
          : undefined,
      minWidth: Math.max(rect.width, 176),
    });
    if (menuRef.current) {
      const menuHeight = menuRef.current.offsetHeight;
      if (rect.bottom + 6 + menuHeight > window.innerHeight - 8) {
        setStyle((previous) => ({
          ...previous,
          top: Math.max(8, rect.top - menuHeight - 6),
        }));
      }
    }
  }, [align]);

  React.useEffect(() => {
    if (!open) return;

    update();

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  const close = React.useCallback(() => setOpen(false), []);

  return (
    <div ref={wrapRef} className={cn("relative inline-flex", className)}>
      <span
        className="contents"
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </span>

      {open
        ? createPortal(
            <DropdownContext.Provider value={{ close }}>
              <div
                ref={menuRef}
                role="menu"
                style={style}
                className="z-50 flex max-h-[min(24rem,70vh)] min-w-44 flex-col overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg animate-scale-in"
              >
                {children}
              </div>
            </DropdownContext.Provider>,
            document.body,
          )
        : null}
    </div>
  );
}

export function DropdownLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-2 py-1.5 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive";
}

export function DropdownItem({
  className,
  variant = "default",
  onClick,
  children,
  ...props
}: DropdownItemProps) {
  const context = React.useContext(DropdownContext);

  return (
    <button
      type="button"
      role="menuitem"
      onClick={(event) => {
        onClick?.(event);
        context?.close();
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors outline-none",
        "focus-visible:bg-accent hover:bg-accent",
        variant === "destructive"
          ? "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10"
          : "text-foreground",
        "[&_svg]:size-3.5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface DropdownCheckboxItemProps extends DropdownItemProps {
  checked?: boolean;
}

export function DropdownCheckboxItem({
  checked,
  className,
  children,
  ...props
}: DropdownCheckboxItemProps) {
  return (
    <DropdownItem className={cn("pr-2", className)} {...props}>
      <span className="flex size-3.5 items-center justify-center">
        {checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </span>
      <span className="flex-1 truncate capitalize">{children}</span>
    </DropdownItem>
  );
}
