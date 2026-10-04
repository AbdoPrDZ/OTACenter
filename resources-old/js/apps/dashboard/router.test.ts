import { afterEach, describe, expect, it } from "vitest";

import DashboardRouter from "@/apps/dashboard/router";
import { Route as RouterRoute } from "@/types/router";

const originalPath = window.location.pathname;

function at(path: string) {
  window.history.replaceState({}, "", path);
}

afterEach(() => {
  at(originalPath);
});

describe("DashboardRouter route table", () => {
  it("resolves the current route and its params", () => {
    at("/dashboard/apps/7/versions/9");

    const current = DashboardRouter.current;

    expect(current.name).toBe("app.version.show");
    expect(current.params).toEqual({ id: "7", versionId: "9" });
  });

  it("does not bake the current params into the shared route table", () => {
    at("/dashboard/apps/7/versions/add");

    DashboardRouter.current;

    // Every param placeholder must survive a lookup on the same table.
    expect(DashboardRouter.getPath("app.version.add")).toBe("/dashboard/apps/:id/versions/add");
    expect(DashboardRouter.getPath("app.version.bundle.add")).toBe(
      "/dashboard/apps/:id/versions/:versionId/bundles/add"
    );
    expect(DashboardRouter.getPath("app.show")).toBe("/dashboard/apps/:id");
  });

  it("still substitutes params passed explicitly", () => {
    at("/dashboard/apps");

    expect(DashboardRouter.getPath("app.show", { id: "42" })).toBe("/dashboard/apps/42");
  });

  it("declares the add routes statically so they win over the :id routes", () => {
    const route = (name: string): RouterRoute =>
      DashboardRouter.routes.find((r) => r.name === name)!;

    expect(route("app.add").path).toBe("/dashboard/apps/add");
    expect(route("app.version.add").path).toBe("/dashboard/apps/:id/versions/add");
    expect(route("app.version.bundle.add").path).toBe(
      "/dashboard/apps/:id/versions/:versionId/bundles/add"
    );
  });
});