import * as React from "react";
import { Navigate, Route } from "react-router-dom";

import Layout from "@/apps/dashboard/components/Layout";
import RouteLoading from "@/components/RouteLoading";

import { Route as RouterRoute } from "@/types/router";
import Router from "@/utils/router";

export default class extends Router {
  static routes: RouterRoute[] = [
    { name: "dashboard", path: "/dashboard" },
    {
      name: "home",
      path: "/dashboard/home",
      title: "Home",
    },
    {
      name: "apps",
      path: "/dashboard/apps",
      title: "Apps",
    },
    {
      name: "app.add",
      path: "/dashboard/apps/add",
      title: "Add App",
    },
    {
      name: "app.show",
      path: "/dashboard/apps/:id",
      title: "App Details",
    },
    {
      name: "app.version.add",
      path: "/dashboard/apps/:id/versions/add",
      title: "Add Version",
    },
    {
      name: "app.version.show",
      path: "/dashboard/apps/:id/versions/:versionId",
      title: "Version Details",
    },
    {
      name: "app.version.bundle.add",
      path: "/dashboard/apps/:id/versions/:versionId/bundles/add",
      title: "Add Bundle",
    },
    {
      name: "app.version.bundle.show",
      path: "/dashboard/apps/:id/versions/:versionId/bundles/:bundleId",
      title: "Bundle Details",
    },
    {
      name: "domains",
      path: "/dashboard/domains",
      title: "Domains",
    },
    {
      name: "domain.add",
      path: "/dashboard/domains/add",
      title: "Add Domain",
    },
    {
      name: "domain.show",
      path: "/dashboard/domains/:id",
      title: "Domain Details",
    },
    {
      name: "users",
      path: "/dashboard/users",
      title: "Users",
    },
    {
      name: "user.show",
      path: "/dashboard/users/:id",
      title: "User Details",
    },
    {
      name: "roles",
      path: "/dashboard/roles",
      title: "Roles",
    },
    {
      name: "role.show",
      path: "/dashboard/roles/:id",
      title: "Role Details",
    },
    {
      name: "permissions",
      path: "/dashboard/permissions",
      title: "Permissions",
    },
    {
      name: "permission.show",
      path: "/dashboard/permissions/:id",
      title: "Permission Details",
    },
    {
      name: "statistics",
      path: "/dashboard/statistics",
      title: "Statistics",
    },
    {
      name: "settings",
      path: "/dashboard/settings",
      title: "Settings",
    },
  ];

  static getRoutes() {
    const HomeTab = React.lazy(() => import("@/apps/dashboard/tabs/HomeTab"));

    const AppsTab = React.lazy(() => import("@/apps/dashboard/tabs/AppsTab"));
    const AppTab = React.lazy(() => import("@/apps/dashboard/tabs/AppTab"));

    const VersionTab = React.lazy(() => import("@/apps/dashboard/tabs/VersionTab"));
    const BundleTab = React.lazy(() => import("@/apps/dashboard/tabs/BundleTab"));

    const DomainsTab = React.lazy(() => import("@/apps/dashboard/tabs/DomainsTab"));
    const DomainTab = React.lazy(() => import("@/apps/dashboard/tabs/DomainTab"));

    const UsersTab = React.lazy(() => import("@/apps/dashboard/tabs/UsersTab"));
    const UserTab = React.lazy(() => import("@/apps/dashboard/tabs/UserTab"));

    const RolesTab = React.lazy(() => import("@/apps/dashboard/tabs/RolesTab"));
    const RoleTab = React.lazy(() => import("@/apps/dashboard/tabs/RoleTab"));

    const PermissionsTab = React.lazy(() => import("@/apps/dashboard/tabs/PermissionsTab"));
    const PermissionTab = React.lazy(() => import("@/apps/dashboard/tabs/PermissionTab"));

    const StatisticsTab = React.lazy(() => import("@/apps/dashboard/tabs/StatisticsTab"));

    const SettingsTab = React.lazy(() => import("@/apps/dashboard/tabs/SettingsTab"));

    return (
      <Route path={this.getPath("dashboard")} element={<Layout />}>
        <Route
          index
          element={<Navigate to={this.getPath("home")!} replace />}
        />
        <Route
          path={this.getPath("home")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <HomeTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("apps")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <AppsTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("app.show")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <AppTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("app.add")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <AppTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("app.version.add")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <VersionTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("app.version.show")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <VersionTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("app.version.bundle.add")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <BundleTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("app.version.bundle.show")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <BundleTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("domains")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <DomainsTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("domain.show")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <DomainTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("domain.add")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <DomainTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("users")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <UsersTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("user.show")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <UserTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("roles")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <RolesTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("role.show")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <RoleTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("permissions")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <PermissionsTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("permission.show")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <PermissionTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("statistics")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <StatisticsTab />
            </React.Suspense>
          }
        />
        <Route
          path={this.getPath("settings")}
          element={
            <React.Suspense fallback={<RouteLoading />}>
              <SettingsTab />
            </React.Suspense>
          }
        />
        {/* <Route path="*" element={<Navigate to={this.getPath("home")!} />} />  */}
      </Route>
    );
  }
}
