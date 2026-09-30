import { useEffect, useState } from "react";

import Statistics, { GeneralStatistics } from "@/models/Statistics";
import { StatCard, StatusBreakdown } from "@/components/StatisticsViews";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <CardHeader className="gap-0.5">
      <CardTitle>{title}</CardTitle>
      {subtitle && <p className="text-xs/relaxed text-muted-foreground">{subtitle}</p>}
    </CardHeader>
  );
}

export default function StatisticsTab() {
  const [stats, setStats] = useState<GeneralStatistics>();

  useEffect(() => {
    let cancelled = false;

    Statistics.general().then((response) => {
      if (cancelled || !response.success) return;
      setStats(response.data?.statistics);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <h1 className="text-sm font-semibold tracking-tight">Statistics</h1>
        <p className="text-xs text-muted-foreground">
          Overview of the apps, versions, bundles, domains, users and roles in the center.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Users" value={stats?.users.total} />
        <StatCard label="Roles" value={stats?.roles.total} />
        <StatCard label="Domains" value={stats?.domains.total} />
        <StatCard label="Apps" value={stats?.apps.total} />
        <StatCard
          label="Versions"
          value={stats?.versions.total}
          hint={
            stats?.versions.with_bundles !== undefined
              ? `${stats.versions.with_bundles} with bundles · ${stats.versions.without_bundles} without`
              : undefined
          }
        />
        <StatCard label="Bundles" value={stats?.bundles.total} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <SectionHeader
            title="Users"
            subtitle="Users with and without a domain assigned."
          />
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <StatCard label="Total" value={stats?.users.total} />
              <StatCard label="With domain" value={stats?.users.with_domains} />
              <StatCard label="Without" value={stats?.users.without_domains} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <SectionHeader
            title="Versions"
            subtitle="Versions grouped by their status."
          />
          <CardContent>
            <StatusBreakdown byStatus={stats?.versions.by_status} />
          </CardContent>
        </Card>

        <Card>
          <SectionHeader
            title="Bundles"
            subtitle="Bundles grouped by their status."
          />
          <CardContent>
            <StatusBreakdown byStatus={stats?.bundles.by_status} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
