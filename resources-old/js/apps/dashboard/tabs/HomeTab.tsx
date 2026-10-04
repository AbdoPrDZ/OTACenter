import { useNavigate } from "react-router-dom";

import DashboardRouter from "@/apps/dashboard/router";
import InviteDialog from "@/components/InviteDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { can, type RouteAccess } from "@/utils/permissions";

import {
  BarChart3,
  ChevronRight,
  Globe,
  KeyRound,
  PanelsTopLeft,
  Plus,
  RadioTower,
  ShieldCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

interface QuickAccessItem {
  name: string;
  label: string;
  description: string;
  icon: LucideIcon;
  access?: RouteAccess;
}

const QUICK_ACCESS: QuickAccessItem[] = [
  {
    name: "apps",
    label: "Apps",
    description: "Publish applications and manage their versions.",
    icon: PanelsTopLeft,
    access: { permission: "app.view" },
  },
  {
    name: "domains",
    label: "Domains",
    description: "Organizational groups that scope who can access what.",
    icon: Globe,
    access: { permission: "domain.view" },
  },
  {
    name: "users",
    label: "Users",
    description: "LDAP directory users and their domain bindings.",
    icon: Users,
    access: { permission: "user.view" },
  },
  {
    name: "roles",
    label: "Roles",
    description: "Roles and the users attached to them.",
    icon: ShieldCheck,
    access: { permission: "role.view" },
  },
  {
    name: "permissions",
    label: "Permissions",
    description: "Fine-grained actions granted to roles and users.",
    icon: KeyRound,
    access: { permission: "permission.view" },
  },
  {
    name: "statistics",
    label: "Statistics",
    description: "Aggregated overview of the center's resources.",
    icon: BarChart3,
    access: { roles: ["super-admin", "admin"] },
  },
];

const OVERVIEW_POINTS = [
  {
    title: "Apps",
    text: "Publish mobile & desktop apps and attach versioned builds.",
  },
  {
    title: "Versions & bundles",
    text: "Each version hosts a distributable bundle that devices update over-the-air.",
  },
  {
    title: "Domains",
    text: "Group users and apps into organizational domains to scope access.",
  },
  {
    title: "Users",
    text: "Users come from your LDAP directory and are bound to domains.",
  },
  {
    title: "Roles & permissions",
    text: "Control what each user can view and do across the center.",
  },
];

export default function HomeTab() {
  const navigate = useNavigate();
  const accessible = QUICK_ACCESS.filter((item) => can(item.access));

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <h1 className="text-sm font-semibold tracking-tight">Home</h1>
        <p className="text-xs text-muted-foreground">
          Overview of the app center.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <RadioTower className="size-4" />
            </span>
            Welcome to OTACenter
          </CardTitle>
          <CardDescription>
            OTACenter is the Over-The-Air distribution &amp; management
            platform for your applications. Use the shortcuts below or the
            sidebar to get around.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          {OVERVIEW_POINTS.map((point) => (
            <div key={point.title} className="flex items-start gap-3">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{point.title}</span>
                <span> — {point.text}</span>
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold tracking-tight text-muted-foreground uppercase">
          Quick access
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accessible.map((item) => (
            <Card
              key={item.name}
              className="cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/40"
              onClick={() => navigate(DashboardRouter.getPath(item.name)!)}
            >
              <CardContent className="flex items-center justify-between gap-3 pt-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <item.icon className="size-4" />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold">{item.label}</span>
                    <span className="text-[0.625rem] text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold tracking-tight text-muted-foreground uppercase">
          Quick actions
        </h2>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 pt-4">
            {can({ permission: "app.create" }) && (
              <Button
                variant="outline"
                onClick={() => navigate(DashboardRouter.getPath("app.add")!)}
              >
                <Plus />
                Create App
              </Button>
            )}
            {can({ permission: "user.invite" }) && (
              <InviteDialog
                onInvited={() => {}}
                triggerRender={
                  <Button variant="outline">
                    <UserPlus />
                    Invite User
                  </Button>
                }
              />
            )}
            {can({ permission: "domain.create" }) && (
              <Button
                variant="outline"
                onClick={() => navigate(DashboardRouter.getPath("domain.add")!)}
              >
                <Plus />
                Add Domain
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}