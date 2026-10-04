import { useEffect, useState } from "react";
import { Menu, PanelLeft, Search } from "lucide-react";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme";
import UserMenu from "./UserMenu";
import CommandPalette from "./CommandPalette";

import DashboardRouter from "@/apps/dashboard/router";
import type { Route } from "@/types/router";

interface TopbarProps {
  route: Route;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenMobile: () => void;
}

export default function Topbar({
  route,
  collapsed,
  onToggleCollapsed,
  onOpenMobile,
}: TopbarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const title = route.title ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md md:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenMobile}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="hidden md:inline-flex"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <PanelLeft />
      </Button>

      <Separator orientation="vertical" className="hidden h-5 md:block" />

      <div className="flex min-w-0 flex-col">
        <Breadcrumbs
          items={[
            { label: "Dashboard", to: DashboardRouter.getPath("home") },
            { label: title },
          ]}
          className="hidden md:flex"
        />
        <h1 className="truncate text-sm font-semibold tracking-tight md:hidden">
          {title}
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="hidden items-center gap-2 rounded-lg border border-border bg-muted/30 py-1.5 pr-2 pl-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent sm:flex"
        >
          <Search className="size-3.5" />
          <span>Search</span>
          <kbd className="rounded border border-border bg-card px-1 font-mono text-[0.625rem]">
            Ctrl K
          </kbd>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => setPaletteOpen(true)}
          aria-label="Search"
        >
          <Search />
        </Button>

        <ThemeToggle />
        <UserMenu />
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
