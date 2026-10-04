import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { MDXComponents } from "mdx/types";
import { Link } from "react-router-dom";
import { AlertTriangle, Info, Lightbulb, OctagonAlert, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { getDocMeta } from "../manifest";
import { Flow, FlowStep } from "./Flow";

/* ------------------------------ Link -------------------------------- */

function isExternalHref(href: string): boolean {
  return /^(https?:)?\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
}

/**
 * MDX anchors. Internal documentation links (e.g. `/client-sdk/hooks`) are
 * routed through react-router so the docs basename (`/docs`) is applied — a
 * plain `<a href="/client-sdk/hooks">` would leave the docs app entirely.
 */
function MdxLink({ href = "", className, children, ...props }: ComponentPropsWithoutRef<"a">) {
  const linkClass = cn("font-medium text-primary underline-offset-4 hover:underline", className);

  if (isExternalHref(href) || href.startsWith("#")) {
    const external = isExternalHref(href);
    return (
      <a
        href={href}
        className={linkClass}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        {...props}
      >
        {children}
      </a>
    );
  }

  const [rawPath, hash] = href.split("#");
  const path = rawPath || "/";
  const slug = path.replace(/^\/+/, "").replace(/\/+$/, "");
  const hasDocsPrefix = slug === "docs" || slug.startsWith("docs/");
  const isHome = path === "/" || path === "";
  const isDocsLink = isHome || hasDocsPrefix || getDocMeta(slug) !== undefined;

  if (isDocsLink) {
    const base = isHome
      ? "/"
      : hasDocsPrefix
        ? `/${slug.replace(/^docs\/?/, "")}`
        : `/${slug}`;
    const to = `${base}${hash ? `#${hash}` : ""}`;
    return (
      <Link to={to} className={linkClass} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={linkClass} {...props}>
      {children}
    </a>
  );
}

/* ----------------------------- Callout ------------------------------ */

const CALLOUT_STYLES = {
  info: { box: "border-info/30 bg-info/10", icon: "text-info", Icon: Info },
  tip: { box: "border-success/30 bg-success/10", icon: "text-success", Icon: Lightbulb },
  warning: { box: "border-warning/30 bg-warning/10", icon: "text-warning", Icon: AlertTriangle },
  danger: { box: "border-destructive/30 bg-destructive/10", icon: "text-destructive", Icon: OctagonAlert },
} as const;

type CalloutType = keyof typeof CALLOUT_STYLES;

function Callout({
  type = "info",
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}) {
  const config = CALLOUT_STYLES[type] ?? CALLOUT_STYLES.info;
  const Icon: LucideIcon = config.Icon;

  return (
    <div className={cn("my-4 flex gap-3 rounded-xl border p-3.5", config.box)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", config.icon)} />
      <div className="min-w-0 flex-1 text-sm/relaxed [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
        {title ? <p className="mb-1 font-semibold text-foreground">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

/* ------------------------------ Steps ------------------------------- */

function Steps({ children }: { children: ReactNode }) {
  return (
    <ol className="my-4 flex flex-col gap-4 border-l border-border pl-0 [counter-reset:step]">
      {children}
    </ol>
  );
}

function Step({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <li className="relative pl-8 [counter-increment:step]">
      <span className="absolute -left-3 flex size-6 items-center justify-center rounded-full border border-border bg-card text-[0.6875rem] font-semibold text-primary [&::before]:content-[counter(step)]" />
      {title ? <p className="mb-1 text-sm font-semibold">{title}</p> : null}
      <div className="text-sm/relaxed text-muted-foreground">{children}</div>
    </li>
  );
}

/* --------------------------- Element map ---------------------------- */

export const mdxComponents: MDXComponents = {
  h1: (props: ComponentPropsWithoutRef<"h1">) => (
    <h1
      className="mt-1 mb-4 font-display text-3xl font-semibold tracking-tight text-foreground"
      {...props}
    />
  ),
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className="mt-10 mb-3 scroll-mt-24 border-b border-border pb-2 text-xl font-semibold tracking-tight text-foreground [&>a]:text-inherit [&>a]:no-underline"
      {...props}
    />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3
      className="mt-8 mb-2 scroll-mt-24 text-base font-semibold tracking-tight text-foreground [&>a]:text-inherit [&>a]:no-underline"
      {...props}
    />
  ),
  h4: (props: ComponentPropsWithoutRef<"h4">) => (
    <h4
      className="mt-6 mb-2 scroll-mt-24 text-sm font-semibold text-foreground [&>a]:text-inherit [&>a]:no-underline"
      {...props}
    />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="my-4 text-sm/relaxed text-muted-foreground" {...props} />
  ),
  a: MdxLink,
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul
      className="my-4 ml-5 list-disc space-y-1.5 text-sm/relaxed text-muted-foreground"
      {...props}
    />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol
      className="my-4 ml-5 list-decimal space-y-1.5 text-sm/relaxed text-muted-foreground"
      {...props}
    />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => <li className="pl-1" {...props} />,
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="my-4 border-l-2 border-primary/40 pl-4 text-sm/relaxed text-muted-foreground italic"
      {...props}
    />
  ),
  hr: () => <hr className="my-8 border-border" />,
  pre: ({ className, ...props }: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className={cn(
        "my-4 overflow-x-auto rounded-xl border border-border bg-muted/40 p-4 font-mono text-[0.8125rem] leading-relaxed",
        className,
      )}
      {...props}
    />
  ),
  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code className="font-mono" {...props} />
  ),
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: (props: ComponentPropsWithoutRef<"thead">) => (
    <thead className="bg-muted/40" {...props} />
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th
      className="border-b border-border px-3 py-2 text-left text-xs font-semibold text-foreground"
      {...props}
    />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td
      className="border-b border-border/60 px-3 py-2 align-top text-xs/relaxed text-muted-foreground"
      {...props}
    />
  ),
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  img: (props: ComponentPropsWithoutRef<"img">) => (
    <img className="my-4 rounded-lg border border-border" {...props} />
  ),
  Callout,
  Steps,
  Step,
  Flow,
  FlowStep,
};
