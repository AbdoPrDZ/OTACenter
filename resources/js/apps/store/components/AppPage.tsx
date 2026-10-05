import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, ImageOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

import AppLogo from "./AppLogo";
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

  if (loading) return <Spinner className="mx-auto mt-16 size-6 text-muted-foreground" />;

  if (missing || !app) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-4 py-24 text-center">
        <p className="text-sm font-medium">App not found</p>
        <p className="text-xs text-muted-foreground">
          It may have been unpublished or its domain is no longer public.
        </p>
        <Link to="/" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <ArrowLeft /> Back to the store
        </Link>
      </div>
    );
  }

  const latest = app.versions[0];
  const size = formatBytes(latest?.size);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <Link
        to="/"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All apps
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-5 pt-5 sm:flex-row sm:items-start">
          <AppLogo name={app.name} logoUrl={app.logo_url} size={72} />

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{app.name}</h1>
              <p className="font-mono text-xs text-muted-foreground">{app.package_name}</p>
            </div>

            {app.summary ? (
              <p className="text-sm/relaxed text-muted-foreground">{app.summary}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-1.5">
              {app.domains.map((domain) => (
                <Badge key={domain.id} variant="outline">
                  {domain.name}
                </Badge>
              ))}
              {latest ? <Badge variant="primary">{latest.name}</Badge> : null}
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:w-44">
            <a
              href={app.download_url}
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
            >
              <Download /> Install
            </a>

            <div className="flex flex-col gap-1 text-[0.6875rem] text-muted-foreground">
              {latest ? <span>Latest version {latest.name}</span> : null}
              {size ? <span>Size {size}</span> : null}
              {formatDate(latest?.created_at) ? (
                <span>Updated {formatDate(latest?.created_at)}</span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Screenshots</CardTitle>
        </CardHeader>
        <CardContent>
          {app.screenshots.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
              <ImageOff className="size-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">No screenshots yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {app.screenshots.map((src) => (
                <a key={src} href={src} target="_blank" rel="noreferrer" className="group">
                  <img
                    src={src}
                    alt={`${app.name} screenshot`}
                    loading="lazy"
                    className="aspect-[9/16] w-full rounded-lg border border-border object-cover transition-colors group-hover:border-primary/40"
                  />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {app.description ? (
        <Card>
          <CardHeader>
            <CardTitle>About this app</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm/relaxed whitespace-pre-line text-muted-foreground">
              {app.description}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Versions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {app.versions.map((version) => (
            <div key={version.id} className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{version.name}</span>
                {formatDate(version.created_at) ? (
                  <span className="text-[0.6875rem] text-muted-foreground">
                    {formatDate(version.created_at)}
                  </span>
                ) : null}
                {formatBytes(version.size) ? (
                  <span className="text-[0.6875rem] text-muted-foreground">
                    {formatBytes(version.size)}
                  </span>
                ) : null}
              </div>
              {version.changelog ? (
                <p className="text-xs/relaxed whitespace-pre-line text-muted-foreground">
                  {version.changelog}
                </p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
