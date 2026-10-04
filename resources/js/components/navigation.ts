import {
  BarChart3,
  Globe,
  Home,
  KeyRound,
  PanelsTopLeft,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Route } from "@/types/router";
import { RouteAccess } from "@/utils/permissions";

export interface NavItem {
  name: string;
  label: string;
  description: string;
  icon: LucideIcon;
  activeNames: string[];
  group: "general" | "settings";
  /** Optional access requirement; when missing the item is always visible. */
  access?: RouteAccess;
}

export const NAV_ITEMS: NavItem[] = [
  {
    name: "home",
    label: "Home",
    description: "Overview and quick actions",
    icon: Home,
    activeNames: ["home"],
    group: "general",
  },
  {
    name: "apps",
    label: "Apps",
    description: "Applications and their versions",
    icon: PanelsTopLeft,
    activeNames: ["apps", "app.add", "app.show"],
    group: "general",
    access: { permission: "app.view" },
  },
  {
    name: "domains",
    label: "Domains",
    description: "Organizational access groups",
    icon: Globe,
    activeNames: ["domains", "domain.add", "domain.show"],
    group: "general",
    access: { permission: "domain.view" },
  },
  {
    name: "users",
    label: "Users",
    description: "LDAP directory users",
    icon: Users,
    activeNames: ["users", "user.show"],
    group: "general",
    access: { permission: "user.view" },
  },
  {
    name: "roles",
    label: "Roles",
    description: "Roles and their users",
    icon: ShieldCheck,
    activeNames: ["roles", "role.show"],
    group: "general",
    access: { permission: "role.view" },
  },
  {
    name: "permissions",
    label: "Permissions",
    description: "Fine-grained access grants",
    icon: KeyRound,
    activeNames: ["permissions", "permission.show"],
    group: "general",
    access: { permission: "permission.view" },
  },
  {
    name: "statistics",
    label: "Statistics",
    description: "Aggregated center metrics",
    icon: BarChart3,
    activeNames: ["statistics"],
    group: "general",
    access: { roles: ["super-admin", "admin"] },
  },
  {
    name: "settings",
    label: "Settings",
    description: "Your profile and preferences",
    icon: Settings,
    activeNames: ["settings"],
    group: "settings",
  },
];

export function isNavActive(item: NavItem, route: Route) {
  return !!route.name && item.activeNames.includes(route.name);
}

/**
 * Access requirement per dashboard route name. Mirrors the backend
 * `permission:{name}` / `role:{...}` middleware wiring. Routes that are always
 * accessible map to an empty requirement.
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
