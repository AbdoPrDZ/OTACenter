import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Statistics, {
  AppStatistics,
  DomainStatistics,
  RoleStatistics,
  UserStatistics,
  VersionStatistics,
} from "@/models/Statistics";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Skeleton, Spinner } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Shared building blocks                                              */
/* ------------------------------------------------------------------ */

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value?: number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-5">
        {value === undefined ? (
          <>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-12" />
          </>
        ) : (
          <>
            <span className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
              {label}
            </span>
            <span className="text-2xl font-semibold tracking-tight tabular-nums">
              {value.toLocaleString()}
            </span>
            {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function StatusBreakdown({ byStatus }: { byStatus?: Record<string, number> }) {
  if (!byStatus) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-5 w-16 rounded-full" />
        ))}
      </div>
    );
  }

  const entries = Object.entries(byStatus);

  if (entries.length === 0) {
    return <p className="py-2 text-center text-xs text-muted-foreground">No statuses.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([status, count]) => (
        <Badge key={status} variant="outline" className="gap-1.5 py-1">
          <span className="font-medium capitalize">{status}</span>
          <span className="tabular-nums text-muted-foreground">{count}</span>
        </Badge>
      ))}
    </div>
  );
}

function EntityList({
  items,
  emptyMessage = "Nothing yet.",
}: {
  items?: { id: number; name: string; extra?: string }[];
  emptyMessage?: string;
}) {
  if (!items) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
        >
          <span className="truncate text-xs font-medium">{item.name}</span>
          {item.extra ? (
            <span className="shrink-0 truncate text-[0.625rem] text-muted-foreground">
              {item.extra}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CardBlock({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle ? (
          <p className="text-xs/relaxed text-muted-foreground">{subtitle}</p>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Entity statistics panels                                            */
/* ------------------------------------------------------------------ */

export function UserStats({ userId }: { userId: number }) {
  const [data, setData] = useState<UserStatistics>();

  useEffect(() => {
    Statistics.byUser(userId).then((response) => {
      if (response.success) setData(response.data);
    });
  }, [userId]);

  if (!data) return <Spinner className="mx-auto mt-8 size-5 text-muted-foreground" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Roles" value={data.statistics.roles_count} />
        <StatCard label="Domains" value={data.statistics.domains_count} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CardBlock title="Roles">
          <EntityList items={data.statistics.roles} emptyMessage="No roles assigned." />
        </CardBlock>

        <CardBlock title="Domains">
          <EntityList items={data.statistics.domains} emptyMessage="No domains bound." />
        </CardBlock>
      </div>
    </div>
  );
}

export function RoleStats({ roleId }: { roleId: number }) {
  const [data, setData] = useState<RoleStatistics>();

  useEffect(() => {
    Statistics.byRole(roleId).then((response) => {
      if (response.success) setData(response.data);
    });
  }, [roleId]);

  if (!data) return <Spinner className="mx-auto mt-8 size-5 text-muted-foreground" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Users" value={data.statistics.users_count} />
      </div>

      <CardBlock title="Users">
        <EntityList
          items={data.statistics.users.map((user) => ({
            id: user.id,
            name: user.name,
            extra: user.login,
          }))}
          emptyMessage="No users with this role."
        />
      </CardBlock>
    </div>
  );
}

export function DomainStats({ domainId }: { domainId: number }) {
  const [data, setData] = useState<DomainStatistics>();

  useEffect(() => {
    Statistics.byDomain(domainId).then((response) => {
      if (response.success) setData(response.data);
    });
  }, [domainId]);

  if (!data) return <Spinner className="mx-auto mt-8 size-5 text-muted-foreground" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Users" value={data.statistics.users_count} />
        <StatCard label="Apps" value={data.statistics.apps_count} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CardBlock title="Users">
          <EntityList
            items={data.statistics.users.map((user) => ({
              id: user.id,
              name: user.name,
              extra: user.login,
            }))}
            emptyMessage="No users in this domain."
          />
        </CardBlock>

        <CardBlock title="Apps">
          <EntityList
            items={data.statistics.apps.map((app) => ({
              id: app.id,
              name: app.name,
              extra: app.status,
            }))}
            emptyMessage="No apps in this domain."
          />
        </CardBlock>
      </div>
    </div>
  );
}

export function AppStats({ appId }: { appId: number }) {
  const navigate = useNavigate();
  const [data, setData] = useState<AppStatistics>();

  useEffect(() => {
    Statistics.byApp(appId).then((response) => {
      if (response.success) setData(response.data);
    });
  }, [appId]);

  if (!data) return <Spinner className="mx-auto mt-8 size-5 text-muted-foreground" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Versions" value={data.statistics.versions_count} />
        <StatCard label="Bundles" value={data.statistics.bundles_count} />
        <StatCard label="Domains" value={data.statistics.domains_count} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CardBlock title="Versions by status">
          <StatusBreakdown byStatus={data.statistics.versions_by_status} />
        </CardBlock>

        <CardBlock title="Domains">
          <EntityList
            items={data.statistics.domains}
            emptyMessage="No domains bound to this app."
          />
        </CardBlock>

        <CardBlock
          className="lg:col-span-2"
          title="Versions"
          subtitle="Versions with their bundle counts. Click a version for details."
        >
          {data.statistics.versions.length === 0 ? (
            <EmptyState
              className="border-0 py-6"
              title="No versions"
              description="This app has no versions yet."
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {data.statistics.versions.map((version) => (
                <button
                  key={version.id}
                  type="button"
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-left transition-colors",
                    "hover:border-primary/40 hover:bg-primary/5",
                  )}
                  onClick={() => navigate(`/dashboard/apps/${appId}/versions/${version.id}`)}
                >
                  <span className="truncate text-xs font-medium">{version.name}</span>
                  <span className="shrink-0 text-[0.625rem] text-muted-foreground">
                    {version.status} · {version.bundles_count} bundles
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardBlock>
      </div>
    </div>
  );
}

export function VersionStats({ versionId }: { versionId: number }) {
  const [data, setData] = useState<VersionStatistics>();

  useEffect(() => {
    Statistics.byVersion(versionId).then((response) => {
      if (response.success) setData(response.data);
    });
  }, [versionId]);

  if (!data) return <Spinner className="mx-auto mt-8 size-5 text-muted-foreground" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Bundles" value={data.statistics.bundles_count} />
      </div>

      <CardBlock
        title="Bundles"
        subtitle={
          data.statistics.latest_bundle
            ? `Latest bundle: ${
                data.statistics.latest_bundle.name ?? data.statistics.latest_bundle.id
              }`
            : "No latest bundle."
        }
      >
        <EntityList
          items={data.statistics.bundles.map((bundle) => ({
            id: bundle.id,
            name: bundle.name ?? `Bundle #${bundle.id}`,
            extra: bundle.url ?? undefined,
          }))}
          emptyMessage="No bundles for this version."
        />
      </CardBlock>
    </div>
  );
}
