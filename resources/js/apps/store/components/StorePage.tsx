import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, PackageOpen, Search, ShieldCheck, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

import AppLogo from "./AppLogo";
import Stars from "./Stars";
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

  const totalApps = domains.reduce((sum, item) => sum + (item.apps_count ?? 0), 0);
  const selectDomain = (id?: number) => {
    setDomain(id);
    setPage(1);
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--color-primary)_24%,transparent),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] bg-[size:32px_32px] opacity-50" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-4 pt-16 pb-12 text-center md:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            {totalApps ? `${totalApps.toLocaleString()} apps · ${domains.length} collections` : "Public apps"}
          </span>
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            The <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">App Store</span>
          </h1>
          <p className="max-w-xl text-sm/relaxed text-muted-foreground md:text-base/relaxed">
            Download the applications published by the center — always the latest build, verified and ready
            to install. No account needed.
          </p>

          <div className="relative mt-2 w-full max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search apps by name or package…"
              aria-label="Search apps"
              className="h-12 w-full rounded-2xl border border-border bg-card/80 pr-11 pl-11 text-sm shadow-lg shadow-primary/5 backdrop-blur outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/15"
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <span className="inline-flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-success" />
            Every download is checksummed (SHA-256).
          </span>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {domains.length > 1 ? (
            <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin">
              <FilterPill active={domain === undefined} onClick={() => selectDomain(undefined)}>
                All
              </FilterPill>
              {domains.map((item) => (
                <FilterPill key={item.id} active={domain === item.id} onClick={() => selectDomain(item.id)}>
                  {item.name}
                  {item.apps_count ? (
                    <span className="rounded-full bg-foreground/10 px-1.5 text-[0.625rem] tabular-nums">
                      {item.apps_count}
                    </span>
                  ) : null}
                </FilterPill>
              ))}
            </div>
          ) : (
            <span />
          )}

          {!loading ? (
            <span className="text-xs text-muted-foreground">
              {pagination.itemsCount.toLocaleString()} {pagination.itemsCount === 1 ? "app" : "apps"}
              {query ? ` for “${query}”` : ""}
            </span>
          ) : null}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-14 rounded-2xl" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-20 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <PackageOpen className="size-7 text-muted-foreground" />
            </span>
            <p className="text-sm font-medium">No apps to show</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {query
                ? "Nothing matches that search. Try another name or clear the filters."
                : "Apps appear here once they belong to a public collection and have a published version."}
            </p>
            {query || domain !== undefined ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  selectDomain(undefined);
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map((app, index) => (
              <StoreCard key={app.id} app={app} index={index} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pagesCount > 1 ? (
          <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft />
            </Button>
            {pageNumbers(pagination.page, pagination.pagesCount).map((value, index) =>
              value === null ? (
                <span key={`gap-${index}`} className="px-1 text-xs text-muted-foreground">
                  …
                </span>
              ) : (
                <button
                  key={value}
                  type="button"
                  aria-current={value === pagination.page ? "page" : undefined}
                  onClick={() => setPage(value)}
                  className={cn(
                    "size-8 rounded-lg text-xs font-medium tabular-nums transition-colors",
                    value === pagination.page
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {value}
                </button>
              ),
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next page"
              disabled={page >= pagination.pagesCount}
              onClick={() => setPage((value) => value + 1)}
            >
              <ChevronRight />
            </Button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

/** Page numbers with `null` gaps: 1 … 4 5 6 … 12 */
function pageNumbers(current: number, count: number): (number | null)[] {
  const pages = new Set([1, count, current - 1, current, current + 1]);
  const sorted = [...pages].filter((value) => value >= 1 && value <= count).sort((a, b) => a - b);

  return sorted.flatMap((value, index) =>
    index > 0 && value - sorted[index - 1] > 1 ? [null, value] : [value],
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function StoreCard({ app, index }: { app: IStoreApp; index: number }) {
  const updated = formatDate(app.updated_at);

  return (
    <Link
      to={`/apps/${app.id}`}
      style={{ animationDelay: `${index * 40}ms` }}
      className="group relative flex animate-slide-up flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm outline-none transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-center gap-3">
        <span className="transition-transform duration-300 group-hover:scale-105">
          <AppLogo name={app.name} logoUrl={app.logo_url} size={56} />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{app.name}</h2>
          <p className="truncate font-mono text-[0.6875rem] text-muted-foreground">{app.package_name}</p>
          {app.rating_count ? (
            <span className="mt-1 inline-flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
              <Stars value={app.rating_avg ?? 0} />
              <span className="tabular-nums">{(app.rating_avg ?? 0).toFixed(1)}</span>
              <span>({app.rating_count})</span>
            </span>
          ) : null}
        </div>
      </div>

      <p className="relative line-clamp-2 min-h-10 text-sm/relaxed text-muted-foreground">
        {app.summary || "No summary provided."}
      </p>

      <div className="relative mt-auto flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {app.version ? (
            <span className="rounded-md bg-primary/12 px-1.5 py-0.5 font-mono text-[0.6875rem] font-medium text-primary">
              v{app.version}
            </span>
          ) : null}
          {app.domains.slice(0, 2).map((domain) => (
            <span
              key={domain.id}
              className="truncate rounded-md bg-muted px-1.5 py-0.5 text-[0.6875rem] font-medium text-muted-foreground"
            >
              {domain.name}
            </span>
          ))}
          {updated ? <span className="text-[0.6875rem] text-muted-foreground">· {updated}</span> : null}
        </div>

        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-[gap] group-hover:gap-1.5">
          Get <ArrowRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}
