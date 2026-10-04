import { Outlet } from "react-router-dom";

import { ReactNode, useEffect, useState } from "react";

import DashboardRouter from "@/apps/dashboard/router";
import SideMenu from "./SideMenu";
import AppNavbar from "./AppNavbar";
import Header from "./Header";
import Forbidden from "@/components/Forbidden";
import { getRouteAccess } from "@/components/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { can } from "@/utils/permissions";

export default function Layout(props: { children?: ReactNode }) {
  const [route, setRoute] = useState(DashboardRouter.current);

  const isMobile = useIsMobile();

  useEffect(() => {
    DashboardRouter.listen((_from, to) => setRoute(to));
  }, []);

  const allowed = can(getRouteAccess(route.name));

  return (
    <SidebarProvider>
      {!isMobile && <SideMenu route={route} />}
      <SidebarInset>
        <AppNavbar route={route} />
        <Header route={route} />
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {allowed ? (
            <>
              {props.children}
              <Outlet />
            </>
          ) : (
            <Forbidden />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
