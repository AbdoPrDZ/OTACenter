import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";

import AppTab from "@/apps/dashboard/tabs/AppTab";
import VersionTab from "@/apps/dashboard/tabs/VersionTab";
import BundleTab from "@/apps/dashboard/tabs/BundleTab";

/**
 * The dashboard router declares the "add" pages as static routes that sit next to
 * the ":id" ones (see apps/dashboard/router.tsx). React Router ranks a static
 * segment above a dynamic one, so `/dashboard/apps/add` matches the static route
 * and provides *no* :id param. The tabs must read "no id segment" as create mode
 * instead of comparing the param against the literal string "add".
 */
function renderAt(path: string, element: ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{element}</Routes>
    </MemoryRouter>,
  );
}

describe("dashboard add routes", () => {
  it("renders the create form for the static app.add route", () => {
    renderAt(
      "/dashboard/apps/add",
      <>
        <Route path="/dashboard/apps/add" element={<AppTab />} />
        <Route path="/dashboard/apps/:id" element={<AppTab />} />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Add app" })).toBeInTheDocument();
    expect(screen.queryByText("Invalid app ID.")).not.toBeInTheDocument();
  });

  it("renders the create form for the static app.version.add route", () => {
    renderAt(
      "/dashboard/apps/1/versions/add",
      <Route path="/dashboard/apps/:id/versions/add" element={<VersionTab />} />,
    );

    expect(screen.queryByText("Invalid version ID.")).not.toBeInTheDocument();
  });

  it("renders the create form for the static app.version.bundle.add route", () => {
    renderAt(
      "/dashboard/apps/1/versions/2/bundles/add",
      <Route path="/dashboard/apps/:id/versions/:versionId/bundles/add" element={<BundleTab />} />,
    );

    expect(screen.queryByText("Invalid bundle ID.")).not.toBeInTheDocument();
  });
});
