import User from "@/models/User";

/**
 * Access requirement attached to a nav item or route.
 * `permission` and `roles` are ANDed when both are present.
 */
export interface RouteAccess {
  permission?: string;
  roles?: string[];
}

/**
 * Whether the current user holds the given role.
 * `super-admin` is implicitly handled: hasPermission() returns true for it.
 */
export function hasRole(role: string): boolean {
  return User.current?.roles?.includes(role) ?? false;
}

/** `super-admin` bypasses every permission check (matches the backend middleware). */
export function isSuperAdmin(): boolean {
  return hasRole("super-admin");
}

/**
 * Roles that receive the privileged fields from the backend per-role
 * `toArray()` (super-admin/admin/developer). Mirrors the switch in the
 * backend models — form fields backed by privileged-only attributes
 * (file/logo/image uploads, api_key, ...) are only editable for these.
 */
export const PRIVILEGED_ROLES = ["super-admin", "admin", "developer"] as const;

/** Whether the current user holds a privileged role. */
export function isPrivilegedRole(): boolean {
  return PRIVILEGED_ROLES.some(hasRole);
}

/**
 * Whether the current user has a given permission.
 * `super-admin` counts as having every permission.
 */
export function hasPermission(permission: string): boolean {
  if (isSuperAdmin()) return true;
  return User.current?.permissions?.includes(permission) ?? false;
}

/**
 * Whether the current user satisfies an access requirement.
 * - no requirement (undefined/empty) → allowed
 * - `roles` present → at least one role must be held
 * - `permission` present → the permission must be held
 * Roles and permission are both required when both are set.
 */
export function can(access?: RouteAccess): boolean {
  if (!access) return true;

  if (access.roles?.length && !access.roles.some(hasRole)) return false;
  if (access.permission && !hasPermission(access.permission)) return false;

  return true;
}

/**
 * Whether the current user may perform at least one of the given permissions.
 */
export function canAny(permissions: string[]): boolean {
  return permissions.some(hasPermission);
}
