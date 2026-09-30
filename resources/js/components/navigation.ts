import { BarChart3, Globe, Home, KeyRound, PanelsTopLeft, Settings, ShieldCheck, Users, type LucideIcon } from "lucide-react";

import { Route } from "@/types/router";
import { RouteAccess } from "@/utils/permissions";

export interface NavItem {
  name: string;
  label: string;
  icon: LucideIcon;
  activeNames: string[];
  /** Optional access requirement; when missing the item is always visible. */
  access?: RouteAccess;
}

export const NAV_ITEMS: NavItem[] = [
  {
    name: "home",
    label: "Home",
    icon: Home,
    activeNames: ["home"],
  },
  {
    name: "apps",
    label: "Apps",
    icon: PanelsTopLeft,
    activeNames: ["apps", "app.add", "app.show"],
    access: { permission: "app.view" },
  },
  {
    name: "domains",
    label: "Domains",
    icon: Globe,
    activeNames: ["domains", "domain.add", "domain.show"],
    access: { permission: "domain.view" },
  },
  {
    name: "users",
    label: "Users",
    icon: Users,
    activeNames: ["users"],
    access: { permission: "user.view" },
  },
  {
    name: "roles",
    label: "Roles",
    icon: ShieldCheck,
    activeNames: ["roles", "role.show"],
    access: { permission: "role.view" },
  },
  {
    name: "permissions",
    label: "Permissions",
    icon: KeyRound,
    activeNames: ["permissions", "permission.show"],
    access: { permission: "permission.view" },
  },
  {
    name: "statistics",
    label: "Statistics",
    icon: BarChart3,
    activeNames: ["statistics"],
    access: { roles: ["super-admin", "admin"] },
  },
  {
    name: "settings",
    label: "Settings",
    icon: Settings,
    activeNames: ["settings"],
  },
];

export function isNavActive(item: NavItem, route: Route) {
  return !!route.name && item.activeNames.includes(route.name);
}

/**
 * Access requirement per dashboard route name.
 * Mirrors the backend `permission:{name}` / `role:{...}` middleware wiring
 * (see ROUTES.md). `home`/`settings`/`dashboard` are always accessible.
 */
export const ROUTE_ACCESS: Record<string, RouteAccess> = {
  home: {},
  settings: {},

  apps: { permission: "app.view" },
  "app.add": { permission: "app.create" },
  "app.show": { permission: "app.view" },
  "app.version.add": { permission: "version.create" },
  "app.version.show": { permission: "version.view" },
  "app.version.bundle.add": { permission: "bundle.create" },
  "app.version.bundle.show": { permission: "bundle.view" },

  domains: { permission: "domain.view" },
  "domain.add": { permission: "domain.create" },
  "domain.show": { permission: "domain.view" },

  users: { permission: "user.view" },
  "user.show": { permission: "user.view" },

  roles: { permission: "role.view" },
  "role.show": { permission: "role.view" },

  permissions: { permission: "permission.view" },
  "permission.show": { permission: "permission.view" },

  statistics: { roles: ["super-admin", "admin"] },
};

export function getRouteAccess(name?: string): RouteAccess {
  return name ? ROUTE_ACCESS[name] ?? {} : {};
}
