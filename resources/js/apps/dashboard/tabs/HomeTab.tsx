import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ChevronRight,
  Download,
  Globe,
  PanelsTopLeft,
  Plus,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

import App, { IApp } from "@/models/App";
import Domain from "@/models/Domain";
import User from "@/models/User";
import Statistics, { GeneralStatistics } from "@/models/Statistics";
import DashboardRouter from "@/apps/dashboard/router";
import InviteDialog from "@/components/InviteDialog";
import KpiTile from "@/components/KpiTile";
import LogoMark from "@/components/Logo";
import { DownloadsChart } from "@/components/charts";
import { NAV_ITEMS } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/feedback";
import { can } from "@/utils/permissions";

interface Counts {
  apps?: number;
  domains?: number;
  users?: number;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeTab() {
  const navigate = useNavigate();
  const user = User.current;
  const canSeeStats = can({ roles: ["super-admin", "admin"] });

  const [counts, setCounts] = useState<Counts>({});
  const [apps, setApps] = useState<IApp[]>();
  const [stats, setStats] = useState<GeneralStatistics>();

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      can({ permission: "app.view" }) ? App.all({ pagination: { page: 1, pageSize: 6 } }) : null,
      can({ permission: "domain.view" }) ? Domain.all({ pagination: { page: 1, pageSize: 5 } }) : null,
      can({ permission: "user.view" }) ? User.all({ pagination: { page: 1, pageSize: 5 } }) : null,
    ]).then(([appsResponse, domains, users]) => {
      if (cancelled) return;
      setCounts({
        apps: appsResponse?.data?.itemsCount,
        domains: domains?.data?.itemsCount,
        users: users?.data?.itemsCount,
      });
      setApps(appsResponse?.data?.items ?? []);
    });

    if (canSeeStats) {
      Statistics.general().then((response) => {
        if (!cancelled && response.success && response.data) setStats(response.data.statistics);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [canSeeStats]);

  const go = (name: string, params?: Record<string, string>) => {
    const path = DashboardRouter.getPath(name, params);
    if (path) navigate(path);
  };

  const last30 = stats?.downloads.daily.reduce((sum, day) => sum + day.with_token + day.without_token, 0);

  const tiles: {
    label: string;
    value?: number;
    icon: LucideIcon;
    to: string;
    tone: "primary" | "info" | "success" | "warning";
    permission: string;
  }[] = [
    { label: "Apps", value: counts.apps, icon: PanelsTopLeft, to: "apps", tone: "primary", permission: "app.view" },
    { label: "Domains", value: counts.domains, icon: Globe, to: "domains", tone: "info", permission: "domain.view" },
    { label: "Users", value: counts.users, icon: Users, to: "users", tone: "success", permission: "user.view" },
  ];
  const visibleTiles = tiles.filter((tile) => can({ permission: tile.permission }));

  const quickAccess = NAV_ITEMS.filter(
    (item) => item.group === "general" && item.name !== "home" && can(item.access),
  );

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-6 shadow-sm md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklch,var(--color-primary)_22%,transparent),transparent_55%),radial-gradient(ellipse_at_bottom_left,color-mix(in_oklch,var(--color-info)_14%,transparent),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)] bg-[size:28px_28px] opacity-60" />
        <LogoMark className="pointer-events-none absolute -right-6 -bottom-8 size-44 opacity-10 md:size-56" />

        <div className="relative flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[0.6875rem] font-medium text-primary">
              <Sparkles className="size-3" />
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </span>
            <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {user ? `${greeting()}, ${user.name.split(" ")[0]}` : "Welcome to OTACenter"}
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Publish builds, control who gets them, and follow every download — all from one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {can({ permission: "app.create" }) ? (
              <Button onClick={() => go("app.add")}>
                <Plus /> Create app
              </Button>
            ) : null}
            {can({ permission: "domain.create" }) ? (
              <Button variant="outline" onClick={() => go("domain.add")}>
                <Globe /> Add domain
              </Button>
            ) : null}
            {can({ permission: "user.invite" }) ? (
              <InviteDialog
                onInvited={() => undefined}
                trigger={
                  <Button variant="outline">
                    <UserPlus /> Invite user
                  </Button>
                }
              />
            ) : null}
          </div>
        </div>
      </section>

      {/* Headline numbers */}
      {visibleTiles.length || canSeeStats ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {visibleTiles.map((tile, index) => (
            <KpiTile
              key={tile.label}
              label={tile.label}
              value={tile.value}
              icon={tile.icon}
              tone={tile.tone}
              onClick={() => go(tile.to)}
              style={{ animationDelay: `${index * 50}ms` }}
            />
          ))}
          {canSeeStats ? (
            <KpiTile
              label="Downloads · 30 days"
              value={last30}
              icon={Download}
              tone="warning"
              hint={stats ? `${stats.downloads.total.toLocaleString()} all time` : undefined}
              onClick={() => go("statistics")}
              style={{ animationDelay: `${visibleTiles.length * 50}ms` }}
            />
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {canSeeStats ? (
          <Card className="animate-slide-up lg:col-span-2" style={{ animationDelay: "150ms" }}>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle>Download activity</CardTitle>
                <p className="text-xs text-muted-foreground">Last 30 days.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => go("statistics")}>
                Statistics <ArrowRight />
              </Button>
            </CardHeader>
            <CardContent>
              {stats ? <DownloadsChart data={stats.downloads.daily} /> : <Skeleton className="h-56 w-full" />}
            </CardContent>
          </Card>
        ) : null}

        {can({ permission: "app.view" }) ? (
          <Card
            className={canSeeStats ? "animate-slide-up" : "animate-slide-up lg:col-span-3"}
            style={{ animationDelay: "200ms" }}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Apps</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => go("apps")}>
                View all <ArrowRight />
              </Button>
            </CardHeader>
            <CardContent>
              <AppList apps={apps} onOpen={(id) => go("app.show", { id: String(id) })} />
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Quick access */}
      {quickAccess.length ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-[0.6875rem] font-semibold tracking-widest text-muted-foreground uppercase">
            Quick access
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickAccess.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => go(item.name)}
                  style={{ animationDelay: `${250 + index * 40}ms` }}
                  className="group flex animate-slide-up items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary transition-transform duration-200 group-hover:scale-105">
                    <Icon className="size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function AppList({ apps, onOpen }: { apps?: IApp[]; onOpen: (id: number) => void }) {
  if (!apps) {
    return (
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  if (apps.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">No apps yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {apps.map((app) => (
        <li key={app.id}>
          <button
            type="button"
            onClick={() => onOpen(app.id)}
            className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent/60"
          >
            {app.logo_url ? (
              <img src={app.logo_url} alt="" className="size-9 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-xs font-semibold text-primary">
                {app.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{app.name}</span>
              <span className="truncate font-mono text-[0.625rem] text-muted-foreground">{app.package_name}</span>
            </span>
            {app.latest ? (
              <Badge variant={statusVariant(app.latest.status)} size="sm">
                v{app.latest.name}
              </Badge>
            ) : (
              <Badge variant="outline" size="sm">
                no version
              </Badge>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
