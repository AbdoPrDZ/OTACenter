import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PackageOpen, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Spinner } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

import AppLogo from "./AppLogo";
import {
  fetchStoreApps,
  fetchStoreDomains,
  formatDate,
  type IStoreApp,
  type IStoreDomain,
} from "../api";

const PAGE_SIZE = 12;

export default function StorePage() {
  const [apps, setApps] = useState<IStoreApp[]>([]);
  const [domains, setDomains] = useState<IStoreDomain[]>([]);
  const [pagination, setPagination] = useState({ itemsCount: 0, pagesCount: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<number>();
  const [page, setPage] = useState(1);

  useEffect(() => {
    document.title = "App Store — OTACenter";
  }, []);

  useEffect(() => {
    fetchStoreDomains().then((response) => {
      if (response.success && response.data) setDomains(response.data.items);
    });
  }, []);

  // Debounce the search box before it hits the API.
  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchStoreApps({
      page,
      pageSize: PAGE_SIZE,
      search: query || undefined,
      domain,
    })
      .then((response) => {
        if (!active) return;

        if (response.success && response.data) {
          setApps(response.data.items);
          setPagination({
            itemsCount: response.data.itemsCount,
            pagesCount: response.data.pagesCount,
            page: response.data.page,
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, query, domain]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <span className="size-1.5 rounded-full bg-primary" />
          Public apps
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">App Store</h1>
        <p className="max-w-xl text-sm/relaxed text-muted-foreground">
          Download the applications published by the center. Everything here is public — no account
          needed.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search apps…"
            aria-label="Search apps"
            className="pl-9"
          />
        </div>

        {domains.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setDomain(undefined);
                setPage(1);
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                domain === undefined
                  ? "border-primary bg-primary/12 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              All
            </button>

            {domains.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setDomain(item.id);
                  setPage(1);
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  domain === item.id
                    ? "border-primary bg-primary/12 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {item.name}
                {item.apps_count ? ` · ${item.apps_count}` : ""}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {loading ? (
        <Spinner className="mx-auto mt-10 size-6 text-muted-foreground" />
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <PackageOpen className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No apps to show</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {query
              ? "Nothing matches that search."
              : "Apps appear here once they belong to a domain marked public and have a published version."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <StoreCard key={app.id} app={app} />
          ))}
        </div>
      )}

      {pagination.pagesCount > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.pagesCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.pagesCount}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function StoreCard({ app }: { app: IStoreApp }) {
  const updated = formatDate(app.updated_at);

  return (
    <Link
      to={`/apps/${app.id}`}
      className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Card className="h-full transition-colors group-hover:border-primary/40">
        <CardContent className="flex h-full flex-col gap-3 pt-5">
          <div className="flex items-start gap-3">
            <AppLogo name={app.name} logoUrl={app.logo_url} />

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">{app.name}</h2>
              <p className="truncate font-mono text-[0.6875rem] text-muted-foreground">
                {app.package_name}
              </p>
            </div>

            {app.version ? <Badge variant="outline">{app.version}</Badge> : null}
          </div>

          <p className="line-clamp-2 min-h-8 text-xs/relaxed text-muted-foreground">
            {app.summary || "No summary provided."}
          </p>

          <div className="mt-auto flex flex-wrap items-center gap-1.5">
            {app.domains.map((domain) => (
              <span
                key={domain.id}
                className="rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground"
              >
                {domain.name}
              </span>
            ))}

            {updated ? (
              <span className="ml-auto text-[0.6875rem] text-muted-foreground">{updated}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
