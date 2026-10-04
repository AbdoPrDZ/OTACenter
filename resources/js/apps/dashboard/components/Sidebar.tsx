import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Settings } from "lucide-react";

import DashboardRouter from "@/apps/dashboard/router";
import User from "@/models/User";
import { isNavActive, NAV_ITEMS, type NavItem } from "@/components/navigation";
import { Avatar } from "@/components/ui/feedback";
import LogoMark from "@/components/Logo";
import { Drawer, DrawerClose, DrawerBody, DrawerHeader } from "@/components/ui/drawer";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { can } from "@/utils/permissions";
import { cn } from "@/lib/utils";
import type { Route } from "@/types/router";

interface SidebarProps {
  route: Route;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export default function Sidebar({
  route,
  collapsed,
  mobileOpen,
  onMobileOpenChange,
}: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        <SidebarBrand collapsed={collapsed} />
        <div className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
          <SidebarNav route={route} collapsed={collapsed} />
        </div>
        <SidebarFooter collapsed={collapsed} />
      </aside>

      <Drawer open={mobileOpen} onOpenChange={onMobileOpenChange} side="left">
        <DrawerHeader>
          <SidebarBrand collapsed={false} compact />
          <DrawerClose />
        </DrawerHeader>
        <DrawerBody>
          <SidebarNav
            route={route}
            collapsed={false}
            onNavigate={() => onMobileOpenChange(false)}
          />
        </DrawerBody>
        <SidebarFooter collapsed={false} />
      </Drawer>
    </>
  );
}

function SidebarBrand({
  collapsed,
  compact,
}: {
  collapsed: boolean;
  compact?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(DashboardRouter.getPath("home")!)}
      className={cn(
        "flex items-center gap-2.5 px-3 py-3.5 text-left",
        collapsed && !compact && "justify-center px-0",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center">
        <LogoMark className="size-9" />
      </span>
      {!collapsed || compact ? (
        <span className="flex min-w-0 flex-col">
          <span className="font-display text-sm font-semibold tracking-tight text-sidebar-foreground">
            OTACenter
          </span>
          <span className="text-[0.625rem] text-muted-foreground">
            App distribution
          </span>
        </span>
      ) : null}
    </button>
  );
}

function SidebarNav({
  route,
  collapsed,
  onNavigate,
}: {
  route: Route;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const items = NAV_ITEMS.filter((item) => can(item.access));
  const general = items.filter((item) => item.group === "general");
  const settings = items.filter((item) => item.group === "settings");

  return (
    <nav className="flex flex-col gap-4">
      <SidebarGroup
        label="General"
        items={general}
        route={route}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />
      {settings.length ? (
        <SidebarGroup
          label="Settings"
          items={settings}
          route={route}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ) : null}
    </nav>
  );
}

function SidebarGroup({
  label,
  items,
  route,
  collapsed,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  route: Route;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {!collapsed ? (
        <p className="px-2.5 pb-1 text-[0.625rem] font-semibold tracking-widest text-muted-foreground/70 uppercase">
          {label}
        </p>
      ) : (
        <div className="mx-auto my-1 h-px w-6 bg-sidebar-border" />
      )}

      {items.map((item) => {
        const active = isNavActive(item, route);
        const Icon = item.icon;

        return (
          <Tooltip key={item.name} content={item.label} disabled={!collapsed}>
            <button
              type="button"
              onClick={() => {
                navigate(DashboardRouter.getPath(item.name)!);
                onNavigate?.();
              }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              {active ? (
                <span className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
              ) : null}
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const user = User.current;

  if (!user) return null;

  return (
    <div className="border-t border-sidebar-border p-2">
      <Dropdown
        align="start"
        trigger={
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-sidebar-accent/60",
              collapsed && "justify-center",
            )}
          >
            <Avatar src={user.image_url} name={user.name} size={32} />
            {!collapsed ? (
              <>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs font-semibold">
                    {user.name}
                  </span>
                  <span className="truncate text-[0.625rem] text-muted-foreground">
                    {user.login}
                  </span>
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </>
            ) : null}
          </button>
        }
      >
        <DropdownLabel>{user.name}</DropdownLabel>
        <DropdownSeparator />
        <DropdownItem
          onClick={() => navigate(DashboardRouter.getPath("settings")!)}
        >
          <Settings /> Settings
        </DropdownItem>
        <DropdownItem variant="destructive" onClick={() => User.logout()}>
          <LogOut /> Sign out
        </DropdownItem>
      </Dropdown>
    </div>
  );
}
