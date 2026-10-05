import { Outlet } from "react-router-dom";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export default function StoreLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader active="store" />

      <main className="flex-1">
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  );
}
