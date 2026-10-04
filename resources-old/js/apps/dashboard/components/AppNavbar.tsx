import { useState } from "react";
import * as React from "react";
import { useNavigate } from "react-router-dom";

import DashboardRouter from "@/apps/dashboard/router";
import { NAV_ITEMS, isNavActive } from "@/components/navigation";
import { can } from "@/utils/permissions";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import User from "@/models/User";
import { Route } from "@/types/router";
import { LogOut, Menu, RadioTower, Settings, X } from "lucide-react";

function DrawerNav(props: { route: Route; onNavigate?: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
      {NAV_ITEMS.filter((item) => can(item.access)).map((item) => {
        const active = isNavActive(item, props.route);

        return (
          <button
            key={item.name}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-md px-3 text-left text-xs/relaxed font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={() => {
              navigate(DashboardRouter.getPath(item.name)!);
              props.onNavigate?.();
            }}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function AppNavbar(props: { route: Route }) {
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();

  const close = () => setOpen(false);

  const user = User.current;

  return (
    <div className="flex h-14 items-center gap-2 border-b bg-background px-3 md:hidden">
      <Drawer open={open} onOpenChange={setOpen} swipeDirection="left">
        <DrawerTrigger
          render={<Button variant="ghost" size="icon" aria-label="Open menu" />}
        >
          <Menu />
        </DrawerTrigger>
        <DrawerContent
          style={{ "--drawer-content-width": "min(18rem, 85vw)" } as React.CSSProperties}
        >
          <DrawerHeader className="border-b">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <RadioTower className="size-4" />
              </div>
              <div className="flex flex-1 flex-col">
                <DrawerTitle className="text-sm">OTACenter</DrawerTitle>
                <DrawerDescription className="text-xs">
                  App center
                </DrawerDescription>
              </div>
              <DrawerTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Close menu" />
                }
              >
                <X />
              </DrawerTrigger>
            </div>
          </DrawerHeader>
          <DrawerNav route={props.route} onNavigate={close} />
        </DrawerContent>
      </Drawer>

      <span className="truncate text-sm font-semibold">
        {props.route.title}
      </span>

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto rounded-full"
              />
            }
          >
            {user.image_url ? (
              <img
                src={user.image_url}
                alt={user.name}
                className="size-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-[0.625rem] font-semibold text-primary-foreground">
                {(user.name || "U").slice(0, 2).toUpperCase()}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() => navigate(DashboardRouter.getPath("settings")!)}
            >
              <Settings />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => User.logout()}>
              <LogOut />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
