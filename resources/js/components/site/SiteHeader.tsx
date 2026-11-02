import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, MoreHorizontal } from "lucide-react";

import { Logo } from "@/components/Logo";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme";
import { cn } from "@/lib/utils";

export type SitePage = "home" | "store" | "docs" | "about" | "contact";

const NAV: { key: SitePage; href: string; label: string; secondary?: boolean }[] = [
  { key: "home", href: "/", label: "Home" },
  { key: "store", href: "/store", label: "Store" },
  { key: "docs", href: "/docs", label: "Docs" },
  { key: "about", href: "/about", label: "About", secondary: true },
  { key: "contact", href: "/contact", label: "Contact", secondary: true },
];

export default function SiteHeader({ active }: { active?: SitePage }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
        <a href="/" className="shrink-0" aria-label="OTACenter home">
          <Logo markClassName="size-8" />
        </a>

        <nav className="flex min-w-0 items-center gap-0.5">
          {NAV.map((item) => (
            <a
              key={item.key}
              href={item.href}
              aria-current={active === item.key ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                item.secondary && "hidden md:inline-block",
                active === item.key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {item.label}
            </a>
          ))}
          <MoreMenu active={active} />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <a
            href="/dashboard"
            className={cn(buttonVariants({ variant: "default", size: "sm" }), "hidden sm:inline-flex")}
          >
            <LayoutDashboard /> Dashboard
          </a>
          <a
            href="/dashboard"
            aria-label="Open dashboard"
            className={cn(buttonVariants({ variant: "default", size: "icon-sm" }), "sm:hidden")}
          >
            <LayoutDashboard />
          </a>
        </div>
      </div>
    </header>
  );
}

/** About / Contact on small screens, where they don't fit in the bar. */
function MoreMenu({ active }: { active?: SitePage }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node))
        setOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);

    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative md:hidden">
      <button
        type="button"
        aria-label="More pages"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open ? (
        <div className="absolute top-full left-0 z-50 mt-2 flex w-40 animate-scale-in flex-col rounded-lg border border-border bg-popover p-1 shadow-lg">
          {NAV.filter((item) => item.secondary).map((item) => (
            <a
              key={item.key}
              href={item.href}
              aria-current={active === item.key ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active === item.key ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {item.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
