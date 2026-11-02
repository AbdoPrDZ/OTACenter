import { useEffect } from "react";
import {
  ArrowRight,
  BarChart3,
  Code2,
  HeartHandshake,
  Lock,
  Rocket,
  Scale,
  Server,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import GithubIcon from "@/components/site/GithubIcon";
import { AUTHOR, AUTHOR_URL, LICENSE_NAME, LICENSE_URL, REPO_URL, copyrightNotice } from "@/components/site/site";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PILLARS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Rocket,
    title: "Distribute",
    text: "Publish apps with versioned installers and OTA bundles. Devices pick up new builds on their own — no store review in the way.",
  },
  {
    icon: Lock,
    title: "Control",
    text: "Your LDAP directory, organizational domains and a fine-grained permission matrix decide exactly who can see and install what.",
  },
  {
    icon: BarChart3,
    title: "Observe",
    text: "Every check-in and download is recorded — per app, per user and per shareable link — so you always know what is running where.",
  },
];

const PRINCIPLES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Server, title: "Self-hosted", text: "Runs on your own infrastructure; your builds never leave it." },
  { icon: ShieldCheck, title: "Secure by default", text: "API keys per version, expiring tokens and SHA-256 checksums on every download." },
  { icon: Code2, title: "Open source", text: `Free software under ${LICENSE_NAME} — read it, run it, improve it.` },
];

const STACK = [
  "Laravel 13",
  "PHP 8.3+",
  "React 19",
  "TypeScript",
  "Tailwind CSS v4",
  "Vite",
  "Laravel Sanctum",
  "LDAPRecord",
  "Spatie Permissions",
  "React Native SDK",
];

export default function AboutPage() {
  useEffect(() => {
    document.title = "About — OTACenter";
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader active="about" />

      <main className="flex-1 animate-page-in">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
          <div className="pointer-events-none absolute -top-40 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-5 px-4 py-20 text-center md:py-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="size-1.5 rounded-full bg-primary" />
              About OTACenter
            </span>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-balance md:text-5xl">
              Ship updates on <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">your terms</span>.
            </h1>
            <p className="max-w-2xl text-base/relaxed text-muted-foreground">
              OTACenter is a self-hosted over-the-air distribution platform. It lets an organization publish its
              own mobile and desktop apps, roll out new versions instantly, and decide — through the directory it
              already runs — exactly who receives them.
            </p>
          </div>
        </section>

        {/* Pillars */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PILLARS.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <article
                  key={pillar.title}
                  style={{ animationDelay: `${index * 80}ms` }}
                  className="group flex animate-slide-up flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-primary/40"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary transition-transform group-hover:scale-105">
                    <Icon className="size-5" />
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight">{pillar.title}</h2>
                  <p className="text-sm/relaxed text-muted-foreground">{pillar.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Principles + stack */}
        <section className="border-y border-border bg-muted/20">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-16 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <h2 className="text-2xl font-semibold tracking-tight">What we care about</h2>
              <ul className="flex flex-col gap-5">
                {PRINCIPLES.map((principle) => {
                  const Icon = principle.icon;
                  return (
                    <li key={principle.title} className="flex gap-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary">
                        <Icon className="size-4.5" />
                      </span>
                      <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-semibold">{principle.title}</h3>
                        <p className="text-sm/relaxed text-muted-foreground">{principle.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex flex-col gap-6">
              <h2 className="text-2xl font-semibold tracking-tight">Built with</h2>
              <div className="flex flex-wrap gap-2">
                {STACK.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="text-sm/relaxed text-muted-foreground">
                A Laravel JSON API with Sanctum tokens and LDAP sign-in powers a React dashboard, a public app
                store and these docs. Devices talk to a small, API-key protected OTA endpoint through the React
                Native client SDK.
              </p>
            </div>
          </div>
        </section>

        {/* Author */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 md:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklch,var(--color-primary)_18%,transparent),transparent_60%)]" />

            <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
              <img
                src={`${AUTHOR_URL}.png?size=192`}
                alt={AUTHOR}
                width={96}
                height={96}
                className="size-24 rounded-2xl border border-border object-cover shadow-lg"
              />

              <div className="flex flex-1 flex-col gap-2">
                <span className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-primary">
                  <HeartHandshake className="size-3.5" /> Created & maintained by
                </span>
                <h2 className="font-display text-2xl font-semibold tracking-tight">{AUTHOR}</h2>
                <p className="max-w-xl text-sm/relaxed text-muted-foreground">
                  OTACenter is designed, built and maintained by {AUTHOR}. Bug reports, ideas and contributions are
                  always welcome on GitHub.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                <a href={AUTHOR_URL} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }))}>
                  <GithubIcon /> @{AUTHOR}
                </a>
                <a href={REPO_URL} target="_blank" rel="noreferrer" className={cn(buttonVariants())}>
                  View the source <ArrowRight />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* License + CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Scale className="size-4.5" />
              </span>
              <h2 className="text-lg font-semibold tracking-tight">License</h2>
              <p className="text-sm/relaxed text-muted-foreground">
                {copyrightNotice()}. OTACenter is free software: you can redistribute it and/or modify it under the
                terms of the GNU General Public License, version 3 or (at your option) any later version.
              </p>
              <a href={LICENSE_URL} target="_blank" rel="noreferrer" className="w-fit text-sm font-medium text-primary hover:underline">
                Read the license →
              </a>
            </div>

            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/12 via-transparent to-transparent p-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold tracking-tight">Questions or ideas?</h2>
                <p className="text-sm/relaxed text-muted-foreground">
                  Whether it is a bug, a feature request or help setting things up — get in touch.
                </p>
              </div>
              <a href="/contact" className={cn(buttonVariants(), "w-fit")}>
                Contact us <ArrowRight />
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
