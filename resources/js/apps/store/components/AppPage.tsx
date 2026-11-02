import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { ArrowLeft, Download, HardDrive, ImageOff, Layers, MessageSquare, QrCode, Star, CalendarDays } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

import AppLogo from "./AppLogo";
import Stars from "./Stars";
import { fetchStoreApp, formatBytes, formatDate, type IStoreAppDetail } from "../api";

export default function AppPage() {
  const { id } = useParams();
  const appId = Number(id);
  const [app, setApp] = useState<IStoreAppDetail>();
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(appId)) {
      setMissing(true);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    fetchStoreApp(appId)
      .then((response) => {
        if (!active) return;

        if (response.success && response.data) {
          setApp(response.data);
          document.title = `${response.data.name} — OTACenter`;
        } else {
          setMissing(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appId]);

  if (loading) return <AppPageSkeleton />;

  if (missing || !app) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-4 py-28 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <ImageOff className="size-7 text-muted-foreground" />
        </span>
        <p className="text-sm font-medium">App not found</p>
        <p className="text-xs text-muted-foreground">It may have been unpublished or its collection is no longer public.</p>
        <Link to="/" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <ArrowLeft /> Back to the store
        </Link>
      </div>
    );
  }

  const latest = app.versions[0];
  const size = formatBytes(latest?.size);
  const updated = formatDate(latest?.created_at);
  const reviews = app.reviews ?? [];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        {app.logo_url ? (
          <img
            src={app.logo_url}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 size-full scale-125 object-cover opacity-20 blur-3xl saturate-150"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklch,var(--color-primary)_20%,transparent),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-background" />

        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-8 pb-10">
          <Link
            to="/"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All apps
          </Link>

          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start">
              <span className="rounded-[1.75rem] shadow-xl shadow-primary/10">
                <AppLogo name={app.name} logoUrl={app.logo_url} size={104} />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{app.name}</h1>
                <p className="font-mono text-xs text-muted-foreground">{app.package_name}</p>
                {app.summary ? <p className="text-sm/relaxed text-muted-foreground">{app.summary}</p> : null}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {app.domains.map((domain) => (
                    <span
                      key={domain.id}
                      className="rounded-full border border-border bg-card/60 px-2.5 py-0.5 text-[0.6875rem] font-medium text-muted-foreground backdrop-blur"
                    >
                      {domain.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <InstallCard downloadUrl={app.download_url} version={latest?.name} size={size} />
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 divide-border overflow-hidden rounded-2xl border border-border bg-card/70 backdrop-blur sm:grid-cols-4 sm:divide-x">
            <Fact
              icon={Star}
              label="Rating"
              value={app.rating_count ? (app.rating_avg ?? 0).toFixed(1) : "—"}
              hint={app.rating_count ? `${app.rating_count} review${app.rating_count === 1 ? "" : "s"}` : "No reviews"}
            />
            <Fact icon={Layers} label="Version" value={latest?.name ?? "—"} hint={`${app.versions.length} released`} />
            <Fact icon={HardDrive} label="Size" value={size ?? "—"} hint="APK" />
            <Fact icon={CalendarDays} label="Updated" value={updated ?? "—"} />
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10">
        {/* Screenshots */}
        <Section title="Screenshots">
          {app.screenshots.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
              <ImageOff className="size-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">No screenshots yet.</p>
            </div>
          ) : (
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-thin">
              {app.screenshots.map((src, index) => (
                <a
                  key={src}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  style={{ animationDelay: `${index * 60}ms` }}
                  className="group shrink-0 animate-slide-up snap-start overflow-hidden rounded-2xl border border-border"
                >
                  <img
                    src={src}
                    alt={`${app.name} screenshot ${index + 1}`}
                    loading="lazy"
                    className="aspect-[9/16] h-80 object-cover transition-transform duration-300 group-hover:scale-[1.03] md:h-96"
                  />
                </a>
              ))}
            </div>
          )}
        </Section>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_20rem]">
          <div className="flex min-w-0 flex-col gap-10">
            {app.description ? (
              <Section title="About this app">
                <p className="text-sm/relaxed whitespace-pre-line text-muted-foreground">{app.description}</p>
              </Section>
            ) : null}

            <Section title="Reviews" icon={MessageSquare}>
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {reviews.map((review) => (
                    <article key={review.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={review.user?.image_url ?? undefined} name={review.user?.name ?? "?"} size={28} />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-xs font-semibold">{review.user?.name ?? "Anonymous"}</span>
                          <span className="text-[0.625rem] text-muted-foreground">{formatDate(review.created_at)}</span>
                        </div>
                        <Stars value={review.rating} />
                      </div>
                      {review.title ? <p className="text-sm font-medium">{review.title}</p> : null}
                      {review.comment ? (
                        <p className="text-sm/relaxed whitespace-pre-line text-muted-foreground">{review.comment}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* Release timeline */}
          <Section title="What's new">
            <ol className="relative flex flex-col gap-5 border-l border-border pl-5">
              {app.versions.map((version, index) => (
                <li key={version.id} className="relative flex flex-col gap-1">
                  <span
                    className={cn(
                      "absolute top-1 -left-[1.6rem] size-2.5 rounded-full ring-4 ring-background",
                      index === 0 ? "bg-primary" : "bg-muted-foreground/40",
                    )}
                  />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-sm font-semibold">v{version.name}</span>
                    {index === 0 ? (
                      <span className="rounded-full bg-primary/12 px-1.5 py-0.5 text-[0.625rem] font-medium text-primary">
                        Latest
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[0.6875rem] text-muted-foreground">
                    {[formatDate(version.created_at), formatBytes(version.size)].filter(Boolean).join(" · ")}
                  </span>
                  {version.changelog ? (
                    <p className="text-xs/relaxed whitespace-pre-line text-muted-foreground">{version.changelog}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>
    </div>
  );
}

/** Install button + a QR code of the same URL, for installing on a phone. */
function InstallCard({ downloadUrl, version, size }: { downloadUrl: string; version?: string; size: string | null }) {
  const [qr, setQr] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(downloadUrl, { width: 320, margin: 1, errorCorrectionLevel: "M" })
      .then((dataUrl) => !cancelled && setQr(dataUrl))
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [downloadUrl]);

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-card/80 p-4 shadow-lg shadow-primary/5 backdrop-blur md:w-64">
      <a href={downloadUrl} className={cn(buttonVariants({ size: "lg" }), "w-full shadow-md shadow-primary/25")}>
        <Download /> Install{version ? ` v${version}` : ""}
      </a>
      {size ? <p className="text-center text-[0.6875rem] text-muted-foreground">{size} · Android APK</p> : null}

      <div className="flex items-center gap-3 border-t border-border pt-3">
        <span className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
          {qr ? <img src={qr} alt="QR code to install this app" className="size-full" /> : <QrCode className="size-6 text-neutral-400" />}
        </span>
        <p className="text-[0.6875rem]/relaxed text-muted-foreground">
          <span className="block font-medium text-foreground">Install on your phone</span>
          Scan the code with your camera to download the APK directly.
        </p>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value, hint }: { icon: typeof Star; label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 border-border p-4 [&:nth-child(-n+2)]:border-b sm:[&:nth-child(-n+2)]:border-b-0">
      <span className="inline-flex items-center gap-1.5 text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
        <Icon className="size-3.5" /> {label}
      </span>
      <span className="truncate text-base font-semibold tabular-nums">{value}</span>
      {hint ? <span className="text-[0.6875rem] text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: typeof Star; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
        {Icon ? <Icon className="size-4.5 text-muted-foreground" /> : null}
        {title}
      </h2>
      {children}
    </section>
  );
}

function AppPageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <Skeleton className="h-6 w-24 rounded-full" />
      <div className="flex gap-4">
        <Skeleton className="size-26 rounded-[1.75rem]" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-80 w-44 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
