import { useEffect, useState } from "react";
import {
  Boxes,
  Globe,
  Layers,
  PanelsTopLeft,
  ShieldCheck,
  Users,
} from "lucide-react";

import Statistics, { GeneralStatistics } from "@/models/Statistics";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { StatusBreakdown } from "@/components/StatisticsViews";

export default function StatisticsTab() {
  const [stats, setStats] = useState<GeneralStatistics>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Statistics.general().then((response) => {
      if (cancelled) return;
      if (response.success && response.data) setStats(response.data.statistics);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader
        title="Statistics"
        description="Aggregated overview of the center's resources."
      />

      {loading || !stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="flex flex-col gap-2 pt-5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-10" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <TotalCard label="Users" value={stats.users.total} icon={Users} />
            <TotalCard label="Roles" value={stats.roles.total} icon={ShieldCheck} />
            <TotalCard label="Domains" value={stats.domains.total} icon={Globe} />
            <TotalCard label="Apps" value={stats.apps.total} icon={PanelsTopLeft} />
            <TotalCard label="Versions" value={stats.versions.total} icon={Layers} />
            <TotalCard label="Bundles" value={stats.bundles.total} icon={Boxes} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Row label="With a domain" value={stats.users.with_domains} />
                <Row label="Without a domain" value={stats.users.without_domains} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Versions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Row label="With bundles" value={stats.versions.with_bundles} />
                <Row label="Without bundles" value={stats.versions.without_bundles} />
                <StatusBreakdown byStatus={stats.versions.by_status} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bundles</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <StatusBreakdown byStatus={stats.bundles.by_status} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function TotalCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="size-3.5" />
          <span className="text-[0.6875rem] font-medium tracking-wide uppercase">
            {label}
          </span>
        </div>
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {value.toLocaleString()}
        </span>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant="outline" className="tabular-nums">
        {value.toLocaleString()}
      </Badge>
    </div>
  );
}
