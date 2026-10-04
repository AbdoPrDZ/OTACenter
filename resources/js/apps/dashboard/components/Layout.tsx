import { Outlet } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";

import DashboardRouter from "@/apps/dashboard/router";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Forbidden from "@/components/Forbidden";
import { getRouteAccess } from "@/components/navigation";

import { can } from "@/utils/permissions";

const SIDEBAR_KEY = "otacenter-sidebar";

export default function Layout(props: { children?: ReactNode }) {
  const [route, setRoute] = useState(DashboardRouter.current);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === "collapsed",
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    DashboardRouter.listen((_from, to) => setRoute(to));
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "expanded");
  }, [collapsed]);

  const allowed = can(getRouteAccess(route.name));

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <Sidebar
        route={route}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          route={route}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          onOpenMobile={() => setMobileOpen(true)}
        />

        <main className="relative flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
            {allowed ? (
              <>
                {props.children}
                <Outlet />
              </>
            ) : (
              <Forbidden />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
