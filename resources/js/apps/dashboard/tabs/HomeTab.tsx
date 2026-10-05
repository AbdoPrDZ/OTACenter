import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import App from "@/models/App";
import Domain from "@/models/Domain";
import User from "@/models/User";
import DashboardRouter from "@/apps/dashboard/router";
import InviteDialog from "@/components/InviteDialog";
import LogoMark from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { NAV_ITEMS } from "@/components/navigation";
import { can } from "@/utils/permissions";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  Globe,
  PanelsTopLeft,
  Plus,
  Users,
} from "lucide-react";

interface Counts {
  apps?: number;
  domains?: number;
  users?: number;
}

export default function HomeTab() {
  const navigate = useNavigate();
  const user = User.current;
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      App.all({ pagination: { page: 1, pageSize: 5 } }),
      Domain.all({ pagination: { page: 1, pageSize: 5 } }),
      User.all({ pagination: { page: 1, pageSize: 5 } }),
    ]).then(
      ([apps, domains, users]) => {
        if (cancelled) return;
        setCounts({
          apps: apps.data?.itemsCount ?? 0,
          domains: domains.data?.itemsCount ?? 0,
          users: users.data?.itemsCount ?? 0,
        });
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const stats: { label: string; value?: number; icon: LucideIcon; to: string; access?: { permission?: string; roles?: string[] } }[] = [
    { label: "Apps", value: counts.apps, icon: PanelsTopLeft, to: "apps", access: { permission: "app.view" } },
    { label: "Domains", value: counts.domains, icon: Globe, to: "domains", access: { permission: "domain.view" } },
    { label: "Users", value: counts.users, icon: Users, to: "users", access: { permission: "user.view" } },
  ];

  const quickAccess = NAV_ITEMS.filter(
    (item) => item.group === "general" && item.name !== "home" && can(item.access),
  );

  return (
    <div className="flex w-full flex-col gap-5">
      <Card className="relative overflow-hidden border-primary/20">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-transparent" />
        <CardContent className="relative flex flex-wrap items-center justify-between gap-4 pt-5">
          <div className="flex items-center gap-4">
            <span className="flex size-16 items-center justify-center rounded-2xl">
              <LogoMark className="size-16" />
            </span>
            <div>
              <h1 className="text-base font-semibold tracking-tight">
                {user ? `Welcome back, ${user.name.split(" ")[0]}` : "Welcome to OTACenter"}
              </h1>
              <p className="text-xs/relaxed text-muted-foreground">
                Over-The-Air distribution &amp; management for your applications.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const allowed = can(stat.access);
          return (
            <Card
              key={stat.label}
              className={allowed ? "transition-colors hover:border-primary/40" : "opacity-70"}
            >
              <CardContent className="flex items-center gap-3 pt-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Icon className="size-5" />
                </span>
                <div className="flex-1">
                  <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                    {stat.label}
                  </p>
                  {loading ? (
                    <Skeleton className="mt-1 h-6 w-10" />
                  ) : (
                    <p className="text-xl font-semibold tracking-tight tabular-nums">
                      {stat.value?.toLocaleString() ?? 0}
                    </p>
                  )}
                </div>
                {allowed ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Open ${stat.label}`}
                    onClick={() => navigate(DashboardRouter.getPath(stat.to)!)}
                  >
                    <ChevronRight />
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[0.6875rem] font-semibold tracking-widest text-muted-foreground uppercase">
          Quick access
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickAccess.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => navigate(DashboardRouter.getPath(item.name)!)}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">
                    {item.label}
                  </span>
                  <span className="block truncate text-[0.625rem] text-muted-foreground">
                    {item.description}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[0.6875rem] font-semibold tracking-widest text-muted-foreground uppercase">
          Quick actions
        </h2>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 pt-5">
            {can({ permission: "app.create" }) ? (
              <Button
                variant="outline"
                onClick={() => navigate(DashboardRouter.getPath("app.add")!)}
              >
                <Plus /> Create app
              </Button>
            ) : null}
            {can({ permission: "domain.create" }) ? (
              <Button
                variant="outline"
                onClick={() => navigate(DashboardRouter.getPath("domain.add")!)}
              >
                <Plus /> Add domain
              </Button>
            ) : null}
            {can({ permission: "user.invite" }) ? (
              <InviteDialog
                onInvited={() => undefined}
                trigger={
                  <Button variant="outline">
                    <Plus /> Invite user
                  </Button>
                }
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
