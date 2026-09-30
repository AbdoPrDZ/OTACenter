import { useNavigate } from "react-router-dom";

import DashboardRouter from "@/apps/dashboard/router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_ITEMS, isNavActive } from "@/components/navigation";
import { can } from "@/utils/permissions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import User from "@/models/User";
import { Route } from "@/types/router";
import { ChevronDown, LogOut, RadioTower } from "lucide-react";

function BrandLogo(props: { className?: string }) {
  return (
    <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground", props.className)}>
      <RadioTower className="size-4" />
    </div>
  );
}

export default function SideMenu(props: { route: Route }) {
  const navigate = useNavigate();
  const user = User.current;

  const visibleItems = NAV_ITEMS.filter((item) => can(item.access));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="group-data-[collapsible=icon]:p-2!"
              onClick={() => navigate(DashboardRouter.getPath("home")!)}
            >
              <BrandLogo />
              <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">OTACenter</span>
                <span className="truncate text-xs text-muted-foreground">
                  App center
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.filter((item) => item.name !== "settings").map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={isNavActive(item, props.route)}
                    onClick={() => navigate(DashboardRouter.getPath(item.name)!)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.filter((item) => item.name === "settings").map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={isNavActive(item, props.route)}
                    onClick={() => navigate(DashboardRouter.getPath(item.name)!)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {user && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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
                  <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.login}
                    </span>
                  </div>
                  <span className="ml-auto group-data-[collapsible=icon]:hidden">
                    <ChevronDown className="size-4" />
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--anchor-width) min-w-56 rounded-lg"
                  side="top"
                  align="center"
                  sideOffset={8}
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="truncate text-sm font-medium">{user.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {user.login}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => User.logout()}>
                    <LogOut />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  );
}
