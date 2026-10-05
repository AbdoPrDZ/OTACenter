import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

import LogoMark from "@/components/Logo";

const POINTS = [
  "Publish & version mobile and desktop apps",
  "Scope access with organizational domains",
  "Track every build and bundle in one place",
];

export default function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const year = new Date().getFullYear();

  return (
    <main className="flex min-h-dvh bg-background text-foreground">
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border bg-sidebar p-10 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />
        <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <LogoMark className="size-16" />
          <span className="font-display text-3xl font-semibold tracking-tight">
            OTACenter
          </span>
        </div>

        <div className="relative flex flex-col gap-4">
          <h2 className="max-w-md font-display text-3xl font-semibold tracking-tight text-balance">
            Over-the-air distribution, under control.
          </h2>
          <p className="max-w-md text-sm/relaxed text-muted-foreground">
            Publish applications, attach versioned builds and decide exactly who
            can access what — from a single dashboard.
          </p>
          <ul className="mt-2 flex flex-col gap-2.5">
            {POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          © {year} OTACenter
        </p>
      </aside>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <LogoMark className="size-9" />
            <span className="font-display text-base font-semibold tracking-tight">
              OTACenter
            </span>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>

          {children}
        </div>
      </div>
    </main>
  );
}
