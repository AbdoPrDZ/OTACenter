import { describe, expect, it, beforeEach, vi } from "vitest";

import User from "@/models/User";
import {
  PRIVILEGED_ROLES,
  can,
  canAny,
  hasPermission,
  hasRole,
  isPrivilegedRole,
  isSuperAdmin,
} from "./permissions";

function setCurrentUser(user: { roles?: string[]; permissions?: string[] } | undefined) {
  (User as unknown as { _currentUser?: unknown })._currentUser = user;
}

describe("permissions helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setCurrentUser(undefined);
  });

  describe("hasRole", () => {
    it("returns false when no user is loaded", () => {
      expect(hasRole("admin")).toBe(false);
    });

    it("returns true when the user holds the role", () => {
      setCurrentUser({ roles: ["admin", "developer"] });
      expect(hasRole("admin")).toBe(true);
      expect(hasRole("developer")).toBe(true);
    });

    it("returns false when the user does not hold the role", () => {
      setCurrentUser({ roles: ["admin"] });
      expect(hasRole("super-admin")).toBe(false);
    });
  });

  describe("isSuperAdmin", () => {
    it("returns true only for the super-admin role", () => {
      setCurrentUser({ roles: ["super-admin"] });
      expect(isSuperAdmin()).toBe(true);
    });

    it("returns false otherwise", () => {
      setCurrentUser({ roles: ["admin"] });
      expect(isSuperAdmin()).toBe(false);
    });
  });

  describe("isPrivilegedRole", () => {
    it("matches the backend per-role toArray privileged roles", () => {
      expect(PRIVILEGED_ROLES).toEqual(["super-admin", "admin", "developer"]);
    });

    it("returns false when no user is loaded", () => {
      expect(isPrivilegedRole()).toBe(false);
    });

    it("returns true for super-admin, admin, and developer", () => {
      setCurrentUser({ roles: ["super-admin"] });
      expect(isPrivilegedRole()).toBe(true);
      setCurrentUser({ roles: ["admin"] });
      expect(isPrivilegedRole()).toBe(true);
      setCurrentUser({ roles: ["developer"] });
      expect(isPrivilegedRole()).toBe(true);
    });

    it("returns false for non-privileged roles", () => {
      setCurrentUser({ roles: ["user"] });
      expect(isPrivilegedRole()).toBe(false);
      setCurrentUser({ roles: ["guest"] });
      expect(isPrivilegedRole()).toBe(false);
      setCurrentUser({ roles: [] });
      expect(isPrivilegedRole()).toBe(false);
    });
  });

  describe("hasPermission", () => {
    it("returns false when no user is loaded", () => {
      expect(hasPermission("app.view")).toBe(false);
    });

    it("returns true when the user has the permission", () => {
      setCurrentUser({ roles: [], permissions: ["app.view", "app.create"] });
      expect(hasPermission("app.view")).toBe(true);
    });

    it("returns true for any permission when the user is super-admin", () => {
      setCurrentUser({ roles: ["super-admin"], permissions: [] });
      expect(hasPermission("app.delete")).toBe(true);
      expect(hasPermission("anything.at.all")).toBe(true);
    });

    it("returns false when the permission is missing", () => {
      setCurrentUser({ roles: [], permissions: ["app.view"] });
      expect(hasPermission("domain.view")).toBe(false);
    });
  });

  describe("can", () => {
    it("allows when no requirement is given", () => {
      expect(can()).toBe(true);
      expect(can({})).toBe(true);
    });

    it("requires the permission when set", () => {
      setCurrentUser({ roles: [], permissions: ["app.create"] });
      expect(can({ permission: "app.create" })).toBe(true);
      expect(can({ permission: "app.delete" })).toBe(false);
    });

    it("requires at least one role when roles are set", () => {
      setCurrentUser({ roles: ["admin"], permissions: [] });
      expect(can({ roles: ["super-admin", "admin"] })).toBe(true);
      expect(can({ roles: ["super-admin"] })).toBe(false);
    });

    it("ANDs roles and permission when both are set", () => {
      setCurrentUser({ roles: ["admin"], permissions: ["app.create"] });
      expect(can({ roles: ["admin"], permission: "app.create" })).toBe(true);
      expect(can({ roles: ["developer"], permission: "app.create" })).toBe(false);
      expect(can({ roles: ["admin"], permission: "app.delete" })).toBe(false);
    });

    it("super-admin bypasses permission but still needs a matching role", () => {
      setCurrentUser({ roles: ["super-admin"], permissions: [] });
      expect(can({ permission: "app.create" })).toBe(true);
      expect(can({ roles: ["super-admin", "admin"] })).toBe(true);
      expect(can({ roles: ["admin"] })).toBe(false);
      expect(can({ roles: ["admin"], permission: "app.create" })).toBe(false);
    });
  });

  describe("canAny", () => {
    it("returns true when at least one permission is held", () => {
      setCurrentUser({ roles: [], permissions: ["bundle.publish"] });
      expect(canAny(["bundle.create", "bundle.publish"])).toBe(true);
    });

    it("returns false when none are held", () => {
      setCurrentUser({ roles: [], permissions: ["bundle.publish"] });
      expect(canAny(["bundle.create", "bundle.delete"])).toBe(false);
    });

    it("returns false for an empty list", () => {
      setCurrentUser({ roles: [], permissions: ["bundle.publish"] });
      expect(canAny([])).toBe(false);
    });
  });
});