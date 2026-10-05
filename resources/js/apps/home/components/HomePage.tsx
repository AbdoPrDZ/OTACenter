import {
  ArrowRight,
  BookOpen,
  Globe,
  LayoutDashboard,
  PanelsTopLeft,
  Rocket,
  ShieldCheck,
  Smartphone,
  Users,
  type LucideIcon,
} from "lucide-react";

import LogoMark from "@/components/Logo";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: PanelsTopLeft,
    title: "Apps & releases",
    description:
      "Publish mobile & desktop apps with logos, screenshots and versioned installers.",
  },
  {
    icon: Rocket,
    title: "Versions & bundles",
    description:
      "Each version carries a ZIP bundle; activating one flips the update live — no store review.",
  },
  {
    icon: Globe,
    title: "Domains",
    description:
      "Group users and apps into organizational domains to scope exactly who sees what.",
  },
  {
    icon: Users,
    title: "LDAP users",
    description:
      "Users come from your directory and are bound to domains; no separate account store.",
  },
  {
    icon: ShieldCheck,
    title: "Roles & permissions",
    description:
      "Seeded roles and a fine-grained permission matrix gate every action, front to back.",
  },
  {
    icon: Smartphone,
    title: "OTA client SDK",
    description:
      "A React Native client checks, downloads and installs bundles, with automatic rollback.",
  },
];

const STEPS = [
  {
    title: "Publish an app",
    text: "Add the app, attach a version and upload its bundle.",
  },
  {
    title: "Scope access",
    text: "Bind the app to domains so the right users receive it.",
  },
  {
    title: "Devices update over-the-air",
    text: "The SDK checks in, pulls the bundle and restarts into it.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader active="home" />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
          <div className="pointer-events-none absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center md:py-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="size-1.5 rounded-full bg-primary" />
              Self-hosted · Over-the-Air distribution
            </span>

            <LogoMark className="size-32 drop-shadow-lg sm:size-40 md:size-48" />

            <h1 className="max-w-3xl font-display text-4xl font-semibold tracking-tight text-balance md:text-6xl">
              Ship updates without the app store.
            </h1>

            <p className="max-w-2xl text-base/relaxed text-muted-foreground md:text-lg/relaxed">
              OTACenter publishes your applications, versions and bundles, then
              lets devices pull updates over the air — scoped by your LDAP
              directory and organizational domains.
            </p>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <a href="/docs" className={cn(buttonVariants({ size: "lg" }))}>
                <BookOpen /> Read the docs
              </a>
              <a
                href="/dashboard"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                <LayoutDashboard /> Open dashboard
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Everything in one console
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              A complete pipeline from app upload to device delivery, with the
              access control you already run on.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="transition-colors hover:border-primary/40"
                >
                  <CardContent className="flex flex-col gap-3 pt-5">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="text-sm font-semibold">{feature.title}</h3>
                    <p className="text-xs/relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-border bg-muted/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">
              How it works
            </h2>
            <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex flex-col gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="text-xs/relaxed text-muted-foreground">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Ready to see it end to end?
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              Follow the getting-started guide to run OTACenter locally, then
              wire the client SDK into your React Native app.
            </p>
            <a href="/docs" className={cn(buttonVariants({ size: "lg" }))}>
              Get started <ArrowRight />
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
