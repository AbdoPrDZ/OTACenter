import { Outlet, useLocation } from "react-router-dom";
import { ReactNode, useEffect, useRef, useState } from "react";

import DashboardRouter from "@/apps/dashboard/router";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Forbidden from "@/components/Forbidden";
import { getRouteAccess } from "@/components/navigation";
import { AUTHOR_URL, copyrightNotice } from "@/components/site/site";

import { can } from "@/utils/permissions";

const SIDEBAR_KEY = "otacenter-sidebar";

export default function Layout(props: { children?: ReactNode }) {
  const [route, setRoute] = useState(DashboardRouter.current);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === "collapsed",
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

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

        <main ref={mainRef} className="relative flex flex-1 flex-col overflow-y-auto scrollbar-thin">
          {/* Keyed by path: each page change remounts this wrapper and replays the enter animation. */}
          <div key={location.pathname} className="mx-auto w-full max-w-7xl flex-1 animate-page-in p-4 md:p-6">
            {allowed ? (
              <>
                {props.children}
                <Outlet />
              </>
            ) : (
              <Forbidden />
            )}
          </div>

          <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-4 text-[0.6875rem] text-muted-foreground md:px-6">
            <span>
              OTACenter ·{" "}
              <a href={AUTHOR_URL} target="_blank" rel="noreferrer" className="font-medium hover:text-foreground">
                {copyrightNotice()}
              </a>
            </span>
            <nav className="flex items-center gap-4">
              <a href="/about" className="hover:text-foreground">About</a>
              <a href="/contact" className="hover:text-foreground">Contact</a>
              <a href="/docs" className="hover:text-foreground">Docs</a>
            </nav>
          </footer>
        </main>
      </div>
    </div>
  );
}
