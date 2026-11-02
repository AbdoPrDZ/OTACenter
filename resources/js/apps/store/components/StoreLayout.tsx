import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export default function StoreLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader active="store" />

      {/* Keyed by path: each page change replays the enter animation. */}
      <main key={location.pathname} className="flex-1 animate-page-in">
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  );
}
