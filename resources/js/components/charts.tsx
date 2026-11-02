import { useMemo, useState } from "react";
import { BarChart3, Table2 } from "lucide-react";

import type { DailyDownloads } from "@/models/Statistics";
import { cn } from "@/lib/utils";

/*
 * Hand-built, dependency-free charts for the dashboard.
 *
 * Colour roles (validated with the dataviz palette checks, see app.css):
 *  - downloads series: `viz-link` (via a download link) / `viz-direct` (without)
 *  - status breakdowns: the reserved status colours, always with a label + count
 * Marks follow the dataviz specs: thin bars anchored to the baseline, 4px rounded
 * data ends, 2px surface gaps between stacked fills, recessive grid, legend for
 * 2+ series, hover tooltip, and a table view.
 */

const SERIES = [
  { key: "without_token", label: "Without link", swatch: "bg-viz-direct" },
  { key: "with_token", label: "Via link", swatch: "bg-viz-link" },
] as const;

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value / 4)! * magnitude;
  return Math.ceil(value / step) * step;
}

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Legend({ items }: { items: readonly { label: string; swatch: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("size-2.5 rounded-[3px]", item.swatch)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Downloads over time — stacked columns                               */
/* ------------------------------------------------------------------ */

export function DownloadsChart({ data }: { data: DailyDownloads[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [hovered, setHovered] = useState<number | null>(null);

  const max = useMemo(
    () => niceMax(Math.max(0, ...data.map((day) => day.with_token + day.without_token))),
    [data],
  );
  const ticks = [max, max / 2, 0];
  const total = data.reduce((sum, day) => sum + day.with_token + day.without_token, 0);
  const active = hovered !== null ? data[hovered] : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Legend items={SERIES} />
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {(["chart", "table"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={view === mode}
              onClick={() => setView(mode)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.6875rem] font-medium transition-colors",
                view === mode ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode === "chart" ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
              {mode === "chart" ? "Chart" : "Table"}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <DownloadsTable data={data} />
      ) : (
        <div className="relative">
          {total === 0 ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-xs text-muted-foreground">
              No downloads in the last {data.length} days.
            </div>
          ) : null}

          <div className="flex gap-2">
            {/* y-axis */}
            <div className="flex h-44 w-7 shrink-0 flex-col justify-between text-right text-[0.625rem] tabular-nums text-muted-foreground">
              {ticks.map((tick) => (
                <span key={tick} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
                  {tick.toLocaleString()}
                </span>
              ))}
            </div>

            <div className="relative min-w-0 flex-1">
              {/* recessive grid */}
              <div className="pointer-events-none absolute inset-x-0 top-0 flex h-44 flex-col justify-between">
                {ticks.map((tick) => (
                  <span key={tick} className={cn("h-px w-full", tick === 0 ? "bg-border" : "bg-border/50")} />
                ))}
              </div>

              <div
                className="relative flex h-44 items-end gap-[2px]"
                onMouseLeave={() => setHovered(null)}
              >
                {data.map((day, index) => {
                  const dayTotal = day.with_token + day.without_token;

                  return (
                    <button
                      key={day.date}
                      type="button"
                      aria-label={`${shortDate(day.date)}: ${dayTotal} downloads (${day.with_token} via link, ${day.without_token} without)`}
                      onMouseEnter={() => setHovered(index)}
                      onFocus={() => setHovered(index)}
                      onBlur={() => setHovered(null)}
                      className={cn(
                        "group flex h-full min-w-0 flex-1 flex-col justify-end rounded-t-[4px] outline-none",
                        hovered === index && "bg-foreground/[0.04]",
                      )}
                    >
                      <span
                        className="flex w-full origin-bottom animate-grow-up flex-col gap-[2px]"
                        style={{
                          height: `${(dayTotal / max) * 100}%`,
                          animationDelay: `${index * 12}ms`,
                        }}
                      >
                        {day.with_token > 0 ? (
                          <span
                            className="w-full rounded-t-[4px] bg-viz-link"
                            style={{ flexGrow: day.with_token }}
                          />
                        ) : null}
                        {day.without_token > 0 ? (
                          <span
                            className={cn("w-full bg-viz-direct", day.with_token === 0 && "rounded-t-[4px]")}
                            style={{ flexGrow: day.without_token }}
                          />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* x-axis: a label every 7 days + the last day */}
              <div className="mt-1.5 flex gap-[2px] text-[0.625rem] text-muted-foreground">
                {data.map((day, index) => (
                  <span key={day.date} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">
                    {index % 7 === 0 || index === data.length - 1 ? shortDate(day.date) : ""}
                  </span>
                ))}
              </div>

              {active && hovered !== null ? (
                <div
                  className="pointer-events-none absolute top-0 z-20 w-40 animate-fade-in rounded-lg border border-border bg-popover p-2.5 text-xs shadow-lg"
                  style={{
                    left: `${((hovered + 0.5) / data.length) * 100}%`,
                    transform: hovered > data.length / 2 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
                  }}
                >
                  <p className="mb-1.5 font-semibold">{shortDate(active.date)}</p>
                  {[...SERIES].reverse().map((series) => (
                    <p key={series.key} className="flex items-center justify-between gap-2 text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn("size-2 rounded-[2px]", series.swatch)} />
                        {series.label}
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        {active[series.key].toLocaleString()}
                      </span>
                    </p>
                  ))}
                  <p className="mt-1.5 flex justify-between border-t border-border pt-1.5 font-medium">
                    <span>Total</span>
                    <span className="tabular-nums">{(active.with_token + active.without_token).toLocaleString()}</span>
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DownloadsTable({ data }: { data: DailyDownloads[] }) {
  const rows = [...data].reverse();

  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border border-border scrollbar-thin">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-card text-[0.625rem] tracking-wide text-muted-foreground uppercase">
          <tr>
            <th className="px-3 py-2 font-medium">Day</th>
            <th className="px-3 py-2 text-right font-medium">Via link</th>
            <th className="px-3 py-2 text-right font-medium">Without link</th>
            <th className="px-3 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((day) => (
            <tr key={day.date} className="border-t border-border">
              <td className="px-3 py-1.5">{shortDate(day.date)}</td>
              <td className="px-3 py-1.5 text-right">{day.with_token.toLocaleString()}</td>
              <td className="px-3 py-1.5 text-right">{day.without_token.toLocaleString()}</td>
              <td className="px-3 py-1.5 text-right font-medium">
                {(day.with_token + day.without_token).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status breakdown — one segmented bar + labelled legend               */
/* ------------------------------------------------------------------ */

const STATUS_SWATCH: Record<string, string> = {
  published: "bg-success",
  review: "bg-warning",
  cancelled: "bg-destructive",
  draft: "bg-muted-foreground/45",
};

const STATUS_ORDER = ["published", "review", "draft", "cancelled"];

export function SegmentBar({ byStatus }: { byStatus?: Record<string, number> }) {
  const entries = STATUS_ORDER.filter((status) => byStatus && status in byStatus).map((status) => ({
    status,
    count: byStatus![status] ?? 0,
  }));
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2.5 w-full origin-left animate-grow-right gap-[2px] overflow-hidden rounded-full bg-muted">
        {total > 0
          ? entries
              .filter((entry) => entry.count > 0)
              .map((entry) => (
                <span
                  key={entry.status}
                  title={`${entry.status}: ${entry.count}`}
                  className={cn("h-full", STATUS_SWATCH[entry.status])}
                  style={{ flexGrow: entry.count }}
                />
              ))
          : null}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {entries.map((entry) => (
          <div key={entry.status} className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 capitalize text-muted-foreground">
              <span className={cn("size-2 rounded-full", STATUS_SWATCH[entry.status])} />
              {entry.status}
            </span>
            <span className="font-medium tabular-nums">
              {entry.count.toLocaleString()}
              {total > 0 ? (
                <span className="ml-1 font-normal text-muted-foreground">
                  {Math.round((entry.count / total) * 100)}%
                </span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Meter — a share of a whole                                          */
/* ------------------------------------------------------------------ */

export function Meter({
  label,
  value,
  total,
  hint,
}: {
  label: string;
  value: number;
  total: number;
  hint?: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums">
          {percent}%
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {value.toLocaleString()} / {total.toLocaleString()}
          </span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full origin-left animate-grow-right rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
      {hint ? <span className="text-[0.625rem] text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rank list — top N with proportional bars                            */
/* ------------------------------------------------------------------ */

export function RankList({
  items,
  unit,
  emptyMessage,
  onSelect,
}: {
  items: { id: number; name: string; image?: string | null; value: number }[];
  unit: string;
  emptyMessage: string;
  onSelect?: (id: number) => void;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));

  if (items.length === 0)
    return <p className="py-6 text-center text-xs text-muted-foreground">{emptyMessage}</p>;

  return (
    <ol className="flex flex-col gap-1">
      {items.map((item, index) => (
        <li key={item.id}>
          <button
            type="button"
            disabled={!onSelect}
            onClick={() => onSelect?.(item.id)}
            className="group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors enabled:hover:bg-accent/60"
          >
            <span className="w-4 shrink-0 text-center text-[0.6875rem] font-semibold text-muted-foreground tabular-nums">
              {index + 1}
            </span>
            {item.image !== undefined ? (
              item.image ? (
                <img src={item.image} alt="" className="size-7 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-[0.6875rem] font-semibold text-primary">
                  {item.name.charAt(0).toUpperCase()}
                </span>
              )
            ) : null}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs font-medium">{item.name}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums">
                  {item.value.toLocaleString()}
                  <span className="ml-1 font-normal text-muted-foreground">{unit}</span>
                </span>
              </span>
              <span className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full origin-left animate-grow-right rounded-full bg-primary"
                  style={{ width: `${(item.value / max) * 100}%`, animationDelay: `${index * 60}ms` }}
                />
              </span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
