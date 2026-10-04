import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerHeader,
} from "@/components/ui/drawer";

import DocsSidebar from "./DocsSidebar";

export default function DocsLayout({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader active="docs" />

      <div className="mx-auto flex w-full max-w-7xl flex-1 items-start gap-10 px-4 py-8">
        <aside className="sticky top-20 hidden h-[calc(100dvh-6rem)] w-72 shrink-0 overflow-y-auto pr-2 lg:block">
          <DocsSidebar />
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <Button variant="outline" size="sm" onClick={() => setNavOpen(true)}>
              <Menu /> Documentation
            </Button>
          </div>
          {children}
        </main>
      </div>

      <SiteFooter />

      <Drawer open={navOpen} onOpenChange={setNavOpen} side="left">
        <DrawerHeader>
          <span className="text-sm font-semibold">Documentation</span>
          <DrawerClose />
        </DrawerHeader>
        <DrawerBody>
          <DocsSidebar onNavigate={() => setNavOpen(false)} />
        </DrawerBody>
      </Drawer>
    </div>
  );
}
