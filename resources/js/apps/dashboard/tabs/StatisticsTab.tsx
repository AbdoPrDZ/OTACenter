import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Boxes,
  Download,
  Globe,
  Layers,
  Link2,
  PanelsTopLeft,
  ShieldCheck,
  Users,
} from "lucide-react";

import Statistics, { GeneralStatistics } from "@/models/Statistics";
import DashboardRouter from "@/apps/dashboard/router";
import PageHeader from "@/components/PageHeader";
import KpiTile from "@/components/KpiTile";
import { DownloadsChart, Meter, RankList, SegmentBar } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";

export default function StatisticsTab() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<GeneralStatistics>();

  useEffect(() => {
    let cancelled = false;

    Statistics.general().then((response) => {
      if (!cancelled && response.success && response.data) setStats(response.data.statistics);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const last30 = stats?.downloads.daily.reduce((sum, day) => sum + day.with_token + day.without_token, 0);
  const open = (name: string, params?: Record<string, string>) => {
    const path = DashboardRouter.getPath(name, params);
    if (path) navigate(path);
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader
        title="Statistics"
        description="How the center is used: downloads, catalogue and access, at a glance."
      />

      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Downloads · 30 days"
          value={last30}
          icon={Download}
          hint={stats ? `${stats.downloads.total.toLocaleString()} all time` : undefined}
        />
        <KpiTile
          label="Apps"
          value={stats?.apps.total}
          icon={PanelsTopLeft}
          tone="info"
          hint={stats ? `${stats.apps.with_versions.toLocaleString()} with versions` : undefined}
          onClick={() => open("apps")}
          style={{ animationDelay: "40ms" }}
        />
        <KpiTile
          label="Users"
          value={stats?.users.total}
          icon={Users}
          tone="success"
          hint={stats ? `${stats.users.with_domains.toLocaleString()} in a domain` : undefined}
          onClick={() => open("users")}
          style={{ animationDelay: "80ms" }}
        />
        <KpiTile
          label="Active links"
          value={stats?.download_links.active}
          icon={Link2}
          tone="warning"
          hint={stats ? `${stats.download_links.total.toLocaleString()} created` : undefined}
          style={{ animationDelay: "120ms" }}
        />
      </div>

      {/* Downloads */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="animate-slide-up lg:col-span-2" style={{ animationDelay: "120ms" }}>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Downloads</CardTitle>
              <p className="text-xs text-muted-foreground">Last 30 days, by whether a download link was used.</p>
            </div>
            {stats ? (
              <div className="text-right">
                <p className="text-xl font-semibold tabular-nums">{last30?.toLocaleString()}</p>
                <p className="text-[0.625rem] text-muted-foreground uppercase">total</p>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {stats ? <DownloadsChart data={stats.downloads.daily} /> : <Skeleton className="h-56 w-full" />}
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "160ms" }}>
          <CardHeader>
            <CardTitle>Top apps</CardTitle>
            <p className="text-xs text-muted-foreground">Most downloaded, all time.</p>
          </CardHeader>
          <CardContent>
            {stats ? (
              <RankList
                items={stats.downloads.top_apps.map((app) => ({
                  id: app.id,
                  name: app.name,
                  image: app.logo_url,
                  value: app.downloads,
                }))}
                unit="dl"
                emptyMessage="No downloads yet."
                onSelect={(id) => open("app.show", { id: String(id) })}
              />
            ) : (
              <SkeletonRows />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Catalogue & access */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="animate-slide-up" style={{ animationDelay: "200ms" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Versions</CardTitle>
            <CountChip icon={Layers} value={stats?.versions.total} />
          </CardHeader>
          <CardContent>
            {stats ? <SegmentBar byStatus={stats.versions.by_status} /> : <SkeletonRows rows={3} />}
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "240ms" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Bundles</CardTitle>
            <CountChip icon={Boxes} value={stats?.bundles.total} />
          </CardHeader>
          <CardContent>
            {stats ? <SegmentBar byStatus={stats.bundles.by_status} /> : <SkeletonRows rows={3} />}
          </CardContent>
        </Card>

        <Card className="animate-slide-up md:col-span-2 lg:col-span-1" style={{ animationDelay: "280ms" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Coverage</CardTitle>
            <div className="flex items-center gap-2">
              <CountChip icon={Globe} value={stats?.domains.total} />
              <CountChip icon={ShieldCheck} value={stats?.roles.total} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {stats ? (
              <>
                <Meter label="Users in a domain" value={stats.users.with_domains} total={stats.users.total} />
                <Meter label="Apps with a version" value={stats.apps.with_versions} total={stats.apps.total} />
                <Meter
                  label="Versions with bundles"
                  value={stats.versions.with_bundles}
                  total={stats.versions.total}
                />
                <Meter
                  label="Downloads via link"
                  value={stats.downloads.with_token}
                  total={stats.downloads.total}
                />
              </>
            ) : (
              <SkeletonRows rows={4} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CountChip({ icon: Icon, value }: { icon: typeof Layers; value?: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
      <Icon className="size-3.5" />
      <span className="font-medium text-foreground tabular-nums">{value?.toLocaleString() ?? "–"}</span>
    </span>
  );
}

function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-8 w-full" />
      ))}
    </div>
  );
}
