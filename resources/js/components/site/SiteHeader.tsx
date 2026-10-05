import { LayoutDashboard } from "lucide-react";

import { Logo } from "@/components/Logo";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme";
import { cn } from "@/lib/utils";

const NAV = [
  { key: "home", href: "/", label: "Home" },
  { key: "store", href: "/store", label: "Store" },
  { key: "docs", href: "/docs", label: "Docs" },
] as const;

export default function SiteHeader({
  active,
}: {
  active?: "home" | "store" | "docs";
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
        <a href="/" className="shrink-0" aria-label="OTACenter home">
          <Logo markClassName="size-8" />
        </a>

        <nav className="flex items-center gap-0.5">
          {NAV.map((item) => (
            <a
              key={item.key}
              href={item.href}
              aria-current={active === item.key ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active === item.key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {item.label}
            </a>
          ))}
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
            className={cn(
              buttonVariants({ variant: "default", size: "icon-sm" }),
              "sm:hidden",
            )}
          >
            <LayoutDashboard />
          </a>
        </div>
      </div>
    </header>
  );
}
